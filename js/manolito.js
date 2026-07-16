/* =============================================================================
   BLOQUE 4: MANOLITO INFINITO — IA sevillana multilingue basada en reglas +
   contexto real + deteccion de idioma + coincidencia difusa (typos).
   No inventa datos: responde siempre con los numeros del ultimo analisis.
   100% JS puro, sin API externa, sin conexion a internet.
   ============================================================================= */

const ManolitoChat = {
  ultimoResultado: null,
  historial: [],       // ultimos intents detectados, para dar contexto a preguntas cortas tipo "¿y cuanto?"
  idiomaForzado: null,  // se fija al idioma detectado y se mantiene mientras no haya señal clara de otro

  // -------------------------------------------------------------------------
  // 1) NORMALIZACION Y UTILIDADES DE TEXTO
  // -------------------------------------------------------------------------
  _normalizar(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
      .replace(/[¿?¡!.,;:()"']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  // Distancia de Levenshtein acotada (rapida, para strings cortos de una palabra)
  _distancia(a, b) {
    if (Math.abs(a.length - b.length) > 3) return 99; // corte rapido, no vale la pena calcular
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

  // -------------------------------------------------------------------------
  // 2) DETECCION DE IDIOMA (heuristica por palabras funcionales, sin libreria)
  // -------------------------------------------------------------------------
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
    if (mejor[1] === 0) return this.idiomaForzado || 'es';
    this.idiomaForzado = mejor[0];
    return mejor[0];
  },

  // -------------------------------------------------------------------------
  // 3) PALABRAS CLAVE POR INTENCION Y POR IDIOMA
  // -------------------------------------------------------------------------
  KEYWORDS: {
    saludo: {
      es: ['hola','buenas','saludos','hey','ola','buenos dias','buenas tardes','que tal'],
      en: ['hello','hi','hey','good morning','good afternoon','whats up'],
      fr: ['bonjour','salut','coucou','bonsoir'],
      it: ['ciao','buongiorno','buonasera','salve'],
      pt: ['ola','bom dia','boa tarde','oi'],
      de: ['hallo','guten tag','servus','moin'],
    },
    k_final: {
      es: ['k final','kfinal','conductividad','constante termica','k_final'],
      en: ['k final','thermal conductivity','conductivity constant'],
      fr: ['conductivite thermique','constante thermique'],
      it: ['conducibilita termica','costante termica'],
      pt: ['condutividade termica','constante termica'],
      de: ['warmeleitfahigkeit','thermische konstante'],
    },
    budget: {
      es: ['budget','presupuesto','coste','costo','precio','dinero','euro','cuanto cuesta','cuanto vale'],
      en: ['budget','cost','price','money','how much','expensive'],
      fr: ['budget','cout','prix','argent','combien'],
      it: ['budget','costo','prezzo','soldi','quanto costa'],
      pt: ['orcamento','custo','preco','dinheiro','quanto custa'],
      de: ['budget','kosten','preis','geld','wie viel kostet'],
    },
    quantum: {
      es: ['quantum','cuantico','qubit','circuito','ry','theta','angulo','cuantica'],
      en: ['quantum','qubit','circuit','theta','angle'],
      fr: ['quantique','qubit','circuit','theta','angle'],
      it: ['quantistico','qubit','circuito','theta','angolo'],
      pt: ['quantico','qubit','circuito','theta','angulo'],
      de: ['quanten','qubit','schaltkreis','theta','winkel'],
    },
    estabilidad: {
      es: ['estabilidad','estable','p00','inestable'],
      en: ['stability','stable','unstable'],
      fr: ['stabilite','stable','instable'],
      it: ['stabilita','stabile','instabile'],
      pt: ['estabilidade','estavel','instavel'],
      de: ['stabilitat','stabil','instabil'],
    },
    materiales: {
      es: ['materiales','material','asfalto','hormigon','nasa','espacial','lista de materiales'],
      en: ['materials','material','asphalt','concrete','nasa','space grade'],
      fr: ['materiaux','materiau','asphalte','beton','nasa','spatial'],
      it: ['materiali','materiale','asfalto','calcestruzzo','nasa','spaziale'],
      pt: ['materiais','material','asfalto','concreto','nasa','espacial'],
      de: ['materialien','material','asphalt','beton','nasa','weltraum'],
    },
    detector: {
      es: ['detector','deteccion','automatico','camara','foto','imagen','video'],
      en: ['detector','detection','automatic','camera','photo','image','video'],
      fr: ['detecteur','detection','automatique','camera','photo','image','video'],
      it: ['rilevatore','rilevamento','automatico','fotocamera','foto','immagine','video'],
      pt: ['detector','deteccao','automatico','camera','foto','imagem','video'],
      de: ['detektor','erkennung','automatisch','kamera','foto','bild','video'],
    },
    sol: {
      es: ['sol','brillo','reflejo','sobreexpos','quemado'],
      en: ['sun','sunlight','glare','reflection','overexposed','burnt'],
      fr: ['soleil','eblouissement','reflet','surexpose'],
      it: ['sole','riflesso','sovraesposto','abbagliamento'],
      pt: ['sol','brilho','reflexo','superexposto'],
      de: ['sonne','blendung','reflexion','uberbelichtet'],
    },
    ayuda: {
      es: ['ayuda','help','que puedes','que sabes','que haces'],
      en: ['help','what can you do','what do you know'],
      fr: ['aide','que peux tu faire','que sais tu'],
      it: ['aiuto','cosa puoi fare','cosa sai'],
      pt: ['ajuda','o que voce pode fazer','o que voce sabe'],
      de: ['hilfe','was kannst du tun','was weisst du'],
    },
  },

  // -------------------------------------------------------------------------
  // 4) RESPUESTAS POR IDIOMA (con datos reales del ultimo analisis si existen)
  // -------------------------------------------------------------------------
  RESPUESTAS: {
    saludo: {
      es: () => "¡Buenas y santas, compadre! Soy Manolito Infinito, tu experto en materiales, presupuestos y física cuántica sevillana. Pregunta lo que quieras.",
      en: () => "Hey there! I'm Manolito Infinito — your engineer for materials, budgets and a bit of quantum physics. Ask me anything.",
      fr: () => "Salut, compadre ! Je suis Manolito Infinito, ton expert en matériaux, budgets et physique quantique. Demande-moi ce que tu veux.",
      it: () => "Ciao! Sono Manolito Infinito, il tuo esperto di materiali, budget e fisica quantistica. Chiedimi quello che vuoi.",
      pt: () => "E aí, compadre! Sou o Manolito Infinito, seu especialista em materiais, orçamentos e física quântica. Pergunte o que quiser.",
      de: () => "Hallo! Ich bin Manolito Infinito, dein Experte für Materialien, Budgets und ein bisschen Quantenphysik. Frag mich alles.",
    },
    k_final: {
      es: (r) => r ? `El k_final ahora mismo es ${r.kFinal.toFixed(4)} W/(m·K). Sale de sumar la conductividad de cada material multiplicada por su porcentaje. Cuanto más alto, más calor pasa.` : "El k_final es la conductividad térmica ponderada del mix. Calcula un análisis primero y te doy el número exacto.",
      en: (r) => r ? `The k_final right now is ${r.kFinal.toFixed(4)} W/(m·K). It comes from summing each material's conductivity weighted by its percentage. Higher means more heat passes through.` : "k_final is the weighted thermal conductivity of the mix. Run an analysis first and I'll give you the exact number.",
      fr: (r) => r ? `Le k_final est actuellement de ${r.kFinal.toFixed(4)} W/(m·K). Il vient de la somme des conductivités pondérées par leur pourcentage.` : "Le k_final est la conductivité thermique pondérée du mélange. Lance d'abord un calcul.",
      it: (r) => r ? `Il k_final ora è ${r.kFinal.toFixed(4)} W/(m·K). Deriva dalla somma delle conducibilità pesate per la percentuale.` : "Il k_final è la conducibilità termica ponderata del mix. Esegui prima un calcolo.",
      pt: (r) => r ? `O k_final agora é ${r.kFinal.toFixed(4)} W/(m·K). Vem da soma das condutividades ponderadas pela porcentagem.` : "O k_final é a condutividade térmica ponderada da mistura. Calcule primeiro uma análise.",
      de: (r) => r ? `Der aktuelle k_final beträgt ${r.kFinal.toFixed(4)} W/(m·K). Er ergibt sich aus der Summe der gewichteten Leitfähigkeiten.` : "k_final ist die gewichtete Wärmeleitfähigkeit der Mischung. Führe zuerst eine Analyse durch.",
    },
    budget: {
      es: (r) => r ? `El presupuesto sale en ${r.budgetTotal.toFixed(2)} € para ${r.areaM2} m². Fórmula: área × % de cada material × su coste por m².` : "El presupuesto sale de multiplicar el área por el % de cada material y su coste. Calcula un análisis primero.",
      en: (r) => r ? `The budget comes out at €${r.budgetTotal.toFixed(2)} for ${r.areaM2} m². Formula: area × each material's % × its cost per m².` : "The budget is area × each material's % × cost per m². Run an analysis first.",
      fr: (r) => r ? `Le budget est de ${r.budgetTotal.toFixed(2)} € pour ${r.areaM2} m².` : "Le budget vient de la surface × % de chaque matériau × son coût au m². Lance un calcul d'abord.",
      it: (r) => r ? `Il budget è di ${r.budgetTotal.toFixed(2)} € per ${r.areaM2} m².` : "Il budget deriva dall'area × % di ogni materiale × il suo costo al m². Esegui prima un calcolo.",
      pt: (r) => r ? `O orçamento fica em ${r.budgetTotal.toFixed(2)} € para ${r.areaM2} m².` : "O orçamento vem da área × % de cada material × seu custo por m². Calcule primeiro.",
      de: (r) => r ? `Das Budget beträgt ${r.budgetTotal.toFixed(2)} € für ${r.areaM2} m².` : "Das Budget ergibt sich aus Fläche × Materialanteil × Kosten pro m². Führe zuerst eine Analyse durch.",
    },
    quantum: {
      es: (r) => r && r.quantum ? `Cogimos k_final=${r.kFinal.toFixed(4)}, lo normalizamos a theta=${r.quantum.theta.toFixed(4)} rad, y con una puerta RY + CNOT en 2 qubits sale una estabilidad |00> del ${r.quantum.estabilidad.toFixed(2)}%.` : "Normalizamos el k_final a un ángulo theta, aplicamos una puerta RY y un CNOT en un circuito de 2 qubits, y medimos la probabilidad de |00>.",
      en: (r) => r && r.quantum ? `We took k_final=${r.kFinal.toFixed(4)}, normalized it to theta=${r.quantum.theta.toFixed(4)} rad, and with an RY gate + CNOT on 2 qubits we get a |00> stability of ${r.quantum.estabilidad.toFixed(2)}%.` : "We normalize k_final into an angle theta, apply an RY gate and a CNOT on a 2-qubit circuit, then measure the |00> probability.",
      fr: (r) => r && r.quantum ? `theta=${r.quantum.theta.toFixed(4)} rad, stabilité |00>=${r.quantum.estabilidad.toFixed(2)}%.` : "On normalise k_final en un angle theta, on applique une porte RY et un CNOT, puis on mesure |00>.",
      it: (r) => r && r.quantum ? `theta=${r.quantum.theta.toFixed(4)} rad, stabilità |00>=${r.quantum.estabilidad.toFixed(2)}%.` : "Normalizziamo k_final in un angolo theta, applichiamo una porta RY e un CNOT, poi misuriamo |00>.",
      pt: (r) => r && r.quantum ? `theta=${r.quantum.theta.toFixed(4)} rad, estabilidade |00>=${r.quantum.estabilidad.toFixed(2)}%.` : "Normalizamos o k_final em um ângulo theta, aplicamos uma porta RY e um CNOT, depois medimos |00>.",
      de: (r) => r && r.quantum ? `theta=${r.quantum.theta.toFixed(4)} rad, Stabilität |00>=${r.quantum.estabilidad.toFixed(2)}%.` : "Wir normalisieren k_final zu einem Winkel theta, wenden ein RY-Gatter und ein CNOT an und messen dann |00>.",
    },
    estabilidad: {
      es: (r) => { if (!r || !r.quantum) return "La estabilidad mide cuánto aguanta el mix térmicamente: alta >70% aguanta bien, media 40-70% moderado, baja <40% transfiere mucho calor."; const n = QuantumEngine.nivelEstabilidad(r.quantum.estabilidad); return `Estabilidad actual: ${r.quantum.estabilidad.toFixed(2)}% — nivel ${n.texto}. ${n.detalle}.`; },
      en: (r) => { if (!r || !r.quantum) return "Stability shows how well the mix holds up thermally: high >70% holds well, medium 40-70% moderate, low <40% transfers a lot of heat."; const n = QuantumEngine.nivelEstabilidad(r.quantum.estabilidad); return `Current stability: ${r.quantum.estabilidad.toFixed(2)}% — level ${n.texto}.`; },
      fr: (r) => r && r.quantum ? `Stabilité actuelle : ${r.quantum.estabilidad.toFixed(2)}%.` : "La stabilité mesure la résistance thermique du mélange.",
      it: (r) => r && r.quantum ? `Stabilità attuale: ${r.quantum.estabilidad.toFixed(2)}%.` : "La stabilità misura quanto regge termicamente il mix.",
      pt: (r) => r && r.quantum ? `Estabilidade atual: ${r.quantum.estabilidad.toFixed(2)}%.` : "A estabilidade mede o quanto a mistura aguenta termicamente.",
      de: (r) => r && r.quantum ? `Aktuelle Stabilität: ${r.quantum.estabilidad.toFixed(2)}%.` : "Die Stabilität zeigt, wie gut die Mischung thermisch standhält.",
    },
    materiales: {
      es: () => "Tengo materiales de construcción, ingeniería civil, aeronáutica y hasta espaciales de la NASA. Desde el asfalto hasta el carbono-carbono de los transbordadores.",
      en: () => "I've got construction materials, civil engineering, aerospace, and even NASA space-grade materials. From asphalt to carbon-carbon.",
      fr: () => "J'ai des matériaux de construction, de génie civil, aérospatiaux et même des matériaux spatiaux de la NASA.",
      it: () => "Ho materiali da costruzione, ingegneria civile, aerospaziale e persino materiali spaziali della NASA.",
      pt: () => "Tenho materiais de construção, engenharia civil, aeroespacial e até materiais espaciais da NASA.",
      de: () => "Ich habe Baumaterialien, Bauingenieurwesen, Luft- und Raumfahrt sowie sogar NASA-Weltraummaterialien.",
    },
    detector: {
      es: (r) => r && r.detectados ? `El detector encontró: ${Object.entries(r.detectados).map(([m,p]) => `${m}:${p.toFixed(1)}%`).join(', ')}. Analiza el color en HSV pixel a pixel.` : "El detector analiza la imagen o vídeo pixel a pixel en HSV y estima qué materiales hay. Sube un archivo y actívalo.",
      en: (r) => r && r.detectados ? `The detector found: ${Object.entries(r.detectados).map(([m,p]) => `${m}:${p.toFixed(1)}%`).join(', ')}.` : "The detector analyzes the image/video pixel by pixel in HSV to estimate materials. Upload a file and enable it.",
      fr: () => "Le détecteur analyse l'image ou la vidéo pixel par pixel en HSV pour estimer les matériaux.",
      it: () => "Il rilevatore analizza l'immagine o il video pixel per pixel in HSV per stimare i materiali.",
      pt: () => "O detector analisa a imagem ou vídeo pixel a pixel em HSV para estimar os materiais.",
      de: () => "Der Detektor analysiert Bild oder Video Pixel für Pixel in HSV, um Materialien zu schätzen.",
    },
    sol: {
      es: () => "Ojo con eso, que es el fallo clásico: un reflejo de sol muy quemado (blanco, sin apenas color) se parecía al aluminio brillante. Metimos un filtro: brillo >96% y saturación <8% se descarta como reflejo, no como metal.",
      en: () => "That's the classic bug: an overexposed sunlight reflection (white, barely any color) looked like shiny aluminum. We added a filter: brightness >96% and saturation <8% gets discarded as glare, not metal.",
      fr: () => "C'est le bug classique : un reflet de soleil surexposé ressemblait à de l'aluminium brillant. On a ajouté un filtre pour l'écarter.",
      it: () => "È il bug classico: un riflesso di sole sovraesposto sembrava alluminio lucido. Abbiamo aggiunto un filtro per scartarlo.",
      pt: () => "É o erro clássico: um reflexo de sol superexposto parecia alumínio brilhante. Adicionamos um filtro para descartar isso.",
      de: () => "Das ist der klassische Fehler: eine überbelichtete Sonnenreflexion sah aus wie glänzendes Aluminium. Wir haben einen Filter hinzugefügt, um das zu vermeiden.",
    },
    ayuda: {
      es: () => "Puedo explicarte: k_final, presupuesto, lo cuántico, la estabilidad, los materiales, el detector automático o el filtro anti-sol. ¡Pregunta lo que quieras!",
      en: () => "I can explain: k_final, budget, the quantum part, stability, materials, the auto-detector, or the anti-glare filter. Ask away!",
      fr: () => "Je peux expliquer : k_final, budget, la partie quantique, la stabilité, les matériaux, le détecteur automatique ou le filtre anti-reflet.",
      it: () => "Posso spiegare: k_final, budget, la parte quantistica, la stabilità, i materiali, il rilevatore automatico o il filtro anti-riflesso.",
      pt: () => "Posso explicar: k_final, orçamento, a parte quântica, estabilidade, materiais, o detector automático ou o filtro anti-reflexo.",
      de: () => "Ich kann erklären: k_final, Budget, den Quantenteil, Stabilität, Materialien, den Auto-Detektor oder den Blendschutzfilter.",
    },
    default: {
      es: () => "Mmm, no pillo del too lo que preguntas, compadre. Prueba con: k_final, presupuesto, cuántico, estabilidad, materiales, detector o el filtro del sol.",
      en: () => "Hmm, I didn't quite catch that. Try asking about: k_final, budget, quantum, stability, materials, the detector, or the anti-glare filter.",
      fr: () => "Je n'ai pas bien compris. Essaie : k_final, budget, quantique, stabilité, matériaux, détecteur ou filtre anti-reflet.",
      it: () => "Non ho capito bene. Prova con: k_final, budget, quantistico, stabilità, materiali, rilevatore o filtro anti-riflesso.",
      pt: () => "Não entendi bem. Tente perguntar sobre: k_final, orçamento, quântico, estabilidade, materiais, detector ou filtro anti-reflexo.",
      de: () => "Das habe ich nicht ganz verstanden. Frag nach: k_final, Budget, Quanten, Stabilität, Materialien, Detektor oder Blendschutzfilter.",
    },
  },

  // -------------------------------------------------------------------------
  // 5) MOTOR DE RESPUESTA: idioma + coincidencia exacta + coincidencia difusa
  //    (tolera pequeñas erratas, ej. "presupesto" -> "presupuesto")
  // -------------------------------------------------------------------------
  _detectarIntent(textoNormalizado, idioma) {
    const tokens = textoNormalizado.split(' ').filter(Boolean);

    // 1) Coincidencia exacta por substring (rapida y precisa)
    for (const [intent, porIdioma] of Object.entries(this.KEYWORDS)) {
      const lista = porIdioma[idioma] || porIdioma.es;
      if (lista.some((frase) => textoNormalizado.includes(frase))) {
        return intent;
      }
    }

    // 2) Fallback: coincidencia difusa palabra a palabra (typos, distancia <=2)
    let mejorIntent = null, mejorDistancia = 3;
    for (const [intent, porIdioma] of Object.entries(this.KEYWORDS)) {
      const lista = porIdioma[idioma] || porIdioma.es;
      for (const frase of lista) {
        for (const palabraFrase of frase.split(' ')) {
          if (palabraFrase.length < 4) continue; // evitar falsos positivos en palabras cortas
          for (const tok of tokens) {
            const d = this._distancia(tok, palabraFrase);
            if (d < mejorDistancia) { mejorDistancia = d; mejorIntent = intent; }
          }
        }
      }
    }
    if (mejorIntent && mejorDistancia <= 2) return mejorIntent;

    // 3) Sin match: si el mensaje es muy corto ("¿y cuanto?", "and how much?"),
    //    asumimos que es un seguimiento del ultimo tema hablado
    if (tokens.length <= 3 && this.historial.length > 0) {
      return this.historial[this.historial.length - 1];
    }

    return 'default';
  },

  responder(mensaje) {
    const textoNorm = this._normalizar(mensaje);
    const idioma = this.detectarIdioma(textoNorm);
    const intent = this._detectarIntent(textoNorm, idioma);

    if (intent !== 'default' && intent !== 'saludo') {
      this.historial.push(intent);
      if (this.historial.length > 5) this.historial.shift();
    }

    const respuestasIntent = this.RESPUESTAS[intent] || this.RESPUESTAS.default;
    const fn = respuestasIntent[idioma] || respuestasIntent.es;
    return fn(this.ultimoResultado);
  },

  actualizarContexto(resultado) {
    this.ultimoResultado = resultado;
  },
};
