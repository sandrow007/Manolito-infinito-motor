/* =============================================================================
   BLOQUE 4: MANOLITO INFINITO — IA sevillana multilingüe asíncrona.
   - Detección de conexión a internet (navigator.onLine).
   - Consulta de noticias reales en vivo mediante API pública de Wikipedia (Sin registro).
   - Traducción dinámica mediante API pública de MyMemory (Sin registro) para idiomas no locales.
   - Salero sevillano integrado con rigor técnico.
   ============================================================================= */

const ManolitoChat = {
  ultimoResultado: null,
  historial: [],
  idiomaForzado: null,
  
  // 1) NORMALIZACIÓN Y DISTANCIA
  _normalizar(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?¡!.,;:()"']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  _distancia(a, b) {
    if (Math.abs(a.length - b.length) > 3) return 99;
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

  // 2) DETECCIÓN DE IDIOMA (Heurística extendida)
  IDIOMAS_STOPWORDS: {
    es: ['el','la','los','las','de','que','y','en','un','una','es','por','para','como','cuanto','cual','donde','porque','esto','eso','del','al','con','pero','mas','muy','hola','buenas','gracias'],
    en: ['the','a','an','of','and','in','is','to','for','how','what','why','this','that','with','but','more','very','hello','hi','thanks','please','can','you'],
    fr: ['le','la','les','de','que','et','en','un','une','est','pour','comment','pourquoi','ceci','cela','avec','mais','plus','tres','bonjour','salut','merci'],
    it: ['il','lo','la','i','gli','le','di','che','e','in','un','una','per','come','perche','questo','quello','con','ma','piu','molto','ciao','buongiorno','grazie'],
    pt: ['o','a','os','as','de','que','e','em','um','uma','para','como','porque','isto','isso','com','mas','mais','muito','ola','obrigado'],
    de: ['der','die','das','und','ist','in','ein','eine','fur','wie','warum','dies','das','mit','aber','mehr','sehr','hallo','danke'],
  },

  detectarIdioma(textoNormalizado) {
    const tokens = textoNormalizado.split(' ').filter(Boolean);
    if (tokens.length === 0) return this.idiomaForzado || 'es';
    
    const puntos = { es: 0, en: 0, fr: 0, it: 0, pt: 0, de: 0 };
    for (const tok of tokens) {
      for (const [idioma, lista] of Object.entries(this.IDIOMAS_STOPWORDS)) {
        if (lista.includes(tok)) puntos[idioma] += 1;
      }
    }
    const mejor = Object.entries(puntos).sort((a, b) => b[1] - a[1])[0];
    
    // Si no pilla el idioma, mantenemos el historial o asumimos español para pasarlo al traductor externo
    if (mejor[1] === 0) return this.idiomaForzado || 'es';
    this.idiomaForzado = mejor[0];
    return mejor[0];
  },

  // 3) PALABRAS CLAVE (Incluye noticias e internet)
  KEYWORDS: {
    noticias: {
      es: ['noticias', 'noticia', 'novedades', 'hoy', 'actualidad', 'periodico', 'pasado hoy'],
      en: ['news', 'today', 'current events', 'happened today'],
    },
    saludo: {
      es: ['hola','buenas','saludos','hey','ola','buenos dias','buenas tardes','que tal'],
      en: ['hello','hi','hey','good morning','good afternoon','whats up'],
    },
    k_final: {
      es: ['k final','kfinal','conductividad','constante termica','k_final'],
      en: ['k final','thermal conductivity','conductivity constant'],
    },
    budget: {
      es: ['budget','presupuesto','coste','costo','precio','dinero','euro','cuanto cuesta','cuanto vale'],
      en: ['budget','cost','price','money','how much','expensive'],
    },
    quantum: {
      es: ['quantum','cuantico','qubit','circuito','ry','theta','angulo','cuantica'],
      en: ['quantum','qubit','circuit','theta','angle'],
    },
    estabilidad: {
      es: ['estabilidad','estable','p00','inestable'],
      en: ['stability','stable','unstable'],
    },
    materiales: {
      es: ['materiales','material','asfalto','hormigon','nasa','espacial','lista de materiales'],
      en: ['materials','material','asphalt','concrete','nasa','space grade'],
    },
    detector: {
      es: ['detector','deteccion','automatico','camara','foto','imagen','video'],
      en: ['detector','detection','automatic','camera','photo','image','video'],
    }
  },

  // 4) BASE DE RESPUESTAS (Fuerte identidad técnica y local)
  RESPUESTAS: {
    saludo: {
      es: () => "¡Qué pasa, compadre! Soy Manolito Infinito, tu ingeniero para física térmica, presupuestos y movidas cuánticas. Habla claro y dime qué necesitas.",
      en: () => "Hey there, compadre. I'm Manolito Infinito, your engineer for thermal physics, budgets, and quantum circuits. Tell me what you need directly.",
    },
    k_final: {
      es: (r) => r ? `Illo, el k_final está en ${r.kFinal.toFixed(4)} W/(m·K). Pura conductividad ponderada. Cuanto más alto, más calor te vas a tragar.` : "El k_final es la conductividad térmica ponderada. Tírame un análisis primero y te suelto el número.",
    },
    budget: {
      es: (r) => r ? `La broma sale por ${r.budgetTotal.toFixed(2)} € para ${r.areaM2} m². Las matemáticas no mienten: área × % × coste/m².` : "Sin análisis no hay números. Dale al cálculo y te saco el coste exacto al céntimo.",
    },
    quantum: {
      es: (r) => r && r.quantum ? `Normalizamos tu k_final a theta=${r.quantum.theta.toFixed(4)} rad. Le metemos una puerta RY y CNOT en 2 qubits, y sacamos una estabilidad del ${r.quantum.estabilidad.toFixed(2)}% en |00>. Pura ciencia.` : "Mapeamos el k_final a un ángulo theta, cruzamos una puerta RY con un CNOT en 2 qubits y medimos. Magia ninguna, probabilidad.",
    },
    estabilidad: {
      es: (r) => { if (!r || !r.quantum) return "La estabilidad cuántica dicta si tu mezcla aguanta el calor o se derrite como mantequilla. >70% vamos bien."; const n = QuantumEngine.nivelEstabilidad(r.quantum.estabilidad); return `Estabilidad marcada: ${r.quantum.estabilidad.toFixed(2)}%. Nivel: ${n.texto}. ${n.detalle}`; },
    },
    materiales: {
      es: () => "Tenemos asfalto, hormigón y hasta la fibra de carbono que usa la NASA. No andamos cortos de opciones, tú eliges el veneno.",
    },
    detector: {
      es: (r) => r && r.detectados ? `Lectura del detector: ${Object.entries(r.detectados).map(([m,p]) => `${m} al ${p.toFixed(1)}%`).join(', ')}. Filtrado limpio en HSV.` : "Análisis de píxeles en matriz HSV. Sube la foto y el código se encarga de separar el brillo de la materia.",
    },
    default: {
      es: () => "No te pillo, compadre. Ve al grano: pregúntame por el k_final, el presupuesto, el estado cuántico, el detector o las noticias de hoy.",
    }
  },

  // 5) INTEGRACIÓN EXTERNA (APIs Públicas)
  async _obtenerNoticias() {
    if (!navigator.onLine) {
      return "Illo, estoy sin conexión. Si no me enchufas a internet, no puedo leer el periódico. Mira el teletexto.";
    }
    try {
      // Usamos la API pública de Wikipedia para evitar registros, keys o bloqueos CORS
      const url = "https://es.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts&exintro=1&explaintext=1&titles=Portal:Actualidad";
      const res = await fetch(url);
      const data = await res.json();
      const pages = data.query.pages;
      const extract = pages[Object.keys(pages)[0]].extract;
      
      // Limpiamos y cogemos los dos primeros eventos del día
      const lineas = extract.split('\n').filter(l => l.length > 30 && !l.includes('Actualidad'));
      const resumen = lineas.slice(0, 2).join(' ');
      
      return `Aquí tienes lo que se cuece hoy por ahí fuera: ${resumen}.`;
    } catch (e) {
      return "Compadre, los servidores están caídos o el proxy me está echando. La actualidad tendrá que esperar.";
    }
  },

  async _traducirDinamico(texto, idiomaDestino) {
    if (idiomaDestino === 'es' || !navigator.onLine) return texto;
    try {
      // API de MyMemory: Gratis, 500 peticiones/día, sin registro.
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto)}&langpair=es|${idiomaDestino}`);
      const data = await res.json();
      return data.responseData.translatedText;
    } catch (e) {
      return texto; // Si falla, tiramos de español por orgullo
    }
  },

  // 6) MOTOR DE RESPUESTA ASÍNCRONO
  _detectarIntent(textoNormalizado, idioma) {
    const tokens = textoNormalizado.split(' ').filter(Boolean);

    for (const [intent, porIdioma] of Object.entries(this.KEYWORDS)) {
      const lista = porIdioma[idioma] || porIdioma.es;
      if (lista.some((frase) => textoNormalizado.includes(frase))) return intent;
    }

    let mejorIntent = null, mejorDistancia = 3;
    for (const [intent, porIdioma] of Object.entries(this.KEYWORDS)) {
      const lista = porIdioma[idioma] || porIdioma.es;
      for (const frase of lista) {
        for (const palabraFrase of frase.split(' ')) {
          if (palabraFrase.length < 4) continue;
          for (const tok of tokens) {
            const d = this._distancia(tok, palabraFrase);
            if (d < mejorDistancia) { mejorDistancia = d; mejorIntent = intent; }
          }
        }
      }
    }
    if (mejorIntent && mejorDistancia <= 2) return mejorIntent;

    if (tokens.length <= 3 && this.historial.length > 0) {
      return this.historial[this.historial.length - 1];
    }
    return 'default';
  },

  async responder(mensaje) {
    const textoNorm = this._normalizar(mensaje);
    const idiomaDetectado = this.detectarIdioma(textoNorm);
    const intent = this._detectarIntent(textoNorm, idiomaDetectado);

    if (intent !== 'default' && intent !== 'saludo') {
      this.historial.push(intent);
      if (this.historial.length > 5) this.historial.shift();
    }

    let respuestaBase = "";

    // Lógica especial para red externa (Noticias)
    if (intent === 'noticias') {
      respuestaBase = await this._obtenerNoticias();
    } else {
      // Lógica local estática
      const respuestasIntent = this.RESPUESTAS[intent] || this.RESPUESTAS.default;
      const fn = respuestasIntent['es']; // Siempre operamos la lógica en español primero
      respuestaBase = fn(this.ultimoResultado);
    }

    // Si el idioma detectado no es español, pasamos la respuesta local por el traductor online
    if (idiomaDetectado !== 'es') {
      if (!navigator.onLine) {
        return respuestaBase + " (Estoy sin internet, compadre, no te lo puedo traducir ahora mismo).";
      }
      return await this._traducirDinamico(respuestaBase, idiomaDetectado);
    }

    return respuestaBase;
  },

  actualizarContexto(resultado) {
    this.ultimoResultado = resultado;
  },
};
