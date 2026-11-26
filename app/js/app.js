// =====================================================================
// QREDO - Point d'entrée de l'application
// ---------------------------------------------------------------------
// Relie le formulaire, le QR code, le fond d'écran, l'import/export,
// le scanner et l'installation sur le téléphone.
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
import { SAMPLE_DOSSIER } from './data/sample-dossier.js';
import { fillForm, readForm, setupForm } from './ui/form.js';
import { canvasToBlob, renderWallpaper, wallpaperSize } from './ui/wallpaper.js';
import { decodeImageFile, startScanner } from './ui/scanner.js';
import { printCard } from './ui/print-card.js';

export const APP_VERSION = '0.2.0';

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
  $('gauge-text').textContent = `${bytes} / ${BYTE_TARGET} octets`;
  $('gauge-status').textContent = {
    ok: '✅ Lecture facile',
    warn: '🟠 Proche de la limite',
    over: '🔴 Trop long : simplifiez',
  }[level];

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
    err.textContent = 'Texte trop long pour un QR code. Retirez des informations.';
    $('st-version').textContent = '–';
    $('st-modules').textContent = '–';
  }
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
  if (!currentQr) throw new Error('Pas de QR code à placer.');
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
  return new File([blob], `qredo-fond-ecran-${c.width}x${c.height}.png`, { type: 'image/png' });
}

$('sel-wallpaper').addEventListener('change', updateWallpaperPreview);

$('btn-wallpaper').addEventListener('click', async () => {
  try {
    const f = await wallpaperFile();
    downloadBlob(f, f.name);
    toast('Image enregistrée dans les téléchargements.');
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
      await navigator.share({ files: [f], title: 'QREDO – fond d’écran' });
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
        text: 'Mon QR code médical d’urgence, gratuit. Installe-le aussi :',
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
  if (!isQredoText(text)) return toast('Ce QR code n’est pas un QR QREDO.');
  const d = parseQrText(text);
  const who = [d.lastName, d.firstName].filter(Boolean).join(' ') || 'sans nom';
  if (hasData(state) && !confirm(`Remplacer le dossier actuel par celui du QR (${who}) ?`)) return;
  loadIntoForm(d);
  toast(`Dossier importé : ${who} ✅`);
}

$('btn-scan').addEventListener('click', async () => {
  try {
    await startScanner((text) => {
      if (!isQredoText(text)) return false;
      setTimeout(() => applyImport(text), 0);
      return true;
    });
  } catch (e) {
    toast(e.name === 'NotAllowedError' ? 'Accès à la caméra refusé.' : e.message);
  }
});

$('btn-scan-image').addEventListener('click', () => $('file-image').click());
$('file-image').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const text = await decodeImageFile(file);
    if (!text) return toast('Aucun QR code trouvé sur cette image.');
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
    if (hasData(state) && !confirm('Remplacer le dossier actuel par celui du fichier ?')) return;
    loadIntoForm(d);
    toast('Dossier importé ✅');
  } catch (err) {
    toast(err.message);
  }
});

$('btn-print').addEventListener('click', () => {
  if (currentQr) printCard(currentQr, state);
});

$('btn-sample').addEventListener('click', () => {
  if (hasData(state) && !confirm('Remplacer votre dossier par l’exemple ?')) return;
  loadIntoForm({ ...structuredClone(SAMPLE_DOSSIER), updated: today() });
});

$('btn-clear').addEventListener('click', () => {
  if (!confirm('Effacer toutes les données de cet appareil ?')) return;
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
window.addEventListener('appinstalled', () => toast('QREDO est installé sur votre écran d’accueil 🎉'));

if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('sw.js').catch(() => {
    /* le mode hors ligne n'est pas disponible, l'appli fonctionne quand même */
  });
}

// ---------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------
$('app-version').textContent = `· v${APP_VERSION}`;
setupForm(form, onFormChange);
if (!state.updated) state.updated = today();
fillForm(form, state);
refresh();
window.addEventListener('resize', debounce(refresh, 200));

// Lien de démonstration : .../?exemple charge le dossier fictif (si vide)
if (new URLSearchParams(location.search).has('exemple') && !hasData(state)) {
  loadIntoForm({ ...structuredClone(SAMPLE_DOSSIER), updated: today() });
}
