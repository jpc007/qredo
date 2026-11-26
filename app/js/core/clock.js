// =====================================================================
// QREDO - Heure fiable (UTC) pour la date de mise à jour du dossier
// ---------------------------------------------------------------------
// Un navigateur ne peut pas interroger un serveur NTP (protocole UDP
// interdit aux pages web). On utilise l'équivalent : l'heure UTC donnée
// par notre serveur web (en-tête HTTP "Date"), lui-même synchronisé NTP.
// Une simple requête HEAD vers notre propre site : aucune donnée envoyée.
// Sans réseau : heure du téléphone (signalée comme telle).
// =====================================================================

let offsetMs = 0; // écart serveur - téléphone
let source = 'device'; // 'server' quand l'heure a été vérifiée
let lastSync = 0;

/** Récupère l'heure du serveur et calcule l'écart avec le téléphone. */
export async function syncClock() {
  try {
    const t0 = Date.now();
    const res = await fetch(`./?clock=${t0}`, { method: 'HEAD', cache: 'no-store' });
    const t1 = Date.now();
    const server = Date.parse(res.headers.get('Date') || '');
    if (Number.isNaN(server)) return false;
    // L'en-tête est à la seconde près (tronqué) : +500 ms en moyenne, + moitié du trajet
    offsetMs = server + 500 + (t1 - t0) / 2 - t1;
    source = 'server';
    lastSync = t1;
    return true;
  } catch {
    return false; // hors ligne : on garde l'heure du téléphone
  }
}

/** Resynchronise si la dernière vérification date de plus de 30 minutes. */
export function syncClockIfStale() {
  if (Date.now() - lastSync > 30 * 60 * 1000) return syncClock();
  return Promise.resolve(source === 'server');
}

export function clockSource() {
  return source;
}

/** Maintenant, en temps fiable. */
export function nowUtc() {
  return new Date(Date.now() + offsetMs);
}

const p2 = (n) => String(n).padStart(2, '0');

/** Horodatage écrit dans le dossier et le QR : "2026-11-26 16:23 UTC". */
export function utcStamp(d = nowUtc()) {
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())} UTC`;
}

/** Relit un horodatage ("2026-11-26 16:23 UTC" ou ancien format "2026-11-26"). */
export function parseStamp(s) {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}) UTC)?$/);
  if (!m) return null;
  const date = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)));
  return { date, hasTime: m[4] !== undefined };
}
