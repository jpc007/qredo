# QREDO – Mémo : à faire / à ne pas oublier

_Dernière mise à jour : 26 novembre 2026 (POC v0.9.0)_

---

## ⚠️ Exigences importantes pour le projet final (site définitif)

### 1. Licence de la base des médicaments SAM (AFMPS / eHealth) – À VÉRIFIER

- **Statut actuel :** le POC réutilise l'**export public SAM v2** (téléchargeable sans contrôle d'accès)
  pour relier nom commercial → molécule. Normalement gratuit, mais **aucune condition de réutilisation
  écrite n'a été trouvée** (ni licence, ni interdiction). L'appli affiche la source et la mention
  « réutilisation non officielle ».
- **À faire avant la mise en ligne du site définitif :**
  - [ ] Lire les conditions d'utilisation sur le portail SAM et le site de l'INAMI
        (« obligations for proper use of the SAM v2 database »).
  - [ ] Contacter le portail SAM (page *Contact*) pour confirmer par écrit que la réutilisation
        gratuite de l'export dans QREDO est autorisée, et sous quelle mention.
  - [ ] Adapter la mention de source dans l'appli selon leur réponse.
- **Liens :**
  - Accès aux exports : <https://www.samportal.be/fr/sam/access>
  - Documentation : <https://www.samportal.be/fr/sam/documentation>
  - Téléchargement : <https://www.vas.ehealth.fgov.be/websamcivics/samcivics/>
- **Technique :** script `tools/sam/build-drug-db.py`, exécuté par `.github/workflows/pages.yml`
  (à chaque publication + chaque lundi).

### 2. ⚠️ Alerte « code de boîte inconnu » → e-mail (IMPORTANT)

Quand un utilisateur scanne la boîte d'un médicament et que le code (DataMatrix / GTIN ou code-barres
CNK) **n'est pas reconnu** dans la base, le système doit **remonter une alerte envoyée par e-mail**
au responsable du projet, avec le code non reconnu. On l'investigue à part et on **ajoute le
médicament manuellement** à la base (table de compléments, en plus de SAM).

- [ ] Nécessite le **serveur à nous** (point de collecte + envoi d'e-mail) : impossible sans serveur
      dans le POC actuel (tout reste dans le téléphone).
- [ ] **Confidentialité / RGPD** : n'envoyer **que le code produit** (GTIN / CNK) et la date, **jamais**
      de données du patient (ni nom, ni dossier). Ne pas envoyer le numéro de série ni le lot du
      DataMatrix. Informer l'utilisateur (« Le code de cette boîte va être signalé pour être ajouté ») et
      lui laisser le choix.
- [ ] Regrouper les alertes (un e-mail récapitulatif par jour plutôt qu'un e-mail par scan).
- [ ] Prévoir un fichier de **compléments manuels** (code → nom, molécule, dosage) fusionné avec la
      base SAM lors de la génération (`tools/sam/build-drug-db.py`).
- Point d'accroche dans le code : `app/js/ui/med-camera.js`, cas « Code lu, mais ce médicament n'est
  pas dans la base » (`unknownCode`).

### 3. Autres points à régler pour le projet final

- [ ] **Hébergement sur un serveur à nous** + nom de domaine (ex. qredo.be). Attention : l'appli
      installée et les données sont liées à l'adresse du site → prévoir la migration
      (export / import du fichier de sauvegarde).
- [ ] **Dossier complet en ligne** (phase 2 du cahier des charges) : hébergement de données de santé,
      RGPD article 9, sécurité, lien avec jeton changé à chaque modification.
- [ ] **Réglementation dispositif médical (MDR)** : vérifier que les fonctions envisagées (IA,
      interactions médicamenteuses) ne font pas basculer l'appli dans cette catégorie.
- [ ] **Accord du Dr Bodson** sur la mention de son nom (pied de page de l'appli, README, mode d'emploi).

---

## 💡 Idées futures (validées, à faire plus tard)

### Alerte d'interactions médicamenteuses (100 % local, sans IA)

> ✅ **Version de base codée dans la v1.0.2** : `app/js/data/interactions.js` (familles + ~50 règles
> classiques à haut risque + doublons), avis au patient en 7 langues, pour les médicaments saisis à la
> main ou scannés. **À faire relire par le Dr Bodson**, puis remplacer / compléter par la source
> officielle ci-dessous.

Prévenir le patient : « Attention, risque d'interaction entre X et Y — parlez-en à votre médecin ».

- **Principe** : table officielle « molécule / famille A + molécule / famille B → niveau + conduite à
  tenir », vérifiée dans le téléphone sur toutes les paires de molécules (DCI déjà connues via SAM).
  Pas d'IA, pas de serveur, pas de clé API : fiable, sourcé, vérifiable.
- **Sources à évaluer (licences !)** :
  - [ ] Thésaurus des interactions médicamenteuses de l'**ANSM** (France, officiel, PDF public, 4 niveaux)
        → extraction en tableau ; vérifier les conditions de réutilisation.
  - [ ] **CBIP / BCFI** (Belgique) : demander l'autorisation.
  - [ ] Liste **ONC** des interactions à haut risque (USA, publique) comme socle minimal.
  - DrugBank / DDInter : licences restrictives (non commercial).
- **Familles** : beaucoup d'interactions sont par classe (AINS, anticoagulants…) → ajouter les codes
  **ATC** dans la base (à vérifier dans l'export SAM).
- [ ] **Réglementation MDR** : un logiciel d'alerte d'interactions peut être un dispositif médical
      (classe IIa ?). Formuler en « information + parlez-en à votre médecin / pharmacien », ou réserver
      à une vue soignant. À trancher avec le Dr Bodson.
- [ ] **Relecture médicale** des règles par le Dr Bodson.
- IA via clé API (Anthropic ou autre) : seulement pour *expliquer* une alerte en langage simple, plus
  tard, avec serveur à nous + consentement (la liste de médicaments quitterait le téléphone).
- Effort estimé : 1–2 journées de session + relecture médicale.

### Contrôles automatiques complets (la nuit)

Pour l'application finalisée : batterie de tests lancée la nuit sur une machine dédiée ou un conteneur
Docker (captures de toutes les langues, scans de vraies photos de boîtes, QR identiques, etc.).

### Ajouter un médicament en photographiant sa boîte (sans taper)

> ✅ **Codé dans la v1.0.0** (code-barres puis OCR, mobile uniquement). Reste : tests sur de vraies boîtes.

Le patient vise la boîte avec la caméra, le médicament est reconnu et ajouté tout seul
(avec confirmation : « Est-ce bien *Medrol 4 mg* ? »).

Approche recommandée : **hybride**, dans l'ordre :

1. **Code-barres de la boîte** (le plus fiable, zéro erreur de lecture) : DataMatrix obligatoire
   depuis 2019 (directive européenne anti-falsification : code produit, lot, péremption) et/ou code
   **CNK** belge. Correspondance avec la base SAM (qui contient les CNK).
   - [ ] Vérifier sur de vraies boîtes le format du code produit belge dans le DataMatrix
         (construit à partir du CNK ?) et sa correspondance avec SAM.
   - [ ] Enrichir `tools/sam/build-drug-db.py` avec les codes CNK (fichiers AMPP / DMPP de l'export).
   - Lecture : `BarcodeDetector` de Chrome Android (formats `data_matrix`, `ean_13`) ; bibliothèque
     de secours à prévoir (ZXing) pour les autres navigateurs.
2. **OCR du texte de la boîte** si le code-barres échoue : Tesseract.js dans le téléphone (rien
   n'est envoyé), puis recherche approchée dans les noms SAM. Fiabilité estimée 60–80 %.
3. **IA de vision en ligne** : réservée au projet final (serveur à nous, coût, RGPD : la photo
   quitte le téléphone → consentement nécessaire).

| Méthode | Difficulté | Codage (avec Claude) | Tests humains | Développeur seul |
|---|---|---|---|---|
| Code-barres DataMatrix / CNK | moyenne | ~½ journée | 1–2 h, ~10 boîtes réelles | 3–5 jours |
| OCR dans le téléphone | difficile (fiabilité) | ~1 journée (prototype) | plusieurs séances | 1–2 semaines |
| IA de vision en ligne | facile (technique) | quelques heures, serveur en place | peu | 2–3 jours + serveur |

---

## ⚠️ Taille du QR code : les rubriques s'accumulent

Avec toutes les rubriques (opérations, vaccins, assurances, spécialistes, hospitalisation…), un dossier
complet dépasse la limite de lisibilité (900 octets). Le patient de test Dupont est déjà à ~835 octets.
- [ ] Laisser le patient (ou le Dr Bodson) choisir **quelles rubriques vont dans le QR vital**
      (cases « inclure dans le QR »), les autres restant dans le dossier complet / la sauvegarde.
- [ ] Ordre de priorité à valider par le Dr Bodson.
- [ ] Combiner avec le **mode « lien »** (dossier complet derrière un lien) pour le projet final.

---

## 📋 À faire (POC)

- [ ] **Mode « lien »** : QR = `https://…/qredo/#<fiche compacte>` → fiche claire au scan
      (Android et iPhone). À valider avec le Dr Bodson (le texte simple à copier convient pour l'instant).
- [ ] **iPhone** : encadré d'aide à l'installation (Safari → Partager → Sur l'écran d'accueil) et
      avertissement « mémoire séparée de Safari ».
- [ ] **Mode « Lire un QR d'urgence »** dans l'appli (fiche présentée clairement pour le secouriste).
- [ ] **Test sur un vrai iPhone** : lecture du QR texte par l'appareil photo.
- [ ] **Mode d’emploi** à mettre à jour (retrait des anticoagulants, base SAM, scan des boîtes),
      puis régénérer le PDF (`tools/manual/`).
- [ ] **Décider** si `documentation/` et `tools/manual/` sont publiés dans le dépôt GitHub.
- [ ] **README** : ajouter une section sur la base SAM.
- [ ] **Tâche du lundi (GitHub Actions)** : GitHub la suspend après 60 jours sans modification du
      dépôt public → faire un petit commit de temps en temps ou la réactiver.
