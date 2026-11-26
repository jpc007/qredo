// =====================================================================
// QREDO - Listes de référence (français -> anglais médical)
// ---------------------------------------------------------------------
// Le patient choisit en français, le QR code est écrit en anglais.
// "en" = code écrit dans le QR (ASCII, majuscules, 1 caractère = 1 octet)
// "fr" = libellé affiché dans le formulaire
// =====================================================================

export const SEXES = [
  { en: 'M', fr: 'Homme' },
  { en: 'F', fr: 'Femme' },
  { en: 'X', fr: 'Autre / non précisé' },
];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Sévérité de la réaction allergique
export const REACTIONS = [
  { en: '', fr: '— réaction ? —' },
  { en: 'ANAPHYLAXIS', fr: 'Anaphylaxie / choc' },
  { en: 'SEVERE', fr: 'Grave (œdème, gêne respiratoire)' },
  { en: 'MODERATE', fr: 'Modérée' },
  { en: 'MILD', fr: 'Légère (urticaire, démangeaisons)' },
];

// Allergènes fréquents (le patient peut aussi taper autre chose)
export const ALLERGENS = [
  { en: 'PENICILLIN', fr: 'Pénicilline' },
  { en: 'AMOXICILLIN', fr: 'Amoxicilline' },
  { en: 'CEPHALOSPORINS', fr: 'Céphalosporines' },
  { en: 'SULFONAMIDES', fr: 'Sulfamidés' },
  { en: 'ASPIRIN', fr: 'Aspirine' },
  { en: 'NSAID', fr: 'Anti-inflammatoires (AINS, ibuprofène)' },
  { en: 'OPIOIDS', fr: 'Morphiniques / codéine' },
  { en: 'IODINE CONTRAST', fr: 'Produit de contraste iodé' },
  { en: 'LOCAL ANESTHETICS', fr: 'Anesthésiques locaux' },
  { en: 'CHLORHEXIDINE', fr: 'Chlorhexidine' },
  { en: 'LATEX', fr: 'Latex' },
  { en: 'PEANUT', fr: 'Arachides / cacahuètes' },
  { en: 'TREE NUTS', fr: 'Fruits à coque (noix, noisettes)' },
  { en: 'SHELLFISH', fr: 'Crustacés / fruits de mer' },
  { en: 'FISH', fr: 'Poisson' },
  { en: 'EGG', fr: 'Œuf' },
  { en: 'MILK', fr: 'Lait' },
  { en: 'WHEAT/GLUTEN', fr: 'Blé / gluten' },
  { en: 'BEE/WASP VENOM', fr: 'Piqûre d’abeille / guêpe' },
];

// Anticoagulants et antiagrégants : vital pour les urgences (saignement)
export const ANTICOAGULANTS = [
  { en: 'ACENOCOUMAROL', fr: 'Sintrom (acénocoumarol)' },
  { en: 'PHENPROCOUMON', fr: 'Marcoumar (phenprocoumone)' },
  { en: 'WARFARIN', fr: 'Marevan / Coumadine (warfarine)' },
  { en: 'APIXABAN', fr: 'Eliquis (apixaban)' },
  { en: 'RIVAROXABAN', fr: 'Xarelto (rivaroxaban)' },
  { en: 'DABIGATRAN', fr: 'Pradaxa (dabigatran)' },
  { en: 'EDOXABAN', fr: 'Lixiana (edoxaban)' },
  { en: 'LMWH', fr: 'Héparine injectable (Clexane, Fraxiparine)' },
  { en: 'CLOPIDOGREL', fr: 'Plavix (clopidogrel) – antiagrégant' },
  { en: 'TICAGRELOR', fr: 'Brilique (ticagrélor) – antiagrégant' },
  { en: 'ASPIRIN', fr: 'Aspirine / Asaflow – antiagrégant' },
];

// Implants et appareillages
export const IMPLANTS = [
  { en: 'PACEMAKER', fr: 'Stimulateur cardiaque (pacemaker)' },
  { en: 'ICD', fr: 'Défibrillateur implanté (DAI)' },
  { en: 'MECHANICAL HEART VALVE', fr: 'Valve cardiaque mécanique' },
  { en: 'CORONARY STENT', fr: 'Stent coronaire' },
  { en: 'INSULIN PUMP', fr: 'Pompe à insuline' },
  { en: 'NEUROSTIMULATOR', fr: 'Neurostimulateur' },
  { en: 'COCHLEAR IMPLANT', fr: 'Implant cochléaire' },
  { en: 'VP SHUNT', fr: 'Valve de dérivation (cerveau)' },
  { en: 'JOINT PROSTHESIS', fr: 'Prothèse articulaire (hanche, genou)' },
  { en: 'CPAP', fr: 'Appareil apnée du sommeil (CPAP)' },
];

// Maladies et situations importantes pour les secours
export const CONDITIONS = [
  { en: 'DIABETES TYPE 1', fr: 'Diabète type 1 (insuline)' },
  { en: 'DIABETES TYPE 2', fr: 'Diabète type 2' },
  { en: 'EPILEPSY', fr: 'Épilepsie' },
  { en: 'HYPERTENSION', fr: 'Hypertension artérielle' },
  { en: 'HEART FAILURE', fr: 'Insuffisance cardiaque' },
  { en: 'CORONARY DISEASE', fr: 'Maladie coronaire / infarctus' },
  { en: 'ATRIAL FIBRILLATION', fr: 'Fibrillation auriculaire' },
  { en: 'PAST STROKE', fr: 'AVC ancien' },
  { en: 'ASTHMA', fr: 'Asthme' },
  { en: 'COPD', fr: 'BPCO (bronchite chronique)' },
  { en: 'SLEEP APNEA', fr: 'Apnée du sommeil' },
  { en: 'KIDNEY FAILURE', fr: 'Insuffisance rénale' },
  { en: 'DIALYSIS', fr: 'Dialyse' },
  { en: 'LIVER CIRRHOSIS', fr: 'Cirrhose du foie' },
  { en: 'BLEEDING DISORDER', fr: 'Hémophilie / trouble de coagulation' },
  { en: 'SICKLE CELL DISEASE', fr: 'Drépanocytose' },
  { en: 'ADRENAL INSUFFICIENCY', fr: 'Insuffisance surrénalienne' },
  { en: 'MYASTHENIA', fr: 'Myasthénie' },
  { en: 'DEMENTIA', fr: 'Démence / Alzheimer' },
  { en: 'PARKINSON', fr: 'Parkinson' },
  { en: 'CANCER UNDER TREATMENT', fr: 'Cancer en traitement' },
  { en: 'IMMUNOSUPPRESSED', fr: 'Immunodéprimé (greffe, chimio…)' },
  { en: 'PREGNANT', fr: 'Enceinte' },
  { en: 'HEARING IMPAIRED', fr: 'Malentendant' },
  { en: 'VISUALLY IMPAIRED', fr: 'Malvoyant' },
];

// Lien avec la personne de contact
export const RELATIONS = [
  { en: '', fr: '— lien ? —' },
  { en: 'SPOUSE', fr: 'Conjoint·e' },
  { en: 'CHILD', fr: 'Enfant' },
  { en: 'PARENT', fr: 'Parent' },
  { en: 'SIBLING', fr: 'Frère / sœur' },
  { en: 'FRIEND', fr: 'Ami·e' },
  { en: 'NEIGHBOR', fr: 'Voisin·e' },
  { en: 'CAREGIVER', fr: 'Aidant·e' },
  { en: 'OTHER', fr: 'Autre' },
];

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
