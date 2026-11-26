// =====================================================================
// QREDO - Ajouter un médicament en scannant sa boîte (mobile uniquement)
// ---------------------------------------------------------------------
// 1) La caméra cherche le code de la boîte : DataMatrix (GTIN) ou
//    code-barres CNK -> médicament trouvé avec certitude dans la base SAM.
// 2) Si aucun code n'est lu après quelques secondes (ou code inconnu),
//    l'utilisateur est invité à viser le NOM du médicament : lecture OCR
//    dans le téléphone, puis choix parmi les médicaments proposés.
// Tout se passe dans l'appareil : aucune image n'est envoyée.
// =====================================================================

import { isMobileDevice } from '../core/device.js';
import { allDrugs, findDrugByCodes, loadDrugCodes, loadDrugDb } from '../core/drug-db.js';
import { t } from '../i18n/i18n.js';

const BARCODE_TIMEOUT_MS = 8000; // ensuite : invitation à lire le nom
const SCAN_INTERVAL_MS = 250;

const $ = (id) => document.getElementById(id);

let session = null; // scan en cours

/** Affiche le bouton "Scanner la boîte" seulement sur téléphone / tablette. */
export function setupMedCamera({ onDrug, toast }) {
  const btn = $('btn-scan-med');
  if (!isMobileDevice()) {
    btn.remove(); // sur ordinateur : la fonction n'existe pas
    return;
  }
  btn.hidden = false;
  btn.addEventListener('click', () => openMedCamera({ onDrug, toast }));
  $('btn-medscan-close').addEventListener('click', () => closeMedCamera());
  $('btn-medscan-ocr').addEventListener('click', () => readName());
  $('btn-medscan-retry').addEventListener('click', () => restartBarcode());
}

function setStatus(text, level = '') {
  const el = $('medscan-status');
  el.textContent = text;
  el.dataset.level = level;
}

function setMode(mode) {
  $('overlay-medscan').dataset.mode = mode; // barcode | attention | ocr | results
}

// ---------------------------------------------------------------------
// Ouverture / fermeture
// ---------------------------------------------------------------------
async function openMedCamera({ onDrug, toast }) {
  if (!isMobileDevice()) return; // sécurité : jamais sur ordinateur
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    toast(t('camera.needsHttps'));
    return;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
  } catch (e) {
    toast(t(e.name === 'NotAllowedError' ? 'camera.denied' : 'camera.unavailable'));
    return;
  }
  const video = $('medscan-video');
  video.srcObject = stream;
  $('overlay-medscan').hidden = false;
  $('medscan-results').innerHTML = '';
  await video.play().catch(() => {});

  session = { stream, onDrug, toast, running: true, timer: null, deadline: 0, barcode: null, ocr: null };

  // Chargement en parallèle : base + codes des boîtes + moteur de lecture
  loadDrugDb();
  loadDrugCodes();
  import('../core/barcode.js')
    .then((m) => {
      if (!session) return;
      session.barcode = m;
      m.preloadBarcodeEngine?.().catch(() => {});
      restartBarcode();
    })
    .catch(() => {
      // Module code-barres indisponible : on passe directement à la lecture du nom
      if (session) attention(t('medscan.noEngine'));
    });
  setMode('barcode');
  setStatus(t('medscan.loading'));
}

export function closeMedCamera() {
  if (!session) return;
  session.running = false;
  clearTimeout(session.timer);
  session.stream.getTracks().forEach((t) => t.stop());
  $('medscan-video').srcObject = null;
  $('overlay-medscan').hidden = true;
  session = null;
}

// ---------------------------------------------------------------------
// Étape 1 : code-barres / DataMatrix
// ---------------------------------------------------------------------
function restartBarcode() {
  if (!session) return;
  clearTimeout(session.timer);
  $('medscan-results').innerHTML = '';
  setMode('barcode');
  setStatus(t('medscan.aim'));
  session.deadline = Date.now() + BARCODE_TIMEOUT_MS;
  session.unknownCode = false;
  scanLoop();
}

async function scanLoop() {
  const s = session;
  if (!s || !s.running || !s.barcode || $('overlay-medscan').dataset.mode !== 'barcode') return;
  const video = $('medscan-video');
  if (video.readyState >= 2) {
    try {
      const raws = await s.barcode.detectBarcodes(video);
      for (const raw of raws) {
        const found = s.barcode.extractProductCodes(raw);
        if (!found.gtins.length && !found.cnks.length) continue;
        await loadDrugCodes();
        const p = findDrugByCodes(found);
        if (p) return showResults([{ product: p, score: 1 }], 'barcode');
        s.unknownCode = true;
      }
    } catch {
      /* image suivante */
    }
  }
  if (session !== s) return;
  if (s.unknownCode) return attention(t('medscan.unknownCode'));
  if (Date.now() > s.deadline) return attention(t('medscan.noBarcode'));
  s.timer = setTimeout(scanLoop, SCAN_INTERVAL_MS);
}

/** Attire l'attention : on passe à la lecture du nom (OCR). */
function attention(message) {
  if (!session) return;
  clearTimeout(session.timer);
  setMode('attention');
  setStatus(t('medscan.attention', { message }), 'warn');
  navigator.vibrate?.([120, 80, 120]);
}

// ---------------------------------------------------------------------
// Étape 2 : lecture du nom (OCR)
// ---------------------------------------------------------------------
/** Image entière de la caméra dans un canvas. */
function captureFull() {
  const video = $('medscan-video');
  const c = document.createElement('canvas');
  c.width = video.videoWidth;
  c.height = video.videoHeight;
  c.getContext('2d').drawImage(video, 0, 0);
  return c;
}

/** Capture la zone du cadre (en pixels de la vidéo) dans un canvas. */
function captureFrame() {
  const video = $('medscan-video');
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const box = video.getBoundingClientRect();
  const frame = document.querySelector('#overlay-medscan .medscan-frame').getBoundingClientRect();
  // La vidéo est affichée en "cover" : on retrouve l'échelle et le décalage
  const scale = Math.max(box.width / vw, box.height / vh);
  const offX = (box.width - vw * scale) / 2;
  const offY = (box.height - vh * scale) / 2;
  const sx = Math.max(0, (frame.left - box.left - offX) / scale);
  const sy = Math.max(0, (frame.top - box.top - offY) / scale);
  const sw = Math.min(vw - sx, frame.width / scale);
  const sh = Math.min(vh - sy, frame.height / scale);
  const c = document.createElement('canvas');
  c.width = Math.round(sw);
  c.height = Math.round(sh);
  c.getContext('2d').drawImage(video, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c;
}

async function readName() {
  const s = session;
  if (!s) return;
  clearTimeout(s.timer);
  // Les deux images sont prises au même instant : la zone du cadre, puis l'image entière
  const canvas = captureFrame();
  const full = captureFull();
  setMode('ocr');
  setStatus(t('medscan.reading'));
  try {
    s.ocr ??= await import('../core/ocr.js');
    const db = await loadDrugDb();
    const onProgress = (p) => session === s && setStatus(t('medscan.progress', { percent: Math.round(p * 100) }));
    const read = async (c) => (db ? s.ocr.matchDrugs(await s.ocr.recognizeText(c, { onProgress }), allDrugs(), { limit: 5 }) : []);
    let matches = await read(canvas);
    // Rien dans le cadre (nom mal visé) : on relit l'image entière
    if (!matches.length && session === s) matches = await read(full);
    if (session !== s) return;
    // On n'affiche que les propositions proches de la meilleure (pas de bruit)
    if (matches.length) matches = matches.filter((m) => m.score >= matches[0].score * 0.7);
    if (!matches.length) {
      setMode('attention');
      setStatus(t('medscan.notRecognized'), 'warn');
      return;
    }
    showResults(matches, 'ocr');
  } catch {
    if (session !== s) return;
    setMode('attention');
    setStatus(t('medscan.failed'), 'warn');
  }
}

// ---------------------------------------------------------------------
// Choix du médicament
// ---------------------------------------------------------------------
function showResults(matches, via) {
  const s = session;
  if (!s) return;
  clearTimeout(s.timer);
  setMode('results');
  navigator.vibrate?.(60);
  setStatus(t(via === 'barcode' ? 'medscan.foundByCode' : 'medscan.choose'), 'ok');
  const list = $('medscan-results');
  list.innerHTML = '';
  for (const { product: p } of matches) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'medscan-choice';
    const strong = document.createElement('strong');
    strong.textContent = p.name;
    const small = document.createElement('small');
    small.textContent = p.inactive ? `${p.inn} · ${t('meds.inactive')}` : p.inn;
    b.append(strong, small);
    b.addEventListener('click', () => {
      const { onDrug, toast } = s;
      closeMedCamera();
      onDrug(p);
      toast(t('medscan.added', { name: p.name }));
    });
    list.append(b);
  }
}
