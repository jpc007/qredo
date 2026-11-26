// =====================================================================
// QREDO - Texte du QR code vital
// ---------------------------------------------------------------------
// buildQrText()  : dossier (formulaire)  -> texte anglais compact
// parseQrText()  : texte scanné          -> dossier (pour import)
//
// Format : une information par ligne, "CLE: valeur", éléments séparés
// par "; ". Lisible par un humain ET relisible par la machine.
// Tout est converti en ASCII : 1 caractère = 1 octet dans le QR.
// =====================================================================

import {
  ALLERGENS,
  ANTICOAGULANTS,
  CONDITIONS,
  IMPLANTS,
  MED_BRAND_TO_INN,
  REACTIONS,
  RELATIONS,
} from '../data/picklists.js';

export const QR_HEADER = 'QREDO EMERGENCY MEDICAL ID';
export const BYTE_TARGET = 900; // objectif de lisibilité sur écran de veille
export const BYTE_MAX = 2331; // maximum théorique (version 40, correction M)

// ---------------------------------------------------------------------
// Dossier vide (structure de données de référence)
// ---------------------------------------------------------------------
export function emptyDossier() {
  return {
    lastName: '',
    firstName: '',
    sex: '',
    dob: '', // AAAA-MM-JJ
    languages: '',
    noKnownAllergy: false,
    allergies: [], // [{ substance, reaction }]
    anticoagulants: [], // codes "en"
    implants: [],
    implantsOther: '',
    conditions: [],
    conditionsOther: '',
    meds: [], // [{ name, dose }]
    bloodGroup: '',
    weight: '',
    height: '',
    advanceDirective: false,
    advanceDirectiveDate: '',
    refuseTransfusion: false,
    dnr: false,
    contacts: [
      { name: '', relation: '', phone: '' },
      { name: '', relation: '', phone: '' },
    ],
    gpName: '',
    gpPhone: '',
    notes: '',
    updated: '',
  };
}

// ---------------------------------------------------------------------
// Outils texte
// ---------------------------------------------------------------------

/** Supprime accents et caractères non ASCII : "Françoise" -> "Francoise". */
export function toAscii(s) {
  return String(s ?? '')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .replace(/ß/g, 'ss')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, '');
}

/** Clé de recherche : minuscules, sans accents, espaces normalisés. */
function key(s) {
  return toAscii(s).toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Nettoie un champ libre : pas de retour ligne ni de ";" (séparateur). */
function clean(s, ascii) {
  const t = String(s ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/;/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
  return ascii ? toAscii(t) : t;
}

/** Téléphone : on garde uniquement + et chiffres. */
function phone(s) {
  return String(s ?? '').replace(/[^\d+]/g, '');
}

function ageFrom(dob) {
  const d = new Date(dob);
  if (isNaN(d)) return '';
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : '';
}

/** Découpe un champ "autres" (virgules) en éléments. */
function splitOther(s) {
  return String(s ?? '')
    .split(/[,;]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------
// Dictionnaires de recherche français -> anglais
// ---------------------------------------------------------------------

// Allergènes : on accepte le libellé complet, un morceau ("arachides"),
// ou directement le code anglais ("PEANUT").
const ALLERGEN_LOOKUP = (() => {
  const map = new Map();
  for (const a of ALLERGENS) {
    map.set(key(a.en), a.en);
    map.set(key(a.fr), a.en);
    for (const part of a.fr.split(/[/(),]/)) {
      const k = key(part);
      if (k.length > 2 && !map.has(k)) map.set(k, a.en);
    }
  }
  return map;
})();

export function allergenToEn(substance, ascii = true) {
  const en = ALLERGEN_LOOKUP.get(key(substance));
  if (en) return en;
  const c = clean(substance, ascii);
  return ascii ? c.toUpperCase() : c;
}

/** Nom de médicament -> molécule internationale (si connue). */
export function medToEn(name, ascii = true) {
  const inn = MED_BRAND_TO_INN[key(name)];
  if (inn) return inn;
  const c = clean(name, ascii);
  return ascii ? c.toUpperCase() : c;
}

function doseToEn(dose, ascii) {
  // "5 mg" -> "5MG"
  const c = clean(dose, ascii).replace(/(\d)\s+([a-zA-Zµ])/g, '$1$2');
  return ascii ? c.toUpperCase() : c;
}

const frLabel = (list, en) => list.find((x) => x.en === en)?.fr ?? en;
const isCode = (list, en) => list.some((x) => x.en === en);

// ---------------------------------------------------------------------
// Dossier -> texte du QR
// ---------------------------------------------------------------------
/**
 * Construit le texte du QR vital, dans l'ordre d'importance pour les
 * secours : identité, allergies, anticoagulants, implants, directives,
 * maladies, médicaments, groupe sanguin, contacts...
 * @param {object} d dossier
 * @param {boolean} ascii false = garder les accents (pour comparaison)
 */
export function buildQrText(d, ascii = true) {
  const L = [QR_HEADER];
  const add = (k, v) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') L.push(`${k}: ${v}`);
  };
  const up = (s) => (ascii ? clean(s, true).toUpperCase() : clean(s, false).toUpperCase());

  // Identité
  const name = [up(d.lastName), clean(d.firstName, ascii)].filter(Boolean).join(' ');
  add('NAME', name);
  add('SEX', d.sex);
  if (d.dob) {
    const age = ageFrom(d.dob);
    add('DOB', d.dob + (age !== '' ? ` (AGE ${age})` : ''));
  }

  // Allergies
  const allergies = (d.allergies || [])
    .filter((a) => String(a.substance ?? '').trim())
    .map((a) => allergenToEn(a.substance, ascii) + (a.reaction ? ` (${a.reaction})` : ''));
  if (allergies.length) add('ALLERGY', allergies.join('; '));
  else if (d.noKnownAllergy) add('ALLERGY', 'NONE KNOWN');

  // Anticoagulants
  add('ANTICOAGULANT', (d.anticoagulants || []).join('; '));

  // Implants
  const implants = [...(d.implants || []), ...splitOther(d.implantsOther).map(up)];
  add('IMPLANT', implants.join('; '));

  // Directives et refus
  const dir = [];
  if (d.advanceDirective)
    dir.push('ADVANCE DIRECTIVE' + (d.advanceDirectiveDate ? ' ' + d.advanceDirectiveDate : ''));
  if (d.refuseTransfusion) dir.push('REFUSES BLOOD TRANSFUSION');
  if (d.dnr) dir.push('DNR');
  add('DIRECTIVE', dir.join('; '));

  // Maladies
  const conditions = [...(d.conditions || []), ...splitOther(d.conditionsOther).map(up)];
  add('CONDITION', conditions.join('; '));

  // Médicaments
  const meds = (d.meds || [])
    .filter((m) => String(m.name ?? '').trim())
    .map((m) => [medToEn(m.name, ascii), doseToEn(m.dose, ascii)].filter(Boolean).join(' '));
  add('MEDS', meds.join('; '));

  // Mesures
  add('BLOOD', d.bloodGroup);
  if (d.weight) add('WEIGHT', `${d.weight}KG`);
  if (d.height) add('HEIGHT', `${d.height}CM`);

  // Contacts
  for (const c of d.contacts || []) {
    if (!String(c.name ?? '').trim() && !phone(c.phone)) continue;
    const parts = [up(c.name)];
    if (c.relation) parts.push(`(${c.relation})`);
    if (phone(c.phone)) parts.push(phone(c.phone));
    add('CONTACT', parts.filter(Boolean).join(' '));
  }
  const gp = [up(d.gpName), phone(d.gpPhone)].filter(Boolean).join(' ');
  add('GP', gp);

  // Divers
  add('LANG', up(d.languages));
  add('NOTE', clean(d.notes, ascii));
  add('UPDATED', d.updated);

  return L.join('\n');
}

/** Nombre d'octets réels dans le QR (UTF-8). */
export function byteLength(text) {
  return new TextEncoder().encode(text).length;
}

// ---------------------------------------------------------------------
// Texte scanné -> dossier (import depuis un QR QREDO)
// ---------------------------------------------------------------------
export function isQredoText(text) {
  return String(text ?? '').trim().startsWith(QR_HEADER);
}

export function parseQrText(text) {
  if (!isQredoText(text)) {
    throw new Error('Ce QR code n’est pas un QR code QREDO.');
  }
  const d = emptyDossier();
  d.contacts = [];
  const items = (v) =>
    v
      .split(';')
      .map((x) => x.trim())
      .filter(Boolean);

  for (const raw of text.split(/\r?\n/)) {
    const m = raw.match(/^([A-Z]+):\s?(.*)$/);
    if (!m) continue;
    const [, k, v] = m;

    switch (k) {
      case 'NAME': {
        // Le nom de famille est en MAJUSCULES, le prénom non.
        const tokens = v.split(' ');
        let i = 0;
        while (i < tokens.length - 1 && tokens[i] === tokens[i].toUpperCase()) i++;
        if (i === 0) i = 1;
        d.lastName = tokens.slice(0, i).join(' ');
        d.firstName = tokens.slice(i).join(' ');
        break;
      }
      case 'SEX':
        d.sex = v.trim();
        break;
      case 'DOB':
        d.dob = v.trim().slice(0, 10);
        break;
      case 'ALLERGY':
        if (v.trim() === 'NONE KNOWN') {
          d.noKnownAllergy = true;
          break;
        }
        for (const it of items(v)) {
          const a = it.match(/^(.*?)\s*(?:\(([A-Z ]+)\))?$/);
          const sub = a[1];
          const reaction = isCode(REACTIONS, a[2]) ? a[2] : '';
          const label = isCode(ALLERGENS, sub) ? frLabel(ALLERGENS, sub) : sub;
          d.allergies.push({ substance: label, reaction });
        }
        break;
      case 'ANTICOAGULANT':
        for (const it of items(v)) {
          if (isCode(ANTICOAGULANTS, it)) d.anticoagulants.push(it);
          else d.meds.push({ name: it, dose: '' });
        }
        break;
      case 'IMPLANT': {
        const other = [];
        for (const it of items(v)) (isCode(IMPLANTS, it) ? d.implants : other).push(it);
        d.implantsOther = other.join(', ');
        break;
      }
      case 'CONDITION': {
        const other = [];
        for (const it of items(v)) (isCode(CONDITIONS, it) ? d.conditions : other).push(it);
        d.conditionsOther = other.join(', ');
        break;
      }
      case 'DIRECTIVE':
        for (const it of items(v)) {
          if (it.startsWith('ADVANCE DIRECTIVE')) {
            d.advanceDirective = true;
            d.advanceDirectiveDate = (it.match(/\d{4}-\d{2}-\d{2}/) || [''])[0];
          } else if (it === 'REFUSES BLOOD TRANSFUSION') d.refuseTransfusion = true;
          else if (it === 'DNR') d.dnr = true;
        }
        break;
      case 'MEDS':
        for (const it of items(v)) {
          const mm = it.match(/^(.*?)\s+(\d.*)$/);
          d.meds.push(mm ? { name: mm[1], dose: mm[2] } : { name: it, dose: '' });
        }
        break;
      case 'BLOOD':
        d.bloodGroup = v.trim();
        break;
      case 'WEIGHT':
        d.weight = parseInt(v, 10) || '';
        break;
      case 'HEIGHT':
        d.height = parseInt(v, 10) || '';
        break;
      case 'CONTACT': {
        const c = v.match(/^(.*?)\s*(?:\(([A-Z]+)\))?\s*(\+?\d+)?$/);
        d.contacts.push({
          name: c[1] || '',
          relation: isCode(RELATIONS, c[2]) ? c[2] : '',
          phone: c[3] || '',
        });
        break;
      }
      case 'GP': {
        const g = v.match(/^(.*?)\s*(\+?\d+)?$/);
        d.gpName = g[1] || '';
        d.gpPhone = g[2] || '';
        break;
      }
      case 'LANG':
        d.languages = v.trim();
        break;
      case 'NOTE':
        d.notes = v.trim();
        break;
      case 'UPDATED':
        d.updated = v.trim();
        break;
    }
  }
  while (d.contacts.length < 2) d.contacts.push({ name: '', relation: '', phone: '' });
  d.contacts = d.contacts.slice(0, 2);
  return d;
}
