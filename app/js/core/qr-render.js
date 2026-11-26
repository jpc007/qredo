// =====================================================================
// QREDO - Génération et dessin du QR code
// ---------------------------------------------------------------------
// S'appuie sur la bibliothèque libre "qrcode-generator" (lib/), chargée
// comme script classique : elle expose la fonction globale qrcode().
// =====================================================================

/* global qrcode */

// Niveau de correction d'erreur : M = ~15 % du code peut être abîmé
// (reflet, fissure d'écran) et rester lisible. Bon compromis.
export const ECC_LEVEL = 'M';

/**
 * Crée le QR code. Version (taille) choisie automatiquement.
 * Lève une erreur si le texte est trop long pour un QR code.
 */
export function makeQr(text) {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  const qr = qrcode(0, ECC_LEVEL); // 0 = version automatique
  qr.addData(text, 'Byte');
  qr.make();
  return qr;
}

/** Infos techniques : version (1-40) et nombre de carrés de côté. */
export function qrInfo(qr) {
  const modules = qr.getModuleCount();
  return { modules, version: (modules - 17) / 4 };
}

/**
 * Dessine le QR dans un canvas, carré de "size" pixels en (x, y).
 * quiet = marge blanche en nombre de carrés (4 recommandé par la norme).
 * Les carrés sont alignés sur des pixels entiers : image nette.
 */
export function drawQr(ctx, qr, x, y, size, { quiet = 4, dark = '#000', light = '#fff' } = {}) {
  const n = qr.getModuleCount();
  const cell = Math.max(1, Math.floor(size / (n + quiet * 2)));
  const total = cell * (n + quiet * 2);
  const ox = Math.round(x + (size - total) / 2);
  const oy = Math.round(y + (size - total) / 2);

  ctx.fillStyle = light;
  ctx.fillRect(ox, oy, total, total);
  ctx.fillStyle = dark;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) ctx.fillRect(ox + (c + quiet) * cell, oy + (r + quiet) * cell, cell, cell);
    }
  }
}

/** Dessine le QR dans un <canvas> existant, adapté à l'écran (net en haute densité). */
export function renderQrToCanvas(canvas, qr, cssSize, { fixedSize = true } = {}) {
  const dpr = window.devicePixelRatio || 1;
  const px = Math.round(cssSize * dpr);
  canvas.width = px;
  canvas.height = px;
  if (fixedSize) {
    canvas.style.width = cssSize + 'px';
    canvas.style.height = cssSize + 'px';
  }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, px, px);
  drawQr(ctx, qr, 0, 0, px);
}

/** Image PNG haute définition du QR seul (pour l'impression). */
export function qrToDataUrl(qr, px = 1200) {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  drawQr(c.getContext('2d'), qr, 0, 0, px, { quiet: 2 });
  return c.toDataURL('image/png');
}
