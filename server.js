/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║           NEURAL AI VISUALIZER - Backend Server           ║
 * ║   Node.js + Express + OpenAI GPT-4o-mini Integration     ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Recibe un prompt del frontend, lo procesa con IA,
 * extrae palabras clave y construye un grafo de nodos+edges.
 */

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares ────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Stopwords (palabras vacías que NO se convierten en nodos) ──
const STOPWORDS = new Set([
  'el','la','los','las','un','una','unos','unas','de','del','al','a','en',
  'que','y','o','por','para','con','sin','sobre','entre','hacia','desde',
  'hasta','como','pero','si','no','es','son','ser','estar','tiene','han',
  'the','a','an','of','in','to','and','or','for','with','on','at','from',
  'is','are','was','were','be','been','have','has','had','do','does','did',
  'will','would','could','should','may','might','can','this','that','these',
  'those','it','its','as','by','not','but','all','their','there','they',
  'we','you','he','she','my','your','our','i','am','what','how','when','where',
]);

// ─── Palabras clave de stopwords adicionales para el contexto IA ──
const AI_BOOST_WORDS = new Set([
  'inteligencia','artificial','neural','machine','learning','deep','red',
  'neurona','algoritmo','datos','modelo','entrenamiento','predicción',
  'procesamiento','lenguaje','natural','transformador','vector','embedding',
  'optimización','gradiente','función','activación','capa','peso','sesgo',
  'generativo','discriminativo','clasificación','regresión','clustering',
]);

/**
 * Extrae palabras clave de un texto.
 * Filtra stopwords y retorna las N más relevantes.
 *
 * @param {string} text   - Texto de entrada
 * @param {number} maxKw  - Cantidad máxima de keywords
 * @returns {string[]}    - Array de keywords limpias
 */
function extractKeywords(text, maxKw = 20) {
  // Tokenizar: a-z, tildes, etc.
  const tokens = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')     // quitar tildes para comparar
    .split(/[^a-záéíóúüñ]+/i)
    .filter(w => w.length > 3 && !STOPWORDS.has(w));

  // Contar frecuencia
  const freq = {};
  tokens.forEach(w => { freq[w] = (freq[w] || 0) + 1; });

  // Dar bonus a términos de IA
  Object.keys(freq).forEach(w => {
    if (AI_BOOST_WORDS.has(w)) freq[w] *= 2;
  });

  // Ordenar por frecuencia descendente y tomar top N
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKw)
    .map(([word]) => word);
}

/**
 * Construye un grafo (nodes + edges) a partir de una lista de keywords.
 * La similitud se basa en:
 *   1. Orden secuencial (palabras consecutivas comparten un edge)
 *   2. Substrings compartidos ≥ 4 caracteres (similitud léxica)
 *
 * @param {string[]} keywords
 * @returns {{ nodes: object[], edges: object[] }}
 */
function buildGraph(keywords) {
  const nodes = keywords.map((word, i) => ({
    id     : i,
    label  : word,
    weight : Math.random() * 0.5 + 0.5,  // tamaño relativo del nodo (0.5–1.0)
    group  : Math.floor(Math.random() * 5), // grupo de color (0–4)
  }));

  const edges = [];
  const edgeSet = new Set();

  const addEdge = (a, b, strength) => {
    const key = `${Math.min(a,b)}-${Math.max(a,b)}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({ source: a, target: b, strength });
    }
  };

  // 1. Conexiones secuenciales (grafo camino principal)
  for (let i = 0; i < nodes.length - 1; i++) {
    addEdge(i, i + 1, 0.9);
  }

  // 2. Conexiones por similitud léxica
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 2; j < nodes.length; j++) {
      const a = nodes[i].label;
      const b = nodes[j].label;

      // Buscar substring común de 4+ letras
      let shared = false;
      for (let len = 4; len <= Math.min(a.length, b.length); len++) {
        for (let s = 0; s <= a.length - len; s++) {
          if (b.includes(a.substring(s, s + len))) { shared = true; break; }
        }
        if (shared) break;
      }

      if (shared) addEdge(i, j, 0.5);

      // Conexiones aleatorias para densidad visual (20 % de probabilidad)
      if (!shared && Math.random() < 0.20) {
        addEdge(i, j, 0.2);
      }
    }
  }

  return { nodes, edges };
}

// ─── Función de generación simulada (sin API key) ───────────
function generateSimulated(prompt) {
  const expansions = {
    default: `La inteligencia artificial y el aprendizaje automático transforman 
              el procesamiento de datos mediante redes neuronales profundas. 
              Los algoritmos de optimización ajustan los pesos mediante gradiente 
              descendiente para minimizar la función de pérdida. 
              Los modelos generativos como GPT utilizan transformadores con 
              atención multi-cabeza para generar texto coherente y contextual. 
              El embedding vectorial permite representar palabras en espacios 
              de alta dimensionalidad capturando relaciones semánticas complejas.`,
  };

  // Detectar palabras clave del prompt para personalizar un poco la respuesta
  const lower = prompt.toLowerCase();
  if (lower.includes('cuántica') || lower.includes('quantum')) {
    return `La computación cuántica aprovecha superposición y entrelazamiento 
            para procesar información de manera exponencialmente más eficiente. 
            Los qubits permiten estados simultáneos, revolucionando criptografía, 
            simulación molecular y optimización de sistemas complejos.`;
  }
  if (lower.includes('blockchain') || lower.includes('cripto')) {
    return `La tecnología blockchain descentraliza el consenso mediante criptografía 
            asimétrica y contratos inteligentes. Los nodos validan transacciones 
            distribuidas asegurando inmutabilidad y transparencia sin intermediarios.`;
  }

  // Incorporar palabras del propio prompt para más relevancia
  return `${expansions.default} Analizando: ${prompt}.`;
}

// ─── ENDPOINT PRINCIPAL ─────────────────────────────────────
/**
 * POST /generate
 * Body: { prompt: string, useOpenAI: boolean }
 * Returns: { text, keywords, nodes, edges }
 */
app.post('/generate', async (req, res) => {
  const { prompt, useOpenAI = false, apiKey } = req.body;

  if (!prompt || prompt.trim().length < 3) {
    return res.status(400).json({ error: 'El prompt debe tener al menos 3 caracteres.' });
  }

  let generatedText = '';

  // ── Intentar OpenAI si el cliente envió una API key ──────
  if (useOpenAI && apiKey) {
    try {
      const { OpenAI } = require('openai');
      const openai = new OpenAI({ apiKey });

      const completion = await openai.chat.completions.create({
        model    : 'gpt-4o-mini',
        messages : [
          {
            role   : 'system',
            content: `Eres un asistente experto. Responde de forma detallada y técnica 
                      usando terminología especializada relevante al tema. 
                      Usa entre 80 y 120 palabras. 
                      No uses listas ni bullets, solo párrafos fluidos.`,
          },
          { role: 'user', content: prompt },
        ],
        max_tokens  : 200,
        temperature : 0.8,
      });

      generatedText = completion.choices[0].message.content;
    } catch (err) {
      console.warn('[OpenAI] Error, usando modo simulado:', err.message);
      generatedText = generateSimulated(prompt);
    }
  } else {
    // Modo simulado sin API key
    generatedText = generateSimulated(prompt);
  }

  // ── Extraer keywords y construir grafo ───────────────────
  const rawKeywords = extractKeywords(generatedText + ' ' + prompt, 18);

  // Asegurar mínimo 6 nodos para que se vea bien
  const keywords = rawKeywords.length >= 6
    ? rawKeywords
    : [...rawKeywords, ...['neural', 'data', 'model', 'ai', 'node', 'graph']
        .filter(w => !rawKeywords.includes(w))
      ].slice(0, 12);

  const { nodes, edges } = buildGraph(keywords);

  res.json({
    text    : generatedText,
    keywords,
    nodes,
    edges,
    mode    : useOpenAI && apiKey ? 'openai' : 'simulated',
  });
});

// ─── Health check ────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: Date.now() }));

// ─── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ╔═══════════════════════════════════════╗`);
  console.log(`  ║   🧠 Neural AI Visualizer - Server    ║`);
  console.log(`  ║   http://localhost:${PORT}               ║`);
  console.log(`  ╚═══════════════════════════════════════╝\n`);
});