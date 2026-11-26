// =====================================================================
// QREDO - Lecture du NOM d'un médicament sur sa boîte (OCR)
// ---------------------------------------------------------------------
// Utilisé quand le code-barres est illisible : l'utilisateur photographie
// le nom imprimé sur la boîte. La reconnaissance de texte (Tesseract.js,
// copié dans lib/tesseract/) tourne ENTIÈREMENT dans l'appareil : aucune
// image ni aucun texte n'est envoyé sur Internet (données médicales).
//
//  - recognizeText(canvas) : image -> texte brut
//  - matchDrugs(texte, produits) : texte brut (avec erreurs d'OCR)
//    -> médicaments les plus probables de la base belge (drug-db.js)
// =====================================================================

// ---------------------------------------------------------------------
// 1) Moteur OCR (Tesseract.js 5, fichiers locaux uniquement)
// ---------------------------------------------------------------------

const LIB = new URL('../../lib/tesseract/', import.meta.url);

// Anglais seul : les noms de marque ne sont pas des mots d'une langue,
// le modèle 'eng' lit très bien l'alphabet latin et les chiffres, et les
// accents sont de toute façon retirés avant la comparaison avec la base.
const LANGS = 'eng';

const TARGET_WIDTH = 1500; // les petites images sont agrandies à ~1500 px de large
const MAX_WIDTH = 2400; // les très grandes sont réduites (vitesse, mémoire)
const MAX_UPSCALE = 4;

// Petit module WebAssembly utilisant une instruction SIMD (même test que
// wasm-feature-detect, utilisé en interne par Tesseract.js).
const SIMD_TEST = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
]);

let workerPromise = null; // un seul worker, gardé en vie
let progressHandler = null; // reçoit les messages du worker pendant la tâche en cours
let queue = Promise.resolve(); // une reconnaissance à la fois

function simdSupported() {
  try {
    return WebAssembly.validate(SIMD_TEST);
  } catch {
    return false;
  }
}

/** Étapes du chargement -> fraction 0..1 du chargement complet. */
const INIT_STEPS = {
  'loading tesseract core': [0, 0.3],
  'initializing tesseract': [0.3, 0.35],
  'loading language traineddata': [0.35, 0.85],
  'loading language traineddata (from cache)': [0.35, 0.85],
  'initializing api': [0.85, 1],
};

function initFraction(m) {
  const step = INIT_STEPS[m.status];
  if (!step) return null;
  const p = Math.min(1, Math.max(0, Number(m.progress) || 0));
  return step[0] + (step[1] - step[0]) * p;
}

function createOcrWorker() {
  return (async () => {
    const { default: Tesseract } = await import(new URL('tesseract.esm.min.js', LIB).href);
    // Cœur WASM choisi ici (et non par Tesseract.js) pour utiliser les
    // fichiers .js + .wasm séparés : 25 % plus légers que les .wasm.js.
    const core = simdSupported() ? 'tesseract-core-simd-lstm.js' : 'tesseract-core-lstm.js';
    const worker = await Tesseract.createWorker(LANGS, Tesseract.OEM.LSTM_ONLY, {
      workerPath: new URL('worker.min.js', LIB).href,
      corePath: new URL(core, LIB).href,
      langPath: LIB.href.replace(/\/$/, ''),
      gzip: true,
      // Pas d'URL blob : le cœur cherche son .wasm à côté du script du worker.
      workerBlobURL: false,
      logger: (m) => progressHandler?.(m),
    });
    await worker.setParameters({
      // Mise en page automatique : lit mieux que SPARSE_TEXT les noms en blanc
      // sur une bande colorée (essais sur images de boîtes simulées).
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      preserve_interword_spaces: '1',
    });
    return worker;
  })().catch((err) => {
    workerPromise = null; // on pourra réessayer
    throw err;
  });
}

function getWorker() {
  if (!workerPromise) workerPromise = createOcrWorker();
  return workerPromise;
}

/** Exécute fn() seul (file d'attente), avec un gestionnaire de progression. */
function exclusive(handler, fn) {
  const run = queue.then(async () => {
    progressHandler = handler;
    try {
      return await fn();
    } finally {
      progressHandler = null;
    }
  });
  queue = run.catch(() => {});
  return run;
}

/** Télécharge et initialise le moteur à l'avance (optionnel). */
export async function preloadOcr(onProgress) {
  const report = (x) => onProgress?.(Math.round(x * 100) / 100);
  await exclusive(
    (m) => {
      const f = initFraction(m);
      if (f !== null) report(f);
    },
    () => getWorker(),
  );
  report(1);
}

/**
 * Prépare l'image pour l'OCR : mise à l'échelle (~1500 px de large),
 * niveaux de gris, lissage, étirement du contraste (reflets des boîtes
 * brillantes), polarité locale (texte blanc sur bande colorée) et fond aplati.
 * Renvoie [image contrastée] ou, si l'image contient beaucoup de tons moyens
 * (bandes colorées), [image contrastée, image à fond aplati] : les deux
 * sont alors lues et les textes mis bout à bout (matchDrugs s'en accommode).
 */
function prepareCanvases(src) {
  const w0 = src.width;
  const h0 = src.height;
  let scale = 1;
  if (w0 < TARGET_WIDTH) scale = Math.min(TARGET_WIDTH / w0, MAX_UPSCALE);
  else if (w0 > MAX_WIDTH) scale = MAX_WIDTH / w0;
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));

  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const n = w * h;
  const gray = new Uint8ClampedArray(n);
  const hist = new Uint32Array(256);
  for (let i = 0, j = 0; i < n; i++, j += 4) gray[i] = (d[j] * 299 + d[j + 1] * 587 + d[j + 2] * 114) / 1000;
  // 1) Lissage léger (bruit du capteur, grain agrandi) : sinon la binarisation
  //    de Tesseract transforme les fonds colorés en poussière de points.
  boxBlur(gray, w, h, Math.min(2, Math.max(1, Math.round(scale / 2))));
  // 2) Étirement du contraste entre les percentiles 1 % et 99 %
  for (let i = 0; i < n; i++) hist[gray[i]]++;
  const lo = percentile(hist, n, 0.01);
  const hi = percentile(hist, n, 0.99);
  if (hi - lo > 24) for (let i = 0; i < n; i++) gray[i] = ((gray[i] - lo) * 255) / (hi - lo);

  // Version simple (1re passe) : inversée si l'image est surtout sombre
  let dark = 0;
  let mid = 0;
  for (let i = 0; i < n; i++) {
    if (gray[i] < 128) dark++;
    if (gray[i] > 50 && gray[i] < 205) mid++;
  }
  const simple = dark / n > 0.5 ? gray.map((v) => 255 - v) : gray.slice();
  const other = document.createElement('canvas');
  other.width = w;
  other.height = h;
  const toCanvas = (px, canvas, c2d) => {
    for (let i = 0, j = 0; i < n; i++, j += 4) {
      d[j] = d[j + 1] = d[j + 2] = px[i];
      d[j + 3] = 255;
    }
    c2d.putImageData(img, 0, 0);
    return canvas;
  };
  const first = toCanvas(simple, other, other.getContext('2d'));
  // Fond uniforme clair ou foncé (cas simple) : une seule passe suffit.
  if (mid / n < 0.15) return [first];

  // 3) Polarité locale : là où le fond est foncé (bande colorée, boîte
  //    sombre), on inverse pour obtenir partout du texte foncé sur fond clair.
  const big = Math.max(8, Math.round(Math.min(w, h) / 8));
  const bg = gray.slice();
  boxBlur(bg, w, h, big);
  for (let i = 0; i < n; i++) if (bg[i] < 128) gray[i] = 255 - gray[i];
  // 4) Fond aplati : division par le fond local -> bandes claires/colorées
  //    blanchies, le texte reste foncé (la binarisation globale de Tesseract
  //    échoue sinon avec texte noir + bande jaune + fond blanc).
  const flat = gray.slice();
  boxBlur(flat, w, h, Math.max(8, Math.round(Math.min(w, h) / 10)));
  for (let i = 0; i < n; i++) gray[i] = (gray[i] * 255) / Math.max(1, flat[i] * 0.92);

  return [first, toCanvas(gray, out, ctx)];
}

/** Flou moyenneur séparable (horizontal puis vertical), rayon r, en place. */
function boxBlur(px, w, h, r) {
  const tmp = new Uint8ClampedArray(px.length);
  const pass = (src, dst, len, count, step, stride) => {
    for (let line = 0; line < count; line++) {
      const base = line * stride;
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += src[base + Math.min(len - 1, Math.max(0, k)) * step];
      for (let x = 0; x < len; x++) {
        dst[base + x * step] = acc / (2 * r + 1);
        acc += src[base + Math.min(len - 1, x + r + 1) * step] - src[base + Math.max(0, x - r) * step];
      }
    }
  };
  pass(px, tmp, w, h, 1, w); // lignes
  pass(tmp, px, h, w, w, 1); // colonnes
}

function percentile(hist, n, q) {
  const target = n * q;
  let acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= target) return v;
  }
  return 255;
}

/**
 * Reconnaît le texte d'une image (HTMLCanvasElement), dans l'appareil.
 * onProgress(0..1) : chargement du moteur (premier appel) puis lecture.
 */
export async function recognizeText(canvas, { onProgress } = {}) {
  const report = (x) => onProgress?.(Math.round(Math.min(1, Math.max(0, x)) * 100) / 100);
  const needInit = !workerPromise;
  const initShare = needInit ? 0.5 : 0; // part de la barre réservée au chargement
  let pass = 0;
  let passes = 1;
  report(0);
  const text = await exclusive(
    (m) => {
      if (m.status === 'recognizing text') {
        report(initShare + ((1 - initShare) * (pass + (Number(m.progress) || 0))) / passes);
      } else if (needInit) {
        const f = initFraction(m);
        if (f !== null) report(f * initShare);
      }
    },
    async () => {
      const worker = await getWorker();
      const canvases = prepareCanvases(canvas);
      passes = canvases.length;
      const texts = [];
      for (pass = 0; pass < passes; pass++) {
        const { data } = await worker.recognize(canvases[pass]);
        const t = (data.text || '').trim();
        if (t) texts.push(t);
      }
      return texts.join('\n');
    },
  );
  report(1);
  return text;
}

// ---------------------------------------------------------------------
// 2) Rapprochement texte OCR -> base des médicaments (fonction pure)
// ---------------------------------------------------------------------

const MIN_SCORE = 0.35; // en dessous : pas une proposition crédible

// Mots imprimés sur les boîtes qui ne désignent pas le médicament (FR/NL/DE/EN).
const STOP_WORDS = new Set(
  (
    'comprime comprimes pellicule pellicules enrobe enrobes secable secables gelule gelules capsule capsules ' +
    'tablet tablets tabletten filmomhulde omhulde harde zachte kapseln filmtabletten ' +
    'voie orale oral oraal usage gebruik lire notice bijsluiter lezen avant apres the and for with ' +
    'boite doos box sachet sachets flacon fles ampoule ampoules ampullen solution oplossing losung ' +
    'injectable injectie buvable drinkbare effervescent effervescents bruistabletten ' +
    'medicament geneesmiddel arzneimittel adulte adultes adults enfant enfants kinderen ' +
    'par pour per voor fur und les des une een der die das met mit sans zonder ohne ' +
    'conserver bewaren temperature lot exp attentivement hors portee buiten bereik ' +
    'de la le du et en het van op'
  ).split(' '),
);

const UNIT_WORDS = new Set(['mg', 'g', 'mcg', 'ug', 'ml', 'iu', 'ui', 'ie', 'u', 'ul']);

/** Minuscules sans accents, espaces normalisés (comme drug-db.js). */
function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Squelette d'un mot : confond les caractères que l'OCR mélange souvent
 * (0/o, 1/l/i/|, 5/s, 8/b, rn/m, vv/w). Appliqué aux deux côtés.
 */
const SKELETON = { rn: 'm', vv: 'w', 0: 'o', 1: 'l', i: 'l', '|': 'l', '!': 'l', 5: 's', 8: 'b' };

function skeleton(w) {
  return /rn|vv|[01i|!58]/.test(w) ? w.replace(/rn|vv|[01i|!58]/g, (c) => SKELETON[c]) : w;
}

/** Distance d'édition maximale tolérée selon la longueur du mot. */
function maxDist(len) {
  if (len <= 4) return 0;
  if (len <= 6) return 1;
  if (len <= 9) return 2;
  return 3;
}

/** Distance de Damerau-Levenshtein (transpositions adjacentes), abandon au-delà de max. */
function editDistance(a, b, max) {
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > max) return max + 1;
  let prev2 = null;
  let prev = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    const cur = new Array(lb + 1);
    cur[0] = i;
    let rowMin = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[lb];
}

function bigrams(w) {
  const s = `^${w}$`;
  const out = new Set();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

// Quantités "nombre + unité" d'un texte normalisé, ramenées à une unité de
// base (g -> mg, mcg -> mg ; ml ; UI ; %). Sans unité : unit = ''.
// Une lettre parasite collée à l'unité est tolérée ("40 mgd"), pas un mot ("1 gelule").
const QTY_RE = /(\d+(?:[.,]\d+)?)\s*(?:(mg|mcg|ug|µg|g|ml|iu|ui|ie|u|%)(?![a-z]{2}|\d)|(?![a-z0-9]))/g;
// Nombre suivi d'un conditionnement ("30 comprimés", "x 20") : pas un dosage.
const PACK_RE =
  /^\s*(x\b|comprim|tablet|gelul|capsul|kapsel|sachet|zakje|stuk|ampoul|ampul|flacon|dose|piece|pastill|suppo)/;

function quantities(t) {
  const out = [];
  for (const m of t.matchAll(QTY_RE)) {
    let v = parseFloat(m[1].replace(',', '.'));
    let unit = m[2] || '';
    if (!unit && (PACK_RE.test(t.slice(m.index + m[0].length)) || /x\s*$/.test(t.slice(0, m.index)))) continue;
    if (unit === 'g') v *= 1000;
    if (unit === 'mcg' || unit === 'ug' || unit === 'µg') v /= 1000;
    if (unit === 'g' || unit === 'mcg' || unit === 'ug' || unit === 'µg') unit = 'mg';
    if (unit === 'ui' || unit === 'ie') unit = 'iu';
    if (Number.isFinite(v)) out.push({ v, unit });
  }
  return out;
}

const sameValue = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, a, b);

/** Mots d'un texte normalisé (lettres ; chiffres isolés ignorés). */
function splitWords(t) {
  return t.split(/[^a-z0-9µ]+/).filter((w) => w && /[a-z]/.test(w));
}

// Index construit une fois par tableau de produits.
const indexCache = new WeakMap();

function buildIndex(products) {
  const words = []; // squelettes distincts
  const wordId = new Map();
  const idOf = (w) => {
    let id = wordId.get(w);
    if (id === undefined) {
      id = words.length;
      wordId.set(w, id);
      words.push(w);
    }
    return id;
  };
  const skels = new Map(); // mot -> squelette (mémo : beaucoup de mots se répètent)
  const skel = (w) => {
    let s = skels.get(w);
    if (s === undefined) skels.set(w, (s = skeleton(w)));
    return s;
  };

  const nameWords = new Array(products.length); // [{ id, weight, brand }]
  const innWords = new Array(products.length); // [id] : 1er mot de chaque molécule
  const qtys = new Array(products.length);
  const byWordName = []; // id -> [index produit]
  const byWordInn = [];
  const push = (arr, id, i) => (arr[id] || (arr[id] = [])).push(i);

  products.forEach((p, i) => {
    const k = p.k ?? norm(p.name);
    const list = []; // [{ id, weight, brand }]
    for (const w of splitWords(k)) {
      if (UNIT_WORDS.has(w) || /\d/.test(w) || w.length < 2) continue;
      const id = idOf(skel(w));
      if (list.some((x) => x.id === id)) continue;
      // Marque = 1er mot d'au moins 3 lettres ("De Icol" -> "icol") ; les mots
      // de 2 lettres (EG, AB…) ne comptent que pour départager.
      const short = w.length < 3;
      const brand = !short && !list.some((x) => x.brand);
      list.push({ id, weight: brand ? 2 : short ? 0.5 : 1, brand });
      push(byWordName, id, i);
    }
    nameWords[i] = list;

    const inn = [];
    for (const part of (p.innK ?? norm(p.inn)).split('/')) {
      const w = splitWords(part.trim())[0];
      if (!w || w.length < 4) continue;
      const id = idOf(skel(w));
      if (!inn.includes(id)) {
        inn.push(id);
        push(byWordInn, id, i);
      }
    }
    innWords[i] = inn;
    qtys[i] = quantities(k);
  });

  const grams = new Map(); // bigramme -> [id mot]
  words.forEach((w, id) => {
    for (const g of bigrams(w)) (grams.get(g) || grams.set(g, []).get(g)).push(id);
  });

  return { words, nameWords, innWords, qtys, byWordName, byWordInn, grams, counts: new Uint16Array(words.length) };
}

function getIndex(products) {
  let idx = indexCache.get(products);
  if (!idx) {
    idx = buildIndex(products);
    indexCache.set(products, idx);
  }
  return idx;
}

/** Jetons OCR : mots (avec chiffres confondus remis en lettres) + paires collées. */
function ocrTokens(t) {
  const raw = t
    .split(/[^a-z0-9|!µ]+/)
    .flatMap((w) => w.split(/(?<=[a-z]{3})(?=\d+(?:mg|g|ml)?$)/)) // "medrol4mg" -> "medrol", "4mg"
    .filter((w) => w && /[a-z]/.test(w) && !UNIT_WORDS.has(w) && !/^\d+(mg|g|ml|mcg|ug|iu|ui|u)$/.test(w));
  const words = raw.filter((w) => !STOP_WORDS.has(w) && w.replace(/[^a-z]/g, '').length >= Math.min(2, w.length));
  const out = new Set(words.map(skeleton));
  // Nom coupé en deux par l'OCR ("Dafal gan") : on essaie aussi les paires collées.
  for (let i = 0; i + 1 < words.length; i++) {
    if (words[i].length + words[i + 1].length <= 16) out.add(skeleton(words[i] + words[i + 1]));
  }
  return [...out].filter((w) => w.length >= 2);
}

/**
 * Pour chaque jeton OCR, mots de la base proches (préfiltre par bigrammes
 * puis distance d'édition). Renvoie Map id mot -> similarité 0..1.
 */
function matchWords(tokens, idx) {
  const { words, grams, counts } = idx;
  const best = new Map();
  for (const tok of tokens) {
    const tg = bigrams(tok);
    const touched = [];
    for (const g of tg) {
      const ids = grams.get(g);
      if (!ids) continue;
      for (const id of ids) {
        if (counts[id] === 0) touched.push(id);
        counts[id]++;
      }
    }
    for (const id of touched) {
      const shared = counts[id];
      counts[id] = 0;
      const w = words[id];
      const len = Math.max(w.length, tok.length);
      const max = maxDist(w.length);
      // Chaque erreur détruit au plus 2 bigrammes.
      if (shared < Math.min(w.length, tok.length) + 1 - 2 * max) continue;
      const d = w === tok ? 0 : editDistance(tok, w, max);
      if (d > max) continue;
      const sim = 1 - (0.75 * d) / len;
      if (sim > (best.get(id) ?? 0)) best.set(id, sim);
    }
  }
  return best;
}

/** Facteur 0.7..1 selon la présence des dosages du produit dans le texte. */
function strengthFactor(prodQ, ocrQ) {
  const withUnit = ocrQ.filter((q) => q.unit);
  if (!prodQ.length) return withUnit.length ? 0.92 : 1;
  if (!ocrQ.length) return 0.85;
  let found = 0;
  for (const q of prodQ) {
    if (withUnit.some((o) => o.unit === q.unit && sameValue(o.v, q.v))) found += 1;
    else if (ocrQ.some((o) => !o.unit && sameValue(o.v, q.v))) found += 0.8;
  }
  // Seulement des nombres sans unité, aucun ne correspond : pas d'information.
  if (!found && !withUnit.length) return 0.8;
  return 0.7 + (0.3 * found) / prodQ.length;
}

/**
 * Médicaments les plus probables pour un texte lu par OCR.
 * Renvoie [{ product, score }] du meilleur au moins bon (score 0..1).
 */
export function matchDrugs(text, products, { limit = 5 } = {}) {
  if (!products?.length) return [];
  const idx = getIndex(products); // matchDrugs('', products) : prépare l'index à l'avance
  if (!text) return [];
  const t = norm(text)
    .replace(/(\d)\s*rng(?![a-z])/g, '$1 mg') // "4 rng" -> "4 mg"
    // Lettres lues dans un nombre : "4O mg" -> "40 mg", "1l" -> "11"
    .replace(/(?<![a-z\d])\d[\doil]*(?=\s*(?:mg|mcg|g|ml)(?![a-z])|[^a-z]|$)/g, (n) =>
      n.replace(/o/g, '0').replace(/[il]/g, '1'),
    )
    .replace(/(\d)[a-z](?=\s+(?:mg|mcg|g|ml)(?![a-z]))/g, '$1') // "5s mg" -> "5 mg"
    // Chiffre isolé lu comme une lettre devant l'unité : "Smg" -> "5 mg", "l mg" -> "1 mg"
    .replace(/(^|[^a-z0-9])([soli])\s?(mg|ml)(?![a-z])/g, (_, a, c, u) => `${a}${{ s: 5, o: 0, l: 1, i: 1 }[c]} ${u}`);
  const tokens = ocrTokens(t);
  if (!tokens.length) return [];
  const sims = matchWords(tokens, idx);
  if (!sims.size) return [];
  const ocrQ = quantities(t);

  // Candidats : produits contenant au moins un mot reconnu.
  const cand = new Set();
  for (const id of sims.keys()) {
    for (const i of idx.byWordName[id] || []) cand.add(i);
    for (const i of idx.byWordInn[id] || []) cand.add(i);
  }

  const results = [];
  for (const i of cand) {
    const p = products[i];
    // Nom commercial : moyenne pondérée des mots trouvés (le 1er mot compte double).
    let total = 0;
    let got = 0;
    let firstFound = false;
    let nFound = 0;
    for (const { id, weight, brand } of idx.nameWords[i]) {
      total += weight;
      const s = sims.get(id);
      if (s) {
        got += weight * s;
        if (weight >= 1) nFound++;
        if (brand) firstFound = true;
      }
    }
    let nameScore = total ? got / total : 0;
    if (!firstFound && nFound < 2) nameScore *= 0.5; // marque absente : peu crédible

    // Molécule (génériques, ou boîte où la molécule est bien visible).
    const inn = idx.innWords[i];
    let innScore = 0;
    for (const id of inn) innScore += sims.get(id) ?? 0;
    innScore = inn.length ? innScore / inn.length : 0;

    // Générique nommé d'après sa molécule ("Pantoprazole Takeda") : les boîtes
    // de marque impriment aussi molécule + firme, la marque doit l'emporter.
    const generic = idx.nameWords[i].some((x) => x.brand && inn.includes(x.id));
    let base = Math.max(nameScore, 0.7 * innScore);
    if (!generic && nameScore >= 0.5 && innScore > 0) base += 0.05;
    // Plus de mots du nom retrouvés = plus précis ("Dafalgan Forte" > "Dafalgan")
    if (firstFound && nFound > 1) base += 0.05 * Math.min(2, nFound - 1);
    let score = Math.min(1, base * strengthFactor(idx.qtys[i], ocrQ));
    if (generic) score *= 0.92;
    if (p.inactive) score *= 0.95;
    if (score >= MIN_SCORE) results.push({ product: p, score: Math.round(score * 1000) / 1000 });
  }

  results.sort(
    (a, b) =>
      b.score - a.score || a.product.inactive - b.product.inactive || a.product.name.length - b.product.name.length,
  );
  return results.slice(0, limit);
}
