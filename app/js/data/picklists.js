// =====================================================================
// QREDO - Listes de référence (codes anglais médicaux)
// ---------------------------------------------------------------------
// Le patient choisit dans sa langue, le QR code est écrit en anglais.
// Chaque élément est le CODE écrit dans le QR (ASCII, majuscules,
// 1 caractère = 1 octet). Le libellé affiché vient des traductions
// (js/i18n/*.js), clé "<liste>.<CODE>" : ex. 'allergen.PENICILLIN'.
// =====================================================================

// Sexe (libellés : sex.<CODE>)
export const SEXES = ['M', 'F', 'X'];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Sévérité de la réaction allergique (libellés : reaction.<CODE>)
export const REACTIONS = ['SEVERE', 'MODERATE', 'MILD'];

// Allergènes fréquents, le patient peut aussi taper autre chose (allergen.<CODE>)
export const ALLERGENS = [
  'PENICILLIN',
  'AMOXICILLIN',
  'CEPHALOSPORINS',
  'SULFONAMIDES',
  'ASPIRIN',
  'NSAID',
  'OPIOIDS',
  'IODINE CONTRAST',
  'LOCAL ANESTHETICS',
  'CHLORHEXIDINE',
  'LATEX',
  'PEANUT',
  'TREE NUTS',
  'SHELLFISH',
  'FISH',
  'EGG',
  'MILK',
  'WHEAT/GLUTEN',
  'BEE/WASP VENOM',
];

// Implants et appareillages (implant.<CODE>)
export const IMPLANTS = [
  'PACEMAKER',
  'ICD',
  'MECHANICAL HEART VALVE',
  'CORONARY STENT',
  'INSULIN PUMP',
  'NEUROSTIMULATOR',
  'COCHLEAR IMPLANT',
  'VP SHUNT',
  'JOINT PROSTHESIS',
  'CPAP',
];

// Maladies et situations importantes pour les secours (condition.<CODE>)
export const CONDITIONS = [
  'DIABETES TYPE 1',
  'DIABETES TYPE 2',
  'EPILEPSY',
  'HYPERTENSION',
  'HEART FAILURE',
  'CORONARY DISEASE',
  'ATRIAL FIBRILLATION',
  'PAST STROKE',
  'ASTHMA',
  'COPD',
  'SLEEP APNEA',
  'KIDNEY FAILURE',
  'DIALYSIS',
  'LIVER CIRRHOSIS',
  'BLEEDING DISORDER',
  'SICKLE CELL DISEASE',
  'ADRENAL INSUFFICIENCY',
  'MYASTHENIA',
  'DEMENTIA',
  'PARKINSON',
  'CANCER UNDER TREATMENT',
  'IMMUNOSUPPRESSED',
  'PREGNANT',
  'HEARING IMPAIRED',
  'VISUALLY IMPAIRED',
];

// Lien avec la personne de contact (relation.<CODE>)
// Spécialités médicales (code anglais écrit dans le QR, libellé traduit : 'specialty.CODE')
export const SPECIALTIES = [
  'CARDIOLOGY',
  'NEUROLOGY',
  'ONCOLOGY',
  'NEPHROLOGY',
  'ENDOCRINOLOGY',
  'PULMONOLOGY',
  'GASTROENTEROLOGY',
  'PSYCHIATRY',
  'RHEUMATOLOGY',
  'GERIATRICS',
  'PEDIATRICS',
  'GYNECOLOGY',
  'UROLOGY',
  'DERMATOLOGY',
  'OPHTHALMOLOGY',
  'ENT',
  'ORTHOPEDICS',
  'HEMATOLOGY',
  'INTERNAL MEDICINE',
  'SURGERY',
];

export const RELATIONS =['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'FRIEND', 'NEIGHBOR', 'CAREGIVER', 'OTHER'];

// Noms commerciaux belges/français -> molécule (nom international, DCI)
// Un "Coversyl" est inconnu à l'étranger, "PERINDOPRIL" est compris partout.
// Clé : nom en minuscules, sans accents.
export const MED_BRAND_TO_INN = {
  sintrom: 'ACENOCOUMAROL',
  marcoumar: 'PHENPROCOUMON',
  marevan: 'WARFARIN',
  eliquis: 'APIXABAN',
  xarelto: 'RIVAROXABAN',
  pradaxa: 'DABIGATRAN',
  lixiana: 'EDOXABAN',
  clexane: 'ENOXAPARIN',
  plavix: 'CLOPIDOGREL',
  brilique: 'TICAGRELOR',
  asaflow: 'ASPIRIN',
  'cardio-aspirine': 'ASPIRIN',
  aspirine: 'ASPIRIN',
  aspegic: 'ASPIRIN',
  coversyl: 'PERINDOPRIL',
  tritace: 'RAMIPRIL',
  emconcor: 'BISOPROLOL',
  amlor: 'AMLODIPINE',
  lasix: 'FUROSEMIDE',
  aldactone: 'SPIRONOLACTONE',
  entresto: 'SACUBITRIL/VALSARTAN',
  cordarone: 'AMIODARONE',
  lanoxin: 'DIGOXIN',
  lipitor: 'ATORVASTATIN',
  crestor: 'ROSUVASTATIN',
  zocor: 'SIMVASTATIN',
  glucophage: 'METFORMIN',
  januvia: 'SITAGLIPTIN',
  jardiance: 'EMPAGLIFLOZIN',
  forxiga: 'DAPAGLIFLOZIN',
  ozempic: 'SEMAGLUTIDE',
  lantus: 'INSULIN GLARGINE',
  novorapid: 'INSULIN ASPART',
  humalog: 'INSULIN LISPRO',
  insuline: 'INSULIN',
  'l-thyroxine': 'LEVOTHYROXINE',
  euthyrox: 'LEVOTHYROXINE',
  levothyrox: 'LEVOTHYROXINE',
  depakine: 'VALPROATE',
  keppra: 'LEVETIRACETAM',
  tegretol: 'CARBAMAZEPINE',
  lyrica: 'PREGABALIN',
  sinemet: 'LEVODOPA/CARBIDOPA',
  prolopa: 'LEVODOPA/BENSERAZIDE',
  ventolin: 'SALBUTAMOL',
  seretide: 'FLUTICASONE/SALMETEROL',
  symbicort: 'BUDESONIDE/FORMOTEROL',
  pantomed: 'PANTOPRAZOLE',
  nexiam: 'ESOMEPRAZOLE',
  medrol: 'METHYLPREDNISOLONE',
  sipralexa: 'ESCITALOPRAM',
  temesta: 'LORAZEPAM',
  xanax: 'ALPRAZOLAM',
  dafalgan: 'PARACETAMOL',
  perdolan: 'PARACETAMOL',
  // génériques écrits "à la française"
  metformine: 'METFORMIN',
  atorvastatine: 'ATORVASTATIN',
  rosuvastatine: 'ROSUVASTATIN',
  simvastatine: 'SIMVASTATIN',
  amlodipine: 'AMLODIPINE',
  levothyroxine: 'LEVOTHYROXINE',
  warfarine: 'WARFARIN',
  'acide valproique': 'VALPROATE',
};
