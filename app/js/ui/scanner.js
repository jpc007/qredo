// =====================================================================
// QREDO - Lecture d'un QR code (caméra ou photo)
// ---------------------------------------------------------------------
// 1) BarcodeDetector : lecteur intégré à Chrome sur Android (rapide).
// 2) Sinon, bibliothèque de secours jsQR (lib/jsqr.js).
// La caméra exige une page sécurisée : https:// ou http://localhost.
// =====================================================================

/* global jsQR */

let detector = null;

async function getDetector() {
  if (detector !== null) return detector;
  detector = false;
  if ('BarcodeDetector' in window) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      if (formats.includes('qr_code')) detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    } catch {
      /* pas de lecteur intégré : on utilisera jsQR */
    }
  }
  return detector;
}

/** Essaie de lire un QR dans une image / vidéo. Renvoie le texte ou null. */
async function decode(source, width, height) {
  const det = await getDetector();
  if (det) {
    try {
      const codes = await det.detect(source);
      if (codes.length) return codes[0].rawValue;
    } catch {
      /* on tente jsQR */
    }
  }
  if (typeof jsQR !== 'function') return null;
  // Réduction de taille : jsQR est plus rapide et souvent plus fiable
  const scale = Math.min(1, 1000 / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const res = jsQR(img.data, w, h, { inversionAttempts: 'attemptBoth' });
  return res ? res.data : null;
}

/** Lit un QR code dans une photo choisie par l'utilisateur. */
export async function decodeImageFile(file) {
  const bmp = await createImageBitmap(file);
  try {
    return await decode(bmp, bmp.width, bmp.height);
  } finally {
    bmp.close?.();
  }
}

/**
 * Ouvre la caméra arrière et cherche un QR code.
 * @param {(text: string) => boolean} onText renvoie true pour arrêter
 */
export async function startScanner(onText) {
  const overlay = document.getElementById('overlay-scan');
  const video = document.getElementById('scan-video');
  const status = document.getElementById('scan-status');

  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('La caméra nécessite une page sécurisée (https). Utilisez « Importer depuis une photo ».');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: false,
  });
  video.srcObject = stream;
  overlay.hidden = false;
  status.textContent = 'Visez le QR code QREDO…';
  await video.play();

  let running = true;
  const stop = () => {
    running = false;
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
    overlay.hidden = true;
  };
  document.getElementById('btn-scan-close').onclick = stop;

  const loop = async () => {
    if (!running) return;
    if (video.readyState >= 2) {
      const text = await decode(video, video.videoWidth, video.videoHeight);
      if (text && running) {
        if (onText(text)) return stop();
        status.textContent = 'QR lu, mais ce n’est pas un QR QREDO. Réessayez…';
      }
    }
    setTimeout(loop, 250);
  };
  loop();
}
