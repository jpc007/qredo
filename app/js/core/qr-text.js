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
  CONDITIONS,
  IMPLANTS,
  MED_BRAND_TO_INN,
  REACTIONS,
  RELATIONS,
  SPECIALTIES,
  SURGERIES,
  DISABILITIES,
  VACCINES,
  INSURANCE_TYPES,
} from '../data/picklists.js';
import { t, translationsOf } from '../i18n/i18n.js';

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
    address: '',
    languages: '',
    noKnownAllergy: false,
    allergies: [], // [{ substance, reaction }]
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
    specialists: [], // [{ name, specialty, phone }]
    surgeries: [], // [{ name, year }]
    disabilities: [], // codes
    disabilitiesOther: '',
    hospDate: '', // dernière hospitalisation : date d'entrée, hôpital, raison
    hospPlace: '',
    hospReason: '',
    vaccines: [], // [{ name, date }] date de la dernière injection
    trustedName: '', // personne de confiance (une seule)
    trustedRelation: '',
    trustedPhone: '',
    insurances: [], // [{ name, number, type }]
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
// Dictionnaires de recherche (7 langues) -> anglais
// ---------------------------------------------------------------------

/** Ajoute un libellé ("Arachides / cacahuètes") et ses morceaux au dictionnaire. */
function addAllergenLabel(map, label, code, replace) {
  if (replace || !map.has(key(label))) map.set(key(label), code);
  for (const part of label.split(/[/(),]/)) {
    const k = key(part);
    if (k.length > 2 && !map.has(k)) map.set(k, code);
  }
}

// Allergènes : on accepte le libellé complet, un morceau ("arachides"),
// le code anglais ("PEANUT"), et cela dans les 7 langues ("Erdnüsse",
// "pinda's", "cacahuetes"…). Le français passe en premier, exactement
// comme avant : le QR des dossiers existants ne change pas.
const ALLERGEN_LOOKUP = (() => {
  const map = new Map();
  const labels = (code) => translationsOf(`allergen.${code}`); // français en premier
  for (const code of ALLERGENS) {
    map.set(key(code), code);
    addAllergenLabel(map, labels(code)[0], code, true);
  }
  for (const code of ALLERGENS) {
    for (const label of labels(code).slice(1)) addAllergenLabel(map, label, code, false);
  }
  return map;
})();

// Spécialités : libellé dans n'importe laquelle des 7 langues, ou code anglais
/** Dictionnaire libellé (7 langues) -> code anglais, pour une liste de codes. */
function makeLookup(codes, prefix) {
  const map = new Map();
  for (const code of codes) {
    map.set(key(code), code);
    for (const label of translationsOf(`${prefix}.${code}`)) {
      map.set(key(label), code);
      for (const part of label.split(/[/(),–—]/)) if (key(part).length > 3 && !map.has(key(part))) map.set(key(part), code);
    }
  }
  return map;
}
const VACCINE_LOOKUP = makeLookup(VACCINES, 'vaccine');
const INSURANCE_TYPE_LOOKUP = makeLookup(INSURANCE_TYPES, 'insurancetype');

/** Texte saisi -> code anglais si reconnu, sinon texte nettoyé (majuscules, sans parenthèses). */
function lookupToEn(map, text, ascii = true) {
  const code = map.get(key(text));
  if (code) return code;
  const c = clean(text, ascii).replace(/[()]/g, '');
  return ascii ? c.toUpperCase() : c;
}
export const vaccineToEn = (name, ascii = true) => lookupToEn(VACCINE_LOOKUP, name, ascii);
export const insuranceTypeToEn = (type, ascii = true) => lookupToEn(INSURANCE_TYPE_LOOKUP, type, ascii);

const SPECIALTY_LOOKUP = (() => {
  const map = new Map();
  for (const code of SPECIALTIES) {
    map.set(key(code), code);
    for (const label of translationsOf(`specialty.${code}`)) {
      map.set(key(label), code);
      for (const part of label.split('/')) if (key(part).length > 2) map.set(key(part), code);
    }
  }
  return map;
})();

// Opérations : libellé dans les 7 langues (ou un morceau : "cœlioscopie"), ou code anglais
const SURGERY_LOOKUP = (() => {
  const map = new Map();
  for (const code of SURGERIES) {
    map.set(key(code), code);
    for (const label of translationsOf(`surgery.${code}`)) {
      map.set(key(label), code);
      for (const part of label.split(/[/(),]/)) if (key(part).length > 3 && !map.has(key(part))) map.set(key(part), code);
    }
  }
  return map;
})();

/** Opération saisie -> code anglais ("Appendicectomie" -> "APPENDECTOMY"), sinon texte nettoyé. */
export function surgeryToEn(name, ascii = true) {
  const code = SURGERY_LOOKUP.get(key(name));
  if (code) return code;
  const c = clean(name, ascii).replace(/[()]/g, '');
  return ascii ? c.toUpperCase() : c;
}

/** Spécialité saisie -> code anglais ("Cardiologue" -> "CARDIOLOGY"), sinon texte nettoyé. */
export function specialtyToEn(specialty, ascii = true) {
  const code = SPECIALTY_LOOKUP.get(key(specialty));
  if (code) return code;
  const c = clean(specialty, ascii).replace(/[()]/g, '');
  return ascii ? c.toUpperCase() : c;
}

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

const isCode = (list, code) => list.includes(code);

// ---------------------------------------------------------------------
// Dossier -> texte du QR
// ---------------------------------------------------------------------
/**
 * Construit le texte du QR vital, dans l'ordre d'importance pour les
 * secours : identité, allergies, implants, directives,
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
  add('ADDRESS', clean(d.address, ascii));

  // Allergies
  const allergies = (d.allergies || [])
    .filter((a) => String(a.substance ?? '').trim())
    .map((a) => allergenToEn(a.substance, ascii) + (a.reaction ? ` (${a.reaction})` : ''));
  if (allergies.length) add('ALLERGY', allergies.join('; '));
  else if (d.noKnownAllergy) add('ALLERGY', 'NONE KNOWN');

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

  // Handicap
  const disabilities = [...(d.disabilities || []), ...splitOther(d.disabilitiesOther).map(up)];
  add('DISABILITY', disabilities.join('; '));

  // Opérations chirurgicales (avec l'année si connue)
  const surgeries = (d.surgeries || [])
    .filter((s) => String(s.name ?? '').trim())
    .map((s) => {
      const year = String(s.year ?? '').replace(/\D/g, '').slice(0, 4);
      return surgeryToEn(s.name, ascii) + (year ? ` (${year})` : '');
    });
  add('SURGERY', surgeries.join('; '));

  // Dernière hospitalisation : date, (hôpital), raison
  if (d.hospDate || String(d.hospPlace ?? '').trim() || String(d.hospReason ?? '').trim()) {
    const place = up(d.hospPlace).replace(/[()]/g, '');
    add('HOSPITALIZATION', [d.hospDate, place ? `(${place})` : '', up(d.hospReason)].filter(Boolean).join(' '));
  }

  // Médicaments : molécule de la base SAM si reconnue (m.inn), sinon conversion locale
  const meds = (d.meds || [])
    .filter((m) => String(m.name ?? '').trim())
    .map((m) => {
      const inn = m.inn ? clean(m.inn, ascii).toUpperCase() : medToEn(m.name, ascii);
      return [inn, doseToEn(m.dose, ascii)].filter(Boolean).join(' ');
    });
  add('MEDS', meds.join('; '));

  // Vaccins : date de la dernière injection
  const vaccines = (d.vaccines || [])
    .filter((v) => String(v.name ?? '').trim())
    .map((v) => [vaccineToEn(v.name, ascii), String(v.date ?? '').trim()].filter(Boolean).join(' '));
  add('VACCINE', vaccines.join('; '));

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
  // Personne de confiance (une seule)
  if (String(d.trustedName ?? '').trim() || phone(d.trustedPhone)) {
    const parts = [up(d.trustedName)];
    if (d.trustedRelation) parts.push(`(${d.trustedRelation})`);
    if (phone(d.trustedPhone)) parts.push(phone(d.trustedPhone));
    add('TRUSTED PERSON', parts.filter(Boolean).join(' '));
  }
  const gp = [up(d.gpName), phone(d.gpPhone)].filter(Boolean).join(' ');
  add('GP', gp);

  // Médecins spécialistes (une ligne chacun)
  for (const s of d.specialists || []) {
    if (!String(s.name ?? '').trim() && !phone(s.phone)) continue;
    const parts = [up(s.name)];
    if (String(s.specialty ?? '').trim()) parts.push(`(${specialtyToEn(s.specialty, ascii)})`);
    if (phone(s.phone)) parts.push(phone(s.phone));
    add('SPECIALIST', parts.filter(Boolean).join(' '));
  }

  // Assurances : nom, numéro de police, type (rapatriement, hospitalisation…)
  const insurances = (d.insurances || [])
    .filter((i) => String(i.name ?? '').trim() || String(i.number ?? '').trim())
    .map((i) => {
      const number = String(i.number ?? '').replace(/[^A-Za-z0-9./-]/g, '');
      const type = String(i.type ?? '').trim() ? `(${insuranceTypeToEn(i.type, ascii)})` : '';
      return [up(i.name).replace(/[()]/g, ''), number ? `NO:${number}` : '', type].filter(Boolean).join(' ');
    });
  add('INSURANCE', insurances.join('; '));

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
    throw new Error(t('import.notQredo'));
  }
  const d = emptyDossier();
  d.contacts = [];
  const items = (v) =>
    v
      .split(';')
      .map((x) => x.trim())
      .filter(Boolean);

  for (const raw of text.split(/\r?\n/)) {
    const m = raw.match(/^([A-Z][A-Z ]*):\s?(.*)$/); // clé : mots en majuscules
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
      case 'ADDRESS':
        d.address = v.trim();
        break;
      case 'ALLERGY':
        if (v.trim() === 'NONE KNOWN') {
          d.noKnownAllergy = true;
          break;
        }
        for (const it of items(v)) {
          const a = it.match(/^(.*?)\s*(?:\(([A-Z ]+)\))?$/);
          const sub = a[1];
          // Anciens QR : "ANAPHYLAXIS" n'existe plus -> converti en "SEVERE"
          const r = a[2] === 'ANAPHYLAXIS' ? 'SEVERE' : a[2];
          const reaction = isCode(REACTIONS, r) ? r : '';
          // Code connu -> libellé dans la langue de l'utilisateur
          const label = isCode(ALLERGENS, sub) ? t(`allergen.${sub}`) : sub;
          d.allergies.push({ substance: label, reaction });
        }
        break;
      case 'ANTICOAGULANT':
        // Ancien format (rubrique supprimée) : repris dans les médicaments
        for (const it of items(v)) d.meds.push({ name: it, dose: '' });
        break;
      case 'IMPLANT': {
        const other = [];
        for (const it of items(v)) (isCode(IMPLANTS, it) ? d.implants : other).push(it);
        d.implantsOther = other.join(', ');
        break;
      }
      case 'CONDITION': {
        const other = [];
        for (const it of items(v)) {
          if (isCode(CONDITIONS, it)) d.conditions.push(it);
          else if (isCode(DISABILITIES, it)) d.disabilities.push(it); // anciens QR (malentendant…)
          else other.push(it);
        }
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
      case 'DISABILITY': {
        const other = [];
        for (const it of items(v)) (isCode(DISABILITIES, it) ? d.disabilities : other).push(it);
        d.disabilitiesOther = other.join(', ');
        break;
      }
      case 'HOSPITALIZATION': {
        const h = v.match(/^(\d{4}-\d{2}-\d{2})?\s*(?:\(([^)]*)\))?\s*(.*)$/);
        d.hospDate = h[1] || '';
        d.hospPlace = h[2] || '';
        d.hospReason = h[3] || '';
        break;
      }
      case 'VACCINE':
        for (const it of items(v)) {
          const m = it.match(/^(.*?)\s*(\d{4}(?:-\d{2}(?:-\d{2})?)?)?$/);
          const code = m[1];
          d.vaccines.push({ name: isCode(VACCINES, code) ? t(`vaccine.${code}`) : code, date: m[2] || '' });
        }
        break;
      case 'TRUSTED PERSON': {
        const c = v.match(/^(.*?)\s*(?:\(([A-Z]+)\))?\s*(\+?\d+)?$/);
        d.trustedName = c[1] || '';
        d.trustedRelation = isCode(RELATIONS, c[2]) ? c[2] : '';
        d.trustedPhone = c[3] || '';
        break;
      }
      case 'INSURANCE':
        for (const it of items(v)) {
          const m = it.match(/^(.*?)(?:\s+NO:(\S+))?(?:\s*\(([^)]*)\))?$/);
          const type = m[3] || '';
          d.insurances.push({
            name: m[1] || '',
            number: m[2] || '',
            type: isCode(INSURANCE_TYPES, type) ? t(`insurancetype.${type}`) : type,
          });
        }
        break;
      case 'SURGERY':
        for (const it of items(v)) {
          const m = it.match(/^(.*?)\s*(?:\((\d{4})\))?$/);
          const code = m[1];
          d.surgeries.push({ name: isCode(SURGERIES, code) ? t(`surgery.${code}`) : code, year: m[2] || '' });
        }
        break;
      case 'SPECIALIST': {
        const s = v.match(/^(.*?)\s*(?:\(([^)]*)\))?\s*(\+?\d+)?$/);
        const code = s[2] || '';
        d.specialists.push({
          name: s[1] || '',
          specialty: isCode(SPECIALTIES, code) ? t(`specialty.${code}`) : code,
          phone: s[3] || '',
        });
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
