// =====================================================================
// QREDO - Formulaire : construction, remplissage, lecture
// ---------------------------------------------------------------------
// Champs simples  : attribut data-field="nomDuChamp"
// Cases à cocher  : data-group="anticoagulants" + value="CODE"
// Lignes ajoutées : allergies et médicaments (data-k="...")
// Contacts        : data-contact="0|1" + data-k="name|relation|phone"
// =====================================================================

import {
  ALLERGENS,
  ANTICOAGULANTS,
  BLOOD_GROUPS,
  CONDITIONS,
  IMPLANTS,
  MED_BRAND_TO_INN,
  REACTIONS,
  RELATIONS,
  SEXES,
} from '../data/picklists.js';
import { emptyDossier } from '../core/qr-text.js';

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

  buildChecks($('#checks-anticoagulants'), ANTICOAGULANTS, 'anticoagulants');
  buildChecks($('#checks-implants'), IMPLANTS, 'implants');
  buildChecks($('#checks-conditions'), CONDITIONS, 'conditions');

  const dlA = $('#dl-allergens');
  ALLERGENS.forEach((a) => dlA.append(option(a.fr, '')));
  const dlM = $('#dl-meds');
  Object.keys(MED_BRAND_TO_INN).forEach((k) => dlM.append(option(k.charAt(0).toUpperCase() + k.slice(1), '')));

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

export function addMedRow({ name, dose }) {
  const row = document.createElement('div');
  row.className = 'row row--med';
  const n = document.createElement('input');
  n.type = 'text';
  n.dataset.k = 'name';
  n.setAttribute('list', 'dl-meds');
  n.placeholder = 'Médicament (ex. Coversyl)';
  n.value = name || '';
  const d = document.createElement('input');
  d.type = 'text';
  d.dataset.k = 'dose';
  d.placeholder = 'Dose (ex. 5 mg)';
  d.value = dose || '';
  row.append(n, d, removeButton());
  $('#med-list').append(row);
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
  for (const group of ['anticoagulants', 'implants', 'conditions']) {
    d[group] = $$(`[data-group="${group}"]:checked`, form).map((el) => el.value);
  }
  const rowData = (row) => Object.fromEntries($$('[data-k]', row).map((el) => [el.dataset.k, el.value.trim()]));
  d.allergies = $$('#allergy-list .row').map(rowData);
  d.meds = $$('#med-list .row').map(rowData);
  d.contacts = $$('[data-contact]', form).map(rowData);
  return d;
}
