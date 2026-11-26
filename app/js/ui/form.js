// =====================================================================
// QREDO - Formulaire : construction, remplissage, lecture
// ---------------------------------------------------------------------
// Champs simples  : attribut data-field="nomDuChamp"
// Cases à cocher  : data-group="implants|conditions" + value="CODE"
// Lignes ajoutées : allergies et médicaments (data-k="...")
// Contacts        : data-contact="0|1" + data-k="name|relation|phone"
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
} from '../data/picklists.js';
import { emptyDossier, medToEn } from '../core/qr-text.js';
import { isDrugDbLoaded, resolveDrug, searchDrugs } from '../core/drug-db.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function option(value, label) {
  const o = document.createElement('option');
  o.value = value;
  o.textContent = label;
  return o;
}

function buildChecks(container, list, group) {
  container.innerHTML = '';
  for (const item of list) {
    const label = document.createElement('label');
    label.className = 'check';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.group = group;
    input.value = item.en;
    label.append(input, ' ' + item.fr);
    container.append(label);
  }
}

/** Prépare listes déroulantes, cases à cocher et suggestions. */
export function setupForm(form, onChange) {
  const sex = $('#sel-sex');
  sex.append(option('', '—'));
  SEXES.forEach((s) => sex.append(option(s.en, s.fr)));

  const blood = $('#sel-blood');
  blood.append(option('', 'Inconnu'));
  BLOOD_GROUPS.forEach((b) => blood.append(option(b, b)));

  $$('.sel-relation').forEach((sel) => RELATIONS.forEach((r) => sel.append(option(r.en, r.fr))));

  buildChecks($('#checks-implants'), IMPLANTS, 'implants');
  buildChecks($('#checks-conditions'), CONDITIONS, 'conditions');

  const dlA = $('#dl-allergens');
  ALLERGENS.forEach((a) => dlA.append(option(a.fr, '')));
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
  b.setAttribute('aria-label', 'Supprimer');
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
  input.placeholder = 'Substance (ex. Pénicilline)';
  input.value = substance || '';
  const sel = document.createElement('select');
  sel.dataset.k = 'reaction';
  REACTIONS.forEach((r) => sel.append(option(r.en, r.fr)));
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
  n.placeholder = 'Médicament (ex. Medrol)';
  n.value = name || '';
  const d = document.createElement('input');
  d.type = 'text';
  d.dataset.k = 'dose';
  d.placeholder = 'Dose (ex. 4 mg)';
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
    const label = `${p.inn}${p.strength ? ' · ' + p.strength : ''}${p.inactive ? ' (plus commercialisé)' : ''}`;
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
    hint.textContent = `→ Molécule : ${r.inn}${r.exact && r.strength ? ' ' + r.strength : ''}`;
    hint.classList.add('med-hint--ok');
    return;
  }
  if (isDrugDbLoaded()) inn.value = ''; // pas trouvé dans la base
  const fallback = inn.value || medToEn(name);
  if (fallback !== name.toUpperCase()) {
    hint.textContent = `→ Molécule : ${fallback}`;
    hint.classList.add('med-hint--ok');
  } else if (isDrugDbLoaded()) {
    hint.textContent = 'Molécule non trouvée : le nom sera écrit tel quel dans le QR.';
  } else {
    hint.textContent = '';
  }
}

/** Après le chargement de la base : met à jour toutes les lignes. */
export function refreshMedRows() {
  $$('#med-list .row').forEach((row) => resolveMedRow(row, { fillDose: false }));
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
  return d;
}
