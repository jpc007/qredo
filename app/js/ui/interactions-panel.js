// =====================================================================
// QREDO - Avis au patient : interactions possibles entre médicaments
// ---------------------------------------------------------------------
// Affiché sous la liste des médicaments, pour les médicaments reconnus
// (base SAM ou petite table interne), saisis à la main ou scannés.
// L'avis n'apparaît PAS dans le QR : il s'adresse au patient.
// =====================================================================

import { findInteractions } from '../core/interactions.js';
import { medToEn, toAscii } from '../core/qr-text.js';
import { t } from '../i18n/i18n.js';

/** Molécule d'un médicament s'il est reconnu, sinon '' (pas de vérification). */
function moleculeOf(med) {
  if (med.inn) return med.inn;
  const name = String(med.name || '').trim();
  if (!name) return '';
  const inn = medToEn(name);
  const raw = toAscii(name).replace(/\s+/g, ' ').toUpperCase();
  return inn !== raw ? inn : '';
}

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Met à jour l'encadré d'avertissement selon les médicaments du dossier. */
export function renderInteractions(container, meds) {
  const list = (meds || []).map((m) => ({ label: String(m.name || '').trim(), inn: moleculeOf(m) }));
  const found = findInteractions(list);
  container.innerHTML = '';
  container.hidden = found.length === 0;
  if (!found.length) return;

  container.append(el('p', 'interactions__title', t('interaction.title')));
  const ul = el('ul', 'interactions__list');
  for (const f of found) {
    const li = el('li', `interactions__item interactions__item--${f.level}`);
    li.append(
      el('strong', '', t(`interaction.level.${f.level}`)),
      document.createTextNode(` — ${f.a} + ${f.b} : ${t(`interaction.risk.${f.risk}`)}`.replace(' :', ':')),
    );
    ul.append(li);
  }
  container.append(
    ul,
    el('p', 'interactions__advice', t('interaction.advice')),
    el('p', 'interactions__disclaimer', t('interaction.disclaimer')),
  );
}
