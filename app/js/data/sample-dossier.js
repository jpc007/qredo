// =====================================================================
// QREDO - Dossier d'exemple (fictif) pour la démonstration
// Repris du cahier des charges du Dr Bodson ("Jean-Pierre Dupont").
// =====================================================================

export const SAMPLE_DOSSIER = {
  lastName: 'Dupont',
  firstName: 'Jean-Pierre',
  sex: 'M',
  dob: '1975-06-14',
  languages: 'FR',
  noKnownAllergy: false,
  allergies: [
    { substance: 'Pénicilline', reaction: 'ANAPHYLAXIS' },
    { substance: 'Arachides / cacahuètes', reaction: 'SEVERE' },
    { substance: 'Latex', reaction: 'MILD' },
  ],
  anticoagulants: ['ACENOCOUMAROL'],
  implants: ['PACEMAKER', 'MECHANICAL HEART VALVE', 'CPAP'],
  implantsOther: '',
  conditions: ['HEART FAILURE', 'HYPERTENSION', 'DIABETES TYPE 2', 'SLEEP APNEA'],
  conditionsOther: '',
  meds: [
    { name: 'Ramipril', dose: '5 mg' },
    { name: 'Metformine', dose: '850 mg' },
    { name: 'Bisoprolol', dose: '5 mg' },
    { name: 'Atorvastatine', dose: '20 mg' },
  ],
  bloodGroup: 'A+',
  weight: 82,
  height: 178,
  advanceDirective: true,
  advanceDirectiveDate: '2022-03-15',
  refuseTransfusion: true,
  dnr: false,
  contacts: [
    { name: 'Marie Dupont', relation: 'SPOUSE', phone: '+32 475 12 34 56' },
    { name: 'Thomas Dupont', relation: 'CHILD', phone: '+32 477 98 76 54' },
  ],
  gpName: 'Dr Martin Dubois',
  gpPhone: '+32 4 123 45 67',
  notes: 'Reduced mobility',
  updated: '',
};
