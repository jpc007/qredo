# QREDO – QR Electronic Data Organiser

**Mon dossier médical d'urgence en un QR code.** Idée originale : Dr L. Bodson.
Preuve de concept (POC) : application web installable (PWA) pour smartphone et PC.

> 🔒 Les données restent **sur l'appareil** du patient. Aucun serveur, aucun compte, rien n'est envoyé sur Internet.

---

## Ce que fait le POC

| Fonction                       | Détail                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| Formulaire en français         | Listes à cocher (allergies, anticoagulants, implants, maladies), médicaments, contacts    |
| QR code en anglais médical     | Généré en direct, ASCII (sans accents : 1 caractère = 1 octet), noms de molécules (DCI)   |
| Jauge d'octets                 | Objectif ≤ 900 octets pour une lecture fiable sur écran de veille                         |
| Fond d'écran de veille         | Image PNG à la taille du téléphone, QR dans la moitié basse, bandeau EMERGENCY            |
| Transfert PC → téléphone (1)   | Télécharger / partager l'image du fond d'écran                                            |
| Transfert PC → téléphone (2)   | Scanner le QR affiché sur le PC avec l'appli du téléphone : tous les champs se remplissent |
| Transfert / sauvegarde (3)     | Fichier `.json` exporté / importé                                                         |
| Carte portefeuille             | Impression au format carte bancaire (85,6 × 54 mm)                                         |
| Installation + hors ligne      | Icône sur l'écran d'accueil, fonctionne en mode avion                                     |

## Structure du projet

```
QREDO/
├── app/                        ← L'APPLICATION (dossier à publier tel quel)
│   ├── index.html              Page unique : formulaire + panneau QR
│   ├── manifest.webmanifest    Nom, icônes, couleurs de l'appli installée
│   ├── sw.js                   Service worker : fonctionnement hors ligne
│   ├── css/
│   │   └── style.css           Apparence (téléphone d'abord, PC ≥ 960 px, impression)
│   ├── js/
│   │   ├── app.js              Point d'entrée : relie tous les modules
│   │   ├── core/               Logique pure (sans interface)
│   │   │   ├── qr-text.js      Dossier ⇄ texte du QR (construction + relecture)
│   │   │   ├── qr-render.js    Génération et dessin du QR code
│   │   │   └── storage.js      Sauvegarde locale, fichier .json
│   │   ├── data/               Données de référence
│   │   │   ├── picklists.js    Listes français → anglais médical, noms commerciaux → DCI
│   │   │   └── sample-dossier.js  Dossier fictif de démonstration
│   │   └── ui/                 Interface
│   │       ├── form.js         Formulaire : construction, remplissage, lecture
│   │       ├── wallpaper.js    Fond d'écran de veille
│   │       ├── scanner.js      Lecture de QR (caméra ou photo)
│   │       └── print-card.js   Carte portefeuille
│   ├── lib/                    Bibliothèques externes (ne pas modifier)
│   │   ├── qrcode-generator.js Génération QR – Kazuhiko Arase, licence MIT
│   │   └── jsqr.js             Lecture QR de secours – licence Apache 2.0
│   └── icons/                  Icônes de l'application (PNG)
├── tools/                      Scripts PowerShell pour le développement
│   ├── generate-icons.ps1      Redessine les icônes
│   └── phone-dev.ps1           Affiche l'appli sur un téléphone Android branché (adb)
├── .github/workflows/pages.yml Publication automatique sur GitHub Pages
└── .vscode/                    Réglages VS Code (Live Server, Prettier)
```

Langages : **HTML** (structure), **CSS** (apparence), **JavaScript** (logique, modules ES).
Pas de Node.js ni de compilation : le navigateur exécute directement les fichiers.

## Lancer l'application

**Sur le PC** : dans VS Code, cliquer sur **Go Live** (barre d'état en bas à droite).
Chrome s'ouvre sur `http://127.0.0.1:5500`. Chaque sauvegarde recharge la page.
Démo instantanée : `http://127.0.0.1:5500/?exemple`.

**Sur un téléphone Android branché en USB** (après Go Live) :

```powershell
powershell -ExecutionPolicy Bypass -File tools\phone-dev.ps1
```

Le téléphone ouvre `http://localhost:5500` : caméra, installation et hors ligne fonctionnent.

## Publier (pour installer sur n'importe quel téléphone)

L'installation exige une adresse **https**. Ce dépôt est publié automatiquement sur
GitHub Pages à chaque `git push` sur `main` (voir `.github/workflows/pages.yml`) :
seul le dossier `app/` est mis en ligne.

Sur le Samsung : ouvrir l'adresse dans **Chrome** → menu ⋮ → **Installer l'application**.

## Contraintes du QR code (à retenir)

| Contenu        | Version QR | Carrés de côté | Taille d'un carré (QR de 6 cm) | Lecture            |
| -------------- | ---------- | -------------- | ------------------------------ | ------------------ |
| ~400 octets    | 14–15      | ~75            | 0,8 mm                         | Instantanée        |
| ~650 octets    | 20         | 97             | 0,6 mm                         | Très bonne         |
| **~900 octets**| **24**     | **113**        | **0,53 mm**                    | **Limite conseillée** |
| 1900 octets    | 35+        | 157+           | 0,38 mm                        | Fragile            |

- Correction d'erreur **M** : ~15 % du code peut être abîmé (reflet, fissure).
- Un caractère accentué = **2 octets** en UTF-8 → le QR est écrit en **anglais, sans accents**.
- Le dossier d'exemple complet (Dupont) tient en **~640 octets**.

## Feuille de route (après le POC)

- Choix de la langue de l'interface (FR / NL / EN / DE)
- Dossier complet + documents (ECG, radio) en local, export PDF
- Lien sécurisé vers un dossier complet en ligne (jeton changé à chaque modification)
- Rappels vaccins / médicaments, application native (fond d'écran automatique sur Android)
