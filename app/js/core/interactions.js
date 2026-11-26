// =====================================================================
// QREDO - Détection des interactions médicamenteuses (dans l'appareil)
// ---------------------------------------------------------------------
// Compare toutes les paires de médicaments reconnus (molécules / DCI)
// à la table de base data/interactions.js. Aucune IA, aucun réseau.
// Fonction pure : testable sans navigateur.
// =====================================================================

import { DRUG_CLASSES, DUPLICATE_CLASSES, INTERACTION_RULES } from '../data/interactions.js';

const SEVERITY = { contraindicated: 3, avoid: 2, caution: 1 };

// Expressions régulières préparées une fois : molécule = mot(s) entier(s)
const CLASS_PATTERNS = Object.entries(DRUG_CLASSES).map(([cls, members]) => [
  cls,
  members.map((m) => new RegExp(`(^|[^A-Z])${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Z]|$)`)),
]);

/** Composants d'une DCI : "PERINDOPRIL ARGININE / INDAPAMIDE" -> 2 composants. */
function components(inn) {
  return String(inn || '')
    .toUpperCase()
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Familles auxquelles appartient une molécule (ou une association). */
export function classesOf(inn) {
  const parts = components(inn);
  const found = new Set();
  for (const [cls, patterns] of CLASS_PATTERNS) {
    if (parts.some((p) => patterns.some((re) => re.test(p)))) found.add(cls);
  }
  return found;
}

/** Molécule de base d'un composant, sans le sel : "PERINDOPRIL ARGININE" -> "PERINDOPRIL". */
function baseMolecule(component) {
  for (const [, members] of Object.entries(DRUG_CLASSES)) {
    const m = members.find((name) => component.includes(name));
    if (m) return m;
  }
  return component.split(' ')[0];
}

/**
 * Interactions entre les médicaments de la liste.
 * @param {{label: string, inn: string}[]} meds  label = nom saisi, inn = molécule(s)
 * @returns {{a: string, b: string, level: string, risk: string}[]} les plus graves d'abord
 */
export function findInteractions(meds) {
  const items = meds
    .filter((m) => m && m.inn)
    .map((m) => ({ ...m, classes: classesOf(m.inn), bases: new Set(components(m.inn).map(baseMolecule)) }));
  const results = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const x = items[i];
      const y = items[j];
      let best = null;
      const consider = (level, risk) => {
        if (!best || SEVERITY[level] > SEVERITY[best.level]) best = { level, risk };
      };

      // Même molécule dans deux médicaments (ex. deux produits au paracétamol)
      if ([...x.bases].some((b) => y.bases.has(b))) consider('avoid', 'duplicate');

      // Règles de la table, dans les deux sens
      for (const r of INTERACTION_RULES) {
        if ((x.classes.has(r.a) && y.classes.has(r.b)) || (x.classes.has(r.b) && y.classes.has(r.a))) {
          consider(r.level, r.risk);
        }
      }

      // Deux molécules différentes de la même famille (doublon de traitement)
      for (const [cls, d] of Object.entries(DUPLICATE_CLASSES)) {
        if (x.classes.has(cls) && y.classes.has(cls) && ![...x.bases].some((b) => y.bases.has(b))) {
          consider(d.level, d.risk);
        }
      }

      if (best) results.push({ a: x.label, b: y.label, ...best });
    }
  }
  return results.sort((p, q) => SEVERITY[q.level] - SEVERITY[p.level]);
}
