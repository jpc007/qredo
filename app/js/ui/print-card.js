// =====================================================================
// QREDO - Carte portefeuille imprimable (format carte bancaire)
// ---------------------------------------------------------------------
// Utile pour les personnes sans smartphone, ou si le téléphone est
// déchargé. La mise en page d'impression est dans css/style.css
// (@media print).
// =====================================================================

import { qrToDataUrl } from '../core/qr-render.js';

export function printCard(qr, dossier) {
  const name = [String(dossier.lastName || '').toUpperCase(), dossier.firstName].filter(Boolean).join(' ');
  document.getElementById('pc-name').textContent = name;
  document.getElementById('pc-updated').textContent = `Updated ${dossier.updated}`;
  const img = document.getElementById('pc-qr');
  const url = qrToDataUrl(qr);
  if (img.src === url && img.complete) return window.print();
  img.onload = () => window.print();
  img.src = url;
}
