// =====================================================================
// QREDO - Formulaire : construction, remplissage, lecture
// ---------------------------------------------------------------------
// Champs simples  : attribut data-field="nomDuChamp"
// Cases à cocher  : data-group="implants|conditions" + value="CODE"
// Lignes ajoutées : allergies, médicaments, spécialistes (data-k="...")
// Contacts        : data-contact="0|1" + data-k="name|relation|phone"
// Les libellés portent une clé de traduction (data-i18n) : au changement
// de langue, seul le texte change ; valeurs et cases cochées restent.
// =====================================================================

import {
  ALLERGENS,
  BLOOD_GROUPS,
  CONDITIONS,
  IMPLANTS,
  MED_BRAND_TO_INN,
  REACTIONS,
  RELATIONS,
  SEXES,
  SPECIALTIES,
} from '../data/picklists.js';
import { emptyDossier, medToEn } from '../core/qr-text.js';
import { isDrugDbLoaded, resolveDrug, searchDrugs } from '../core/drug-db.js';
import { applyTranslations, t } from '../i18n/i18n.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function option(value, label) {
  const o = document.createElement('option');
  o.value = value;
  o.textContent = label;
  return o;
}

/** Option dont le libellé est traduit (clé i18n) ; la valeur reste le code anglais. */
function translatedOption(value, key) {
  const o = option(value, t(key));
  o.dataset.i18n = key;
  return o;
}

/** Remplit une liste : option vide (traduite si emptyKey), puis un code par option. */
function fillSelect(sel, emptyKey, codes, prefix) {
  sel.append(emptyKey ? translatedOption('', emptyKey) : option('', '—'));
  codes.forEach((code) => sel.append(translatedOption(code, `${prefix}.${code}`)));
}

function buildChecks(container, codes, group, prefix) {
  container.innerHTML = '';
  for (const code of codes) {
    const label = document.createElement('label');
    label.className = 'check';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.group = group;
    input.value = code;
    const text = document.createElement('span');
    text.dataset.i18n = `${prefix}.${code}`;
    label.append(input, ' ', text);
    container.append(label);
  }
  applyTranslations(container);
}

/** Prépare listes déroulantes, cases à cocher et suggestions. */
export function setupForm(form, onChange) {
  fillSelect($('#sel-sex'), null, SEXES, 'sex');

  const blood = $('#sel-blood');
  blood.append(translatedOption('', 'measures.bloodUnknown'));
  BLOOD_GROUPS.forEach((b) => blood.append(option(b, b)));

  $$('.sel-relation').forEach((sel) => fillSelect(sel, 'relation.choose', RELATIONS, 'relation'));

  buildChecks($('#checks-implants'), IMPLANTS, 'implants', 'implant');
  buildChecks($('#checks-conditions'), CONDITIONS, 'conditions', 'condition');

  // Suggestions d'allergènes : la valeur proposée est le libellé traduit
  const dlA = $('#dl-allergens');
  for (const code of ALLERGENS) {
    const o = option(t(`allergen.${code}`), '');
    o.dataset.i18nValue = `allergen.${code}`;
    dlA.append(o);
  }
  // Suggestions de médicaments : base SAM (si chargée), sinon petite liste interne
  const dlM = $('#dl-meds');
  Object.keys(MED_BRAND_TO_INN).forEach((k) => dlM.append(option(k.charAt(0).toUpperCase() + k.slice(1), '')));
  $('#med-list').addEventListener('input', (e) => {
    if (e.target.dataset.k !== 'name') return;
    updateMedSuggestions(e.target.value);
    resolveMedRow(e.target.closest('.row'), { fillDose: true });
  });

  $('#btn-add-allergy').addEventListener('click', () => {
    addAllergyRow({ substance: '', reaction: '' }).querySelector('input').focus();
  });
  $('#btn-add-med').addEventListener('click', () => {
    addMedRow({ name: '', dose: '' }).querySelector('input').focus();
  });

  // Médecins spécialistes : suggestions de spécialités traduites
  const dlS = $('#dl-specialties');
  for (const code of SPECIALTIES) {
    const o = option(t(`specialty.${code}`), '');
    o.dataset.i18nValue = `specialty.${code}`;
    dlS.append(o);
  }
  $('#btn-add-specialist').addEventListener('click', () => {
    addSpecialistRow({ name: '', specialty: '', phone: '' }).querySelector('input').focus();
  });

  // Toute modification du formulaire -> mise à jour du QR
  form.addEventListener('input', onChange);
  form.addEventListener('change', onChange);
  form.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove]');
    if (btn) {
      btn.closest('.row').remove();
      onChange();
    }
  });
}

function removeButton() {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn btn--icon';
  b.dataset.remove = '';
  b.dataset.i18nAriaLabel = 'common.remove';
  b.setAttribute('aria-label', t('common.remove'));
  b.textContent = '✕';
  return b;
}

export function addAllergyRow({ substance, reaction }) {
  const row = document.createElement('div');
  row.className = 'row row--allergy';
  const input = document.createElement('input');
  input.type = 'text';
  input.dataset.k = 'substance';
  input.setAttribute('list', 'dl-allergens');
  input.dataset.i18nPlaceholder = 'allergies.placeholder';
  input.placeholder = t('allergies.placeholder');
  input.value = substance || '';
  const sel = document.createElement('select');
  sel.dataset.k = 'reaction';
  fillSelect(sel, 'reaction.choose', REACTIONS, 'reaction');
  sel.value = reaction || '';
  row.append(input, sel, removeButton());
  $('#allergy-list').append(row);
  return row;
}

export function addMedRow({ name, dose, inn }) {
  const row = document.createElement('div');
  row.className = 'row row--med';
  const n = document.createElement('input');
  n.type = 'text';
  n.dataset.k = 'name';
  n.setAttribute('list', 'dl-meds');
  n.setAttribute('autocomplete', 'off');
  n.dataset.i18nPlaceholder = 'meds.namePlaceholder';
  n.placeholder = t('meds.namePlaceholder');
  n.value = name || '';
  const d = document.createElement('input');
  d.type = 'text';
  d.dataset.k = 'dose';
  d.dataset.i18nPlaceholder = 'meds.dosePlaceholder';
  d.placeholder = t('meds.dosePlaceholder');
  d.value = dose || '';
  // Molécule (DCI) trouvée dans la base SAM : c'est elle qui va dans le QR
  const i = document.createElement('input');
  i.type = 'hidden';
  i.dataset.k = 'inn';
  i.value = inn || '';
  const hint = document.createElement('div');
  hint.className = 'med-hint';
  row.append(n, d, removeButton(), i, hint);
  $('#med-list').append(row);
  resolveMedRow(row, { fillDose: false });
  return row;
}

/** Remplit la liste de suggestions avec les médicaments correspondants. */
function updateMedSuggestions(query) {
  if (!isDrugDbLoaded()) return;
  const dl = $('#dl-meds');
  dl.innerHTML = '';
  for (const p of searchDrugs(query)) {
    const label = `${p.inn}${p.strength ? ' · ' + p.strength : ''}${p.inactive ? ` (${t('meds.inactive')})` : ''}`;
    dl.append(option(p.name, label));
  }
}

/**
 * Cherche la molécule du médicament saisi et l'affiche sous la ligne.
 * fillDose : préremplit la dose si le produit exact est reconnu.
 */
export function resolveMedRow(row, { fillDose = false } = {}) {
  const name = $('[data-k="name"]', row).value.trim();
  const dose = $('[data-k="dose"]', row);
  const inn = $('[data-k="inn"]', row);
  const hint = $('.med-hint', row);
  hint.className = 'med-hint';
  if (!name) {
    inn.value = '';
    hint.textContent = '';
    return;
  }
  const r = resolveDrug(name);
  if (r) {
    inn.value = r.inn;
    if (fillDose && r.exact && r.strength && !dose.value.trim()) dose.value = r.strength;
    hint.textContent = t('meds.molecule', { inn: r.exact && r.strength ? `${r.inn} ${r.strength}` : r.inn });
    hint.classList.add('med-hint--ok');
    return;
  }
  if (isDrugDbLoaded()) inn.value = ''; // pas trouvé dans la base
  const fallback = inn.value || medToEn(name);
  if (fallback !== name.toUpperCase()) {
    hint.textContent = t('meds.molecule', { inn: fallback });
    hint.classList.add('med-hint--ok');
  } else if (isDrugDbLoaded()) {
    hint.textContent = t('meds.notFound');
  } else {
    hint.textContent = '';
  }
}

/** Après le chargement de la base ou un changement de langue : met à jour toutes les lignes. */
export function refreshMedRows() {
  $$('#med-list .row').forEach((row) => resolveMedRow(row, { fillDose: false }));
}

/** Ligne "médecin spécialiste" : nom, spécialité (suggestions traduites), téléphone. */
export function addSpecialistRow({ name, specialty, phone }) {
  const row = document.createElement('div');
  row.className = 'row row--specialist';
  const input = (k, type, placeholderKey, value) => {
    const i = document.createElement('input');
    i.type = type;
    i.dataset.k = k;
    i.dataset.i18nPlaceholder = placeholderKey;
    i.placeholder = t(placeholderKey);
    i.value = value || '';
    return i;
  };
  const sp = input('specialty', 'text', 'specialists.specialtyPlaceholder', specialty);
  sp.setAttribute('list', 'dl-specialties');
  row.append(
    input('name', 'text', 'specialists.namePlaceholder', name),
    sp,
    input('phone', 'tel', 'specialists.phonePlaceholder', phone),
    removeButton(),
  );
  $('#specialist-list').append(row);
  return row;
}

/** Remplit le formulaire avec un dossier. */
export function fillForm(form, d) {
  for (const el of $$('[data-field]', form)) {
    const v = d[el.dataset.field];
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = v ?? '';
  }
  for (const el of $$('[data-group]', form)) {
    el.checked = (d[el.dataset.group] || []).includes(el.value);
  }
  $('#allergy-list').innerHTML = '';
  (d.allergies || []).forEach(addAllergyRow);
  $('#med-list').innerHTML = '';
  (d.meds || []).forEach(addMedRow);
  $('#specialist-list').innerHTML = '';
  (d.specialists || []).forEach(addSpecialistRow);

  for (const box of $$('[data-contact]', form)) {
    const c = (d.contacts || [])[+box.dataset.contact] || {};
    for (const el of $$('[data-k]', box)) el.value = c[el.dataset.k] ?? '';
  }
}

/** Lit le formulaire et renvoie un dossier. */
export function readForm(form) {
  const d = emptyDossier();
  for (const el of $$('[data-field]', form)) {
    d[el.dataset.field] = el.type === 'checkbox' ? el.checked : el.value.trim();
  }
  for (const group of ['implants', 'conditions']) {
    d[group] = $$(`[data-group="${group}"]:checked`, form).map((el) => el.value);
  }
  const rowData = (row) => Object.fromEntries($$('[data-k]', row).map((el) => [el.dataset.k, el.value.trim()]));
  d.allergies = $$('#allergy-list .row').map(rowData);
  d.meds = $$('#med-list .row').map(rowData);
  d.contacts = $$('[data-contact]', form).map(rowData);
  d.specialists = $$('#specialist-list .row').map(rowData);
  return d;
}
