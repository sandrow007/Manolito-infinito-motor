/* =============================================================================
   BLOQUE 6: APP — orquestador general, conecta UI con los motores
   v2. Respeta las 6 tarjetas de materiales del HTML (no las borra) y añade
   debajo la tabla completa de 60 materiales en desplegables por familia.
   El mix final = sliders de las tarjetas + extras marcados en la tabla.
   ============================================================================= */

const App = {
  mixManual: {},
  detectados: null,
  ultimoResultado: null,

  init() {
    this.renderMaterialesAvanzados();
    this.bindEventos();
    this.log('Sistema listo. Configura el mix o sube una imagen/video.', 'ok');
  },

  /** Mix combinado: sliders de las tarjetas + extras de la tabla avanzada */
  _mixCombinado() {
    const mix = {};
    const sliders = window.materialMix || {};
    for (const [mat, pct] of Object.entries(sliders)) {
      const v = parseFloat(pct) || 0;
      if (v > 0) mix[mat] = v;
    }
    for (const [mat, pct] of Object.entries(this.mixManual)) {
      const v = parseFloat(pct) || 0;
      if (v > 0) mix[mat] = (mix[mat] || 0) + v;
    }
    return mix;
  },

  /**
   * Añade la tabla avanzada SIN tocar las tarjetas del HTML.
   * Cada familia queda dentro de su propio <details> (antes las filas se
   * soltaban fuera y las categorías quedaban vacías).
   */
  renderMaterialesAvanzados() {
    const cont = document.getElementById('material-selector');
    if (!cont || document.getElementById('materiales-avanzados')) return;

    const wrapper = document.createElement('details');
    wrapper.className = 'material-category material-category-full';
    wrapper.id = 'materiales-avanzados';
    wrapper.style.gridColumn = '1 / -1';
    const resumen = document.createElement('summary');
    resumen.textContent = 'Tabla completa · 60 materiales por familias';
    wrapper.appendChild(resumen);

    for (const [categoria, materiales] of Object.entries(MATERIAL_CATEGORIES)) {
      const details = document.createElement('details');
      details.className = 'material-category';
      const summary = document.createElement('summary');
      summary.textContent = categoria;
      details.appendChild(summary);

      materiales.forEach((mat) => {
        const row = document.createElement('div');
        row.className = 'material-row';
        row.innerHTML = `
          <input type="checkbox" data-mat="${mat}" class="mat-check">
          <div>
            <div class="mname">${mat.replace(/_/g, ' ')}</div>
            <div class="mk">k=${THERMAL_CONSTANTS[mat].toFixed(3)} W/m·K · ${COST_PER_M2[mat]} €/m²</div>
          </div>
          <input type="number" min="0" max="100" value="0" step="0.5" data-mat-pct="${mat}" disabled>
        `;
        details.appendChild(row); // la fila va DENTRO de su familia
      });
      wrapper.appendChild(details);
    }
    cont.appendChild(wrapper);

    wrapper.addEventListener('change', (e) => {
      if (e.target.classList.contains('mat-check')) {
        const mat = e.target.dataset.mat;
        const pctInput = wrapper.querySelector(`input[data-mat-pct="${mat}"]`);
        pctInput.disabled = !e.target.checked;
        if (!e.target.checked) { pctInput.value = 0; delete this.mixManual[mat]; }
        else { this.mixManual[mat] = parseFloat(pctInput.value) || 0; }
        this.actualizarMixTotal();
      }
      if (e.target.hasAttribute('data-mat-pct')) {
        const mat = e.target.dataset.matPct;
        this.mixManual[mat] = parseFloat(e.target.value) || 0;
        this.actualizarMixTotal();
      }
    });

    // Los sliders de las tarjetas también actualizan el total combinado
    document.querySelectorAll('.mat-range').forEach(input => {
      input.addEventListener('input', () => this.actualizarMixTotal());
    });
  },

  actualizarMixTotal() {
    const total = Object.values(this._mixCombinado()).reduce((a, b) => a + b, 0);
    const el = document.getElementById('mix-total');
    if (!el) return;
    el.textContent = `Suma actual: ${total.toFixed(1)}% (debe ser 100%)`;
    el.className = 'mix-total ' + (Math.abs(total - 100) < 1 ? 'ok' : (total > 0 ? 'bad' : ''));
  },

  bindEventos() {
    // btn-autorrellenar lo gestiona el script inline de index.html (las tarjetas)
    document.getElementById('btn-calcular').addEventListener('click', () => this.calcular());
    document.getElementById('btn-export-json').addEventListener('click', () => {
      if (this.ultimoResultado) ExportEngine.exportarJSON(this.ultimoResultado);
    });
    document.getElementById('btn-export-csv').addEventListener('click', () => {
      if (this.ultimoResultado) ExportEngine.exportarCSV(this.ultimoResultado);
    });
    document.getElementById('btn-export-pdf').addEventListener('click', () => {
      if (this.ultimoResultado) ExportEngine.exportarPDF(this.ultimoResultado);
    });

    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length) this.procesarArchivo(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) this.procesarArchivo(e.target.files[0]);
    });

    document.getElementById('chat-send').addEventListener('click', () => this.enviarChat());
    document.getElementById('chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.enviarChat();
    });
  },

  async procesarArchivo(file) {
    this.log(`Analizando ${file.name}...`, 'ok');
    const esVideo = file.type.startsWith('video');
    const url = URL.createObjectURL(file);

    document.getElementById('preview-container').innerHTML = '';

    if (esVideo) {
      const video = document.createElement('video');
      video.src = url;
      video.muted = true;
      video.style.maxWidth = '100%';
      video.style.borderRadius = '4px';
      document.getElementById('preview-container').appendChild(video);
      video.addEventListener('loadedmetadata', async () => {
        const { materiales, descartadosPorSol } = await MaterialDetector.detectarDesdeVideo(video);
        this.aplicarDeteccion(materiales, descartadosPorSol);
      });
    } else {
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Preview de imagen subida para detección de materiales';
      img.loading = 'lazy';
      img.style.maxWidth = '100%';
      img.style.borderRadius = '4px';
      document.getElementById('preview-container').appendChild(img);
      img.addEventListener('load', () => {
        const imgData = MaterialDetector.imageDataDesdeImagen(img);
        const { materiales, descartadosPorSol } = MaterialDetector.detectarDesdeImageData(imgData);
        this.aplicarDeteccion(materiales, descartadosPorSol);
      });
    }
  },

  aplicarDeteccion(materiales, descartadosPorSol) {
    this.detectados = materiales;
    const cont = document.getElementById('detected-tags');
    cont.innerHTML = '';
    for (const [mat, pct] of Object.entries(materiales)) {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = `${mat.replace(/_/g, ' ')}: ${pct.toFixed(1)}%`;
      cont.appendChild(tag);
    }
    this.log(`Deteccion completa: ${Object.keys(materiales).length} materiales identificados.`, 'ok');
    if (descartadosPorSol > 0) {
      this.log(`Filtro anti-sol activo: ${descartadosPorSol} zonas de brillo/reflejo descartadas (no se contaron como aluminio).`, 'warn');
    }
    document.getElementById('usar-deteccion').disabled = false;
  },

  calcular() {
    const usarDeteccion = document.getElementById('usar-deteccion').checked;
    let mix = usarDeteccion && this.detectados ? this.detectados : this._mixCombinado();
    mix = Object.fromEntries(Object.entries(mix).filter(([, v]) => v > 0));

    const validacion = ThermalEngine.validarMix(mix);
    if (!validacion.ok) {
      // Sin alert() nativo: el aviso vive en el registro y en el contador del mix
      this.log(validacion.mensaje, 'warn');
      const el = document.getElementById('mix-total');
      if (el) el.className = 'mix-total bad';
      return;
    }

    const areaM2 = parseFloat(document.getElementById('input-area').value) || 100;
    const tempDiff = parseFloat(document.getElementById('input-tempdiff').value) || 20;
    const espesorM = parseFloat(document.getElementById('input-thickness')?.value) || 0.1;

    const resultado = ThermalEngine.calcularAnalisisCompleto(mix, areaM2, tempDiff, espesorM);
    const quantum = QuantumEngine.ejecutar(resultado.kFinal);
    resultado.quantum = quantum;
    resultado.detectados = usarDeteccion ? this.detectados : null;

    this.ultimoResultado = resultado;
    ManolitoChat.actualizarContexto(resultado);
    this.mostrarResultados(resultado);
    this.log(`COMPLETADO · k_final=${resultado.kFinal.toFixed(4)} | Budget=${resultado.budgetTotal.toFixed(2)}€ | Estabilidad=${(quantum.estabilidadExacta ?? quantum.estabilidad).toFixed(1)}%`, 'ok');

    document.getElementById('resultados-panel').style.display = 'block';
    document.getElementById('resultados-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  mostrarResultados(r) {
    document.getElementById('k-readout').innerHTML = `${r.kFinal.toFixed(4)} <span class="unit">W/(m·K)</span>`;

    const pct = Math.min(100, (r.kFinal / K_MAX_NORMALIZATION) * 100);
    document.getElementById('thermo-needle').style.left = `calc(${pct}% - 2px)`;

    document.getElementById('result-budget').textContent = `${r.budgetTotal.toFixed(2)} €`;
    document.getElementById('result-flux').textContent = `${r.thermalFlux.toFixed(3)} W`;
    document.getElementById('result-efficiency').textContent = r.efficiency != null ? r.efficiency.toFixed(4) : '—';
    document.getElementById('result-theta').textContent = `${r.quantum.theta.toFixed(4)} rad`;
    const estabilidad = r.quantum.estabilidadExacta ?? r.quantum.estabilidad;
    document.getElementById('result-estabilidad').textContent = `${estabilidad.toFixed(2)}%`;

    const nivel = QuantumEngine.nivelEstabilidad(estabilidad);
    const nivelEl = document.getElementById('result-nivel');
    nivelEl.textContent = `${nivel.texto} · ${nivel.detalle}`;
    nivelEl.style.color = nivel.color;

    this.dibujarBarrasCuanticas(r.quantum.counts, r.quantum.totalShots);

    this._chatAppend('manolito', ManolitoChat.RESPUESTAS.k_final.es(r));
  },

  dibujarBarrasCuanticas(counts, total) {
    const cont = document.getElementById('qbars');
    cont.innerHTML = '';
    for (const estado of ['00', '01', '10', '11']) {
      const pct = (counts[estado] / total) * 100;
      const col = document.createElement('div');
      col.className = 'qbar-col';
      col.innerHTML = `
        <div class="qbar ${estado === '00' ? 'state00' : ''}" style="height:${Math.max(2, pct)}px"></div>
        <div class="qbar-label">|${estado}&gt;<br>${pct.toFixed(1)}%</div>
        `;
      cont.appendChild(col);
    }
  },

  async enviarChat() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    this._chatAppend('user', msg);

    const loadingId = 'loading-' + Date.now();
    this._chatAppend('manolito', '<span id="'+loadingId+'">Pensando...</span>');

    const resp = await ManolitoChat.responder(msg);

    const loadingEl = document.getElementById(loadingId);
    if (loadingEl) {
      loadingEl.parentNode.innerHTML = resp;
    } else {
      this._chatAppend('manolito', resp);
    }
  },

  _chatAppend(quien, texto) {
    const win = document.getElementById('chat-window');
    const div = document.createElement('div');
    div.className = `chat-msg ${quien}`;
    // El texto del usuario se escapa siempre. Las respuestas del motor llegan
    // ya escapadas desde ManolitoChat.responder (con <br> para saltos).
    const cuerpo = quien === 'user'
      ? texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      : texto;
    div.innerHTML = `<div class="who">${quien === 'user' ? 'Tu' : 'Manolito'}</div><div>${cuerpo}</div>`;
    win.appendChild(div);
    win.scrollTop = win.scrollHeight;
  },

  log(mensaje, tipo = '') {
    const el = document.getElementById('status-log');
    const div = document.createElement('div');
    div.className = tipo;
    const ts = new Date().toLocaleTimeString('es-ES');
    div.textContent = `[${ts}] ${mensaje}`;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
