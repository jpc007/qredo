#!/usr/bin/env python3
# =====================================================================
# QREDO - Base des médicaments belges à partir de SAM (AFMPS / eHealth)
# ---------------------------------------------------------------------
# Source : SAM v2, export public (sans contrôle d'accès) publié par
#          eHealth / AFMPS : https://www.samportal.be/fr/sam/access
# Produit : app/data/medicaments-be.json
#           nom commercial -> molécule(s) (DCI) + dosage
#
# Usage :
#   python tools/sam/build-drug-db.py                 (télécharge le dernier export)
#   python tools/sam/build-drug-db.py --zip sam.zip   (utilise un export déjà téléchargé)
#
# Uniquement la bibliothèque standard Python (aucune dépendance).
# Le fichier XML des médicaments (AMP) fait ~1,7 Go : il est lu en
# continu (iterparse), sans être chargé en mémoire.
# =====================================================================

import argparse
import datetime as dt
import json
import os
import re
import sys
import tempfile
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

BASE = "https://www.vas.ehealth.fgov.be/websamcivics/samcivics/download"
XSD = 6  # version du format d'export SAM v2
UA = {"User-Agent": "QREDO-drug-db/1.0 (+https://jpc007.github.io/qredo/)"}


def http_get(url, dest=None):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=300) as r:
        if dest is None:
            return r.read().decode("utf-8").strip()
        with open(dest, "wb") as f:
            while chunk := r.read(1 << 20):
                f.write(chunk)
    return dest


def download_latest(workdir):
    version = http_get(f"{BASE}/samv2-full-getLastVersion?xsd={XSD}")
    if not version.isdigit():
        raise RuntimeError(f"Réponse inattendue pour la version SAM : {version!r}")
    print(f"Export SAM le plus récent : version {version}")
    path = os.path.join(workdir, f"sam-{version}.zip")
    http_get(f"{BASE}/samv2-download?type=FULL&xsd={XSD}&version={version}", path)
    print(f"Téléchargé : {os.path.getsize(path) / 1e6:.0f} Mo")
    return path, int(version)


# --------------------------------------------------------------------------
# Lecture du XML
# --------------------------------------------------------------------------
def local(tag):
    return tag.rsplit("}", 1)[-1]


def children(el, name):
    return [c for c in el if local(c.tag) == name]


def child(el, name):
    return next((c for c in el if local(c.tag) == name), None) if el is not None else None


def text(el, path):
    for part in path.split("/"):
        el = child(el, part)
        if el is None:
            return None
    return (el.text or "").strip() or None


def current(datas):
    """Période de validité en cours (sans date de fin), sinon la plus récente."""
    if not datas:
        return None
    open_ = [d for d in datas if "to" not in d.attrib]
    return (open_ or sorted(datas, key=lambda d: d.get("from", "")))[-1]


def num(value):
    """'1000.0000' -> '1000', '2.5000' -> '2.5'"""
    try:
        s = f"{float(value):.4f}".rstrip("0").rstrip(".")
        return s
    except (TypeError, ValueError):
        return None


def unit(u):
    # "ug" (SAM) -> "mcg" : notation médicale, sans caractère spécial (QR en ASCII)
    return {"ug": "mcg", "µg": "mcg"}.get(u or "", u or "")


def strength_of(data):
    st = child(data, "Strength")
    if st is None:
        return None
    q = child(st, "Quantity")
    if q is None or num(q.text) is None:
        return None
    s = f"{num(q.text)} {unit(q.get('unit'))}".strip()
    q2 = child(st, "SecondQuantity")
    if q2 is not None and num(q2.text):
        n2 = num(q2.text)
        s += f"/{'' if n2 == '1' else n2 + ' '}{unit(q2.get('unit'))}".rstrip()
    return s


def clean_name(s):
    return re.sub(r"\s+", " ", s or "").strip()


def key(s):
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"\s+", " ", "".join(c for c in s if unicodedata.category(c) != "Mn")).strip()


def parse_amp(zip_path):
    z = zipfile.ZipFile(zip_path)
    amp_name = next(n for n in z.namelist() if n.startswith("AMP-"))
    sam_id = None
    products = {}
    stats = {"total": 0, "kept": 0}

    for event, el in ET.iterparse(z.open(amp_name), events=("start", "end")):
        if event == "start":
            if sam_id is None and local(el.tag) == "ExportActualMedicines":
                sam_id = el.get("SamId")
            continue
        if local(el.tag) != "Amp":
            continue
        stats["total"] += 1
        d = current(children(el, "Data"))
        name = clean_name(text(d, "Name/Fr") or text(d, "OfficialName"))
        status = text(d, "Status")
        mtype = text(d, "MedicineType")

        if name and mtype == "ALLOPATHIC":
            inns, strengths = [], []
            for comp in children(el, "AmpComponent"):
                for ing in children(comp, "RealActualIngredient"):
                    idata = current(children(ing, "Data"))
                    if idata is None or text(idata, "Type") != "ACTIVE_SUBSTANCE":
                        continue
                    sub = child(idata, "Substance")
                    inn = text(sub, "Name/En") or text(sub, "Name/Fr")
                    if inn and inn.upper() not in inns:
                        inns.append(inn.upper())
                        strengths.append(strength_of(idata) or "")
            if inns:
                active = 0 if status == "AUTHORIZED" else 1  # 1 = plus commercialisé
                k = key(name)
                prev = products.get(k)
                # En cas de doublon de nom, on garde le produit autorisé
                if prev is None or (prev[3] == 1 and active == 0):
                    s = " / ".join(strengths) if any(strengths) else ""
                    products[k] = [name, " / ".join(inns), s, active]
        el.clear()

    rows = sorted(products.values(), key=lambda r: key(r[0]))
    stats["kept"] = len(rows)
    return sam_id, rows, stats


def main():
    ap = argparse.ArgumentParser(description="Construit la base médicaments QREDO depuis SAM")
    ap.add_argument("--zip", help="export SAM déjà téléchargé (sinon : téléchargement)")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "..", "app", "data", "medicaments-be.json"))
    args = ap.parse_args()

    with tempfile.TemporaryDirectory() as tmp:
        if args.zip:
            zip_path, version = args.zip, None
            m = re.search(r"(\d+)", os.path.basename(zip_path))
            version = int(m.group(1)) if m else None
        else:
            zip_path, version = download_latest(tmp)
        sam_id, rows, stats = parse_amp(zip_path)

    if stats["kept"] < 5000:  # garde-fou : export incomplet ou format changé
        raise RuntimeError(f"Trop peu de médicaments extraits ({stats['kept']}) : abandon.")

    payload = {
        "source": "SAM v2 – AFMPS / eHealth (export public, réutilisation non officielle)",
        "sourceUrl": "https://www.samportal.be/fr/sam/access",
        "samId": sam_id,
        "samVersion": version,
        "generated": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d"),
        "count": len(rows),
        "columns": ["name", "inn", "strength", "inactive"],
        "products": rows,
    }
    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{stats['total']} médicaments lus, {stats['kept']} retenus -> {out} ({os.path.getsize(out) / 1e6:.2f} Mo)")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # message clair dans les logs GitHub Actions
        print(f"ERREUR : {e}", file=sys.stderr)
        sys.exit(1)
