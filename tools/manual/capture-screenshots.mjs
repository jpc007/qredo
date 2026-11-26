// =====================================================================
// QREDO - Captures d'écran automatiques pour le mode d'emploi
// ---------------------------------------------------------------------
// Usage : node capture-screenshots.mjs
// Sert le dossier app/ en local, ouvre Chrome en mode invisible et
// photographie chaque écran utile. Résultat : documentation/images/*.png
// =====================================================================

import { createServer } from 'node:http';
import { readFile, mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '../../app');
const OUT = resolve(HERE, '../../documentation/images');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PUBLIC_URL = 'https://jpc007.github.io/qredo/';
const PORT = 5611;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

// Page "harnais" : affiche l'appli dans un cadre puis joue un scénario
const HARNESS = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;height:100%;overflow:hidden}iframe{border:0;width:100vw;height:100vh}</style></head>
<body><iframe id="f"></iframe><script>
const p = new URLSearchParams(location.search);
// Captures en français (sinon l'appli prend la langue du navigateur)
localStorage.setItem('qredo.lang', p.get('lang') || 'fr');
const f = document.getElementById('f');
// Largeur fixe : Chrome invisible impose une fenêtre minimale plus large qu'un téléphone
if (p.get('fw')) f.style.width = p.get('fw') + 'px';
f.src = '/' + (p.get('sample') ? '?exemple=' + p.get('sample') : '');
const wait = (ms) => new Promise(r => setTimeout(r, ms));
f.onload = async () => {
  await wait(1200);
  const w = f.contentWindow, d = w.document, $ = (id) => d.getElementById(id);
  const scrollToCard = (id, offset = 70) => {
    const el = $(id).closest('.card') || $(id);
    w.scrollTo(0, el.getBoundingClientRect().top + w.scrollY - offset);
  };
  const s = p.get('s');
  if (s === 'top') { $('btn-install').hidden = false; }
  if (s && s.startsWith('card-')) scrollToCard(s.slice(5));
  if (s && s.startsWith('field-')) {
    const card = d.querySelector('[data-field="' + s.slice(6) + '"]').closest('.card');
    w.scrollTo(0, card.getBoundingClientRect().top + w.scrollY - 70);
  }
  if (s === 'langmenu') { $('btn-menu').click(); }
  if (s === 'interactions') {
    // Ajout d'un anti-inflammatoire tapé à la main (Dupont est sous Sintrom)
    $('btn-add-med').click();
    const rows = d.querySelectorAll('#med-list .row');
    const input = rows[rows.length - 1].querySelector('[data-k="name"]');
    input.value = 'Nurofen';
    input.dispatchEvent(new w.Event('input', { bubbles: true }));
    await wait(700);
    const box = $('med-interactions');
    w.scrollTo(0, box.getBoundingClientRect().top + w.scrollY - 330);
  }
  if (s === 'allergies') scrollToCard('allergy-list');
  if (s === 'meds') scrollToCard('med-list');
  if (s === 'qr') scrollToCard('qr-canvas');
  if (s === 'wallpaper') scrollToCard('sel-wallpaper');
  if (s === 'wallpaper-ios') {
    scrollToCard('sel-wallpaper');
    $('sel-wallpaper').value = 'iphone';
    $('sel-wallpaper').dispatchEvent(new w.Event('change'));
    $('btn-share').hidden = false; // bouton Partager, toujours présent sur iPhone
  }
  if (s === 'transfer') scrollToCard('btn-scan');
  if (s === 'invite-card') scrollToCard('btn-invite');
  if (s === 'demo') { scrollToCard('sel-sample'); }
  if (s === 'footer') { w.scrollTo(0, d.body.scrollHeight); }
  if (s === 'fullscreen') { $('btn-fullscreen').click(); }
  if (s === 'invite') {
    $('btn-invite').click();
    await wait(200);
    // On montre l'adresse publique plutôt que l'adresse locale de test
    $('invite-url').textContent = '${PUBLIC_URL}';
    const qr = w.qrcode(0, 'M'); qr.addData('${PUBLIC_URL}'); qr.make();
    const c = $('qr-canvas-invite'), ctx = c.getContext('2d'), n = qr.getModuleCount();
    const cell = Math.floor(c.width / (n + 8)), off = Math.floor((c.width - cell * (n + 8)) / 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.fillStyle = '#000';
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (qr.isDark(r, k)) ctx.fillRect(off + (k + 4) * cell, off + (r + 4) * cell, cell, cell);
  }
  if (s === 'card') {
    // Affiche la carte portefeuille à l'écran avec les styles d'impression
    const css = [];
    for (const sheet of d.styleSheets) for (const rule of sheet.cssRules)
      if (rule.media && rule.media.mediaText === 'print')
        for (const r of rule.cssRules) if (r.selectorText) css.push(r.cssText);
    const st = d.createElement('style');
    st.textContent = css.join('\\n') + ' body{padding:16px;margin:0} .print-help{display:none}';
    d.head.append(st);
    $('pc-name').textContent = 'DUPONT Jean-Pierre';
    $('pc-updated').textContent = 'Updated ' + new Date().toISOString().slice(0, 10);
    $('pc-qr').src = $('qr-canvas').toDataURL('image/png');
  }
  document.title = 'ready';
};
</script></body></html>`;

// Page qui dessine le fond d'écran en taille réelle
const WALLPAPER = `<!doctype html><html><body style="margin:0">
<script src="/lib/qrcode-generator.js"></script>
<script type="module">
import { buildQrText } from '/js/core/qr-text.js';
import { makeQr } from '/js/core/qr-render.js';
import { renderWallpaper, WALLPAPER_PRESETS } from '/js/ui/wallpaper.js';
import { SAMPLES } from '/js/data/sample-dossier.js';
const day = new Date().toISOString().slice(0, 10);
const qr = makeQr(buildQrText({ ...SAMPLES[0].dossier, updated: day }));
const preset = new URLSearchParams(location.search).get('p') || 'samsung';
const c = renderWallpaper(qr, WALLPAPER_PRESETS[preset], day);
c.style.width = '540px'; c.style.display = 'block'; document.body.append(c);
</script></body></html>`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/__shot.html') return res.end(HARNESS);
  if (url.pathname === '/__wallpaper.html') return res.end(WALLPAPER);
  let path = join(APP, decodeURIComponent(url.pathname));
  if (path.endsWith('\\') || path.endsWith('/')) path = join(path, 'index.html');
  try {
    const data = await readFile(path);
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404).end();
  }
});

const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36';
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

function shot(name, query, { w = 390, h = 844, page = '__shot.html', ua = '' } = {}) {
  const profile = join(tmpdir(), 'qredo-shot-' + name);
  return new Promise((ok, ko) => {
    execFile(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        `--user-data-dir=${profile}`,
        `--window-size=${w},${h}`,
        '--force-device-scale-factor=2',
        '--virtual-time-budget=7000',
        '--lang=fr',
        ...(ua ? [`--user-agent=${ua}`] : []),
        `--screenshot=${join(OUT, name + '.png')}`,
        `http://127.0.0.1:${PORT}/${page}?${query}&fw=${w}`,
      ],
      async (err) => {
        await rm(profile, { recursive: true, force: true }).catch(() => {});
        err ? ko(err) : ok(console.log('OK ', name));
      },
    );
  });
}

await mkdir(OUT, { recursive: true });
server.listen(PORT, '127.0.0.1');

const SHOTS = [
  ['01-accueil', 's=top&sample=1'],
  ['02-langue', 's=langmenu&sample=1'],
  ['03-allergies', 's=card-allergy-list&sample=1'],
  ['04-handicap', 's=card-checks-disabilities&sample=3'],
  ['05-operations', 's=card-surgery-list&sample=1'],
  ['06-hospitalisation', 's=field-hospDate&sample=3'],
  ['07-medicaments', 's=card-med-list&sample=1'],
  ['08-interactions', 's=interactions&sample=1'],
  ['09-vaccins', 's=card-vaccine-list&sample=2'],
  ['10-confiance', 's=field-trustedName&sample=1'],
  ['11-specialistes', 's=card-specialist-list&sample=2'],
  ['12-assurances', 's=card-insurance-list&sample=2'],
  ['13-qr-code', 's=card-qr-canvas&sample=1'],
  ['14-plein-ecran', 's=fullscreen&sample=1'],
  ['15-fond-ecran', 's=card-sel-wallpaper&sample=1'],
  ['16-transferer', 's=card-btn-scan&sample=1'],
  ['17-offrir-carte', 's=card-btn-invite&sample=1'],
  ['18-offrir-qr', 's=invite&sample=1'],
  ['19-mise-a-jour', 's=footer&sample=1'],
];
try {
  if (process.argv.includes('--iphone')) {
    // Captures du guide d'installation iPhone (identité d'un iPhone)
    await shot('iphone-01-accueil', 's=none&sample=1', { ua: IPHONE_UA });
    await shot('iphone-02-fond-ecran', 's=wallpaper-ios&sample=1', { ua: IPHONE_UA });
    await shot('iphone-03-image', 'p=iphone', { w: 540, h: 1170, page: '__wallpaper.html' });
    await shot('iphone-04-offrir', 's=invite&sample=1', { ua: IPHONE_UA });
    await shot('iphone-05-medicaments', 's=meds&sample=1', { ua: IPHONE_UA });
    process.exit(0);
  }
  // --only=<nom> : refaire une seule capture
  const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);
  for (const [name, q] of SHOTS) if (!only || name === only) await shot(name, q, { ua: ANDROID_UA });
  if (only) process.exit(0);
  await shot('20-pc', 's=top&sample=1', { w: 1280, h: 860 });
  await shot('21-carte', 's=card&sample=1', { w: 358, h: 238 }); // carte 85,6 x 54 mm + marge
  await shot('22-fond-ecran-image', '', { w: 540, h: 1170, page: '__wallpaper.html' });
} finally {
  server.close();
}
