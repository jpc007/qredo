# QREDO – Suivi du projet et reprise

_État des lieux au 26 novembre 2026 – application **v1.0.6** (POC)_

> **À lire en premier lors d'une reprise.** Les tâches détaillées sont dans [TODO.md](TODO.md),
> le fonctionnement technique dans [README.md](README.md).

---

## ⚠️ Prochaine étape majeure : passage sur le serveur définitif

Le POC tourne aujourd'hui sur **GitHub Pages, sur un compte personnel** (`jpc007`). C'est suffisant pour
tester, mais **pas pour durer** : on va passer **bientôt sur un serveur réel** dédié au projet.

- Pas de problème RGPD à ce stade : **aucune donnée patient n'est exposée à distance**. Tout reste dans
  le téléphone (ou l'ordinateur) du patient ; le site ne sert que le code de l'application et la base
  publique des médicaments.
- Le changement d'adresse demandera une **migration** des utilisateurs : l'application installée et ses
  données sont liées à l'adresse du site → prévoir l'export / import du fichier de sauvegarde, et un
  message dans l'ancienne version invitant à passer sur la nouvelle adresse.

### 📌 Ordre du jour de la prochaine session (sur le serveur définitif)

1. **Choisir et préparer le serveur** (hébergeur, nom de domaine, ex. `qredo.be`, HTTPS).
2. **Migrer** le site (le dossier `app/` + la génération hebdomadaire de la base SAM).
3. **Ajouter les PDF** à l'application, téléchargeables depuis l'appli :
   - mode d'emploi (`documentation/QREDO-Mode-emploi.pdf`) ;
   - guide d'installation iPhone (`documentation/QREDO-Installation-iPhone.pdf`).
4. Vérifier la **licence SAM** (AFMPS / eHealth) avant la mise en ligne définitive (voir TODO).
5. Mettre en place l'**alerte e-mail « code de boîte inconnu »** (nécessite le serveur ; voir TODO).

---

## Où trouver quoi

| Élément | Adresse / emplacement |
| --- | --- |
| Application en ligne (POC) | <https://jpc007.github.io/qredo/> (démo : `?exemple=1` à `?exemple=5`) |
| Dépôt du code | <https://github.com/jpc007/qredo> (public) |
| Application (code) | `app/` – HTML / CSS / JavaScript, sans compilation |
| Base médicaments (génération) | `tools/sam/build-drug-db.py` (exécuté par GitHub Actions) |
| Publication | `.github/workflows/pages.yml` (à chaque envoi + chaque lundi 04:00 UTC) |
| Mode d'emploi FR (22 p.) | `documentation/QREDO-Mode-emploi.pdf` / `.docx` |
| Guide installation iPhone (4 p.) | `documentation/QREDO-Installation-iPhone.pdf` / `.docx` |
| Génération des documents | `tools/manual/` (captures, Word, export PDF par Word) |
| Mémo des tâches | `TODO.md` |
| Cahier des charges du Dr Bodson | `MinimumlRequierement/` – **sur le PC uniquement**, volontairement **hors dépôt** (document de tiers) : à sauvegarder à part |

---

## Ce que fait l'application (v1.0.6)

**Principe** : le patient remplit son dossier (en français ou dans l'une des 7 langues) ; l'appli produit un
**QR code en anglais médical** (ASCII, ≤ 900 octets visés) à mettre en **fond d'écran de verrouillage**. Un
secouriste le lit sans déverrouiller le téléphone ni Internet. Données **uniquement sur l'appareil**.

### Rubriques du dossier
Identité (avec adresse) · Allergies (Grave / Modérée / Légère) · Implants · Maladies · **Handicap** ·
**Opérations chirurgicales** (+ année) · **Dernière hospitalisation** · Médicaments · **Vaccins** (+ date de la
dernière injection) · Volontés (directives, refus de transfusion, DNR) · Mesures · Personnes à prévenir ·
**Personne de confiance** · Médecin traitant · **Médecins spécialistes** · **Assurances** (nom, n° de police,
type) · Remarque. Bandeau **« Dernière mise à jour »** en tête (heure locale + UTC).

### Fonctions
- **QR vital** en anglais médical, jauge d'octets, plein écran ; date `UPDATED: … UTC`.
- **Fond d'écran** (QR centré) par modèle de téléphone ; aide adaptée Android / iPhone.
- **Transfert PC → téléphone** : image, scan du QR (import), fichier de sauvegarde `.json`.
- **Carte portefeuille** imprimable ; **Offrir QREDO** (QR de l'adresse de l'appli).
- **Médicaments** : base officielle belge **SAM** (≈ 14 400 produits ; nom commercial → molécule + dose),
  **scan de la boîte** sur mobile (DataMatrix GTIN / code-barres CNK, puis **OCR** du nom en secours),
  **avis d'interactions** (table de base, ~50 règles, à faire valider).
- **7 langues** d'interface (FR, EN, DE, NL, IT, PT, ES), traductions intégrées (aucun service en ligne).
- **Heure fiable** : heure UTC du serveur (en-tête HTTP `Date`, serveur synchronisé NTP).
- **Hors ligne** (service worker), installable (PWA), mises à jour automatiques + bouton « Mettre à jour ».
- **5 patients de test fictifs**.

### Choix techniques importants
- PWA statique, **aucun serveur applicatif**, aucune donnée patient transmise.
- Bibliothèques embarquées (aucun CDN) : qrcode-generator (MIT), jsQR (Apache-2.0), zxing-wasm (MIT),
  Tesseract.js (Apache-2.0).
- Le QR reste **identique quelle que soit la langue** ; compatibilité ascendante des anciens QR / dossiers.
- Scan des boîtes **désactivé sur ordinateur** (détection Android / iOS).

---

## Historique des versions (26 novembre 2026)

| Version | Contenu |
| --- | --- |
| 0.1 – 0.5 | POC : formulaire, QR, fond d'écran, carte, transfert, PWA, patients de test, QR centré |
| 0.6 – 0.9 | Adresse ; retrait « anaphylaxie » ; retrait rubrique anticoagulants ; **base SAM** |
| 1.0.0 | **Scan des boîtes** (DataMatrix / CNK) – mobile uniquement |
| 1.0.1 | **7 langues** + **OCR** du nom des boîtes |
| 1.0.2 | **Avis d'interactions** médicamenteuses |
| 1.0.3 | **Médecins spécialistes** |
| 1.0.4 – 1.0.5 | Aide fond d'écran iPhone ; **opérations chirurgicales** |
| 1.0.6 | **Date de mise à jour UTC**, personne de confiance, handicap, hospitalisation, vaccins, assurances |

---

## Points ouverts (résumé – détail dans TODO.md)

- 🔴 **Serveur définitif** + migration + PDF dans l'appli (ordre du jour ci-dessus).
- 🔴 **Licence SAM** à confirmer par écrit.
- 🟠 **Taille du QR** : un dossier complet approche la limite (patient de test Dupont ≈ 835 / 900 octets)
  → choisir les rubriques incluses dans le QR, et/ou **mode « lien »**.
- 🟠 **Relecture médicale** par le Dr Bodson : table d'interactions, listes (allergies, maladies,
  opérations, vaccins, handicaps), ordre des informations dans le QR.
- 🟠 Réglementation **dispositif médical (MDR)** pour l'avis d'interactions.
- 🟡 Tests sur **vrais appareils** : iPhone (installation, lecture du QR texte par l'appareil photo), photos
  réelles de boîtes pour l'OCR.
- 🟡 Mode d'emploi et guide iPhone **multilingues**.
- 🟡 Alerte e-mail « code de boîte inconnu » (serveur requis).

---

## Reprendre le travail (pense-bête)

```powershell
# Lancer en local : VS Code -> "Go Live" (Live Server, racine app/)  ->  http://127.0.0.1:5500/?exemple=1
# Base médicaments en local (une fois) :
python tools\sam\build-drug-db.py
# Téléphone Android branché (adb) :
powershell -ExecutionPolicy Bypass -File tools\phone-dev.ps1
# Régénérer la documentation :
cd tools\manual ; npm install ; node capture-screenshots.mjs ; node capture-screenshots.mjs --iphone
node build-manual.mjs ; node build-iphone-guide.mjs
powershell -ExecutionPolicy Bypass -File export-pdf.ps1
powershell -ExecutionPolicy Bypass -File export-pdf.ps1 -Docx QREDO-Installation-iPhone.docx
# Publier : git push sur main (GitHub Actions publie et régénère la base SAM)
```

À chaque nouvelle version : incrémenter `APP_VERSION` (`app/js/app.js`) **et** `CACHE_VERSION`
(`app/sw.js`), ajouter tout nouveau fichier à `APP_FILES` dans `app/sw.js`.
