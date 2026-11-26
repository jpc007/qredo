// =====================================================================
// QREDO - Génération du mode d'emploi Word (documentation/*.docx)
// ---------------------------------------------------------------------
// Usage : node build-manual.mjs   (après capture-screenshots.mjs)
// Puis  : powershell -ExecutionPolicy Bypass -File export-pdf.ps1
// Public : patients et familles (non techniques), soignants.
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
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const IMG = resolve(ROOT, 'documentation/images');
const OUT = resolve(ROOT, 'documentation/QREDO-Mode-emploi.docx');

const APP_URL = 'https://jpc007.github.io/qredo/';
const VERSION = '1.0.6';
const DATE = 'novembre 2026';

const CONTENT_W = 9638; // largeur utile A4 (marges 2 cm), en DXA
const RED = 'C62828';
const INK = '1D2433';

// ---------------------------------------------------------------------
// Petits constructeurs
// ---------------------------------------------------------------------

/** Texte avec **gras** simple. */
function runs(text, opts = {}) {
  return String(text)
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('**')
        ? new TextRun({ text: part.slice(2, -2), bold: true, ...opts })
        : new TextRun({ text: part, ...opts }),
    );
}

const P = (text, opts = {}) =>
  new Paragraph({ children: runs(text, opts.run), spacing: { after: 120 }, ...opts.para });
const H1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
const H2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

let listInstance = 0;
/** Liste numérotée (repart à 1 à chaque appel). */
function steps(items) {
  listInstance++;
  return items.map(
    (t) =>
      new Paragraph({
        children: runs(t),
        numbering: { reference: 'steps', level: 0, instance: listInstance },
        spacing: { after: 80 },
      }),
  );
}
const bullets = (items) =>
  items.map(
    (t) => new Paragraph({ children: runs(t), numbering: { reference: 'bullets', level: 0 }, spacing: { after: 80 } }),
  );

/** Dimensions d'un PNG (lues dans l'en-tête du fichier). */
function pngSize(buf) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
function image(file, widthPx) {
  const data = readFileSync(resolve(IMG, file));
  const { w, h } = pngSize(data);
  return new ImageRun({ type: 'png', data, transformation: { width: widthPx, height: Math.round((widthPx * h) / w) } });
}

// Espace vide après un tableau ou un encadré. Retiré s'il termine un
// chapitre (sinon il peut déborder seul sur une page blanche).
const SPACERS = new WeakSet();
function spacer() {
  const p = new Paragraph({ spacing: { after: 120 }, children: [] });
  SPACERS.add(p);
  return p;
}
const trimEnd = (chapter) => (SPACERS.has(chapter.at(-1)) ? chapter.slice(0, -1) : chapter);

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

/** Une ou plusieurs captures côte à côte, avec légende. */
function figures(list, widthPx) {
  const colW = Math.floor(CONTENT_W / list.length);
  const widths = list.map(() => colW);
  widths[widths.length - 1] = CONTENT_W - colW * (list.length - 1);
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    borders: { ...NO_BORDERS, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
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

/** Encadré coloré : important / conseil / note. */
const CALLOUTS = {
  important: { fill: 'FDECEA', border: RED, label: '⚠ Important' },
  conseil: { fill: 'E8F5E9', border: '2E7D32', label: '💡 Conseil' },
  note: { fill: 'E3F2FD', border: '1565C0', label: 'ℹ Bon à savoir' },
};
function callout(kind, text, title) {
  const c = CALLOUTS[kind];
  const paras = (Array.isArray(text) ? text : [text]).map(
    (t) => new Paragraph({ children: runs(t), spacing: { after: 60 } }),
  );
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
              borders: {
                top: NO_BORDER,
                bottom: NO_BORDER,
                right: NO_BORDER,
                left: { style: BorderStyle.SINGLE, size: 24, color: c.border },
              },
              children: [
                new Paragraph({
                  spacing: { after: 60 },
                  children: [new TextRun({ text: title || c.label, bold: true, color: c.border })],
                }),
                ...paras,
              ],
            }),
          ],
        }),
      ],
    }),
    spacer(),
  ];
}

/** Tableau simple avec en-tête rouge. */
function table(headers, rows, widths) {
  const cell = (text, i, header) =>
    new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      shading: header ? { fill: RED, type: ShadingType.CLEAR, color: 'auto' } : undefined,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [
        new Paragraph({
          children: header ? [new TextRun({ text, bold: true, color: 'FFFFFF' })] : runs(text),
        }),
      ],
    });
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'DDE2EA' };
  return [
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: widths,
      borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
      rows: [
        new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, i, true)) }),
        ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((t, i) => cell(t, i, false)) })),
      ],
    }),
    spacer(),
  ];
}

// ---------------------------------------------------------------------
// Contenu
// ---------------------------------------------------------------------
const cover = [
  new Paragraph({ spacing: { before: 1500 }, alignment: AlignmentType.CENTER, children: [image('../../app/icons/icon-512.png', 130)] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 120 },
    children: [new TextRun({ text: 'QREDO', bold: true, size: 72, color: RED, characterSpacing: 60 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
    children: [new TextRun({ text: 'Mon dossier médical d’urgence en un QR code', size: 32, color: INK })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [new TextRun({ text: 'Mode d’emploi', bold: true, size: 44, color: INK })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 1200 },
    children: [new TextRun({ text: `Version ${VERSION} – ${DATE}`, size: 24, color: '5F6B7A' })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Adresse de l’application', size: 22, color: '5F6B7A' })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({ text: APP_URL, bold: true, size: 28, color: '1565C0' })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: 'Gratuit · Sans compte · 7 langues · Vos données restent sur votre appareil', size: 22, color: '2E7D32' }),
    ],
  }),
  pageBreak(),
  new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: 'Sommaire', bold: true, size: 36, color: RED })] }),
  new TableOfContents('Sommaire', { hyperlink: true, headingStyleRange: '1-2' }),
];

const ch1 = [
  H1('1. QREDO en bref'),
  P(
    'En cas d’accident ou de malaise, les secours doivent savoir très vite qui vous êtes, si vous êtes allergique, quels médicaments vous prenez, si vous avez un pacemaker ou une maladie importante…',
  ),
  P(
    'QREDO met **l’essentiel de votre dossier médical dans un QR code** affiché sur l’écran de verrouillage de votre téléphone. Un secouriste le lit en une seconde avec son propre téléphone, **sans connaître votre code** et **sans Internet**. Le QR code est rédigé **en anglais médical**, compris par les secours partout en Belgique et à l’étranger.',
  ),
  ...bullets([
    '**Gratuit**, sans publicité, **sans compte** et sans inscription.',
    '**Vos données restent sur votre appareil** : rien n’est envoyé sur Internet.',
    'Fonctionne **sans connexion** une fois installé.',
    'Sur **Android**, **iPhone** et **ordinateur**, en **7 langues** (français, anglais, allemand, néerlandais, italien, portugais, espagnol).',
    'Aide à la saisie des médicaments grâce à la **base officielle belge SAM** (AFMPS), avec **scan de la boîte** sur téléphone et **avis d’interactions**.',
  ]),
  H2('Ce qu’il vous faut'),
  ...bullets([
    'Un smartphone avec **Chrome** (Android) ou **Safari** (iPhone), ou un ordinateur.',
    'Environ **15 minutes**.',
    'Vos documents médicaux : liste de médicaments, allergies, vaccins, coordonnées de vos médecins et de votre assurance.',
  ]),
  ...callout(
    'important',
    'QREDO est une version d’essai. Il ne remplace ni votre dossier médical ni l’avis de votre médecin. Vérifiez vos informations avec lui, en particulier les allergies et les médicaments.',
  ),
];

const ch2 = [
  H1('2. Installer QREDO'),
  P('QREDO s’installe directement depuis son adresse, sans passer par le Play Store ou l’App Store.'),
  H2('2.1 Sur un téléphone Android (Samsung, Xiaomi, Pixel…)'),
  ...steps([
    'Ouvrez l’application **Chrome**.',
    `Tapez l’adresse **${APP_URL}**, ou scannez le QR code « Offrir QREDO » d’un proche (voir 2.4).`,
    'Appuyez sur le bouton **Installer** en haut à droite. S’il n’apparaît pas : menu **⋮** de Chrome → **Installer l’application** (ou « Ajouter à l’écran d’accueil »).',
    'Confirmez avec **Installer** : l’icône **QREDO** apparaît sur l’écran d’accueil.',
  ]),
  figures([['01-accueil.png', 'Le bouton « Installer » et la date de mise à jour en tête']], 190),
  H2('2.2 Sur un iPhone'),
  ...steps([
    'Ouvrez **Safari** et tapez l’adresse de QREDO.',
    'Touchez le bouton **Partager** (carré avec une flèche vers le haut), puis **« Sur l’écran d’accueil »** → **Ajouter**.',
    'Ouvrez désormais QREDO **avec son icône**.',
  ]),
  ...callout(
    'important',
    'Sur iPhone, l’application installée a **sa propre mémoire**, séparée de Safari : remplissez votre dossier **dans l’application ouverte depuis l’icône**. Un guide détaillé existe : **« QREDO – Installer l’application sur un iPhone »**.',
  ),
  H2('2.3 Sur un ordinateur (Windows, Mac)'),
  ...steps([
    'Ouvrez **Chrome** ou **Edge**, puis l’adresse de QREDO.',
    'Cliquez sur l’icône d’installation à droite de la barre d’adresse, ou menu **⋮** → **Installer QREDO**.',
  ]),
  figures([['20-pc.png', 'QREDO sur ordinateur : le formulaire à gauche, le QR code à droite']], 540),
  P('Sur ordinateur, le scan des boîtes de médicaments n’est pas proposé : il est réservé aux téléphones et tablettes.', {
    run: { italics: true, color: '5F6B7A', size: 20 },
  }),
  H2('2.4 Offrir QREDO à un proche'),
  ...steps([
    'Carte **🤝 Offrir QREDO à un proche** → **Afficher le QR de l’application**.',
    'Votre proche le scanne avec l’appareil photo de son téléphone, puis installe QREDO.',
    'Ou bien : **Partager le lien** par WhatsApp, SMS ou e-mail.',
  ]),
  figures(
    [
      ['17-offrir-carte.png', 'La carte « Offrir QREDO »'],
      ['18-offrir-qr.png', 'Le QR code à faire scanner'],
    ],
    175,
  ),
  H2('2.5 Choisir la langue'),
  P(
    'Touchez le bouton **⋮** en haut à droite et choisissez votre langue. Tout l’écran change de langue ; **le QR code, lui, reste toujours en anglais médical**, pour les secouristes.',
  ),
  figures([['02-langue.png', 'Le menu des langues']], 175),
];

const ch3 = [
  H1('3. Remplir son dossier'),
  P(
    'Remplissez les rubriques qui vous concernent, dans l’ordre de l’écran. **Tout est enregistré automatiquement**. En haut du dossier, un bandeau indique la **date et l’heure de la dernière mise à jour** : elle change à chaque modification.',
  ),
  ...table(
    ['Rubrique', 'Ce qu’il faut indiquer'],
    [
      ['👤 Identité', 'Nom, prénom, sexe, date de naissance, adresse, langues parlées.'],
      ['⚠️ Allergies', 'La substance et la gravité de la réaction (grave, modérée, légère). Cochez « Aucune allergie connue » si c’est le cas.'],
      ['🫀 Implants et appareils', 'Pacemaker, défibrillateur, valve cardiaque, pompe à insuline, prothèse…'],
      ['🩺 Maladies', 'Cochez dans la liste ; ajoutez les autres en les séparant par des virgules.'],
      ['♿ Handicap', 'Mobilité réduite, fauteuil roulant, malvoyant, malentendant, troubles de la mémoire… + texte libre.'],
      ['🩹 Opérations chirurgicales', 'Les opérations subies, avec l’année (liste de suggestions ou texte libre).'],
      ['🏨 Dernière hospitalisation', 'Date d’entrée, hôpital, raison.'],
      ['💊 Médicaments', 'Nom et dose ; la molécule s’affiche dessous (voir chapitre 4).'],
      ['💉 Vaccins', 'Le vaccin et la date de la dernière injection.'],
      ['📜 Volontés', 'Directives anticipées, refus de transfusion, non-réanimation (DNR).'],
      ['📏 Mesures', 'Groupe sanguin, poids, taille.'],
      ['📞 Personnes à prévenir', 'Deux personnes au maximum : nom, lien, téléphone.'],
      ['🧑‍🤝‍🧑 Personne de confiance', 'Une personne réputée de confiance, qui peut être prévenue (à part des personnes à prévenir).'],
      ['👨‍⚕️ Médecin traitant', 'Nom et téléphone.'],
      ['🏥 Médecins spécialistes', 'Autant que nécessaire : nom, spécialité, téléphone.'],
      ['🛡️ Assurances', 'Nom de l’assurance, n° de police et type (hospitalisation, rapatriement…).'],
      ['📝 Remarque', 'Une phrase courte, de préférence en anglais.'],
    ],
    [2900, CONTENT_W - 2900],
  ),
  H2('Allergies, handicap, opérations'),
  figures(
    [
      ['03-allergies.png', 'Allergies : substance et gravité'],
      ['04-handicap.png', 'Handicap : cases à cocher'],
      ['05-operations.png', 'Opérations et année'],
    ],
    160,
  ),
  H2('Hospitalisation, vaccins, personne de confiance'),
  figures(
    [
      ['06-hospitalisation.png', 'Dernière hospitalisation'],
      ['09-vaccins.png', 'Vaccins et date de la dernière injection'],
      ['10-confiance.png', 'Personne de confiance'],
    ],
    160,
  ),
  H2('Médecins spécialistes et assurances'),
  figures(
    [
      ['11-specialistes.png', 'Plusieurs spécialistes possibles'],
      ['12-assurances.png', 'Assurance : nom, n° de police, type'],
    ],
    175,
  ),
  ...callout('conseil', [
    'Les listes (allergies, opérations, vaccins, spécialités, types d’assurance) sont des **suggestions** : choisissez dans la liste ou **tapez librement** si vous ne trouvez pas.',
    'Vous pouvez écrire dans votre langue : QREDO traduit automatiquement les termes reconnus en anglais médical dans le QR code.',
  ]),
];

const ch4 = [
  H1('4. Médicaments : saisie, scan et interactions'),
  H2('4.1 Taper le nom'),
  P(
    'Tapez le nom que vous connaissez (ex. « Medrol ») : QREDO propose les médicaments de la **base officielle belge SAM** (AFMPS / eHealth, plus de 14 000 médicaments). La **molécule** s’affiche sous la ligne (ex. « → Molécule : METHYLPREDNISOLONE ») et la dose se remplit si vous choisissez un produit précis. C’est la molécule qui va dans le QR code : elle est comprise partout.',
  ),
  figures([['07-medicaments.png', 'Les médicaments et leur molécule']], 180),
  H2('4.2 Scanner la boîte (téléphone et tablette)'),
  ...steps([
    'Touchez **📷 Scanner la boîte** et autorisez l’appareil photo.',
    'Visez le **code-barres** ou le **petit carré noir et blanc (DataMatrix)** de la boîte : le médicament est reconnu avec certitude grâce à la base SAM.',
    'Si aucun code n’est lu après quelques secondes, le cadre devient **orange** : visez le **nom** du médicament et touchez **« Lire le nom »**.',
    'Touchez le bon médicament dans la liste proposée : il est ajouté à votre dossier.',
  ]),
  ...callout(
    'note',
    'Tout se passe **dans le téléphone** : aucune image ni aucun nom de médicament n’est envoyé sur Internet. Le scan n’est pas proposé sur ordinateur.',
  ),
  H2('4.3 Avis d’interactions'),
  P(
    'Dès que deux médicaments reconnus peuvent interagir (saisis à la main ou scannés), un **encadré orange** apparaît sous la liste : le niveau (contre-indiqué, déconseillé, prudence), les deux médicaments et le risque. **Demandez alors conseil à votre médecin ou à votre pharmacien, et ne modifiez jamais un traitement de vous-même.**',
  ),
  figures([['08-interactions.png', 'Exemple : Sintrom + Nurofen']], 180),
  ...callout(
    'important',
    'Il s’agit d’une **vérification de base, non exhaustive**. L’absence d’avis ne garantit pas l’absence d’interaction. L’avis n’apparaît pas dans le QR code.',
  ),
];

const ch5 = [
  H1('5. Votre QR code vital'),
  P('Le QR code se met à jour pendant que vous remplissez le formulaire.'),
  ...bullets([
    '**La jauge** indique la taille du QR code : **vert** jusqu’à 700 octets (lecture facile), **orange** jusqu’à 900 (proche de la limite), **rouge** au-delà (trop long : retirez les informations les moins importantes).',
    '**Voir le texte encodé** montre exactement ce que lira le secouriste (en anglais médical).',
    '**Afficher en grand** montre le QR code en plein écran : pratique pour le faire scanner directement.',
    'La ligne **UPDATED** du QR code indique la date et l’heure de mise à jour en **heure UTC** (heure universelle), vérifiée sur le serveur quand il y a une connexion.',
  ]),
  figures(
    [
      ['13-qr-code.png', 'Le QR code et sa jauge'],
      ['14-plein-ecran.png', 'Le QR code en plein écran'],
    ],
    180,
  ),
  ...callout(
    'important',
    'Toute personne qui voit votre écran verrouillé peut scanner votre QR code. N’y mettez que ce que vous acceptez de montrer à un secouriste.',
    '⚠ Qui peut lire ce QR code ?',
  ),
];

const ch6 = [
  H1('6. Mettre le QR code sur l’écran de verrouillage'),
  P(
    'L’écran de verrouillage est celui qui s’allume quand on appuie sur le bouton du téléphone, **avant** de taper le code. C’est là que le secouriste regardera. Le QR code est placé **au centre** de l’image : l’heure en haut et les raccourcis en bas restent libres.',
  ),
  H2('Étape 1 – Créer l’image'),
  ...steps([
    'Carte **📱 Fond d’écran de veille** : choisissez le modèle (sur le téléphone : « Cet appareil »).',
    'Android : **⬇️ Télécharger** (l’image va dans la Galerie). iPhone : **📤 Partager** → **Enregistrer l’image**.',
  ]),
  figures(
    [
      ['15-fond-ecran.png', 'La carte « Fond d’écran de veille »'],
      ['22-fond-ecran-image.png', 'L’image obtenue : QR au centre'],
    ],
    175,
  ),
  H2('Étape 2 – La choisir comme fond d’écran'),
  ...table(
    ['Téléphone', 'Marche à suivre'],
    [
      [
        '**Samsung Galaxy**',
        'Galerie → l’image → **⋮** → **Définir comme fond d’écran** → **Écran de verrouillage**. Vérifiez que l’horloge ne cache pas le QR code, puis **Terminé**.',
      ],
      [
        '**Xiaomi, Redmi, Poco**',
        'Galerie → l’image → **⋯ Plus** → **Définir comme fond d’écran** → **Écran de verrouillage**. Désactivez le **Carrousel de fonds d’écran** (Paramètres → Écran de verrouillage).',
      ],
      ['**Google Pixel**', 'Photos → l’image → **⋮** → **Utiliser comme** → **Fond d’écran** → **Écran de verrouillage**.'],
      ['**iPhone**', 'Photos → l’image → **Partager** → **Utiliser en fond d’écran** → désactivez le zoom → **Ajouter**.'],
    ],
    [2400, CONTENT_W - 2400],
  ),
  H2('Étape 3 – Réglages et vérification'),
  ...bullets([
    '**Notifications** : Samsung : Paramètres → Écran de verrouillage → Notifications → **Icônes uniquement**. iPhone : Réglages → Notifications → Afficher comme → **Nombre**.',
    '**Vérifiez** : verrouillez le téléphone, appuyez une fois sur le bouton : le QR code doit apparaître **sans taper le code**. Scannez-le avec un autre téléphone.',
    'L’affichage « toujours allumé » (l’heure en petit sur fond noir) ne montre pas le fond d’écran : il faut réveiller l’écran.',
  ]),
  ...callout(
    'important',
    'L’image ne se met **pas** à jour toute seule. Après chaque modification de votre dossier, **refaites l’image** et remettez-la en fond d’écran.',
    '⚠ Après chaque modification',
  ),
];

const ch7 = [
  H1('7. Transférer son dossier'),
  P(
    'Vos données sont enregistrées **dans l’appareil où vous les avez saisies**. Pour les retrouver sur un autre appareil (de l’ordinateur vers le téléphone, ou lors d’un changement de téléphone), trois méthodes :',
  ),
  ...table(
    ['Méthode', 'Comment', 'Quand l’utiliser'],
    [
      [
        '**1. Envoyer l’image**',
        'Télécharger (ou Partager) le fond d’écran, l’envoyer à soi-même, puis le définir comme fond d’écran sur le téléphone.',
        'Le plus simple : le téléphone n’a même pas besoin de QREDO.',
      ],
      [
        '**2. Scanner le QR code**',
        'Sur le téléphone : **Importer en scannant un QR QREDO**, puis viser le QR code affiché sur l’ordinateur.',
        'Rapide. Le texte est repris tel qu’il est écrit dans le QR code.',
      ],
      [
        '**3. Fichier de sauvegarde**',
        '**Exporter mon dossier (fichier)**, l’envoyer sur l’autre appareil, puis **Importer un dossier (fichier)**.',
        'Changement de téléphone : tout est repris **à l’identique**.',
      ],
    ],
    [2300, 4300, CONTENT_W - 6600],
  ),
  ...callout(
    'important',
    'Le fichier de sauvegarde contient vos données médicales **en clair**. Ne le laissez pas traîner et supprimez-le une fois le transfert fait.',
  ),
  figures([['16-transferer.png', 'La carte « Transférer / sauvegarder »']], 150),
];

const ch8 = [
  H1('8. Imprimer la carte portefeuille'),
  P('Pour avoir votre QR code même si le téléphone est déchargé, ou si vous n’avez pas de smartphone.'),
  ...steps([
    'Carte **🔄 Transférer / sauvegarder** → **🖨️ Imprimer ma carte portefeuille**.',
    'Imprimez, puis découpez la carte le long du pointillé (format carte bancaire 85,6 × 54 mm).',
    'Glissez-la dans votre portefeuille, à côté de votre carte d’identité.',
  ]),
  figures([['21-carte.png', 'La carte portefeuille à découper']], 330),
  ...callout('conseil', 'Faites plastifier la carte. Réimprimez-la après chaque modification de votre dossier.'),
];

const ch9 = [
  H1('9. Mettre à jour l’application'),
  P('QREDO **se met à jour tout seul** à chaque ouverture avec Internet. Le numéro de version est affiché tout en bas de la page.'),
  ...bullets([
    'Le bouton **🔄 Mettre à jour**, en bas de la page, force la recherche d’une nouvelle version.',
    'Sur téléphone, si la version semble ancienne : **fermez complètement** l’application (écran des applications récentes → balayez QREDO), puis rouvrez-la.',
    'La base des médicaments (SAM) est rafraîchie **chaque semaine** automatiquement.',
  ]),
  figures([['19-mise-a-jour.png', 'Le numéro de version et le bouton « Mettre à jour »']], 180),
];

const ch10 = [
  H1('10. Supprimer ses données ou l’application'),
  H2('10.1 Effacer son dossier'),
  ...steps(['Tout en bas, carte **🧪 Démonstration** → **Tout effacer**.', 'Confirmez : toutes les données QREDO de cet appareil sont effacées.']),
  H2('10.2 Supprimer les fichiers téléchargés'),
  P(
    'Deux types de fichiers peuvent se trouver dans vos **Téléchargements** : l’image du fond d’écran (**qredo-fond-ecran-….png**) et le fichier de sauvegarde (**qredo-….json**). Supprimez-les avec l’application **Fichiers** (Samsung : **Mes fichiers**), **Photos** ou le dossier **Téléchargements** de l’ordinateur, puis videz la corbeille.',
  ),
  H2('10.3 Désinstaller QREDO'),
  ...table(
    ['Appareil', 'Marche à suivre'],
    [
      ['**Android**', 'Appui long sur l’icône QREDO → **Désinstaller**.'],
      ['**iPhone**', 'Appui long sur l’icône QREDO → **Supprimer l’app** → **Supprimer**.'],
      ['**Ordinateur**', 'QREDO → menu **⋮** de la fenêtre → **Désinstaller QREDO** (cochez « Effacer aussi les données »).'],
    ],
    [2000, CONTENT_W - 2000],
  ),
  ...callout('important', 'Désinstaller ne supprime pas toujours vos données : utilisez d’abord **Tout effacer** (10.1).'),
];

const ch11 = [
  H1('11. Pour les secouristes et les soignants'),
  P('Vous trouvez un QR code « EMERGENCY MEDICAL ID » sur l’écran d’un téléphone :'),
  ...steps([
    'Appuyez **une fois** sur le bouton latéral pour allumer l’écran. Inutile de connaître le code.',
    'Ouvrez l’**appareil photo** de votre téléphone et visez le QR code : la fiche s’affiche en texte, en anglais médical, **sans Internet**.',
    'Vérifiez la ligne **UPDATED** (date et heure UTC de la dernière mise à jour).',
  ]),
  ...table(
    ['Ligne', 'Signification'],
    [
      ['NAME / SEX / DOB / ADDRESS', 'Nom (NOM en majuscules), sexe, date de naissance et âge, adresse'],
      ['ALLERGY', 'Allergies et gravité (SEVERE, MODERATE, MILD) ; NONE KNOWN = aucune connue'],
      ['IMPLANT', 'Implants et appareillages (PACEMAKER, ICD, valve…)'],
      ['DIRECTIVE', 'Directives anticipées, refus de transfusion, DNR'],
      ['CONDITION / DISABILITY', 'Maladies ; handicaps'],
      ['SURGERY / HOSPITALIZATION', 'Opérations (année) ; dernière hospitalisation (date, hôpital, raison)'],
      ['MEDS / VACCINE', 'Médicaments (molécule, dose) ; vaccins (date de la dernière injection)'],
      ['BLOOD / WEIGHT / HEIGHT', 'Groupe sanguin, poids, taille'],
      ['CONTACT / TRUSTED PERSON', 'Personnes à prévenir ; personne de confiance'],
      ['GP / SPECIALIST', 'Médecin traitant ; spécialistes (spécialité)'],
      ['INSURANCE', 'Assurances : nom, NO: n° de police, (type)'],
      ['LANG / NOTE / UPDATED', 'Langues parlées, remarque, date de mise à jour (UTC)'],
    ],
    [3300, CONTENT_W - 3300],
  ),
];

const ch12 = [
  H1('12. Questions fréquentes'),
  H2('Mes données sont-elles envoyées sur Internet ?'),
  P(
    'Non. Elles restent dans votre téléphone (ou votre ordinateur). La seule connexion faite est la vérification de l’heure auprès de notre serveur, sans aucune donnée personnelle.',
  ),
  H2('Est-ce payant ? Faut-il un compte ?'),
  P('Non et non. QREDO est gratuit et ne demande aucune inscription.'),
  H2('Que se passe-t-il si je perds mon téléphone ?'),
  P('Votre dossier disparaît avec lui : faites de temps en temps une **sauvegarde en fichier** (chapitre 7) et gardez-la en lieu sûr.'),
  H2('La jauge est orange ou rouge, mon dossier est trop long'),
  P(
    'Raccourcissez la remarque, retirez un contact, une assurance ou les mesures. Gardez en priorité : allergies, médicaments, implants, volontés, maladies graves.',
  ),
  H2('Pourquoi l’heure est-elle indiquée en « UTC » ?'),
  P(
    'L’heure UTC (heure universelle) est la même partout dans le monde : un secouriste à l’étranger sait exactement quand votre dossier a été mis à jour. L’écran vous montre aussi l’heure locale.',
  ),
  H2('QREDO fonctionne-t-il sans Internet ?'),
  P('Oui, une fois installé. Et le QR code du fond d’écran est une simple image : il se lit toujours, même en mode avion.'),
  new Paragraph({
    spacing: { before: 600 },
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: 'DDE2EA', space: 12 } },
    children: [
      new TextRun({
        text: 'QREDO – QR Electronic Data Organiser · Idée originale : Dr L. Bodson · Application gratuite, version d’essai',
        size: 18,
        color: '5F6B7A',
      }),
    ],
  }),
];

const CHAPTERS = [ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8, ch9, ch10, ch11, ch12];

// ---------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------
const doc = new Document({
  creator: 'QREDO',
  title: 'QREDO – Mode d’emploi',
  description: 'Mode d’emploi de l’application QREDO',
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 24, color: INK }, paragraph: { spacing: { line: 300 } } },
      heading1: {
        run: { font: 'Arial', size: 36, bold: true, color: RED },
        // Chaque chapitre commence sur une nouvelle page
        paragraph: { spacing: { before: 0, after: 200 }, keepNext: true, pageBreakBefore: true },
      },
      heading2: {
        run: { font: 'Arial', size: 28, bold: true, color: INK },
        paragraph: { spacing: { before: 280, after: 120 }, keepNext: true },
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
                new TextRun({ text: 'QREDO – Mode d’emploi  ·  page ', size: 18, color: '5F6B7A' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '5F6B7A' }),
              ],
            }),
          ],
        }),
      },
      children: [...cover, ...CHAPTERS.flatMap(trimEnd)],
    },
  ],
});

writeFileSync(OUT, await Packer.toBuffer(doc));
console.log('OK ', OUT);
