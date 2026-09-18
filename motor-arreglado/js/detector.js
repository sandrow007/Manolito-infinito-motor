/* =============================================================================
   BLOQUE 2: DETECTOR AUTOMATICO DE MATERIALES (imagen y video)
   100% Canvas + JS puro, sin OpenCV ni librerias externas.
   Algoritmo: muestreo de pixeles -> RGB a HSV -> comparacion contra
   rangos de MATERIAL_COLOR_HINTS, con filtro de sobreexposicion previo
   para no confundir brillo solar / reflejos con aluminio u otros metales claros.
   ============================================================================= */

const MaterialDetector = {

  rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : (d / max) * 100;
    const v = max * 100;
    return { h, s, v };
  },

  /** Filtro anti-sol/reflejo: brillo muy alto + saturacion muy baja = quemado, no material */
  esSobreexpuesto(s, v) {
    return v > HOTSPOT_FILTER.vMin && s < HOTSPOT_FILTER.sMax;
  },

  coincideMaterial(hsv, rango) {
    const { h, s, v } = hsv;
    const hOk = rango.hMin <= rango.hMax
      ? (h >= rango.hMin && h <= rango.hMax)
      : (h >= rango.hMin || h <= rango.hMax); // wrap-around (ej. rojos cerca de 360/0)
    return hOk && s >= rango.sMin && s <= rango.sMax && v >= rango.vMin && v <= rango.vMax;
  },

  /**
   * Analiza un ImageData (de canvas) y devuelve { material: porcentaje }
   * step: cada cuantos pixeles muestrea (rendimiento). 4 = analiza 1 de cada 4.
   */
  detectarDesdeImageData(imageData, step = 4) {
    const { data, width, height } = imageData;
    const total = width * height;
    const scores = {};
    let muestreados = 0;
    let descartadosPorSol = 0;

    for (let i = 0; i < data.length; i += 4 * step) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const hsv = this.rgbToHsv(r, g, b);
      muestreados++;

      if (this.esSobreexpuesto(hsv.s, hsv.v)) {
        descartadosPorSol++;
        continue; // no se clasifica como ningun material: es reflejo/sol
      }

      for (const [mat, rango] of Object.entries(MATERIAL_COLOR_HINTS)) {
        if (this.coincideMaterial(hsv, rango)) {
          scores[mat] = (scores[mat] || 0) + 1;
        }
      }
    }

    if (Object.keys(scores).length === 0) {
      return { materiales: this.deteccionBasica(data), descartadosPorSol, muestreados };
    }

    // Normalizar y quedarnos con el top 5
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    let porcentajes = Object.entries(scores)
      .map(([mat, v]) => [mat, (v / totalScore) * 100])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const top5total = porcentajes.reduce((acc, [, v]) => acc + v, 0);
    const materiales = {};
    for (const [mat, v] of porcentajes) {
      materiales[mat] = Math.round((v / top5total) * 10000) / 100;
    }

    return { materiales, descartadosPorSol, muestreados };
  },

  /** Fallback por luminancia media si no hay coincidencias de color claras */
  deteccionBasica(data) {
    let sumR = 0, sumG = 0, sumB = 0, n = 0;
    for (let i = 0; i < data.length; i += 4 * 8) {
      sumR += data[i]; sumG += data[i + 1]; sumB += data[i + 2];
      n++;
    }
    const r = sumR / n, g = sumG / n, b = sumB / n;
    const lum = (r + g + b) / 3;

    if (lum < 60) return { asfalto: 70, hormigon: 30 };
    if (lum < 130) {
      if (r > g && r > b) return { ladrillo: 50, ceramica: 30, mortero: 20 };
      return { hormigon: 50, tierra_compacta: 30, grava: 20 };
    }
    if (b > r && b > g) return { vidrio: 60, aluminio: 40 };
    return { hormigon: 40, ceramica: 35, yeso: 25 };
  },

  /** Extrae ImageData de un <img> ya cargado */
  imageDataDesdeImagen(imgEl) {
    const canvas = document.createElement('canvas');
    canvas.width = imgEl.naturalWidth;
    canvas.height = imgEl.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  },

  /** Muestrea N frames de un <video> ya cargado y promedia la deteccion */
  async detectarDesdeVideo(videoEl, numSamples = 5) {
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const ctx = canvas.getContext('2d');
    const duracion = videoEl.duration;
    const combinado = {};
    let totalDescartes = 0;

    for (let i = 0; i < numSamples; i++) {
      const t = (duracion / numSamples) * i;
      await new Promise((resolve) => {
        const onSeeked = () => { videoEl.removeEventListener('seeked', onSeeked); resolve(); };
        videoEl.addEventListener('seeked', onSeeked);
        videoEl.currentTime = t;
      });
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { materiales, descartadosPorSol } = this.detectarDesdeImageData(imgData, 6);
      totalDescartes += descartadosPorSol || 0;
      for (const [mat, pct] of Object.entries(materiales)) {
        combinado[mat] = (combinado[mat] || 0) + pct;
      }
    }

    const total = Object.values(combinado).reduce((a, b) => a + b, 0);
    const resultado = {};
    if (total > 0) {
      for (const [mat, v] of Object.entries(combinado)) {
        resultado[mat] = Math.round((v / total) * 10000) / 100;
      }
    }
    return { materiales: resultado, descartadosPorSol: totalDescartes };
  },
};
