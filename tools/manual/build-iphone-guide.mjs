// =====================================================================
// QREDO - Guide d'installation sur iPhone (documentation/*.docx)
// ---------------------------------------------------------------------
// Usage : node capture-screenshots.mjs --iphone   (captures iPhone)
//         node build-iphone-guide.mjs
//         powershell -ExecutionPolicy Bypass -File export-pdf.ps1 -Docx QREDO-Installation-iPhone.docx
// Public : un patient ou un proche, non technique, avec un iPhone.
// =====================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const IMG = resolve(ROOT, 'documentation/images');
const OUT = resolve(ROOT, 'documentation/QREDO-Installation-iPhone.docx');
const APP_URL = 'https://jpc007.github.io/qredo/';

const CONTENT_W = 9638; // A4, marges 2 cm (DXA)
const RED = 'C62828';
const INK = '1D2433';

// ------------------------------ Constructeurs ------------------------------
const runs = (text, opts = {}) =>
  String(text)
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((p) => (p.startsWith('**') ? new TextRun({ text: p.slice(2, -2), bold: true, ...opts }) : new TextRun({ text: p, ...opts })));
const P = (text, run) => new Paragraph({ children: runs(text, run), spacing: { after: 120 } });
const H1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });

let listInstance = 0;
const steps = (items) => {
  listInstance++;
  return items.map(
    (t) => new Paragraph({ children: runs(t), numbering: { reference: 'steps', level: 0, instance: listInstance }, spacing: { after: 90 } }),
  );
};
const bullets = (items) =>
  items.map((t) => new Paragraph({ children: runs(t), numbering: { reference: 'bullets', level: 0 }, spacing: { after: 80 } }));

function image(file, widthPx) {
  const data = readFileSync(resolve(IMG, file));
  const w = data.readUInt32BE(16);
  const h = data.readUInt32BE(20);
  return new ImageRun({ type: 'png', data, transformation: { width: widthPx, height: Math.round((widthPx * h) / w) } });
}

const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE };

function figures(list, widthPx) {
  const colW = Math.floor(CONTENT_W / list.length);
  const widths = list.map((_, i) => (i === list.length - 1 ? CONTENT_W - colW * (list.length - 1) : colW));
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    borders: { ...NO_BORDERS, insideHorizontal: NONE, insideVertical: NONE },
    rows: [
      new TableRow({
        cantSplit: true,
        children: list.map(
          ([file, caption], i) =>
            new TableCell({
              width: { size: widths[i], type: WidthType.DXA },
              borders: NO_BORDERS,
              verticalAlign: VerticalAlign.TOP,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [image(file, widthPx)] }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 60, after: 160 },
                  children: [new TextRun({ text: caption, italics: true, size: 18, color: '5F6B7A' })],
                }),
              ],
            }),
        ),
      }),
    ],
  });
}

const CALLOUTS = {
  important: { fill: 'FDECEA', border: RED, label: '⚠ Important' },
  conseil: { fill: 'E8F5E9', border: '2E7D32', label: '💡 Conseil' },
  note: { fill: 'E3F2FD', border: '1565C0', label: 'ℹ Bon à savoir' },
};
function callout(kind, text, title) {
  const c = CALLOUTS[kind];
  return [
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [CONTENT_W],
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: CONTENT_W, type: WidthType.DXA },
              shading: { fill: c.fill, type: ShadingType.CLEAR, color: 'auto' },
              margins: { top: 120, bottom: 80, left: 200, right: 200 },
              borders: { top: NONE, bottom: NONE, right: NONE, left: { style: BorderStyle.SINGLE, size: 24, color: c.border } },
              children: [
                new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: title || c.label, bold: true, color: c.border })] }),
                ...(Array.isArray(text) ? text : [text]).map((t) => new Paragraph({ children: runs(t), spacing: { after: 60 } })),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
  ];
}

// ------------------------------ Contenu ------------------------------
const intro = [
  new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text: 'QREDO', bold: true, size: 56, color: RED, characterSpacing: 40 })],
  }),
  new Paragraph({
    spacing: { after: 240 },
    children: [new TextRun({ text: 'Installer l’application sur un iPhone', bold: true, size: 36, color: INK })],
  }),
  P(
    'QREDO met l’essentiel de votre dossier médical dans un **QR code affiché sur l’écran de verrouillage** de votre téléphone. En cas d’urgence, un secouriste le lit en une seconde, sans connaître votre code. QREDO est **gratuit**, **sans compte**, et **vos données restent dans votre iPhone**.',
  ),
  H1('Avant de commencer'),
  ...bullets([
    'Un iPhone récent (iOS 16.4 ou plus récent : **Réglages → Général → Informations → Version d’iOS**).',
    'L’application **Safari** (la boussole bleue), et une connexion Internet pour l’installation.',
    'Environ **10 minutes**, et votre liste de médicaments et d’allergies.',
  ]),
  P(
    'Les intitulés des menus peuvent varier légèrement selon la version d’iOS. QREDO est une version d’essai : il ne remplace ni votre dossier médical ni l’avis de votre médecin.',
    { italics: true, color: '5F6B7A', size: 20 },
  ),
];

const install = [
  H1('1. Installer QREDO'),
  ...steps([
    'Ouvrez **Safari**.',
    `Tapez l’adresse **${APP_URL}** dans la barre d’adresse. Ou bien : scannez le QR code ci-dessous avec l’**appareil photo**, puis touchez le lien jaune qui apparaît.`,
    'Touchez le bouton **Partager** : le carré avec une flèche vers le haut, **en bas** de l’écran (en haut à droite sur iPad).',
    'Faites défiler la liste vers le bas et touchez **« Sur l’écran d’accueil »**. S’il n’apparaît pas : touchez **« Modifier les actions »** tout en bas de la liste et ajoutez-le.',
    'Laissez le nom **QREDO** et touchez **« Ajouter »** en haut à droite.',
    'L’icône **QREDO** apparaît sur votre écran d’accueil. **Ouvrez désormais toujours QREDO avec cette icône.**',
  ]),
  figures(
    [
      ['iphone-04-offrir.png', 'Le QR code à scanner pour ouvrir QREDO'],
      ['iphone-01-accueil.png', 'QREDO ouvert depuis son icône'],
    ],
    118,
  ),
  ...callout(
    'important',
    'Sur iPhone, l’application installée a **sa propre mémoire**, séparée de Safari. Remplissez votre dossier **dans l’application ouverte depuis l’icône**, et pas dans Safari : sinon vos données n’y seront pas.',
  ),
];

const fill = [
  H1('2. Remplir son dossier'),
  P(
    'Remplissez les rubriques qui vous concernent (identité, allergies, maladies, opérations, médicaments, vaccins, personnes à prévenir…). **Tout est enregistré automatiquement**, et la **date de dernière mise à jour** s’affiche en haut.',
  ),
  ...bullets([
    '**Médicaments** : tapez le nom que vous connaissez (ex. « Medrol ») ; la molécule s’affiche dessous. Ou touchez **« Scanner la boîte »** et visez le code-barres ou le petit carré noir et blanc de la boîte.',
    'La première fois, iPhone demande l’accès à l’**appareil photo** : touchez **« Autoriser »**. Si vous avez refusé : **Réglages → Safari → Caméra → « Demander »**.',
    'La langue de l’application se change avec le bouton **⋮** en haut à droite.',
  ]),
  figures([['iphone-05-medicaments.png', 'Les médicaments et leur molécule']], 150),
];

const wallpaper = [
  H1('3. Mettre le QR code sur l’écran de verrouillage'),
  P('C’est l’écran qui s’allume quand on touche l’iPhone, **avant** de taper le code. C’est là que le secouriste regardera.'),
  ...steps([
    'Dans QREDO, carte **« Fond d’écran de veille »** : choisissez **« iPhone »** (ou « Cet appareil »).',
    'Touchez **« Partager »**, puis **« Enregistrer l’image »**. L’image est rangée dans **Photos**.',
    'Ouvrez **Photos**, touchez l’image, puis le bouton **Partager** et **« Utiliser en fond d’écran »**.',
    'Vérifiez que le QR code est **entier et bien net**. Si iPhone propose le zoom ou l’effet de profondeur, désactivez-les. Touchez **« Ajouter »**.',
    'Choisissez **« Définir comme paire de fonds d’écran »** (ou « Personnaliser l’écran d’accueil » pour garder une autre image sur l’écran d’accueil).',
  ]),
  figures(
    [
      ['iphone-02-fond-ecran.png', 'La carte « Fond d’écran de veille »'],
      ['iphone-03-image.png', 'L’image obtenue, QR au centre'],
    ],
    150,
  ),
  ...callout('conseil', [
    '**Notifications** : pour qu’elles ne cachent pas le QR code, allez dans **Réglages → Notifications → Afficher comme** et choisissez **« Nombre »**.',
    '**Vérifiez** : verrouillez l’iPhone, touchez l’écran (ou appuyez sur le bouton latéral) : le QR code doit apparaître **sans taper le code**. Scannez-le avec un autre téléphone.',
  ]),
  ...callout(
    'important',
    'L’image ne se met **pas** à jour toute seule. Après chaque modification de votre dossier, **enregistrez à nouveau l’image** et remettez-la en fond d’écran.',
    '⚠ Après chaque modification',
  ),
];

const after = [
  H1('4. Mises à jour et suppression'),
  ...bullets([
    '**Mises à jour** : QREDO se met à jour tout seul quand vous l’ouvrez avec Internet. Le bouton **« Mettre à jour »**, tout en bas de la page, force la vérification.',
    '**Sauvegarde** : carte « Transférer / sauvegarder » → **« Exporter mon dossier (fichier) »** → **Enregistrer dans Fichiers**. Utile pour changer de téléphone.',
    '**Supprimer QREDO** : pour effacer d’abord vos données, touchez **« Tout effacer »** (carte « Démonstration », en bas). Puis, sur l’écran d’accueil, **appui long sur l’icône → « Supprimer l’app » → « Supprimer »**.',
  ]),
  new Paragraph({
    spacing: { before: 400 },
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: 'DDE2EA', space: 12 } },
    children: [new TextRun({ text: `QREDO – ${APP_URL} – gratuit, sans compte`, size: 18, color: '5F6B7A' })],
  }),
];

// ------------------------------ Document ------------------------------
const doc = new Document({
  creator: 'QREDO',
  title: 'QREDO – Installer l’application sur iPhone',
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 24, color: INK }, paragraph: { spacing: { line: 300 } } },
      heading1: {
        run: { font: 'Arial', size: 32, bold: true, color: RED },
        paragraph: { spacing: { before: 320, after: 160 }, keepNext: true },
      },
    },
  },
  numbering: {
    config: [
      {
        reference: 'steps',
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: '%1.',
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 567, hanging: 397 } }, run: { bold: true, color: RED } },
          },
        ],
      },
      {
        reference: 'bullets',
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 567, hanging: 340 } }, run: { color: RED } },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'QREDO – Installation sur iPhone  ·  page ', size: 18, color: '5F6B7A' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '5F6B7A' }),
              ],
            }),
          ],
        }),
      },
      children: [...intro, ...install, ...fill, ...wallpaper, ...after],
    },
  ],
});

writeFileSync(OUT, await Packer.toBuffer(doc));
console.log('OK ', OUT);
