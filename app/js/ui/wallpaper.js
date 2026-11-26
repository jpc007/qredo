// =====================================================================
// QREDO - Fond d'écran de veille avec le QR code
// ---------------------------------------------------------------------
// Mise en page pensée pour l'écran verrouillé :
//  - le haut (~38 %) reste libre pour l'horloge et les notifications ;
//  - bandeau rouge "EMERGENCY MEDICAL ID" bien visible ;
//  - QR sur fond blanc avec marge (indispensable pour la lecture) ;
//  - le bas reste libre pour les raccourcis (téléphone, caméra).
// =====================================================================

import { drawQr } from '../core/qr-render.js';

export const WALLPAPER_PRESETS = {
  samsung: { w: 1080, h: 2340, label: 'samsung' },
  pixel: { w: 1080, h: 2424, label: 'pixel' },
  generic: { w: 1080, h: 2400, label: 'android' },
  iphone: { w: 1179, h: 2556, label: 'iphone' },
};

/** Dimensions en pixels pour le préréglage choisi. */
export function wallpaperSize(preset) {
  if (preset !== 'auto') return WALLPAPER_PRESETS[preset] || WALLPAPER_PRESETS.samsung;
  const isPhone = window.matchMedia('(pointer: coarse)').matches;
  if (!isPhone) return WALLPAPER_PRESETS.samsung;
  const dpr = window.devicePixelRatio || 1;
  let w = Math.round(screen.width * dpr);
  let h = Math.round(screen.height * dpr);
  if (w > h) [w, h] = [h, w];
  return { w, h, label: 'phone' };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Dessine le fond d'écran et renvoie le <canvas>. */
export function renderWallpaper(qr, { w, h }, updated) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const font = (weight, px) => `${weight} ${Math.round(px)}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

  // Fond sombre (bon contraste avec le carré blanc du QR)
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1b2433');
  g.addColorStop(1, '#0b0f17');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const cardW = Math.round(w * 0.84);
  const x = Math.round((w - cardW) / 2);

  // Bandeau rouge
  const bannerY = Math.round(h * 0.38);
  const bannerH = Math.round(h * 0.06);
  ctx.fillStyle = '#d32f2f';
  roundRect(ctx, x, bannerY, cardW, bannerH, w * 0.025);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font(800, w * 0.052);
  ctx.fillText('✚ EMERGENCY MEDICAL ID', w / 2, bannerY + bannerH * 0.38);
  ctx.font = font(500, w * 0.03);
  ctx.fillText('URGENCE MÉDICALE · SCAN ME', w / 2, bannerY + bannerH * 0.76);

  // Carré blanc + QR
  const cardY = bannerY + bannerH + Math.round(h * 0.012);
  ctx.fillStyle = '#fff';
  roundRect(ctx, x, cardY, cardW, cardW, w * 0.03);
  ctx.fill();
  drawQr(ctx, qr, x, cardY, cardW, { quiet: 4 }); // marge de 4 carrés : norme QR

  // Légende
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = font(600, w * 0.034);
  ctx.fillText('Scan with any phone camera – no unlock needed', w / 2, cardY + cardW + h * 0.028);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = font(400, w * 0.028);
  ctx.fillText(`QREDO · updated ${updated}`, w / 2, cardY + cardW + h * 0.052);

  return c;
}

export function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
