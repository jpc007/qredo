// =====================================================================
// QREDO - Lecture du code-barres d'une boîte de médicament (Belgique)
// ---------------------------------------------------------------------
// 1) BarcodeDetector : lecteur intégré (Chrome Android), s'il connaît le
//    DataMatrix et les codes 1D utiles.
// 2) Sinon (iPhone, Chrome Windows…) : ZXing compilé en WASM
//    (lib/zxing/, zxing-wasm, licence MIT), chargé seulement au premier
//    besoin. Le fichier .wasm est servi par l'application : aucun CDN.
//
// Codes recherchés sur la boîte :
//  - DataMatrix GS1 (directive européenne anti-falsification) :
//    (01) GTIN-14, (17) péremption AAMMJJ, (10) lot, (21) n° de série ;
//  - ancien code 1D (Code 128 / Code 39) avec le code CNK à 7 chiffres ;
//  - parfois un EAN-13 (=> GTIN-14 en ajoutant un 0 devant).
// extractProductCodes() est pure (pas de DOM) : testable sous Node.
// =====================================================================

const ZXING_MODULE = '../../lib/zxing/reader/index.js';
const ZXING_WASM = new URL('../../lib/zxing/zxing_reader.wasm', import.meta.url).href;

// Formats natifs (BarcodeDetector) et équivalents ZXing
const NATIVE_FORMATS = ['data_matrix', 'ean_13', 'code_128', 'code_39', 'ean_8', 'upc_a', 'qr_code'];
const ZXING_FORMATS = ['DataMatrix', 'EAN13', 'Code128', 'Code39', 'EAN8', 'UPCA', 'QRCode'];

// Au-delà, l'image est réduite avant ZXing (vitesse ; un code de boîte
// reste lisible en 1280 px si la boîte remplit une bonne partie du cadre).
const MAX_SIDE = 1280;

const GS = '\x1d'; // séparateur GS1 (FNC1)

let nativeDetector = null; // promesse : BarcodeDetector, ou false si indisponible
let zxing = null; // promesse du module ZXing prêt (wasm compilé)
let canvas = null;
let ctx = null;

// ---------------------------------------------------------------------
// Moteurs de lecture
// ---------------------------------------------------------------------

/** Lecteur intégré, seulement s'il sait lire le DataMatrix (code principal des boîtes). */
function getNativeDetector() {
  if (nativeDetector) return nativeDetector;
  nativeDetector = (async () => {
    if (typeof globalThis.BarcodeDetector !== 'function') return false;
    try {
      const supported = await globalThis.BarcodeDetector.getSupportedFormats();
      const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
      if (formats.includes('data_matrix') && formats.includes('code_128')) {
        return new globalThis.BarcodeDetector({ formats });
      }
    } catch {
      /* pas de lecteur intégré utilisable : ZXing */
    }
    return false;
  })();
  return nativeDetector;
}

/** Charge ZXing (une seule fois) et compile le .wasm local. */
function getZxing() {
  if (zxing) return zxing;
  zxing = import(ZXING_MODULE)
    .then(async (mod) => {
      await mod.prepareZXingModule({
        overrides: { locateFile: (path, prefix) => (path.endsWith('.wasm') ? ZXING_WASM : prefix + path) },
        fireImmediately: true,
      });
      return mod;
    })
    .catch((err) => {
      zxing = null; // on réessaiera au prochain appel
      throw err;
    });
  return zxing;
}

/** Préchauffage facultatif. Renvoie 'native', 'zxing' ou null (échec). */
export async function preloadBarcodeEngine() {
  if (await getNativeDetector()) return 'native';
  try {
    await getZxing();
    return 'zxing';
  } catch {
    return null;
  }
}

/** Dimensions d'une source vidéo / canvas / ImageBitmap / image. */
function sourceSize(source) {
  const w = source.videoWidth || source.naturalWidth || source.width || 0;
  const h = source.videoHeight || source.naturalHeight || source.height || 0;
  return [w, h];
}

/** Copie la source dans un canvas (réduit si besoin) et renvoie ses pixels. */
function toImageData(source) {
  const [sw, sh] = sourceSize(source);
  if (!sw || !sh) return null; // vidéo pas encore prête
  const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
  const w = Math.round(sw * scale);
  const h = Math.round(sh * scale);
  if (!canvas) {
    canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  }
  if (canvas.width !== w || canvas.height !== h || !ctx) {
    canvas.width = w;
    canvas.height = h;
    ctx = canvas.getContext('2d', { willReadFrequently: true });
  }
  ctx.drawImage(source, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

/**
 * Lit les codes visibles dans une image vidéo, un canvas ou un ImageBitmap.
 * Renvoie les textes bruts décodés (tableau éventuellement vide).
 */
export async function detectBarcodes(source) {
  const det = await getNativeDetector();
  if (det) {
    try {
      const codes = await det.detect(source);
      return unique(codes.map((c) => c.rawValue));
    } catch {
      /* on tente ZXing */
    }
  }
  const mod = await getZxing();
  const img = toImageData(source);
  if (!img) return [];
  const results = await mod.readBarcodes(img, {
    formats: ZXING_FORMATS,
    tryHarder: true,
    tryRotate: true,
    tryInvert: true,
    tryDownscale: true,
    maxNumberOfSymbols: 8,
    textMode: 'HRI', // GS1 rendu sous la forme "(01)…(17)…" (sans ambiguïté)
  });
  return unique(results.filter((r) => r.isValid && r.text).map((r) => r.text));
}

// ---------------------------------------------------------------------
// Analyse du texte décodé (pure, sans DOM)
// ---------------------------------------------------------------------

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

/** Clé de contrôle GS1 (modulo 10, poids 3/1 en partant de la droite). */
function gs1CheckOk(digits) {
  if (!/^\d{8,18}$/.test(digits)) return false;
  let sum = 0;
  for (let i = digits.length - 2, w = 3; i >= 0; i--, w = 4 - w) sum += Number(digits[i]) * w;
  return (10 - (sum % 10)) % 10 === Number(digits[digits.length - 1]);
}

/** GTIN-8/12/13/14 => GTIN-14 valide, ou null. */
function toGtin14(digits) {
  if (![8, 12, 13, 14].includes(digits.length) || !gs1CheckOk(digits) || /^0+$/.test(digits)) return null;
  return digits.padStart(14, '0');
}

// Longueur de l'identifiant d'application (AI) selon ses 2 premiers chiffres
// (table GS1 simplifiée) : 2 chiffres pour 00-22, 30, 37, 90-99 ;
// 3 chiffres pour 23x-25x, 40x-43x, 71x ; 4 chiffres pour le reste (31xx, 70xx…).
function aiLength(p) {
  const n = Number(p);
  if (n <= 22 || n === 30 || n === 37 || n >= 90) return 2;
  if ((n >= 23 && n <= 25) || (n >= 40 && n <= 43) || n === 71) return 3;
  return 4;
}

// AI à longueur fixe « prédéfinie » (pas de séparateur GS après eux).
// Clé = 2 premiers chiffres de l'AI ; valeur = nombre de caractères de données.
// prettier-ignore
const FIXED_LENGTH = {
  '00': 18, '01': 14, '02': 14, '03': 14, '04': 16,
  11: 6, 12: 6, 13: 6, 14: 6, 15: 6, 16: 6, 17: 6, 18: 6, 19: 6,
  20: 2, 31: 6, 32: 6, 33: 6, 34: 6, 35: 6, 36: 6, 41: 13,
};

/** Retire le préfixe de symbologie ("]d2", "]C1", "]Q3"…) et normalise les GS. */
function normalizeGs1(raw) {
  return String(raw ?? '')
    .replace(/^\s+|\s+$/g, '')
    .replace(/^\][A-Za-z]\d/, '')
    .replace(/␝|<GS>|\{GS\}|\[GS\]/gi, GS)
    .replace(/^\x1d+/, '');
}

/** Forme lisible "(01)05060642020403(17)281231(10)ABC". */
function parseHumanGs1(s) {
  const out = {};
  const re = /\((\d{2,4})\)\s*([^(]*)/g;
  let m;
  while ((m = re.exec(s))) out[m[1]] = m[2].replace(/\x1d/g, '').trim();
  return out;
}

/** Forme brute "0105060642020403172812311OABC<GS>21XYZ". S'arrête au premier AI illisible. */
function parseRawGs1(s) {
  const out = {};
  let i = 0;
  while (i < s.length) {
    if (s[i] === GS) {
      i++;
      continue;
    }
    const p = s.slice(i, i + 2);
    if (!/^\d\d$/.test(p)) break;
    const ai = s.slice(i, i + aiLength(p));
    if (!/^\d+$/.test(ai)) break;
    i += ai.length;
    let value;
    if (FIXED_LENGTH[p]) {
      value = s.slice(i, i + FIXED_LENGTH[p]);
      i += FIXED_LENGTH[p];
    } else {
      // Longueur variable : jusqu'au GS (si le lecteur a supprimé les GS,
      // la valeur avale la suite ; sans gravité pour le GTIN, placé en tête).
      const end = s.indexOf(GS, i);
      value = s.slice(i, end < 0 ? s.length : end);
      i = end < 0 ? s.length : end + 1;
    }
    out[ai] = value;
  }
  return out;
}

/**
 * Décompose un texte GS1 en { AI: valeur }, ex. { '01': '05060642020403', '17': '281231' }.
 * Accepte "]d2…", GS présents ou non, forme "(01)…", lien GS1 Digital Link (…/01/<gtin>).
 * Renvoie null si le texte n'a pas l'air d'être du GS1.
 */
export function parseGS1(raw) {
  const s = normalizeGs1(raw);
  if (!s) return null;
  if (/^\(\d{2,4}\)/.test(s)) return parseHumanGs1(s);
  const link = s.match(/^https?:\/\/[^?#]*?\/01\/(\d{14})(?:[/?#]|$)/i);
  if (link) return { '01': link[1] };
  const hadPrefix = /^\s*\][A-Za-z]\d/.test(String(raw)) || String(raw).includes(GS);
  if (hadPrefix || /^01\d{14}/.test(s)) {
    const out = parseRawGs1(s);
    return Object.keys(out).length ? out : null;
  }
  return null;
}

/**
 * Candidats CNK (code pharmacie belge, 7 chiffres) dans la valeur d'un code 1D.
 * Heuristique :
 *  - on ne garde que les chiffres, seulement si le texte est court et ne
 *    contient que chiffres, espaces, ponctuation simple ou un mot (« CNK ») ;
 *  - zéros de tête en trop (9-10 chiffres) retirés jusqu'à 8 chiffres ;
 *  - 7 chiffres : CNK tel quel ;
 *  - 8 chiffres : soit CNK + chiffre de contrôle final (on retire le dernier),
 *    soit zéro de tête + CNK (s'il commence par 0, on propose aussi les 7
 *    derniers). Le zéro de tête est proposé en premier quand il existe.
 * Les candidats sont vérifiés ensuite contre la base des médicaments par
 * l'appelant : un faux candidat ne trouve simplement rien.
 */
function cnkCandidates(raw) {
  const s = String(raw ?? '').trim();
  if (s.length > 24 || !/^[A-Za-z]{0,4}[\s:#.\-/0-9]*$/.test(s)) return [];
  let d = s.replace(/\D/g, '');
  while (d.length > 8 && d.length <= 10 && d[0] === '0') d = d.slice(1);
  if (d.length === 7) return [d];
  if (d.length === 8) return d[0] === '0' ? [d.slice(1), d.slice(0, 7)] : [d.slice(0, 7)];
  return [];
}

/**
 * Codes produit contenus dans un texte décodé :
 * { gtins: [GTIN-14 à clé valide], cnks: [CNK 7 chiffres] }.
 */
export function extractProductCodes(raw) {
  const gtins = [];
  const cnks = [];
  const gs1 = parseGS1(raw);
  if (gs1) {
    for (const ai of ['01', '02']) {
      const g = gs1[ai] && toGtin14(gs1[ai].replace(/\D/g, ''));
      if (g) gtins.push(g);
    }
    // Certains fabricants mettent aussi le CNK en champ national (AI 710-715)
    for (const ai of ['710', '711', '712', '713', '714', '715']) {
      if (gs1[ai] && /^\d{7}$/.test(gs1[ai])) cnks.push(gs1[ai]);
    }
    return { gtins: unique(gtins), cnks: unique(cnks) };
  }
  const s = String(raw ?? '').trim();
  // EAN-8 / UPC-A / EAN-13 / GTIN-14 purement numériques. Un EAN-8 commençant
  // par 0 ou 2 est un numéro à diffusion restreinte (GS1) : pas un GTIN, et
  // plus probablement un CNK précédé d'un zéro.
  if (/^[13-9]\d{7}$|^\d{12,14}$/.test(s)) {
    const g = toGtin14(s);
    if (g) gtins.push(g);
  }
  if (!/^\d{12,14}$/.test(s)) cnks.push(...cnkCandidates(s));
  return { gtins: unique(gtins), cnks: unique(cnks) };
}
