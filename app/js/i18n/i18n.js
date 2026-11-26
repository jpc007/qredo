// =====================================================================
// QREDO - Traduction de l'interface (7 langues)
// ---------------------------------------------------------------------
// Toutes les traductions sont écrites DANS l'application (js/i18n/*.js) :
// aucun service en ligne, rien n'est téléchargé, tout marche hors ligne.
// Le CONTENU du QR code, lui, reste toujours en anglais médical
// (voir core/qr-text.js) : seul l'affichage change de langue.
//
// Dans le HTML :
//   data-i18n="cle"             -> texte de l'élément
//   data-i18n-html="cle"        -> texte avec mise en forme (<strong>, <em>)
//   data-i18n-placeholder="cle" -> attribut placeholder
//   (idem : -aria-label, -title, -alt, -content, -value)
// =====================================================================

import fr from './fr.js';
import en from './en.js';
import de from './de.js';
import nl from './nl.js';
import it from './it.js';
import pt from './pt.js';
import es from './es.js';

export const LANGUAGES = [
  { code: 'fr', name: 'Français', locale: 'fr-BE' },
  { code: 'en', name: 'English', locale: 'en-GB' },
  { code: 'de', name: 'Deutsch', locale: 'de-BE' },
  { code: 'nl', name: 'Nederlands', locale: 'nl-BE' },
  { code: 'it', name: 'Italiano', locale: 'it-IT' },
  { code: 'pt', name: 'Português', locale: 'pt-PT' },
  { code: 'es', name: 'Español', locale: 'es-ES' },
];

const DICTIONARIES = { fr, en, de, nl, it, pt, es };
const REFERENCE = 'fr'; // langue de référence (textes complets)
const DEFAULT_LANGUAGE = 'en'; // si la langue du téléphone n'est pas proposée
const STORAGE_KEY = 'qredo.lang';
const ATTRIBUTES = ['placeholder', 'aria-label', 'title', 'alt', 'content', 'value'];

const listeners = new Set();

const isSupported = (code) => typeof code === 'string' && Object.hasOwn(DICTIONARIES, code);

// ---------------------------------------------------------------------
// Choix de la langue (fonctionne aussi sous Node : pas de navigateur)
// ---------------------------------------------------------------------
function savedLanguage() {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

/** Langue enregistrée, sinon celle du téléphone ("nl-BE" -> nl), sinon anglais. */
function detectLanguage() {
  const saved = savedLanguage();
  if (isSupported(saved)) return saved;
  const nav = globalThis.navigator;
  const wanted = nav?.languages?.length ? nav.languages : [nav?.language];
  for (const tag of wanted) {
    const code = String(tag ?? '')
      .slice(0, 2)
      .toLowerCase();
    if (isSupported(code)) return code;
  }
  return DEFAULT_LANGUAGE;
}

let current = detectLanguage();
updateDocumentLang();

function updateDocumentLang() {
  if (globalThis.document?.documentElement) globalThis.document.documentElement.lang = current;
}

export function getLanguage() {
  return current;
}

/** Format des nombres et des dates de la langue courante (ex. "nl-BE"). */
export function getLocale() {
  return LANGUAGES.find((l) => l.code === current).locale;
}

/** Change la langue, la mémorise et prévient l'application. */
export function setLanguage(code) {
  if (!isSupported(code) || code === current) return;
  current = code;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, code);
  } catch {
    /* mémoire indisponible (navigation privée) : la langue vaut pour cette visite */
  }
  updateDocumentLang();
  listeners.forEach((fn) => fn(code));
}

/** Appelle fn(code) à chaque changement de langue. */
export function onLanguageChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ---------------------------------------------------------------------
// Traduction
// ---------------------------------------------------------------------
/**
 * Texte traduit. Les {noms} sont remplacés par les paramètres :
 * t('import.doneQr', { who: 'DUPONT Jean' }).
 * Repli : français, puis la clé elle-même (visible = facile à repérer).
 */
export function t(key, params = {}) {
  const text = DICTIONARIES[current][key] ?? DICTIONARIES[REFERENCE][key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

/** Le même texte dans toutes les langues (français d'abord). */
export function translationsOf(key) {
  return LANGUAGES.map((l) => DICTIONARIES[l.code][key]).filter(Boolean);
}

/** Traduit les éléments marqués data-i18n* dans root (et root lui-même). */
export function applyTranslations(root = globalThis.document) {
  if (!root?.querySelectorAll) return;
  const all = (selector) => [...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)];

  for (const el of all('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of all('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
  for (const attr of ATTRIBUTES) {
    const data = `data-i18n-${attr}`;
    for (const el of all(`[${data}]`)) el.setAttribute(attr, t(el.getAttribute(data)));
  }
}
