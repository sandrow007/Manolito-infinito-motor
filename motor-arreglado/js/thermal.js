/* =============================================================================
   BLOQUE 1: MOTOR TERMICO
   k_final = SUM(k_i * pct_i / 100)
   Budget  = SUM(area * pct_i/100 * costo_m2_i)
   thermal_flux = k_final * area * temp_diff / espesor  (Ley de Fourier: Q = k·A·ΔT/L)
   Sin el espesor L el flujo no sale en vatios, salia en W·m, que no es nada.
   ============================================================================= */

const ThermalEngine = {
  /**
   * mix: { materialName: porcentaje }  (porcentajes deben sumar ~100)
   */
  calcularKFinal(mix) {
    let k = 0;
    for (const [mat, pct] of Object.entries(mix)) {
      const ki = THERMAL_CONSTANTS[mat] ?? 1.0;
      k += ki * (pct / 100);
    }
    return k;
  },

  calcularBudget(mix, areaM2) {
    let total = 0;
    for (const [mat, pct] of Object.entries(mix)) {
      const costo = COST_PER_M2[mat] ?? 0;
      total += areaM2 * (pct / 100) * costo;
    }
    return total;
  },

  calcularFlujoTermico(kFinal, areaM2, tempDiff, espesorM = 0.1) {
    const L = espesorM > 0 ? espesorM : 0.1;
    return (kFinal * areaM2 * tempDiff) / L;
  },

  calcularEficiencia(flujo, budget) {
    if (!budget || budget <= 0) return null;
    return flujo / budget;
  },

  /** Normaliza un mix arbitrario de porcentajes para que sume exactamente 100 */
  normalizarMix(mix) {
    const total = Object.values(mix).reduce((a, b) => a + b, 0);
    if (total <= 0) return mix;
    const normalizado = {};
    for (const [mat, pct] of Object.entries(mix)) {
      normalizado[mat] = Math.round((pct / total) * 10000) / 100;
    }
    return normalizado;
  },

  validarMix(mix) {
    const materiales = Object.keys(mix);
    if (materiales.length === 0) {
      return { ok: false, mensaje: 'Selecciona al menos un material o usa la deteccion automatica.' };
    }
    const total = Object.values(mix).reduce((a, b) => a + b, 0);
    if (Math.abs(total - 100) > 1.0) {
      return { ok: false, mensaje: `Suma actual: ${total.toFixed(1)}%. Debe ser 100%.` };
    }
    return { ok: true };
  },

  calcularAnalisisCompleto(mix, areaM2, tempDiff = 20, espesorM = 0.1) {
    const kFinal = this.calcularKFinal(mix);
    const budget = this.calcularBudget(mix, areaM2);
    const flujo = this.calcularFlujoTermico(kFinal, areaM2, tempDiff, espesorM);
    const eficiencia = this.calcularEficiencia(flujo, budget);
    return {
      materialesMix: mix,
      areaM2,
      tempDiff,
      thicknessM: espesorM,
      kFinal,
      budgetTotal: budget,
      thermalFlux: flujo,
      efficiency: eficiencia,
      timestamp: new Date().toISOString(),
    };
  },
};
