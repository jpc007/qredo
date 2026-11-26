// =====================================================================
// QREDO - Sauvegarde locale et fichier de sauvegarde
// ---------------------------------------------------------------------
// Les données restent DANS l'appareil (mémoire du navigateur).
// Rien n'est envoyé sur Internet. Le fichier .json permet de transférer
// ou de sauvegarder son dossier.
// =====================================================================

import { emptyDossier, medToEn } from './qr-text.js';
import { t } from '../i18n/i18n.js';

const STORAGE_KEY = 'qredo.dossier.v1';
const FILE_FORMAT = 'QREDO-DOSSIER';

/** Complète un dossier partiel avec les champs manquants. */
export function normalizeDossier(d) {
  const base = emptyDossier();
  const out = { ...base, ...(d || {}) };
  out.contacts = [0, 1].map((i) => ({ ...base.contacts[i], ...((d && d.contacts && d.contacts[i]) || {}) }));
  for (const k of ['allergies', 'implants', 'conditions', 'meds']) {
    if (!Array.isArray(out[k])) out[k] = [];
  }
  // Ancienne rubrique "Anticoagulants" (supprimée) : transférée dans les
  // médicaments, sans doublon, pour ne perdre aucune information
  if (Array.isArray(d?.anticoagulants) && d.anticoagulants.length) {
    const known = out.meds.map((m) => medToEn(m.name));
    for (const code of d.anticoagulants) {
      if (!known.includes(code)) out.meds.push({ name: code, dose: '' });
    }
  }
  delete out.anticoagulants;
  // Ancienne valeur "ANAPHYLAXIS" (retirée de la liste) -> "SEVERE"
  out.allergies = out.allergies.map((a) => (a.reaction === 'ANAPHYLAXIS' ? { ...a, reaction: 'SEVERE' } : a));
  return out;
}

export function loadDossier() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeDossier(JSON.parse(raw)) : emptyDossier();
  } catch {
    return emptyDossier();
  }
}

export function saveDossier(d) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
}

export function clearDossier() {
  localStorage.removeItem(STORAGE_KEY);
}

/** Télécharge le dossier sous forme de fichier .json */
export function exportDossierFile(d) {
  const payload = { format: FILE_FORMAT, version: 1, exported: new Date().toISOString(), dossier: d };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const who = (d.lastName || t('transfer.defaultFileName')).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const name = `qredo-${who}-${today()}.json`;
  downloadBlob(blob, name);
}

/** Lit un fichier .json choisi par l'utilisateur. */
export async function importDossierFile(file) {
  let data = null;
  try {
    data = JSON.parse(await file.text());
  } catch {
    /* pas du JSON : même message ci-dessous */
  }
  if (data?.format !== FILE_FORMAT || !data.dossier) {
    throw new Error(t('import.notBackup'));
  }
  return normalizeDossier(data.dossier);
}

export function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
