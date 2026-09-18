/* =============================================================================
   MANOLITO INFINITO v3.1 — IA sevillana con cerebro completo
   Motor 100% local: sin APIs externas, sin claves, sin promesas falsas.
   Responde sobre lo que esta herramienta hace de verdad: conductividad,
   presupuesto, materiales, detector de imagen y la parte cuántica.
   Trabaja en español y en inglés. Saluda en seis idiomas.
   ============================================================================= */

const ManolitoChat = {
  // ============================================================
  // CONFIGURACIÓN Y ESTADO
  // ============================================================
  ultimoResultado: null,
  historial: [],
  idiomaForzado: null,
  historialIA: [],

  // ============================================================
  // 1) NORMALIZACIÓN Y DISTANCIA
  // ============================================================
  _normalizar(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[¿?¡!.,:;"'‘’“”]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  _escapeHTML(texto) {
    return String(texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  _distancia(a, b) {
    if (Math.abs(a.length - b.length) > 4) return 99;
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  },

  // ============================================================
  // 2) DETECCIÓN DE IDIOMA
  // ============================================================
  IDIOMAS_STOPWORDS: {
    es: ['el','la','los','las','de','que','y','en','un','una','es','por','para','como','cuanto','cual','donde','porque','esto','eso','del','al','con','pero','mas','muy','hola','buenas','gracias','illo','compadre','tio'],
    en: ['the','a','an','of','and','in','is','to','for','how','what','why','this','that','with','but','more','very','hello','hi','thanks','please','can','you'],
    fr: ['le','la','les','de','que','et','en','un','une','est','pour','comment','pourquoi','ceci','cela','avec','mais','plus','tres','bonjour','salut','merci'],
    it: ['il','lo','la','i','gli','le','di','che','e','in','un','una','per','come','perche','questo','quello','con','ma','piu','molto','ciao','buongiorno','grazie'],
    pt: ['o','a','os','as','de','que','e','em','um','uma','para','como','porque','isto','isso','com','mas','mais','muito','ola','obrigado'],
    de: ['der','die','das','und','ist','in','ein','eine','fur','wie','warum','dies','mit','aber','mehr','sehr','hallo','danke'],
    ja: ['です','ます','した','して','こと','これ','それ','あれ','はい','いいえ'],
    ko: ['입니다','합니다','있습니다','그리고','이것','저것','네','아니요'],
    zh: ['的','是','在','了','有','我','你','他','她','这','那','吗','不'],
  },

  detectarIdioma(textoNormalizado) {
    const tokens = textoNormalizado.split(' ').filter(Boolean);
    if (tokens.length === 0) return this.idiomaForzado || 'es';

    const tieneChino = /[一-鿿]/.test(textoNormalizado);
    const tieneJapones = /[぀-ヿ]/.test(textoNormalizado);
    const tieneCoreano = /[가-힯]/.test(textoNormalizado);

    if (tieneCoreano) return 'ko';
    if (tieneJapones) return 'ja';
    if (tieneChino) return 'zh';

    const puntos = { es: 0, en: 0, fr: 0, it: 0, pt: 0, de: 0 };
    for (const tok of tokens) {
      for (const [idioma, lista] of Object.entries(this.IDIOMAS_STOPWORDS)) {
        if (idioma === 'ja' || idioma === 'ko' || idioma === 'zh') continue;
        if (lista.includes(tok)) puntos[idioma] += 1;
      }
    }
    const mejor = Object.entries(puntos).sort((a, b) => b[1] - a[1])[0];

    if (mejor[1] === 0) return this.idiomaForzado || 'es';
    this.idiomaForzado = mejor[0];
    return mejor[0];
  },

  // ============================================================
  // 3) PALABRAS CLAVE
  // ============================================================
  KEYWORDS: {
    saludo: {
      es: ['hola','buenas','saludos','hey','ola','buenos dias','buenas tardes','que tal','que pasa'],
      en: ['hello','hi','hey','good morning','good afternoon','whats up'],
    },
    k_final: {
      es: ['k final','kfinal','conductividad','constante termica','k_final','termica','calor transmitido'],
      en: ['k final','thermal conductivity','conductivity constant','conductivity'],
    },
    budget: {
      es: ['budget','presupuesto','coste','costo','precio','dinero','euro','cuanto cuesta','cuanto vale'],
      en: ['budget','cost','price','money','how much','expensive'],
    },
    quantum: {
      es: ['quantum','cuantico','cuantica','qubit','circuito','ry','theta','angulo','cnot'],
      en: ['quantum','qubit','circuit','theta','angle','cnot'],
    },
    estabilidad: {
      es: ['estabilidad','estable','p00','inestable','aguanta'],
      en: ['stability','stable','unstable'],
    },
    materiales: {
      es: ['materiales','material','asfalto','hormigon','nasa','espacial','lista de materiales','cuantos materiales'],
      en: ['materials','material','asphalt','concrete','nasa','space grade','material list'],
    },
    detector: {
      es: ['detector','deteccion','automatico','camara','foto','imagen','video','subir'],
      en: ['detector','detection','automatic','camera','photo','image','video','upload'],
    },
    exportar: {
      es: ['exportar','descargar','json','csv','pdf','reporte','informe'],
      en: ['export','download','json','csv','pdf','report'],
    },
    quien_eres: {
      es: ['quien eres','como te llamas','que eres','cual es tu nombre','presentate'],
      en: ['who are you','what are you','your name','introduce yourself'],
    },
    ayuda: {
      es: ['ayuda','help','que puedes hacer','que sabes hacer','comandos'],
      en: ['help','what can you do','commands','capabilities'],
    },
  },

  // ============================================================
  // 4) RESPUESTAS
  // ============================================================
  RESPUESTAS: {
    saludo: {
      es: () => "¡Qué pasa, compadre! Soy Manolito Infinito, la voz de este motor térmico. Pregúntame por la conductividad, el presupuesto o la parte cuántica.",
      en: () => "Hey there. I am Manolito Infinito, the voice of this thermal engine. Ask me about conductivity, budget or the quantum part.",
      fr: () => "Salut. Je suis Manolito Infinito. Pose moi une question sur la conductivité, le budget ou la partie quantique.",
      it: () => "Ciao. Sono Manolito Infinito. Chiedimi pure di conducibilità, budget o della parte quantistica.",
      pt: () => "Olá. Sou o Manolito Infinito. Pergunta me sobre condutividade, orçamento ou a parte quântica.",
      de: () => "Hallo. Ich bin Manolito Infinito. Frag mich zur Wärmeleitfähigkeit, zum Budget oder zum Quantenteil.",
    },
    quien_eres: {
      es: () => "Soy Manolito Infinito, una IA casera con acento sevillano. No busco en internet ni llamo a ningún servidor. Todo lo que sé de este motor térmico y cuántico lo llevo puesto encima, y te lo cuento sin moverme de tu navegador.",
      en: () => "I am Manolito Infinito, a homemade AI with a Seville accent. I do not search the internet and I do not call any server. Everything I know about this thermal and quantum engine is built into me, and I tell you without leaving your browser.",
    },
    ayuda: {
      es: () => "Te cuento lo que sé hacer. Explicarte el k_final de tu mezcla, decirte cómo va el presupuesto, contarte qué mide la estabilidad cuántica, listarte los materiales disponibles, explicarte cómo subir una foto para el detector y recordarte que puedes exportar el resultado en JSON, CSV o PDF. ¿Por dónde empezamos?",
      en: () => "Here is what I can do. Explain the k_final of your mix, walk you through the budget, tell you what the quantum stability measures, list the available materials, explain how to upload a photo for the detector and remind you that the result can be exported as JSON, CSV or PDF. Where do we start?",
    },
    k_final: {
      es: (r) => {
        if (!r) return "El k_final es la conductividad térmica ponderada de tu mezcla. Cada material aporta su k multiplicada por su porcentaje. Cuanto más bajo, mejor aísla. Cuanto más alto, más calor deja pasar. Pulsa Calcular y te lo digo de tu mezcla concreta.";
        const nivel = r.kFinal < 0.5 ? "Eso aísla muy bien, casi como un material de obra seria." :
                      r.kFinal < 2 ? "Está en la zona de los materiales de construcción habituales." :
                      r.kFinal < 50 ? "Ya conduce bastante calor. El asfalto de agosto se siente orgulloso." :
                      "Eso es prácticamente un radiador. Hay mucho metal en tu mezcla.";
        return `Tu mezcla tiene un k_final de ${r.kFinal.toFixed(4)} W/(m·K). ${nivel}`;
      },
      en: (r) => {
        if (!r) return "k_final is the weighted thermal conductivity of your mix. Each material adds its k multiplied by its percentage. Lower means better insulation. Press Calculate and I will tell you about your actual mix.";
        return `Your mix has a k_final of ${r.kFinal.toFixed(4)} W/(m·K).`;
      },
    },
    budget: {
      es: (r) => r
        ? `El presupuesto de tu mezcla sale a ${r.budgetTotal.toFixed(2)} euros para ${r.areaM2} m². Cada material cobra su precio por metro cuadrado según el porcentaje que le hayas dado.`
        : "El presupuesto suma el precio por metro cuadrado de cada material según su porcentaje en la mezcla. Pulsa Calcular y te canto la cifra de tu mezcla.",
      en: (r) => r
        ? `The budget for your mix comes out at ${r.budgetTotal.toFixed(2)} euros for ${r.areaM2} m².`
        : "The budget adds the price per square meter of each material weighted by its share of the mix. Press Calculate and I will give you the figure.",
    },
    quantum: {
      es: () => "La parte cuántica convierte tu k_final en un ángulo theta y lo mete en un circuito de 2 qubits, primero una puerta RY y luego un CNOT. La probabilidad de medir el estado |00> es lo que llamamos estabilidad. Es una simulación matemática exacta hecha en tu navegador, no hay hardware cuántico real detrás. Te lo dice el panel y te lo digo yo, para que nadie se confunda.",
      en: () => "The quantum part turns your k_final into a theta angle and feeds it into a 2 qubit circuit, first an RY gate and then a CNOT. The probability of measuring the |00> state is what we call stability. It is an exact mathematical simulation running in your browser, no real quantum hardware involved.",
    },
    estabilidad: {
      es: (r) => r && r.quantum
        ? `Tu mezcla tiene una estabilidad del ${(r.quantum.estabilidadExacta ?? r.quantum.estabilidad).toFixed(2)}%. Cuanto más alto, menos energía transmite la mezcla en términos del circuito. Mira las barras del circuito para ver cómo se reparte la probabilidad.`
        : "La estabilidad es la probabilidad de que el circuito mida el estado |00>. Cuanto más alta, más tranquila térmicamente es tu mezcla. Calcula primero y te digo la tuya.",
      en: (r) => r && r.quantum
        ? `Your mix has a stability of ${(r.quantum.estabilidadExacta ?? r.quantum.estabilidad).toFixed(2)}%.`
        : "Stability is the probability of the circuit measuring the |00> state. Calculate first and I will tell you yours.",
    },
    materiales: {
      es: () => "Tienes 60 materiales ordenados por familias. Urbano y construcción, metales de ingeniería, vidrios y polímeros, aeroespacial de la NASA, aislantes eco, suelos naturales y líquidos de referencia. Las seis tarjetas de arriba son el mix rápido. La tabla completa está en el desplegable de materiales avanzados.",
      en: () => "You have 60 materials sorted by family. Urban and construction, engineering metals, glass and polymers, NASA aerospace, eco insulation, natural soils and reference liquids. The six cards on top are the quick mix. The full table lives in the advanced materials dropdown.",
    },
    detector: {
      es: () => "El detector mira el color de cada píxel de tu foto en el espacio HSV y lo compara con los rangos típicos de cada material. El truco del filtro anti-sol es sencillo. Si un píxel está quemado de brillo y casi sin color, se descarta como reflejo en vez de contarlo como aluminio. Es una estimación honesta, no una medición certificada. Revisa siempre el resultado antes de calcular.",
      en: () => "The detector looks at each pixel color in HSV space and compares it against typical ranges per material. The anti-glare trick is simple. A pixel that is overbright and nearly colorless gets discarded as glare instead of being counted as aluminum. It is an honest estimate, not a certified measurement. Always review the result before calculating.",
    },
    exportar: {
      es: () => "Cuando tengas un resultado, abajo aparecen tres botones. JSON para reutilizar los datos, CSV para la hoja de cálculo y PDF para un informe imprimible. Todo se genera en tu navegador y se descarga directo, sin pasar por ningún servidor.",
      en: () => "Once you have a result, three buttons appear below. JSON to reuse the data, CSV for your spreadsheet and PDF for a printable report. Everything is generated in your browser and downloaded directly, no server in between.",
    },
    fallback: {
      es: () => "Eso se me escapa, compadre. Soy un motor térmico con acento, no un periódico ni un buscador. Pregúntame por la conductividad, el presupuesto, la estabilidad cuántica, los materiales o el detector de fotos, que de eso sí sé.",
      en: () => "That one escapes me. I am a thermal engine with an accent, not a newspaper or a search engine. Ask me about conductivity, budget, quantum stability, materials or the photo detector, those I do know.",
    },
  },

  // ============================================================
  // 5) MÉTODOS PRINCIPALES
  // ============================================================

  /** Guarda el último cálculo para que las respuestas hablen de datos reales */
  actualizarContexto(resultado) {
    this.ultimoResultado = resultado || null;
    return this.ultimoResultado;
  },

  /** Busca el intent de la pregunta comparando con las palabras clave */
  _detectarIntent(norm) {
    let mejorIntent = null;
    let mejorPuntos = 0;
    for (const [intent, porIdioma] of Object.entries(this.KEYWORDS)) {
      const listas = Object.values(porIdioma).flat();
      for (const clave of listas) {
        const claveNorm = this._normalizar(clave);
        if (!claveNorm) continue;
        if (norm.includes(claveNorm)) {
          const puntos = claveNorm.split(' ').length;
          if (puntos > mejorPuntos) { mejorPuntos = puntos; mejorIntent = intent; }
        }
      }
    }
    return mejorIntent;
  },

  /**
   * Responde siempre. Devuelve HTML seguro (texto escapado + saltos de línea).
   * 100% local, sin fetch, sin APIs, sin promesas que no pueda cumplir.
   */
  async responder(mensaje) {
    const norm = this._normalizar(mensaje || '');
    this.historial.push({ quien: 'user', texto: mensaje, cuando: new Date().toISOString() });

    if (!norm) {
      return this._escapeHTML(this.RESPUESTAS.fallback.es());
    }

    const idioma = this.detectarIdioma(norm);
    const intent = this._detectarIntent(norm) || 'fallback';
    const pack = this.RESPUESTAS[intent] || this.RESPUESTAS.fallback;

    // Idioma de trabajo: español e inglés completos. Otros idiomas reciben
    // saludo en su lengua y continuación en inglés, sin fingir lo contrario.
    let fn = pack[idioma] || pack.en || pack.es;
    let texto = fn(this.ultimoResultado);

    if (idioma !== 'es' && idioma !== 'en' && intent !== 'saludo' && intent !== 'quien_eres') {
      const avisos = {
        fr: "Je réponds en détail en anglais ou en espagnol.",
        it: "Rispondo nel dettaglio in inglese o in spagnolo.",
        pt: "Respondo em detalhe em inglês ou espanhol.",
        de: "Ich antworte ausführlich auf Englisch oder Spanisch.",
        ja: "詳しい回答は英語またはスペイン語になります。",
        ko: "자세한 답변은 영어 또는 스페인어로 드립니다.",
        zh: "详细回答使用英语或西班牙语。",
      };
      texto = (avisos[idioma] ? avisos[idioma] + ' ' : '') + texto;
    }

    this.historial.push({ quien: 'manolito', texto, cuando: new Date().toISOString() });
    return this._escapeHTML(texto).replace(/\n/g, '<br>');
  },

  // ============================================================
  // 6) INICIALIZACIÓN
  // ============================================================
  init() {
    return this;
  }
};

// Auto-inyección
ManolitoChat.init();
