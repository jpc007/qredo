// =====================================================================
// QREDO - Table de base des interactions médicamenteuses
// ---------------------------------------------------------------------
// ⚠️ LISTE DE BASE, NON EXHAUSTIVE, À FAIRE VALIDER PAR UN MÉDECIN.
// Elle ne contient que des interactions classiques et bien documentées,
// à haut risque. Elle ne remplace ni le thésaurus officiel (ANSM, CBIP)
// ni l'avis du médecin ou du pharmacien. Voir TODO.md (source officielle
// à intégrer pour le projet final).
//
// Les molécules sont écrites en anglais (DCI), comme dans la base SAM.
// Un médicament appartient à une famille si l'un de ses composants
// contient le nom de la molécule (ex. "PERINDOPRIL ARGININE" -> IEC).
// =====================================================================

export const DRUG_CLASSES = {
  // Anticoagulants
  VKA: ['WARFARIN', 'ACENOCOUMAROL', 'PHENPROCOUMON'], // antivitamines K
  DOAC: ['APIXABAN', 'RIVAROXABAN', 'DABIGATRAN', 'EDOXABAN'], // anticoagulants oraux directs
  HEPARIN: ['ENOXAPARIN', 'NADROPARIN', 'TINZAPARIN', 'DALTEPARIN', 'HEPARIN'],
  // Antiagrégants plaquettaires
  ANTIPLATELET: ['CLOPIDOGREL', 'PRASUGREL', 'TICAGRELOR', 'ACETYLSALICYLIC ACID'],
  // Anti-inflammatoires non stéroïdiens (hors aspirine)
  NSAID: [
    'IBUPROFEN',
    'DEXIBUPROFEN',
    'NAPROXEN',
    'DICLOFENAC',
    'ACECLOFENAC',
    'KETOPROFEN',
    'DEXKETOPROFEN',
    'MELOXICAM',
    'PIROXICAM',
    'TENOXICAM',
    'CELECOXIB',
    'ETORICOXIB',
    'INDOMETACIN',
    'NIMESULIDE',
    'MEFENAMIC ACID',
    'FLURBIPROFEN',
  ],
  // Antidépresseurs sérotoninergiques (ISRS / IRSN)
  SSRI: [
    'SERTRALINE',
    'CITALOPRAM',
    'ESCITALOPRAM',
    'FLUOXETINE',
    'PAROXETINE',
    'FLUVOXAMINE',
    'VENLAFAXINE',
    'DULOXETINE',
  ],
  MAOI: ['MOCLOBEMIDE', 'PHENELZINE', 'TRANYLCYPROMINE', 'SELEGILINE', 'RASAGILINE', 'SAFINAMIDE'], // IMAO
  TRAMADOL: ['TRAMADOL'],
  TRIPTAN: ['SUMATRIPTAN', 'RIZATRIPTAN', 'ZOLMITRIPTAN', 'ELETRIPTAN', 'ALMOTRIPTAN', 'NARATRIPTAN', 'FROVATRIPTAN'],
  LINEZOLID: ['LINEZOLID'],
  // Dépresseurs respiratoires
  OPIOID: [
    'MORPHINE',
    'OXYCODONE',
    'HYDROMORPHONE',
    'FENTANYL',
    'TRAMADOL',
    'TAPENTADOL',
    'CODEINE',
    'BUPRENORPHINE',
    'METHADONE',
    'PIRITRAMIDE',
    'TILIDINE',
  ],
  BENZODIAZEPINE: [
    'DIAZEPAM',
    'LORAZEPAM',
    'ALPRAZOLAM',
    'BROMAZEPAM',
    'CLONAZEPAM',
    'OXAZEPAM',
    'LORMETAZEPAM',
    'CLOBAZAM',
    'PRAZEPAM',
    'CLORAZEPATE',
    'TEMAZEPAM',
    'FLURAZEPAM',
    'MIDAZOLAM',
    'ZOLPIDEM',
    'ZOPICLONE',
  ],
  // Système rénine-angiotensine et potassium
  ACEI: [
    'PERINDOPRIL',
    'RAMIPRIL',
    'LISINOPRIL',
    'ENALAPRIL',
    'CAPTOPRIL',
    'ZOFENOPRIL',
    'FOSINOPRIL',
    'QUINAPRIL',
    'TRANDOLAPRIL',
    'CILAZAPRIL',
    'BENAZEPRIL',
  ], // IEC
  ARB: ['LOSARTAN', 'VALSARTAN', 'CANDESARTAN', 'IRBESARTAN', 'OLMESARTAN', 'TELMISARTAN', 'EPROSARTAN'], // sartans
  K_SPARING: ['SPIRONOLACTONE', 'EPLERENONE', 'AMILORIDE', 'TRIAMTERENE', 'FINERENONE'], // épargneurs de potassium
  POTASSIUM: ['POTASSIUM CHLORIDE', 'POTASSIUM CITRATE', 'POTASSIUM GLUCONATE', 'POTASSIUM BICARBONATE'],
  DIURETIC: ['HYDROCHLOROTHIAZIDE', 'CHLORTALIDONE', 'INDAPAMIDE', 'FUROSEMIDE', 'BUMETANIDE', 'TORASEMIDE'],
  LITHIUM: ['LITHIUM'],
  // Divers à marge thérapeutique étroite
  METHOTREXATE: ['METHOTREXATE'],
  TRIMETHOPRIM: ['TRIMETHOPRIM'],
  STATIN_3A4: ['SIMVASTATIN', 'ATORVASTATIN', 'LOVASTATIN'], // statines métabolisées par le CYP3A4
  STRONG_3A4_INHIBITOR: [
    'CLARITHROMYCIN',
    'ERYTHROMYCIN',
    'ITRACONAZOLE',
    'KETOCONAZOLE',
    'POSACONAZOLE',
    'VORICONAZOLE',
    'RITONAVIR',
    'COBICISTAT',
  ],
  COLCHICINE: ['COLCHICINE'],
  NITRATE: [
    'ISOSORBIDE DINITRATE',
    'ISOSORBIDE MONONITRATE',
    'GLYCERYL TRINITRATE',
    'NITROGLYCERIN',
    'MOLSIDOMINE',
    'NICORANDIL',
  ],
  PDE5: ['SILDENAFIL', 'TADALAFIL', 'VARDENAFIL', 'AVANAFIL'],
  DIGOXIN: ['DIGOXIN'],
  AMIODARONE: ['AMIODARONE', 'DRONEDARONE'],
  VERAPAMIL_DILTIAZEM: ['VERAPAMIL', 'DILTIAZEM'],
  BETA_BLOCKER: ['BISOPROLOL', 'METOPROLOL', 'ATENOLOL', 'NEBIVOLOL', 'PROPRANOLOL', 'CARVEDILOL', 'SOTALOL', 'LABETALOL'],
  CLOPIDOGREL: ['CLOPIDOGREL'],
  PPI_2C19: ['OMEPRAZOLE', 'ESOMEPRAZOLE'],
  THIOPURINE: ['AZATHIOPRINE', 'MERCAPTOPURINE'],
  XANTHINE_OXIDASE_INHIBITOR: ['ALLOPURINOL', 'FEBUXOSTAT'],
  TIZANIDINE: ['TIZANIDINE'],
  CYP1A2_INHIBITOR: ['CIPROFLOXACIN', 'FLUVOXAMINE'],
  RIFAMPICIN: ['RIFAMPICIN'],
};

// Niveaux : contraindicated (association contre-indiquée), avoid (déconseillée),
// caution (précaution, surveillance). Risques : voir les traductions 'interaction.risk.*'.
export const INTERACTION_RULES = [
  // Saignement
  { a: 'VKA', b: 'NSAID', level: 'avoid', risk: 'bleeding' },
  { a: 'DOAC', b: 'NSAID', level: 'avoid', risk: 'bleeding' },
  { a: 'HEPARIN', b: 'NSAID', level: 'avoid', risk: 'bleeding' },
  { a: 'VKA', b: 'DOAC', level: 'avoid', risk: 'bleeding' },
  { a: 'VKA', b: 'HEPARIN', level: 'caution', risk: 'bleeding' },
  { a: 'DOAC', b: 'HEPARIN', level: 'avoid', risk: 'bleeding' },
  { a: 'VKA', b: 'ANTIPLATELET', level: 'caution', risk: 'bleeding' },
  { a: 'DOAC', b: 'ANTIPLATELET', level: 'caution', risk: 'bleeding' },
  { a: 'ANTIPLATELET', b: 'NSAID', level: 'caution', risk: 'bleeding' },
  { a: 'SSRI', b: 'NSAID', level: 'caution', risk: 'bleeding' },
  { a: 'SSRI', b: 'VKA', level: 'caution', risk: 'bleeding' },
  { a: 'SSRI', b: 'DOAC', level: 'caution', risk: 'bleeding' },
  { a: 'SSRI', b: 'ANTIPLATELET', level: 'caution', risk: 'bleeding' },
  { a: 'AMIODARONE', b: 'VKA', level: 'caution', risk: 'bleeding' },
  // Syndrome sérotoninergique
  { a: 'MAOI', b: 'SSRI', level: 'contraindicated', risk: 'serotonin' },
  { a: 'MAOI', b: 'TRAMADOL', level: 'contraindicated', risk: 'serotonin' },
  { a: 'MAOI', b: 'TRIPTAN', level: 'contraindicated', risk: 'serotonin' },
  { a: 'SSRI', b: 'TRAMADOL', level: 'caution', risk: 'serotonin' },
  { a: 'SSRI', b: 'TRIPTAN', level: 'caution', risk: 'serotonin' },
  { a: 'SSRI', b: 'LINEZOLID', level: 'avoid', risk: 'serotonin' },
  // Dépression respiratoire
  { a: 'OPIOID', b: 'BENZODIAZEPINE', level: 'avoid', risk: 'respiratory' },
  // Potassium / reins
  { a: 'ACEI', b: 'ARB', level: 'avoid', risk: 'kidney' },
  { a: 'ACEI', b: 'K_SPARING', level: 'caution', risk: 'hyperkalemia' },
  { a: 'ARB', b: 'K_SPARING', level: 'caution', risk: 'hyperkalemia' },
  { a: 'ACEI', b: 'POTASSIUM', level: 'caution', risk: 'hyperkalemia' },
  { a: 'ARB', b: 'POTASSIUM', level: 'caution', risk: 'hyperkalemia' },
  { a: 'K_SPARING', b: 'POTASSIUM', level: 'avoid', risk: 'hyperkalemia' },
  { a: 'NSAID', b: 'ACEI', level: 'caution', risk: 'kidney' },
  { a: 'NSAID', b: 'ARB', level: 'caution', risk: 'kidney' },
  // Toxicité par augmentation des taux
  { a: 'LITHIUM', b: 'NSAID', level: 'avoid', risk: 'toxicity' },
  { a: 'LITHIUM', b: 'ACEI', level: 'avoid', risk: 'toxicity' },
  { a: 'LITHIUM', b: 'ARB', level: 'avoid', risk: 'toxicity' },
  { a: 'LITHIUM', b: 'DIURETIC', level: 'avoid', risk: 'toxicity' },
  { a: 'METHOTREXATE', b: 'NSAID', level: 'caution', risk: 'toxicity' },
  { a: 'METHOTREXATE', b: 'TRIMETHOPRIM', level: 'avoid', risk: 'toxicity' },
  { a: 'STATIN_3A4', b: 'STRONG_3A4_INHIBITOR', level: 'avoid', risk: 'toxicity' },
  { a: 'COLCHICINE', b: 'STRONG_3A4_INHIBITOR', level: 'avoid', risk: 'toxicity' },
  { a: 'AMIODARONE', b: 'STATIN_3A4', level: 'caution', risk: 'toxicity' },
  { a: 'DIGOXIN', b: 'AMIODARONE', level: 'caution', risk: 'toxicity' },
  { a: 'DIGOXIN', b: 'VERAPAMIL_DILTIAZEM', level: 'caution', risk: 'toxicity' },
  { a: 'THIOPURINE', b: 'XANTHINE_OXIDASE_INHIBITOR', level: 'avoid', risk: 'toxicity' },
  { a: 'TIZANIDINE', b: 'CYP1A2_INHIBITOR', level: 'contraindicated', risk: 'toxicity' },
  // Cœur / tension
  { a: 'PDE5', b: 'NITRATE', level: 'contraindicated', risk: 'hypotension' },
  { a: 'BETA_BLOCKER', b: 'VERAPAMIL_DILTIAZEM', level: 'avoid', risk: 'heart' },
  // Efficacité diminuée
  { a: 'CLOPIDOGREL', b: 'PPI_2C19', level: 'caution', risk: 'reducedEffect' },
  { a: 'RIFAMPICIN', b: 'DOAC', level: 'avoid', risk: 'reducedEffect' },
  { a: 'RIFAMPICIN', b: 'VKA', level: 'caution', risk: 'reducedEffect' },
];

// Deux médicaments DIFFÉRENTS de la même famille = doublon probable
// (ex. deux anti-inflammatoires). Les associations volontaires (aspirine +
// clopidogrel après un stent) ne sont pas signalées : ANTIPLATELET absent.
export const DUPLICATE_CLASSES = {
  NSAID: { level: 'avoid', risk: 'duplicate' },
  VKA: { level: 'avoid', risk: 'bleeding' },
  DOAC: { level: 'avoid', risk: 'bleeding' },
  SSRI: { level: 'avoid', risk: 'serotonin' },
  BENZODIAZEPINE: { level: 'caution', risk: 'respiratory' },
  OPIOID: { level: 'caution', risk: 'respiratory' },
  ACEI: { level: 'avoid', risk: 'duplicate' },
  ARB: { level: 'avoid', risk: 'duplicate' },
};
