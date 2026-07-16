/* =============================================================================
   BLOQUE 4: MANOLITO INFINITO — IA sevillana basada en reglas + contexto real.
   No inventa datos: responde siempre con los numeros del ultimo analisis.
   ============================================================================= */

const ManolitoChat = {
  ultimoResultado: null,

  KEYWORDS: {
    saludo: ['hola', 'buenas', 'saludos', 'hey', 'ola', 'buenos'],
    k_final: ['k_final', 'kfinal', 'conductividad', 'k final', 'constante'],
    budget: ['budget', 'presupuesto', 'coste', 'costo', 'precio', 'dinero', 'euro'],
    quantum: ['quantum', 'cuantico', 'qubit', 'circuito', 'ry', 'theta', 'angulo'],
    estabilidad: ['estabilidad', 'estable', 'p00', '00'],
    materiales: ['materiales', 'material', 'asfalto', 'hormigon', 'nasa', 'espacial'],
    detector: ['detector', 'deteccion', 'automatico', 'camara', 'foto', 'imagen'],
    sol: ['sol', 'brillo', 'reflejo', 'sobreexpos', 'quemado'],
    ayuda: ['ayuda', 'help', 'que puedes', 'que sabes'],
  },

  RESPUESTAS: {
    saludo: () => "Buenas y santas, compadre! Soy Manolito Infinito, tu experto en materiales y cuantica sevillana. Pregunta sin miedo, que aqui estamos pa ayudar.",
    k_final: (r) => r
      ? `El k_final ahora mismo es ${r.kFinal.toFixed(4)} W/(m·K). Sale de sumar la conductividad de cada material multiplicada por su porcentaje en el mix. Cuanto mas alto, mas calor pasa por ahi.`
      : "El k_final es la conductividad termica ponderada del mix: k_final = suma de (k_i * pct_i / 100). Todavia no has calculado nada, dale al boton cuando quieras.",
    budget: (r) => r
      ? `El presupuesto de este analisis sale en ${r.budgetTotal.toFixed(2)} EUR, para ${r.areaM2} m². Formula: Budget = suma de (area * pct_i/100 * costo_m2_i). Ni trampa ni carton.`
      : "El presupuesto sale de multiplicar el area por el porcentaje de cada material y su coste por m². Calcula un analisis y te doy la cifra exacta.",
    quantum: (r) => r && r.quantum
      ? `Cogimos el k_final = ${r.kFinal.toFixed(4)}, lo normalizamos a theta = ${r.quantum.theta.toFixed(4)} rad, y se lo metimos a una puerta RY en un circuito de 2 qubits con CNOT. Estabilidad |00> = ${r.quantum.estabilidad.toFixed(2)}%.`
      : "Lo cuantico va asi: normalizamos el k_final a un angulo theta entre 0 y pi, aplicamos una puerta RY sobre el primer qubit, un CNOT al segundo, y medimos. La estabilidad es la probabilidad de que salga |00>.",
    estabilidad: (r) => {
      if (!r || !r.quantum) return "La estabilidad cuantica mide cuanto aguanta el mix termicamente. Alta (>70%): aguanta bien. Media (40-70%): moderado. Baja (<40%): transfiere mucho calor.";
      const nivel = QuantumEngine.nivelEstabilidad(r.quantum.estabilidad);
      return `Estabilidad actual: ${r.quantum.estabilidad.toFixed(2)}% — nivel ${nivel.texto}. ${nivel.detalle}.`;
    },
    materiales: () => "Tengo en la base de datos materiales de construccion, ingenieria civil, aeronautica y hasta espaciales de la NASA. Desde el asfalto hasta el carbon-carbon de los transbordadores. Que no falte nada.",
    detector: (r) => r && r.detectados
      ? `El detector encontro esto: ${Object.entries(r.detectados).map(([m, p]) => `${m}:${p.toFixed(1)}%`).join(', ')}. Analiza el color de cada pixel en HSV y lo compara contra los rangos tipicos de cada material.`
      : "El detector automatico analiza la imagen o video pixel a pixel, convierte el color a HSV y estima que materiales hay. Sube una foto o video y activa la deteccion.",
    sol: () => "Ojo con eso, que es el fallo clasico: un reflejo de sol muy quemado (blanco puro, casi sin color) se parecia al aluminio brillante. Por eso metimos un filtro: si un pixel tiene brillo mayor al 96% y saturacion menor al 6%, lo descartamos como reflejo antes de clasificarlo. Asi el sol ya no cuenta como metal.",
    ayuda: () => "Puedo explicarte: k_final, budget, lo cuantico, la estabilidad, los materiales, el detector automatico o el filtro anti-sol. Pregunta lo que quieras!",
    default: () => "Mmm no pillo del too lo que preguntas, compadre. Prueba con: k_final, budget, cuantico, estabilidad, materiales, detector o el filtro del sol.",
  },

  responder(mensaje) {
    const texto = mensaje.toLowerCase();
    for (const [categoria, palabras] of Object.entries(this.KEYWORDS)) {
      if (palabras.some((p) => texto.includes(p))) {
        return this.RESPUESTAS[categoria](this.ultimoResultado);
      }
    }
    return this.RESPUESTAS.default();
  },

  actualizarContexto(resultado) {
    this.ultimoResultado = resultado;
  },
};
