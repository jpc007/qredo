// =====================================================================
// QREDO - Textes de l'interface : FRANÇAIS (langue de référence)
// ---------------------------------------------------------------------
// Toute nouvelle clé s'ajoute ici d'abord, puis dans les 6 autres langues.
// Les listes (allergènes, maladies…) sont rangées par code anglais :
// c'est ce code, et non le libellé, qui est écrit dans le QR.
// =====================================================================

export default {
  // En-tête et page
  'app.title': 'QREDO – Mon QR code médical d’urgence',
  'app.description': 'Créez votre QR code médical d’urgence. Vos données restent sur votre appareil.',
  'app.tagline': 'Mon QR code médical d’urgence',
  'app.install': '📲 Installer',
  'app.privacy': '🔒 Vos données restent <strong>sur cet appareil</strong>. Rien n’est envoyé sur Internet.',
  'app.installed': 'QREDO est installé sur votre écran d’accueil 🎉',
  'app.checkingUpdate': 'Recherche de mise à jour…',

  // Menu "⋮"
  'menu.button': 'Menu : choisir la langue',
  'menu.language': '🌐 Langue',

  // Identité
  'identity.title': '👤 Identité',
  'identity.lastName': 'Nom',
  'identity.firstName': 'Prénom',
  'identity.sex': 'Sexe',
  'identity.dob': 'Date de naissance',
  'identity.address': 'Adresse',
  'identity.addressPlaceholder': 'Rue, n°, code postal, ville',
  'identity.languages': 'Langues parlées',
  'identity.languagesExample': '(ex. FR, NL)',
  'identity.languagesPlaceholder': 'FR',
  'sex.M': 'Homme',
  'sex.F': 'Femme',
  'sex.X': 'Autre / non précisé',

  // Allergies
  'allergies.title': '⚠️ Allergies',
  'allergies.none': 'Aucune allergie connue',
  'allergies.add': '＋ Ajouter une allergie',
  'allergies.placeholder': 'Substance (ex. Pénicilline)',
  'reaction.choose': '— réaction ? —',
  'reaction.SEVERE': 'Grave (œdème, gêne respiratoire)',
  'reaction.MODERATE': 'Modérée',
  'reaction.MILD': 'Légère (urticaire, démangeaisons)',
  'allergen.PENICILLIN': 'Pénicilline',
  'allergen.AMOXICILLIN': 'Amoxicilline',
  'allergen.CEPHALOSPORINS': 'Céphalosporines',
  'allergen.SULFONAMIDES': 'Sulfamidés',
  'allergen.ASPIRIN': 'Aspirine',
  'allergen.NSAID': 'Anti-inflammatoires (AINS, ibuprofène)',
  'allergen.OPIOIDS': 'Morphiniques / codéine',
  'allergen.IODINE CONTRAST': 'Produit de contraste iodé',
  'allergen.LOCAL ANESTHETICS': 'Anesthésiques locaux',
  'allergen.CHLORHEXIDINE': 'Chlorhexidine',
  'allergen.LATEX': 'Latex',
  'allergen.PEANUT': 'Arachides / cacahuètes',
  'allergen.TREE NUTS': 'Fruits à coque (noix, noisettes)',
  'allergen.SHELLFISH': 'Crustacés / fruits de mer',
  'allergen.FISH': 'Poisson',
  'allergen.EGG': 'Œuf',
  'allergen.MILK': 'Lait',
  'allergen.WHEAT/GLUTEN': 'Blé / gluten',
  'allergen.BEE/WASP VENOM': 'Piqûre d’abeille / guêpe',

  // Implants
  'implants.title': '🫀 Implants et appareils',
  'implants.other': 'Autres',
  'implants.otherHint': '(séparés par des virgules)',
  'implant.PACEMAKER': 'Stimulateur cardiaque (pacemaker)',
  'implant.ICD': 'Défibrillateur implanté (DAI)',
  'implant.MECHANICAL HEART VALVE': 'Valve cardiaque mécanique',
  'implant.CORONARY STENT': 'Stent coronaire',
  'implant.INSULIN PUMP': 'Pompe à insuline',
  'implant.NEUROSTIMULATOR': 'Neurostimulateur',
  'implant.COCHLEAR IMPLANT': 'Implant cochléaire',
  'implant.VP SHUNT': 'Valve de dérivation (cerveau)',
  'implant.JOINT PROSTHESIS': 'Prothèse articulaire (hanche, genou)',
  'implant.CPAP': 'Appareil apnée du sommeil (CPAP)',

  // Maladies
  'conditions.title': '🩺 Maladies',
  'conditions.other': 'Autres',
  'conditions.otherHint': '(séparées par des virgules)',
  'condition.DIABETES TYPE 1': 'Diabète type 1 (insuline)',
  'condition.DIABETES TYPE 2': 'Diabète type 2',
  'condition.EPILEPSY': 'Épilepsie',
  'condition.HYPERTENSION': 'Hypertension artérielle',
  'condition.HEART FAILURE': 'Insuffisance cardiaque',
  'condition.CORONARY DISEASE': 'Maladie coronaire / infarctus',
  'condition.ATRIAL FIBRILLATION': 'Fibrillation auriculaire',
  'condition.PAST STROKE': 'AVC ancien',
  'condition.ASTHMA': 'Asthme',
  'condition.COPD': 'BPCO (bronchite chronique)',
  'condition.SLEEP APNEA': 'Apnée du sommeil',
  'condition.KIDNEY FAILURE': 'Insuffisance rénale',
  'condition.DIALYSIS': 'Dialyse',
  'condition.LIVER CIRRHOSIS': 'Cirrhose du foie',
  'condition.BLEEDING DISORDER': 'Hémophilie / trouble de coagulation',
  'condition.SICKLE CELL DISEASE': 'Drépanocytose',
  'condition.ADRENAL INSUFFICIENCY': 'Insuffisance surrénalienne',
  'condition.MYASTHENIA': 'Myasthénie',
  'condition.DEMENTIA': 'Démence / Alzheimer',
  'condition.PARKINSON': 'Parkinson',
  'condition.CANCER UNDER TREATMENT': 'Cancer en traitement',
  'condition.IMMUNOSUPPRESSED': 'Immunodéprimé (greffe, chimio…)',
  'condition.PREGNANT': 'Enceinte',
  'condition.HEARING IMPAIRED': 'Malentendant',
  'condition.VISUALLY IMPAIRED': 'Malvoyant',

  // Médicaments
  'meds.title': '💊 Médicaments',
  'meds.hint':
    'Tapez le nom que vous connaissez (ex. Medrol) : la molécule s’affiche dessous, c’est elle qui va dans le QR.',
  'meds.scan': '📷 Scanner la boîte',
  'meds.add': '＋ Ajouter un médicament',
  'meds.namePlaceholder': 'Médicament (ex. Medrol)',
  'meds.dosePlaceholder': 'Dose (ex. 4 mg)',
  'meds.molecule': '→ Molécule : {inn}',
  'meds.notFound': 'Molécule non trouvée : le nom sera écrit tel quel dans le QR.',
  'meds.inactive': 'plus commercialisé',
  'meds.dbInfo':
    'Suggestions : base officielle belge SAM (AFMPS / eHealth), {count} médicaments, mise à jour du {date}.',
  'meds.dbUnavailable': 'Base des médicaments indisponible (hors ligne ?) : la saisie libre fonctionne quand même.',
  'common.remove': 'Supprimer',
  'common.close': 'Fermer',

  // Volontés
  'wishes.title': '📜 Volontés',
  'wishes.advanceDirective': 'Directives anticipées',
  'wishes.date': 'Date',
  'wishes.refuseTransfusion': 'Refus de transfusion sanguine',
  'wishes.dnr': 'Ne pas réanimer (DNR)',

  // Mesures
  'measures.title': '📏 Mesures',
  'measures.blood': 'Groupe sanguin',
  'measures.bloodUnknown': 'Inconnu',
  'measures.weight': 'Poids (kg)',
  'measures.height': 'Taille (cm)',

  // Personnes à prévenir
  'contacts.title': '📞 Personnes à prévenir',
  'contacts.name': 'Nom',
  'contacts.relation': 'Lien',
  'contacts.phone': 'Téléphone',
  'relation.choose': '— lien ? —',
  'relation.SPOUSE': 'Conjoint·e',
  'relation.CHILD': 'Enfant',
  'relation.PARENT': 'Parent',
  'relation.SIBLING': 'Frère / sœur',
  'relation.FRIEND': 'Ami·e',
  'relation.NEIGHBOR': 'Voisin·e',
  'relation.CAREGIVER': 'Aidant·e',
  'relation.OTHER': 'Autre',

  // Médecin traitant
  'gp.title': '👨‍⚕️ Médecin traitant',
  'gp.name': 'Nom',
  'gp.phone': 'Téléphone',

  // Remarque
  'notes.title': '📝 Remarque',
  'notes.label': 'Courte, de préférence en anglais',
  'notes.placeholder': 'ex. Reduced mobility',

  // Panneau du QR code
  'qr.title': 'Mon QR code vital',
  'qr.canvasLabel': 'QR code médical',
  'qr.gaugeLabel': 'Taille du QR code',
  'qr.bytes': '{bytes} / {max} octets',
  'qr.statusOk': '✅ Lecture facile',
  'qr.statusWarn': '🟠 Proche de la limite',
  'qr.statusOver': '🔴 Trop long : simplifiez',
  'qr.chars': 'Caractères',
  'qr.version': 'Version QR',
  'qr.modules': 'Carrés de côté',
  'qr.saved': 'Octets gagnés sans accents',
  'qr.fullscreen': '🔍 Afficher en grand',
  'qr.showText': 'Voir le texte encodé',
  'qr.tooLong': 'Texte trop long pour un QR code. Retirez des informations.',

  // Fond d'écran
  'wallpaper.title': '📱 Fond d’écran de veille',
  'wallpaper.model': 'Modèle de téléphone',
  'wallpaper.auto': 'Cet appareil (automatique)',
  'wallpaper.generic': 'Android standard (1080 × 2400)',
  'wallpaper.previewAlt': 'Aperçu du fond d’écran',
  'wallpaper.download': '⬇️ Télécharger',
  'wallpaper.share': '📤 Partager',
  'wallpaper.help':
    'Puis : Galerie → l’image → ⋮ → <em>Définir comme fond d’écran</em> → <em>Écran de verrouillage</em>.',
  'wallpaper.subtitle': 'URGENCE MÉDICALE · SCAN ME',
  'wallpaper.saved': 'Image enregistrée dans les téléchargements.',
  'wallpaper.shareTitle': 'QREDO – fond d’écran',
  'wallpaper.fileName': 'qredo-fond-ecran',
  'wallpaper.noQr': 'Pas de QR code à placer.',

  // Offrir l'application
  'invite.title': '🤝 Offrir QREDO à un proche',
  'invite.hint': 'C’est gratuit : faites scanner ce QR code pour installer l’application.',
  'invite.show': '📲 Afficher le QR de l’application',
  'invite.shareLink': '📤 Partager le lien (WhatsApp, SMS…)',
  'invite.shareText': 'Mon QR code médical d’urgence, gratuit. Installe-le aussi :',
  'invite.banner': 'QREDO · gratuit · free',
  'invite.scanHint': 'Scannez avec l’appareil photo pour installer QREDO',

  // Transférer / sauvegarder
  'transfer.title': '🔄 Transférer / sauvegarder',
  'transfer.scan': '📷 Importer en scannant un QR QREDO',
  'transfer.scanImage': '🖼️ Importer depuis une photo du QR',
  'transfer.print': '🖨️ Imprimer ma carte portefeuille',
  'transfer.export': '💾 Exporter mon dossier (fichier)',
  'transfer.import': '📂 Importer un dossier (fichier)',
  'transfer.defaultFileName': 'dossier',

  // Import
  'import.notQredo': 'Ce QR code n’est pas un QR QREDO.',
  'import.noName': 'sans nom',
  'import.confirmQr': 'Remplacer le dossier actuel par celui du QR ({who}) ?',
  'import.doneQr': 'Dossier importé : {who} ✅',
  'import.noQrInImage': 'Aucun QR code trouvé sur cette image.',
  'import.confirmFile': 'Remplacer le dossier actuel par celui du fichier ?',
  'import.doneFile': 'Dossier importé ✅',
  'import.notBackup': 'Ce fichier n’est pas une sauvegarde QREDO.',

  // Démonstration
  'demo.title': '🧪 Démonstration',
  'demo.patient': 'Patient de test (fictif)',
  'demo.load': 'Charger l’exemple',
  'demo.clear': 'Tout effacer',
  'demo.loaded': 'Patient de test chargé : {name}',
  'demo.confirmReplace': 'Remplacer votre dossier par ce patient de test ?',
  'demo.confirmLink': 'Remplacer le dossier actuel par le patient de test « {name} » ?',
  'demo.confirmClear': 'Effacer toutes les données de cet appareil ?',
  'sample.1': '1. Jean-Pierre Dupont, 51 ans – cardiaque, anticoagulé',
  'sample.2': '2. Françoise Lemaître, 41 ans – diabète type 1, épilepsie',
  'sample.3': '3. Marcel Peeters, 88 ans – Alzheimer, Parkinson, néerlandophone',
  'sample.4': '4. Lucas Martin, 14 ans – asthme, allergie aux guêpes',
  'sample.5': '5. Nadia Benali, 33 ans – en bonne santé, enceinte',

  // Pied de page, bouton flottant
  'footer.idea': 'Idée originale : Dr L. Bodson',
  'footer.update': '🔄 Mettre à jour',
  'fab.label': 'Voir mon QR code',

  // Fenêtres plein écran
  'overlay.emergency': 'URGENCE MÉDICALE',
  'overlay.tapToClose': 'Touchez l’écran pour fermer',

  // Caméra et lecture d'un QR code
  'camera.needsHttps': 'La caméra nécessite une page sécurisée (https).',
  'camera.needsHttpsScan': 'La caméra nécessite une page sécurisée (https). Utilisez « Importer depuis une photo ».',
  'camera.denied': 'Accès à la caméra refusé.',
  'camera.unavailable': 'Caméra indisponible.',
  'scan.aim': 'Visez le QR code QREDO…',
  'scan.notQredo': 'QR lu, mais ce n’est pas un QR QREDO. Réessayez…',

  // Scanner de boîte de médicament
  'medscan.readName': '🔤 Lire le nom',
  'medscan.barcode': '↺ Code-barres',
  'medscan.loading': 'Chargement…',
  'medscan.aim': 'Visez le code-barres ou le petit carré (DataMatrix) de la boîte…',
  'medscan.noEngine': 'Lecture des codes-barres indisponible. Visez le NOM du médicament.',
  'medscan.unknownCode': 'Code lu, mais ce médicament n’est pas dans la base. Visez son NOM.',
  'medscan.noBarcode': 'Code-barres non trouvé. Visez le NOM du médicament.',
  'medscan.attention': '{message} Placez le nom dans le cadre, puis appuyez sur « Lire le nom ».',
  'medscan.reading': 'Lecture du nom… (la première fois, quelques secondes)',
  'medscan.progress': 'Lecture du nom… {percent} %',
  'medscan.notRecognized': 'Nom non reconnu. Rapprochez-vous, ajoutez de la lumière, puis réessayez — ou tapez le nom.',
  'medscan.failed': 'La lecture du nom a échoué. Réessayez, ou tapez le nom.',
  'medscan.foundByCode': 'Médicament reconnu grâce au code de la boîte :',
  'medscan.choose': 'Est-ce l’un de ces médicaments ? Touchez le bon :',
  'medscan.added': '{name} ajouté ✅',

  // Carte portefeuille
  'print.subtitle': 'Urgence médicale',
  'print.help': '✂️ Découpez la carte en suivant le pointillé (format carte bancaire 85,6 × 54 mm).',
};
