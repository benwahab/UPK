#!/usr/bin/env python3
"""Génère les fichiers SQL D1 du catalogue Sahel (GeoNames + OpenStreetMap).

Les données sont déjà normalisées dans seed/geonames-sahel-*.json et
seed/osm-sahel-*.json. Ce script ne fabrique aucune donnée : il convertit
les relevés en INSERT idempotents, puis les découpe pour wrangler.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT = "2026-11-27"


def sql(value: object) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def slug(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "x"


def read(name: str) -> dict:
    return json.loads((ROOT / "seed" / name).read_text(encoding="utf-8"))


def statements_geo() -> list[str]:
    geo = read(f"geonames-sahel-{SNAPSHOT}.json")
    categories = read(f"categories-{SNAPSHOT}.json")
    out: list[str] = ["PRAGMA foreign_keys = ON;"]

    for category in categories["categories"]:
        category_id = f"cat_{category['slug']}"
        out.append(
            "INSERT INTO categories (id, nom, slug, icone, ordre, created_at) VALUES ("
            f"{sql(category_id)}, {sql(category['nom'])}, {sql(category['slug'])}, "
            f"{sql(category.get('icone'))}, {category['ordre']}, {sql(SNAPSHOT + 'T00:00:00.000Z')}) "
            "ON CONFLICT(id) DO UPDATE SET nom=excluded.nom, icone=excluded.icone, ordre=excluded.ordre;"
        )
        for language, name in category["translations"].items():
            out.append(
                "INSERT INTO category_translations (category_id, langue, nom) VALUES ("
                f"{sql(category_id)}, {sql(language)}, {sql(name)}) "
                "ON CONFLICT(category_id, langue) DO UPDATE SET nom=excluded.nom;"
            )

    for country in geo["countries"]:
        out.append(
            "INSERT INTO countries (code, nom, phone_prefix, source, licence, updated_at) VALUES ("
            f"{sql(country['code'])}, {sql(country['nom'])}, {sql({'NE': '227', 'ML': '223', 'BF': '226'}.get(country['code']))}, "
            f"{sql(country.get('source'))}, {sql(country.get('licence'))}, {sql(country.get('updated_at', SNAPSHOT))}) "
            "ON CONFLICT(code) DO UPDATE SET nom=excluded.nom, phone_prefix=excluded.phone_prefix, source=excluded.source, licence=excluded.licence, updated_at=excluded.updated_at;"
        )

    for region in geo["regions"]:
        out.append(
            "INSERT INTO regions (id, nom, slug, country_code, latitude, longitude, source, geonames_id) VALUES ("
            f"{sql(region['id'])}, {sql(region['nom'])}, {sql(region['slug'])}, {sql(region.get('country_code'))}, "
            f"{sql(region.get('latitude'))}, {sql(region.get('longitude'))}, {sql(region.get('source'))}, {sql(region.get('geonames_id'))}) "
            "ON CONFLICT(id) DO UPDATE SET nom=excluded.nom, country_code=excluded.country_code, latitude=excluded.latitude, longitude=excluded.longitude, source=excluded.source, geonames_id=excluded.geonames_id;"
        )

    for department in geo["departements"]:
        out.append(
            "INSERT INTO departements (id, region_id, nom, slug, latitude, longitude, source, geonames_id) VALUES ("
            f"{sql(department['id'])}, {sql(department['region_id'])}, {sql(department['nom'])}, {sql(department['slug'])}, "
            f"{sql(department.get('latitude'))}, {sql(department.get('longitude'))}, {sql(department.get('source'))}, {sql(department.get('geonames_id'))}) "
            "ON CONFLICT(id) DO UPDATE SET region_id=excluded.region_id, nom=excluded.nom, latitude=excluded.latitude, longitude=excluded.longitude, source=excluded.source, geonames_id=excluded.geonames_id;"
        )

    for commune in geo["communes"]:
        out.append(
            "INSERT INTO communes (id, departement_id, nom, slug, latitude, longitude, source, geonames_id) VALUES ("
            f"{sql(commune['id'])}, {sql(commune['departement_id'])}, {sql(commune['nom'])}, {sql(commune['slug'])}, "
            f"{sql(commune.get('latitude'))}, {sql(commune.get('longitude'))}, {sql(commune.get('source'))}, {sql(commune.get('geonames_id'))}) "
            "ON CONFLICT(id) DO UPDATE SET departement_id=excluded.departement_id, nom=excluded.nom, latitude=excluded.latitude, longitude=excluded.longitude, source=excluded.source, geonames_id=excluded.geonames_id;"
        )

    for city in geo["villes"]:
        out.append(
            "INSERT INTO villes_zones (id, commune_id, nom, slug, latitude, longitude, type, nom_normalise, population, source, geonames_id, country_code) VALUES ("
            f"{sql(city['id'])}, {sql(city['commune_id'])}, {sql(city['nom'])}, {sql(city['slug'])}, "
            f"{sql(city.get('latitude'))}, {sql(city.get('longitude'))}, {sql(city.get('type', 'ville'))}, "
            f"{sql(city.get('nom_normalise') or slug(city['nom']))}, {sql(city.get('population'))}, "
            f"{sql(city.get('source'))}, {sql(city.get('geonames_id'))}, {sql(city.get('country_code'))}) "
            "ON CONFLICT(id) DO UPDATE SET commune_id=excluded.commune_id, nom=excluded.nom, latitude=excluded.latitude, longitude=excluded.longitude, type=excluded.type, nom_normalise=excluded.nom_normalise, population=excluded.population, source=excluded.source, country_code=excluded.country_code;"
        )

    for quartier in geo["quartiers"]:
        out.append(
            "INSERT INTO quartiers (id, ville_zone_id, commune_id, nom, slug, nom_normalise, latitude, longitude, source, geonames_id, licence_source, created_at) VALUES ("
            f"{sql(quartier['id'])}, {sql(quartier['ville_zone_id'])}, {sql(quartier.get('commune_id'))}, {sql(quartier['nom'])}, {sql(quartier['slug'])}, "
            f"{sql(quartier.get('nom_normalise') or slug(quartier['nom']))}, {sql(quartier.get('latitude'))}, {sql(quartier.get('longitude'))}, "
            f"{sql(quartier.get('source'))}, {sql(quartier.get('geonames_id'))}, {sql(quartier.get('licence_source'))}, {sql(SNAPSHOT + 'T00:00:00.000Z')}) "
            "ON CONFLICT(id) DO UPDATE SET ville_zone_id=excluded.ville_zone_id, commune_id=excluded.commune_id, nom=excluded.nom, nom_normalise=excluded.nom_normalise, latitude=excluded.latitude, longitude=excluded.longitude, source=excluded.source;"
        )
    return out


PLACE_FIELDS = (
    "id, nom, nom_normalise, description, category_id, region_id, departement_id, commune_id, "
    "ville_zone_id, quartier, quartier_id, quartier_normalise, adresse, latitude, longitude, telephone, "
    "telephone_normalise, whatsapp, horaires, site_web, statut_publication, statut_verification, owner_id, "
    "source, osm_id, osm_type, licence_source, importe_le, metadata, contact_email, gps_precision_m, "
    "motif_refus, modere_par, modere_le, langue, country_code, source_url, osm_tags, actif, created_at, updated_at"
)


def place_sql(place: dict) -> str:
    values = [
        place["id"],
        place["nom"],
        place["nom_normalise"],
        place.get("description"),
        f"cat_{place['categorie_slug']}",
        place.get("region_id"),
        place.get("departement_id"),
        place.get("commune_id"),
        place.get("ville_zone_id"),
        place.get("quartier"),
        place.get("quartier_id"),
        place.get("quartier_normalise"),
        place.get("adresse"),
        place["latitude"],
        place["longitude"],
        place.get("telephone"),
        place.get("telephone_normalise"),
        place.get("whatsapp"),
        place.get("horaires"),
        place.get("site_web"),
        place.get("statut_publication", "valide"),
        place.get("statut_verification", "source_fiable"),
        place.get("owner_id"),
        place.get("source", "openstreetmap"),
        place.get("osm_id"),
        place.get("osm_type"),
        place.get("licence_source", "ODbL-1.0"),
        place.get("importe_le", SNAPSHOT + "T00:00:00.000Z"),
        place.get("metadata"),
        place.get("contact_email"),
        place.get("gps_precision_m"),
        place.get("motif_refus"),
        place.get("modere_par"),
        place.get("modere_le"),
        place.get("langue", "fr"),
        place.get("pays"),
        place.get("source_url"),
        place.get("osm_tags"),
        1,
        place.get("created_at", SNAPSHOT + "T00:00:00.000Z"),
        place.get("updated_at", SNAPSHOT + "T00:00:00.000Z"),
    ]
    return (
        f"INSERT INTO places ({PLACE_FIELDS}) VALUES ("
        + ", ".join(sql(value) for value in values)
        + ") ON CONFLICT(id) DO UPDATE SET nom=excluded.nom, nom_normalise=excluded.nom_normalise, "
        "description=excluded.description, category_id=excluded.category_id, region_id=excluded.region_id, "
        "departement_id=excluded.departement_id, commune_id=excluded.commune_id, ville_zone_id=excluded.ville_zone_id, "
        "quartier=excluded.quartier, quartier_id=excluded.quartier_id, quartier_normalise=excluded.quartier_normalise, "
        "adresse=excluded.adresse, latitude=excluded.latitude, longitude=excluded.longitude, telephone=excluded.telephone, "
        "telephone_normalise=excluded.telephone_normalise, horaires=excluded.horaires, site_web=excluded.site_web, "
        "statut_verification=excluded.statut_verification, source=excluded.source, licence_source=excluded.licence_source, "
        "importe_le=excluded.importe_le, gps_precision_m=excluded.gps_precision_m, country_code=excluded.country_code, "
        "source_url=excluded.source_url, osm_tags=excluded.osm_tags, updated_at=excluded.updated_at;"
    )


def write_chunks(out_dir: Path, prefix: str, statements: list[str], size: int = 500) -> list[Path]:
    paths: list[Path] = []
    for index in range(0, len(statements), size):
        path = out_dir / f"{prefix}-{index // size:03d}.sql"
        path.write_text("\n".join(statements[index : index + size]) + "\n", encoding="utf-8")
        paths.append(path)
    return paths


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="/tmp/upk-sahel-sql")
    parser.add_argument("--chunk", type=int, default=500)
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("*.sql"):
        old.unlink()

    geo = statements_geo()
    geo_paths = write_chunks(out_dir, "geo", geo, args.chunk)

    places = read(f"osm-sahel-{SNAPSHOT}.json")["places"]
    paths = write_chunks(out_dir, "places", [place_sql(place) for place in places], args.chunk)
    print(f"{len(geo)} instructions géo, {len(places)} lieux, {len(paths) + len(geo_paths)} fichiers SQL")
    print(f"Sortie : {out_dir}")


if __name__ == "__main__":
    main()
