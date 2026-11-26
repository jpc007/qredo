// =====================================================================
// QREDO - Menu "⋮" de l'en-tête : choix de la langue
// ---------------------------------------------------------------------
// Gros boutons (personnes âgées), au doigt, à la souris ou au clavier :
// Échap ou un toucher à côté pour fermer, flèches pour se déplacer.
// Les noms des langues sont écrits dans leur propre langue.
// =====================================================================

import { getLanguage, LANGUAGES, onLanguageChange, setLanguage } from '../i18n/i18n.js';

const $ = (id) => document.getElementById(id);

function languageItem({ code, name }) {
  const item = document.createElement('button');
  item.type = 'button';
  item.className = 'menu__item';
  item.setAttribute('role', 'menuitemradio');
  item.lang = code;
  item.dataset.lang = code;
  const check = document.createElement('span');
  check.className = 'menu__check';
  check.setAttribute('aria-hidden', 'true');
  check.textContent = '✓';
  item.append(check, name);
  return item;
}

export function setupLanguageMenu() {
  const button = $('btn-menu');
  const list = $('menu-list');
  const items = LANGUAGES.map(languageItem);
  list.append(...items);

  const isOpen = () => !list.hidden;
  const currentItem = () => items.find((i) => i.dataset.lang === getLanguage()) ?? items[0];

  function markCurrent() {
    for (const item of items) item.setAttribute('aria-checked', String(item.dataset.lang === getLanguage()));
  }

  function open() {
    list.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    currentItem().focus();
  }

  function close({ focusButton = false } = {}) {
    list.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (focusButton) button.focus();
  }

  /** Flèches haut / bas : passe à la langue précédente / suivante. */
  function moveFocus(step) {
    const i = items.indexOf(document.activeElement);
    items[(i + step + items.length) % items.length].focus();
  }

  button.addEventListener('click', () => (isOpen() ? close() : open()));
  for (const item of items) {
    item.addEventListener('click', () => {
      setLanguage(item.dataset.lang);
      close({ focusButton: true });
    });
  }
  document.addEventListener('click', (e) => {
    if (isOpen() && !e.target.closest('.menu')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') close({ focusButton: true });
    else if (e.key === 'ArrowDown') moveFocus(1);
    else if (e.key === 'ArrowUp') moveFocus(-1);
    else return;
    e.preventDefault();
  });

  markCurrent();
  onLanguageChange(markCurrent);
}
