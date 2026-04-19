/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║           NEURAL AI VISUALIZER - Backend Server           ║
 * ║   Node.js + Express + OpenAI GPT-4o-mini Integration     ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * El grafo se construye DIRECTAMENTE desde el prompt del usuario.
 * No hay texto predeterminado: cada palabra del prompt se convierte
 * en un nodo, y las conexiones reflejan relaciones reales del texto.
 */

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ══════════════════════════════════════════════════════════════
   STOPWORDS — palabras vacías que no aportan significado
══════════════════════════════════════════════════════════════ */
const STOPWORDS = new Set([
  'el','la','los','las','un','una','unos','unas','de','del','al','a','en',
  'que','y','o','por','para','con','sin','sobre','entre','hacia','desde',
  'hasta','como','pero','si','no','es','son','ser','estar','tiene','han',
  'este','esta','estos','estas','ese','esa','esos','esas','muy','mas',
  'ya','hay','fue','ser','sea','sido','lo','le','les','me','mi','tu','su',
  'nos','vos','les','era','eran','todo','toda','todos','todas','cuando',
  'donde','quien','cual','cuyo','tanto','tan','aunque','porque','pues',
  'the','an','of','in','to','and','or','for','with','on','at','from',
  'is','are','was','were','be','been','have','has','had','do','does','did',
  'will','would','could','should','may','might','can','this','that','these',
  'those','it','its','as','by','not','but','all','their','there','they',
  'we','you','he','she','my','your','our','i','am','what','how','when','where',
  'which','who','then','than','also','just','more','into','about','after',
]);

/* ══════════════════════════════════════════════════════════════
   TOKENIZAR
══════════════════════════════════════════════════════════════ */
function tokenize(text, minLen = 3) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z]+/i)
    .filter(w => w.length >= minLen && !STOPWORDS.has(w));
}

/* ══════════════════════════════════════════════════════════════
   FRECUENCIA
══════════════════════════════════════════════════════════════ */
function countFrequency(tokens) {
  const freq = {};
  tokens.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  return freq;
}

/* ══════════════════════════════════════════════════════════════
   CO-OCURRENCIA — ventana deslizante
   Dos palabras que aparecen cerca en el prompt se conectan.
   La fuerza depende de la proximidad.
══════════════════════════════════════════════════════════════ */
function buildCoOccurrence(tokens, keywords, windowSize = 5) {
  const kwSet = new Set(keywords);
  const cooc  = new Map();

  for (let i = 0; i < tokens.length; i++) {
    if (!kwSet.has(tokens[i])) continue;

    for (let j = i + 1; j <= Math.min(i + windowSize, tokens.length - 1); j++) {
      if (!kwSet.has(tokens[j])) continue;

      const a = tokens[i];
      const b = tokens[j];
      if (a === b) continue;

      const key      = a < b ? `${a}|${b}` : `${b}|${a}`;
      const distance = j - i;
      const strength = windowSize / distance / windowSize;

      cooc.set(key, (cooc.get(key) || 0) + strength);
    }
  }

  return cooc;
}

/* ══════════════════════════════════════════════════════════════
   SIMILITUD LÉXICA — substring compartido >= 4 letras
══════════════════════════════════════════════════════════════ */
function lexicalSimilarity(a, b) {
  for (let len = 4; len <= Math.min(a.length, b.length); len++) {
    for (let s = 0; s <= a.length - len; s++) {
      if (b.includes(a.substring(s, s + len))) return true;
    }
  }
  return false;
}

/* ══════════════════════════════════════════════════════════════
   BUILD GRAPH — 100% desde el prompt del usuario
══════════════════════════════════════════════════════════════ */
function buildGraphFromPrompt(prompt) {
  const tokens = tokenize(prompt);
  const freq   = countFrequency(tokens);

  const MAX_NODES = 20;

  // Seleccionar top palabras por frecuencia
  let keywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .slice(0, MAX_NODES);

  // Si pocas palabras, relajar longitud mínima a 2
  if (keywords.length < 4) {
    const relaxed = tokenize(prompt, 2);
    const rf = countFrequency(relaxed);
    keywords = Object.entries(rf)
      .sort((a, b) => b[1] - a[1])
      .map(([w]) => w)
      .slice(0, MAX_NODES);
  }

  // Nodos
  const nodes = keywords.map((word, i) => ({
    id    : i,
    label : word,
    weight: 0.5 + Math.min(freq[word] || 1, 5) * 0.1,
    group : i % 5,
  }));

  // Edges
  const edges  = [];
  const edgeSet = new Set();
  const kwIdx   = Object.fromEntries(keywords.map((w, i) => [w, i]));

  const addEdge = (a, b, strength) => {
    const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (!edgeSet.has(key) && a !== b) {
      edgeSet.add(key);
      edges.push({ source: a, target: b, strength: Math.min(strength, 1) });
    }
  };

  // 1. Co-ocurrencia real del prompt (conexiones por proximidad)
  const cooc = buildCoOccurrence(tokens, keywords, 6);
  cooc.forEach((strength, key) => {
    const [a, b] = key.split('|');
    if (kwIdx[a] !== undefined && kwIdx[b] !== undefined) {
      addEdge(kwIdx[a], kwIdx[b], strength * 0.9);
    }
  });

  // 2. Similitud léxica entre palabras
  for (let i = 0; i < keywords.length; i++) {
    for (let j = i + 1; j < keywords.length; j++) {
      if (lexicalSimilarity(keywords[i], keywords[j])) {
        addEdge(i, j, 0.55);
      }
    }
  }

  // 3. Asegurar que nodos aislados queden conectados
  const connected = new Set();
  edges.forEach(e => { connected.add(e.source); connected.add(e.target); });

  nodes.forEach(n => {
    if (!connected.has(n.id) && nodes.length > 1) {
      const neighbour = n.id > 0 ? n.id - 1 : 1;
      addEdge(n.id, neighbour, 0.3);
    }
  });

  // 4. Fallback: cadena básica si casi no hay edges
  if (edges.length < 2 && nodes.length > 1) {
    for (let i = 0; i < nodes.length - 1; i++) {
      addEdge(i, i + 1, 0.7);
    }
  }

  const topWords = keywords.slice(0, 5).join(', ');
  const summary  = `Grafo construido desde: "${prompt.slice(0, 80)}${prompt.length > 80 ? '…' : ''}". Conceptos detectados: ${topWords}.`;

  return { keywords, nodes, edges, summary };
}

/* ══════════════════════════════════════════════════════════════
   POST /generate
══════════════════════════════════════════════════════════════ */
app.post('/generate', async (req, res) => {
  const { prompt, useOpenAI = false, apiKey } = req.body;

  if (!prompt || prompt.trim().length < 2) {
    return res.status(400).json({ error: 'El prompt debe tener al menos 2 caracteres.' });
  }

  let generatedText = '';
  let graphData;

  if (useOpenAI && apiKey) {
    /* ── OpenAI: expande el prompt y luego construye el grafo ── */
    try {
      const { OpenAI } = require('openai');
      const openai = new OpenAI({ apiKey });

      const completion = await openai.chat.completions.create({
        model    : 'gpt-4o-mini',
        messages : [
          {
            role   : 'system',
            content: `Eres un asistente que expande prompts para análisis visual.
                      Dado el input del usuario, escribe un párrafo de 300-420 palabras
                      usando vocabulario rico, sustantivos concretos y términos técnicos
                      relacionados exactamente con el tema ingresado.
                      Sin listas. Solo prosa fluida. No agregues introducción ni cierre genérico.`,
          },
          { role: 'user', content: prompt },
        ],
        max_tokens  : 220,
        temperature : 0.75,
      });

      generatedText = completion.choices[0].message.content;
      // Grafo desde la expansión + el prompt original para mayor cobertura
      graphData = buildGraphFromPrompt(generatedText + ' ' + prompt);

    } catch (err) {
      console.warn('[OpenAI] Error, usando modo local:', err.message);
      graphData     = buildGraphFromPrompt(prompt);
      generatedText = graphData.summary;
    }

  } else {
    /* ── Modo local: grafo 100% desde el prompt ──────────────── */
    graphData     = buildGraphFromPrompt(prompt);
    generatedText = graphData.summary;
  }

  const { keywords, nodes, edges } = graphData;

  res.json({
    text    : generatedText,
    keywords,
    nodes,
    edges,
    mode    : useOpenAI && apiKey ? 'openai' : 'local',
  });
});

/* ══════════════════════════════════════════════════════════════
   HEALTH + START
══════════════════════════════════════════════════════════════ */
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: Date.now() }));

app.listen(PORT, () => {
  console.log(`\n  ╔═══════════════════════════════════════╗`);
  console.log(`  ║   🧠 Neural AI Visualizer - Server    ║`);
  console.log(`  ║   http://localhost:${PORT}               ║`);
  console.log(`  ╚═══════════════════════════════════════╝\n`);
});