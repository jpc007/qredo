// =====================================================================
// QREDO - Type d'appareil
// ---------------------------------------------------------------------
// L'ajout de médicaments par la caméra est réservé aux téléphones et
// tablettes (Android, iPhone, iPad). Jamais sur un ordinateur.
// =====================================================================

/** true sur téléphone / tablette Android ou iOS, false sur ordinateur. */
export function isMobileDevice() {
  const uaData = navigator.userAgentData;
  if (uaData && uaData.mobile === true) return true;
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS se présente comme un Mac, mais avec un écran tactile
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;
  return false;
}

/** true si l'appareil est un iPhone / iPad. */
export function isIOS() {
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}
