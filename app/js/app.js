// =====================================================================
// QREDO - Point d'entrée de l'application
// ---------------------------------------------------------------------
// Relie le formulaire, le QR code, le fond d'écran, l'import/export,
// le scanner, l'installation sur le téléphone et la langue de l'interface.
// =====================================================================

import { buildQrText, byteLength, BYTE_TARGET, emptyDossier, isQredoText, parseQrText } from './core/qr-text.js';
import { makeQr, qrInfo, renderQrToCanvas } from './core/qr-render.js';
import {
  clearDossier,
  downloadBlob,
  exportDossierFile,
  importDossierFile,
  loadDossier,
  normalizeDossier,
  saveDossier,
  today,
} from './core/storage.js';
import { SAMPLES } from './data/sample-dossier.js';
import { addMedRow, fillForm, readForm, refreshMedRows, setupForm } from './ui/form.js';
import { setupMedCamera } from './ui/med-camera.js';
import { drugDbMeta, loadDrugDb } from './core/drug-db.js';
import { canvasToBlob, renderWallpaper, wallpaperSize } from './ui/wallpaper.js';
import { decodeImageFile, startScanner } from './ui/scanner.js';
import { printCard } from './ui/print-card.js';
import { setupLanguageMenu } from './ui/lang-menu.js';
import { renderInteractions } from './ui/interactions-panel.js';
import { applyTranslations, getLocale, onLanguageChange, t } from './i18n/i18n.js';

export const APP_VERSION = '1.0.3';

const $ = (id) => document.getElementById(id);
const form = $('dossier-form');

let state = loadDossier(); // le dossier courant
let currentQr = null; // le QR code courant

// ---------------------------------------------------------------------
// Petits outils
// ---------------------------------------------------------------------
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

let toastTimer;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3500);
}

const hasData = (d) => !!(d.lastName || d.firstName || d.allergies.length || d.meds.length);

// ---------------------------------------------------------------------
// Mise à jour du QR code et des statistiques
// ---------------------------------------------------------------------
function refresh() {
  const text = buildQrText(state);
  const bytes = byteLength(text);
  const bytesWithAccents = byteLength(buildQrText(state, false));

  $('qr-text').textContent = text;
  $('st-chars').textContent = text.length;
  $('st-saved').textContent = Math.max(0, bytesWithAccents - bytes);

  // Jauge : vert <= 700, orange <= 900, rouge au-delà
  const bar = $('gauge-bar');
  bar.style.width = Math.min(100, (bytes / BYTE_TARGET) * 100) + '%';
  const level = bytes <= 700 ? 'ok' : bytes <= BYTE_TARGET ? 'warn' : 'over';
  bar.dataset.level = level;
  $('gauge-text').textContent = t('qr.bytes', { bytes, max: BYTE_TARGET });
  $('gauge-status').textContent = t({ ok: 'qr.statusOk', warn: 'qr.statusWarn', over: 'qr.statusOver' }[level]);

  // QR code
  const canvas = $('qr-canvas');
  const err = $('qr-error');
  try {
    currentQr = makeQr(text);
    const { version, modules } = qrInfo(currentQr);
    $('st-version').textContent = version;
    $('st-modules').textContent = modules;
    // Taille d'affichage gérée par le CSS (#qr-canvas : 100 % du cadre, max 340 px)
    renderQrToCanvas(canvas, currentQr, 340, { fixedSize: false });
    canvas.hidden = false;
    err.hidden = true;
  } catch {
    currentQr = null;
    canvas.hidden = true;
    err.hidden = false;
    err.textContent = t('qr.tooLong');
    $('st-version').textContent = '–';
    $('st-modules').textContent = '–';
  }
  // Avis au patient : interactions possibles entre ses médicaments
  renderInteractions($('med-interactions'), state.meds);
  updateWallpaperPreview();
}

const onFormChange = debounce(() => {
  state = readForm(form);
  state.updated = today();
  saveDossier(state);
  refresh();
}, 120);

function loadIntoForm(d) {
  state = normalizeDossier(d);
  if (!state.updated) state.updated = today();
  fillForm(form, state);
  saveDossier(state);
  refresh();
}

// ---------------------------------------------------------------------
// Fond d'écran
// ---------------------------------------------------------------------
function buildWallpaper() {
  if (!currentQr) throw new Error(t('wallpaper.noQr'));
  return renderWallpaper(currentQr, wallpaperSize($('sel-wallpaper').value), state.updated);
}

const updateWallpaperPreview = debounce(() => {
  if (!currentQr) return;
  const c = buildWallpaper();
  // Aperçu réduit (plus léger)
  const small = document.createElement('canvas');
  small.width = 270;
  small.height = Math.round((270 * c.height) / c.width);
  small.getContext('2d').drawImage(c, 0, 0, small.width, small.height);
  $('wallpaper-img').src = small.toDataURL('image/png');
}, 400);

async function wallpaperFile() {
  const c = buildWallpaper();
  const blob = await canvasToBlob(c);
  return new File([blob], `${t('wallpaper.fileName')}-${c.width}x${c.height}.png`, { type: 'image/png' });
}

$('sel-wallpaper').addEventListener('change', updateWallpaperPreview);

$('btn-wallpaper').addEventListener('click', async () => {
  try {
    const f = await wallpaperFile();
    downloadBlob(f, f.name);
    toast(t('wallpaper.saved'));
  } catch (e) {
    toast(e.message);
  }
});

// Partage (WhatsApp, e-mail, Galerie…) si le navigateur le permet
const shareTest = new File([new Blob(['x'])], 't.png', { type: 'image/png' });
if (navigator.canShare && navigator.canShare({ files: [shareTest] })) {
  $('btn-share').hidden = false;
  $('btn-share').addEventListener('click', async () => {
    try {
      const f = await wallpaperFile();
      await navigator.share({ files: [f], title: t('wallpaper.shareTitle') });
    } catch (e) {
      if (e.name !== 'AbortError') toast(e.message);
    }
  });
}

// ---------------------------------------------------------------------
// QR en plein écran (pour le secouriste qui scanne depuis l'appli)
// ---------------------------------------------------------------------
let wakeLock = null;
$('btn-fullscreen').addEventListener('click', async () => {
  if (!currentQr) return;
  const ov = $('overlay-qr');
  ov.hidden = false;
  const size = Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.92);
  renderQrToCanvas($('qr-canvas-big'), currentQr, size);
  try {
    wakeLock = await navigator.wakeLock?.request('screen');
  } catch {
    /* facultatif */
  }
});
$('overlay-qr').addEventListener('click', () => {
  $('overlay-qr').hidden = true;
  wakeLock?.release?.();
  wakeLock = null;
});

// ---------------------------------------------------------------------
// Offrir QREDO à un proche : QR code de l'adresse de l'application
// ---------------------------------------------------------------------
// Adresse calculée (sans "?exemple") : reste juste si le site déménage.
const APP_URL = new URL('./', location.href).href;

$('btn-invite').addEventListener('click', () => {
  $('overlay-invite').hidden = false;
  $('invite-url').textContent = APP_URL;
  const size = Math.floor(Math.min(window.innerWidth * 0.8, window.innerHeight * 0.6));
  renderQrToCanvas($('qr-canvas-invite'), makeQr(APP_URL), size);
});
$('overlay-invite').addEventListener('click', () => ($('overlay-invite').hidden = true));

if (navigator.share) {
  $('btn-invite-share').hidden = false;
  $('btn-invite-share').addEventListener('click', async () => {
    try {
      await navigator.share({
        title: 'QREDO',
        text: t('invite.shareText'),
        url: APP_URL,
      });
    } catch (e) {
      if (e.name !== 'AbortError') toast(e.message);
    }
  });
}

// ---------------------------------------------------------------------
// Import depuis un QR QREDO (caméra ou photo)
// ---------------------------------------------------------------------
function applyImport(text) {
  if (!isQredoText(text)) return toast(t('import.notQredo'));
  const d = parseQrText(text);
  const who = [d.lastName, d.firstName].filter(Boolean).join(' ') || t('import.noName');
  if (hasData(state) && !confirm(t('import.confirmQr', { who }))) return;
  loadIntoForm(d);
  toast(t('import.doneQr', { who }));
}

$('btn-scan').addEventListener('click', async () => {
  try {
    await startScanner((text) => {
      if (!isQredoText(text)) return false;
      setTimeout(() => applyImport(text), 0);
      return true;
    });
  } catch (e) {
    toast(e.name === 'NotAllowedError' ? t('camera.denied') : e.message);
  }
});

$('btn-scan-image').addEventListener('click', () => $('file-image').click());
$('file-image').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const text = await decodeImageFile(file);
    if (!text) return toast(t('import.noQrInImage'));
    applyImport(text);
  } catch (err) {
    toast(err.message);
  }
});

// ---------------------------------------------------------------------
// Fichier de sauvegarde, impression, démo
// ---------------------------------------------------------------------
$('btn-export').addEventListener('click', () => exportDossierFile(state));
$('btn-import').addEventListener('click', () => $('file-import').click());
$('file-import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const d = await importDossierFile(file);
    if (hasData(state) && !confirm(t('import.confirmFile'))) return;
    loadIntoForm(d);
    toast(t('import.doneFile'));
  } catch (err) {
    toast(err.message);
  }
});

$('btn-print').addEventListener('click', () => {
  if (currentQr) printCard(currentQr, state);
});

// Patients de test fictifs (libellé traduit via data-i18n)
SAMPLES.forEach((s, i) => {
  const o = document.createElement('option');
  o.value = i;
  o.dataset.i18n = s.labelKey;
  $('sel-sample').append(o);
});

function loadSample(index) {
  const s = SAMPLES[index] || SAMPLES[0];
  loadIntoForm({ ...structuredClone(s.dossier), updated: today() });
  $('sel-sample').value = SAMPLES.indexOf(s);
  toast(t('demo.loaded', { name: `${s.dossier.firstName} ${s.dossier.lastName}` }));
}

$('btn-sample').addEventListener('click', () => {
  if (hasData(state) && !confirm(t('demo.confirmReplace'))) return;
  loadSample(+$('sel-sample').value);
});

$('btn-clear').addEventListener('click', () => {
  if (!confirm(t('demo.confirmClear'))) return;
  clearDossier();
  loadIntoForm(emptyDossier());
});

// Bouton flottant (téléphone) -> aller au QR
$('fab-qr').addEventListener('click', () => $('panel').scrollIntoView({ behavior: 'smooth' }));

// ---------------------------------------------------------------------
// Installation (icône sur l'écran d'accueil) et mode hors ligne
// ---------------------------------------------------------------------
let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  $('btn-install').hidden = false;
});
$('btn-install').addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  $('btn-install').hidden = true;
});
window.addEventListener('appinstalled', () => toast(t('app.installed')));

let swRegistration = null;
if ('serviceWorker' in navigator && window.isSecureContext) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker
    .register('sw.js')
    .then((reg) => {
      swRegistration = reg;
      reg.update(); // vérifie à chaque ouverture s'il existe une nouvelle version
    })
    .catch(() => {
      /* le mode hors ligne n'est pas disponible, l'appli fonctionne quand même */
    });
  // Nouvelle version installée -> on recharge une fois pour l'afficher
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });
}

// Bouton "Mettre à jour" (pied de page)
$('btn-update').addEventListener('click', async () => {
  toast(t('app.checkingUpdate'));
  try {
    await swRegistration?.update();
  } catch {
    /* hors ligne : on recharge quand même */
  }
  location.reload();
});

// Quand l'appli revient au premier plan (téléphone), on vérifie aussi
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') swRegistration?.update().catch(() => {});
});

// ---------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------
$('app-version').textContent = `· v${APP_VERSION}`;
applyTranslations(); // textes de la page dans la langue choisie
setupLanguageMenu();
setupForm(form, onFormChange);
if (!state.updated) state.updated = today();
fillForm(form, state);
refresh();
window.addEventListener('resize', debounce(refresh, 200));

// Ajout d'un médicament en scannant sa boîte (téléphone / tablette uniquement)
setupMedCamera({
  toast,
  onDrug: (p) => {
    // On réutilise une ligne vide s'il y en a une, sinon on en ajoute une
    const empty = [...document.querySelectorAll('#med-list .row')].find(
      (r) => !r.querySelector('[data-k="name"]').value.trim(),
    );
    empty?.remove();
    addMedRow({ name: p.name, dose: p.strength, inn: p.inn }).scrollIntoView({ block: 'center' });
    onFormChange();
  },
});

// Base des médicaments belges (SAM) : chargée en arrière-plan
function showDrugDbInfo() {
  const m = drugDbMeta();
  $('med-db-info').textContent = m
    ? t('meds.dbInfo', { count: m.count.toLocaleString(getLocale()), date: m.generated })
    : t('meds.dbUnavailable');
}
loadDrugDb().then((db) => {
  showDrugDbInfo();
  if (!db) return;
  refreshMedRows();
  // Les molécules trouvées sont enregistrées, sans changer la date de mise à jour
  const updated = state.updated;
  state = readForm(form);
  state.updated = updated;
  saveDossier(state);
  refresh();
});

// Liens de démonstration : .../?exemple (=1) … ?exemple=5 chargent un patient fictif
const sampleParam = new URLSearchParams(location.search).get('exemple');
if (sampleParam !== null) {
  const index = Math.max(1, parseInt(sampleParam, 10) || 1) - 1;
  const s = SAMPLES[index] || SAMPLES[0];
  const name = `${s.dossier.firstName} ${s.dossier.lastName}`;
  if (!hasData(state) || confirm(t('demo.confirmLink', { name }))) {
    loadSample(index);
  }
  // On retire "?exemple" de l'adresse : un rechargement ne redemande pas
  history.replaceState(null, '', location.pathname);
}

// ---------------------------------------------------------------------
// Changement de langue (menu "⋮") : tout est retraduit sur place.
// Les données saisies ne bougent pas, et le QR code reste identique
// (il est toujours écrit en anglais médical).
// ---------------------------------------------------------------------
onLanguageChange(() => {
  applyTranslations(); // textes fixes, listes, cases à cocher, exemples
  $('toast').hidden = true; // un message en cours est dans l'ancienne langue
  refreshMedRows(); // "→ Molécule : …" sous chaque médicament
  showDrugDbInfo();
  refresh(); // jauge, message d'erreur, aperçu du fond d'écran
});
