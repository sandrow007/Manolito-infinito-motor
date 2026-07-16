/* =============================================================================
   BLOQUE 3: MOTOR CUANTICO — simulador de vector de estado, JS puro.
   Reproduce EXACTAMENTE el circuito del Python original:
     theta = k_final * pi / K_MAX   (normalizado a [0, pi])
     RY(theta) sobre q0, luego CNOT(control=q0, target=q1), medicion.
     Estabilidad = P(|00>) * 100
   Sin qiskit, sin AerSimulator, sin conexion a IBM: es calculo matricial puro.
   ============================================================================= */

const QuantumEngine = {

  normalizarTheta(kFinal) {
    const theta = (kFinal / K_MAX_NORMALIZATION) * Math.PI;
    return Math.max(0, Math.min(Math.PI, theta));
  },

  /**
   * Simula el circuito de 2 qubits y devuelve las probabilidades exactas
   * (no haria falta samplear con "shots" porque tenemos el estado exacto,
   * pero se generan shots simulados para mantener la misma semantica
   * estadistica que el AerSimulator original).
   */
  ejecutar(kFinal, shots = 1024) {
    const theta = this.normalizarTheta(kFinal);

    // Estado inicial |00> = [1, 0, 0, 0]  (orden de base: |00>,|01>,|10>,|11>)
    // Paso 1: RY(theta) sobre q0 -> superposicion entre |0>q0 y |1>q0
    //   RY(theta) = [[cos(t/2), -sin(t/2)], [sin(t/2), cos(t/2)]]
    const c = Math.cos(theta / 2);
    const s = Math.sin(theta / 2);

    // Tras RY en q0 (q1 se mantiene en |0>): estado = c|00> + s|10>
    let amp00 = c;
    let amp01 = 0;
    let amp10 = s;
    let amp11 = 0;

    // Paso 2: CNOT(control=q0, target=q1) -> si q0=1, invierte q1
    //   |00> se queda igual, |10> pasa a |11>
    const amp00_final = amp00;
    const amp01_final = amp01;
    const amp10_final = 0;       // |10> ya no existe: se convirtio en |11>
    const amp11_final = amp10;   // la amplitud que estaba en |10> ahora esta en |11>

    const prob00 = amp00_final ** 2;
    const prob01 = amp01_final ** 2;
    const prob10 = amp10_final ** 2;
    const prob11 = amp11_final ** 2;

    // Generar "shots" simulados con estas probabilidades exactas (Monte Carlo)
    const counts = { '00': 0, '01': 0, '10': 0, '11': 0 };
    for (let i = 0; i < shots; i++) {
      const r = Math.random();
      if (r < prob00) counts['00']++;
      else if (r < prob00 + prob01) counts['01']++;
      else if (r < prob00 + prob01 + prob10) counts['10']++;
      else counts['11']++;
    }

    const estabilidad = (counts['00'] / shots) * 100;

    return {
      status: 'ok',
      theta,
      thetaDeg: theta * (180 / Math.PI),
      probabilidadesExactas: { '00': prob00 * 100, '01': prob01 * 100, '10': prob10 * 100, '11': prob11 * 100 },
      counts,
      totalShots: shots,
      estabilidad: Math.round(estabilidad * 10000) / 10000,
    };
  },

  nivelEstabilidad(estabilidad) {
    if (estabilidad >= 70) return { texto: 'ALTA', detalle: 'El material aguanta bien el calor', color: '#4ADE80' };
    if (estabilidad >= 40) return { texto: 'MEDIA', detalle: 'Comportamiento termico moderado', color: '#FBBF24' };
    return { texto: 'BAJA', detalle: 'Alta transferencia energetica', color: '#F87171' };
  },
};
