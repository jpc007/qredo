# QREDO – QR Electronic Data Organiser

**Mon dossier médical d'urgence en un QR code.** Idée originale : Dr L. Bodson.
Preuve de concept (POC, v1.0.6) : application web installable (PWA) pour smartphone et PC.

> 🔒 Les données restent **sur l'appareil** du patient. Aucun serveur applicatif, aucun compte, aucune donnée
> patient envoyée sur Internet.

> 📌 **Reprise du projet : lire [SUIVI.md](SUIVI.md)** (état des lieux, ordre du jour, passage sur le serveur
> définitif). Tâches : [TODO.md](TODO.md).

---

## Ce que fait le POC

| Fonction | Détail |
| --- | --- |
| Dossier complet | Identité, allergies, implants, maladies, handicap, opérations, hospitalisation, médicaments, vaccins, volontés, mesures, contacts, personne de confiance, médecins, assurances |
| QR code en anglais médical | ASCII (1 caractère = 1 octet), molécules (DCI), objectif ≤ 900 octets, date `UPDATED` en UTC |
| 7 langues d'interface | FR, EN, DE, NL, IT, PT, ES (menu ⋮) ; le QR reste en anglais |
| Médicaments | Base officielle belge SAM (AFMPS), scan de la boîte (DataMatrix / CNK, puis OCR) sur mobile, avis d'interactions |
| Fond d'écran de veille | Image à la taille du téléphone, QR centré, aide Android / iPhone |
| Transfert / sauvegarde | Image, scan du QR (import), fichier `.json` ; carte portefeuille imprimable |
| Installation + hors ligne | Icône sur l'écran d'accueil, mode avion, mises à jour automatiques |

## Structure du projet

```
QREDO/
├── app/                        ← L'APPLICATION (dossier publié tel quel)
│   ├── index.html              Page unique : formulaire + panneau QR
│   ├── manifest.webmanifest    Appli installée (nom, icônes)
│   ├── sw.js                   Service worker (hors ligne) – liste APP_FILES
│   ├── css/style.css           Apparence (téléphone, PC, impression)
│   ├── js/
│   │   ├── app.js              Point d'entrée
│   │   ├── core/               Logique : qr-text (dossier ⇄ QR), qr-render, storage, clock (heure UTC),
│   │   │                       drug-db (base SAM), barcode, ocr, interactions, device
│   │   ├── data/               picklists (codes), interactions (table de base), sample-dossier (5 patients fictifs)
│   │   ├── i18n/               Traductions intégrées (fr, en, de, nl, it, pt, es) + moteur i18n
│   │   └── ui/                 form, wallpaper, scanner, med-camera, interactions-panel, lang-menu, print-card
│   ├── lib/                    Bibliothèques embarquées (qrcode-generator, jsQR, zxing-wasm, tesseract)
│   ├── data/                   Base médicaments générée (non versionnée)
│   └── icons/                  Icônes
├── documentation/              Mode d'emploi + guide iPhone (Word, PDF) et captures
├── docs/                       Notes internes (démonstration)
├── tools/
│   ├── sam/build-drug-db.py    Base médicaments depuis l'export public SAM (AFMPS / eHealth)
│   ├── manual/                 Génération des documents (captures, Word, PDF)
│   ├── generate-icons.ps1      Icônes
│   └── phone-dev.ps1           Appli sur un téléphone Android branché (adb)
├── .github/workflows/pages.yml Publication + base SAM (chaque envoi + chaque lundi)
├── SUIVI.md / TODO.md          Suivi et tâches
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

## Régénérer le mode d'emploi

Après une modification de l'application (nécessite Chrome et Microsoft Word) :

```powershell
cd tools\manual
npm install                      # une seule fois
node capture-screenshots.mjs     # captures d'écran (+ --iphone pour le guide iPhone)
node build-manual.mjs            # documentation\QREDO-Mode-emploi.docx
powershell -ExecutionPolicy Bypass -File export-pdf.ps1   # sommaire + PDF
```

Penser à mettre à jour `VERSION` dans `build-manual.mjs`.

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
