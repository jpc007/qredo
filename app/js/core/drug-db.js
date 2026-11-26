// =====================================================================
// QREDO - Base des médicaments belges (source SAM, AFMPS / eHealth)
// ---------------------------------------------------------------------
// Fichier data/medicaments-be.json, généré par tools/sam/build-drug-db.py
// (GitHub Actions, chaque semaine). Chargé une fois, gardé hors ligne.
// La recherche se fait DANS l'appareil : aucun nom de médicament n'est
// envoyé sur Internet.
// =====================================================================

const DB_URL = 'data/medicaments-be.json';

let db = null; // { meta, products: [{ name, inn, strength, inactive, k, words }] }
let loading = null;

/** Minuscules sans accents, espaces normalisés. */
function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isDrugDbLoaded() {
  return db !== null;
}

export function drugDbMeta() {
  return db?.meta ?? null;
}

/** Charge la base (une seule fois). Renvoie null si indisponible. */
export function loadDrugDb() {
  if (loading) return loading;
  loading = fetch(DB_URL)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
    .then((data) => {
      const products = data.products.map(([name, inn, strength, inactive]) => {
        const k = norm(name);
        return { name, inn, strength, inactive: !!inactive, k, first: k.split(' ')[0], innK: norm(inn) };
      });
      const { products: _p, ...meta } = data;
      db = { meta, products, byName: new Map(products.map((p) => [p.k, p])) };
      return db;
    })
    .catch(() => {
      loading = null; // on réessaiera plus tard (hors ligne au premier lancement…)
      return null;
    });
  return loading;
}

/**
 * Suggestions pendant la saisie : nom commercial (début du nom en priorité),
 * puis début d'un mot du nom, puis molécule. Produits commercialisés d'abord.
 */
export function searchDrugs(query, limit = 25) {
  if (!db) return [];
  const q = norm(query);
  if (q.length < 2) return [];
  const starts = [];
  const words = [];
  const inn = [];
  for (const p of db.products) {
    if (p.k.startsWith(q)) starts.push(p);
    else if (p.k.includes(' ' + q)) words.push(p);
    else if (p.innK.startsWith(q) || p.innK.includes(' ' + q)) inn.push(p);
    if (starts.length >= limit * 2) break;
  }
  const byActive = (a, b) => a.inactive - b.inactive;
  return [...starts.sort(byActive), ...words.sort(byActive), ...inn.sort(byActive)].slice(0, limit);
}

/** Tous les produits (pour l'OCR). Tableau vide si la base n'est pas chargée. */
export function allDrugs() {
  return db?.products ?? [];
}

// ---------------------------------------------------------------------
// Codes imprimés sur les boîtes : GTIN (DataMatrix) et CNK (code-barres)
// Fichier séparé, chargé seulement lors du premier scan.
// ---------------------------------------------------------------------
const CODES_URL = 'data/medicaments-be-codes.json';
let codes = null;
let codesLoading = null;

export function loadDrugCodes() {
  if (codesLoading) return codesLoading;
  codesLoading = Promise.all([loadDrugDb(), fetch(CODES_URL).then((r) => (r.ok ? r.json() : null))])
    .then(([base, c]) => {
      // Les deux fichiers doivent venir du même export SAM (positions identiques)
      if (!base || !c || c.samId !== base.meta.samId) throw new Error('codes indisponibles');
      codes = c;
      return codes;
    })
    .catch(() => {
      codesLoading = null;
      return null;
    });
  return codesLoading;
}

/** Produit correspondant aux codes lus sur la boîte, ou null. */
export function findDrugByCodes({ gtins = [], cnks = [] } = {}) {
  if (!db || !codes) return null;
  for (const g of gtins) {
    const i = codes.gtin[g];
    if (i !== undefined) return db.products[i];
  }
  for (const c of cnks) {
    const i = codes.cnk[String(c).padStart(7, '0')];
    if (i !== undefined) return db.products[i];
  }
  return null;
}

/**
 * Molécule correspondant à un nom saisi :
 *  1) nom exact d'un produit ("Medrol 4 mg")
 *  2) nom de marque seul ("Nurofen") : la molécule commune à tous les
 *     produits de cette marque, sel exclu (IBUPROFEN, IBUPROFEN SODIUM,
 *     IBUPROFEN LYSINE -> IBUPROFEN)
 * Renvoie { inn, strength, exact } ou null.
 */
export function resolveDrug(name) {
  if (!db) return null;
  const k = norm(name);
  if (!k) return null;
  const exact = db.byName.get(k);
  if (exact) return { inn: exact.inn, strength: exact.strength, exact: true };
  if (!k.includes(' ')) {
    let group = db.products.filter((p) => p.first === k);
    if (group.some((p) => !p.inactive)) group = group.filter((p) => !p.inactive); // produits commercialisés
    const inn = commonMolecule(group.map((p) => p.inn));
    if (inn) return { inn, strength: '', exact: false };
  }
  return null;
}

/** Début commun (mot par mot) de toutes les molécules, ex. "IBUPROFEN". */
function commonMolecule(inns) {
  if (!inns.length) return '';
  const lists = inns.map((s) => s.split(' '));
  const common = [];
  for (let i = 0; i < lists[0].length; i++) {
    const w = lists[0][i];
    if (w === '/' || !lists.every((l) => l[i] === w)) break;
    common.push(w);
  }
  const inn = common.join(' ');
  return inn.length >= 4 ? inn : '';
}
