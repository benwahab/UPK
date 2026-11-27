#!/usr/bin/env python3
"""Génère les SQL D1 d'intégration Overture, sans les exécuter.

Lit docs/overture/validated-new.csv et docs/overture/enrichments-osm.csv.
Produit :
- docs/overture/import-new.sql : INSERT idempotents des nouveaux lieux
- docs/overture/enrich-osm.sql : UPDATE limités aux champs absents d'OSM
- docs/overture/rollback-new.sql : suppression des seuls lieux Overture importés
- docs/overture/import-manifest.json : empreintes et décomptes

Aucune donnée n'est inventée : l'adresse et le quartier restent NULL lorsque
les fichiers d'audit ne les fournissent pas.
"""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "overture"
RELEASE = "2026-11-18.0"
AUDIT_DATE = "2026-11-21"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def sql_string(value: str | None) -> str:
    if value is None or value == "":
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def sql_number(value: str | None) -> str:
    if value is None or value == "":
        return "NULL"
    return str(float(value))


def clean_phone(row: dict[str, str]) -> str | None:
    normalized = row.get("telephone_normalise", "").strip()
    return normalized or None


def clean_website(value: str | None) -> str | None:
    value = (value or "").strip()
    if not value:
        return None
    if value.startswith(("http://", "https://")):
        return value
    return "https://" + value


def metadata(row: dict[str, str]) -> str:
    payload = {
        "overture": {
            "release": RELEASE,
            "category": row["categorie_overture"],
            "confidence": row["confiance"],
            "candidate_id": row["candidat_id"],
            "audit": AUDIT_DATE,
            "decision": row["decision"],
            "verification_url": row.get("verification_externe") or None,
        }
    }
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def new_place_sql(row: dict[str, str]) -> str:
    phone = clean_phone(row)
    website = clean_website(row.get("site_web"))
    values = [
        sql_string(row["candidat_id"]),
        sql_string(row["nom"]),
        sql_string(row["nom_normalise"]),
        "NULL",  # description
        sql_string(f"cat_{row['categorie_upk']}"),
        sql_string(row.get("region_id") or None),
        sql_string(row.get("departement_id") or None),
        sql_string(row.get("commune_id") or None),
        sql_string(row.get("ville_zone_id") or None),
        "NULL",  # quartier
        "NULL",  # adresse
        sql_number(row["latitude"]),
        sql_number(row["longitude"]),
        sql_string(phone),
        sql_string(phone),
        "NULL",  # whatsapp
        "NULL",  # horaires
        sql_string(website),
        "'valide'",
        "'source_fiable'",
        "NULL",  # owner_id
        "'overture'",
        "NULL",  # osm_id
        "NULL",  # osm_type
        "'CDLA-Permissive-2.0'",
        sql_string(f"{AUDIT_DATE}T00:00:00.000Z"),
        sql_string(metadata(row)),
        "NULL",  # contact_email
        "NULL",  # gps_precision_m
        "NULL",  # motif_refus
        "NULL",  # modere_par
        "NULL",  # modere_le
        "'fr'",
        sql_string(row["code_pays"]),
        "'https://overturemaps.org/'",
        "NULL",  # osm_tags
        "1",
        sql_string(f"{AUDIT_DATE}T00:00:00.000Z"),
        sql_string(f"{AUDIT_DATE}T00:00:00.000Z"),
    ]
    fields = (
        "id, nom, nom_normalise, description, category_id, region_id, departement_id, "
        "commune_id, ville_zone_id, quartier, adresse, latitude, longitude, telephone, "
        "telephone_normalise, whatsapp, horaires, site_web, statut_publication, "
        "statut_verification, owner_id, source, osm_id, osm_type, licence_source, "
        "importe_le, metadata, contact_email, gps_precision_m, motif_refus, modere_par, "
        "modere_le, langue, country_code, source_url, osm_tags, actif, created_at, updated_at"
    )
    updates = (
        "nom=excluded.nom, nom_normalise=excluded.nom_normalise, "
        "category_id=excluded.category_id, region_id=excluded.region_id, "
        "departement_id=excluded.departement_id, commune_id=excluded.commune_id, "
        "ville_zone_id=excluded.ville_zone_id, latitude=excluded.latitude, "
        "longitude=excluded.longitude, telephone=excluded.telephone, "
        "telephone_normalise=excluded.telephone_normalise, site_web=excluded.site_web, "
        "statut_publication=excluded.statut_publication, "
        "statut_verification=excluded.statut_verification, metadata=excluded.metadata, "
        "country_code=excluded.country_code, source_url=excluded.source_url, "
        "licence_source=excluded.licence_source, updated_at=excluded.updated_at"
    )
    return (
        f"INSERT INTO places ({fields}) VALUES ({', '.join(values)}) "
        f"ON CONFLICT(id) DO UPDATE SET {updates} WHERE source = 'overture';"
    )


def enrichment_sql(row: dict[str, str]) -> str:
    fields = set((row.get("champs_enrichis") or "").split(","))
    assignments = []
    if "telephone" in fields:
        phone = clean_phone(row)
        assignments.append(f"telephone = COALESCE(telephone, {sql_string(phone)})")
        assignments.append(
            f"telephone_normalise = COALESCE(telephone_normalise, {sql_string(phone)})"
        )
    if "site_web" in fields:
        website = clean_website(row.get("site_web"))
        assignments.append(f"site_web = COALESCE(site_web, {sql_string(website)})")
    if not assignments:
        return ""
    overture_json = json.dumps(
        {
            "release": RELEASE,
            "audit": AUDIT_DATE,
            "candidate_id": row["candidat_id"],
            "fields": sorted(fields),
        },
        ensure_ascii=False,
        separators=(",", ":"),
    )
    assignments.extend(
        [
            "source = CASE WHEN source = 'openstreetmap' THEN 'osm+overture' ELSE source END",
            "metadata = json_set("
            "CASE WHEN json_valid(metadata) THEN metadata ELSE '{}' END, "
            "'$.overture', json(" + sql_string(overture_json) + "))",
            f"updated_at = {sql_string(AUDIT_DATE + 'T00:00:00.000Z')}",
        ]
    )
    return (
        "UPDATE places SET "
        + ", ".join(assignments)
        + f" WHERE id = {sql_string(row['osm_match_id'])} AND source = 'openstreetmap';"
    )


def main() -> None:
    new_rows = read_csv(OUT / "validated-new.csv")
    enrich_rows = read_csv(OUT / "enrichments-osm.csv")

    header = [
        "-- UPK — intégration Overture Maps, release " + RELEASE,
        "-- Audit du " + AUDIT_DATE + " ; licence Overture Places : CDLA-Permissive-2.0",
        "-- Ne pas exécuter en production sans sauvegarde D1 et validation explicite.",
        "PRAGMA foreign_keys = ON;",
        "",
    ]
    new_statements = [new_place_sql(row) for row in new_rows]
    enrich_statements = [enrichment_sql(row) for row in enrich_rows]
    enrich_statements = [statement for statement in enrich_statements if statement]

    (OUT / "import-new.sql").write_text(
        "\n".join(header + new_statements) + "\n", encoding="utf-8"
    )
    (OUT / "enrich-osm.sql").write_text(
        "\n".join(header + enrich_statements) + "\n", encoding="utf-8"
    )
    ids = ", ".join(sql_string(row["candidat_id"]) for row in new_rows)
    (OUT / "rollback-new.sql").write_text(
        "\n".join(
            header
            + [
                "DELETE FROM places",
                f"WHERE id IN ({ids})",
                "  AND source = 'overture';",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    manifest = {
        "release": RELEASE,
        "audit_date": AUDIT_DATE,
        "new_places": len(new_rows),
        "enrichments": len(enrich_statements),
        "new_ids_sha256": hashlib.sha256(
            "\n".join(row["candidat_id"] for row in new_rows).encode()
        ).hexdigest(),
        "import_new_sha256": hashlib.sha256(
            (OUT / "import-new.sql").read_bytes()
        ).hexdigest(),
        "enrich_osm_sha256": hashlib.sha256(
            (OUT / "enrich-osm.sql").read_bytes()
        ).hexdigest(),
        "production_executed": False,
    }
    (OUT / "import-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
