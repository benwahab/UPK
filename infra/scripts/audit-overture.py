#!/usr/bin/env python3
"""Audit reproductible des candidats Overture Maps pour UPK.

Entrées :
- UPK-revue-candidats-Overture_2.csv (vue de travail)
- upk-overture-candidats-a-verifier_2.csv (vue brute)
- seed/osm-sahel-2026-11-27.json (catalogue OSM déjà intégré)
- seed/geonames-sahel-2026-11-27.json (villes et quartiers)

Sorties dans docs/overture/ :
- candidates-classified.csv : une ligne par candidat, décision explicite
- validated-new.csv, enrichments-osm.csv, duplicates-osm.csv
- duplicates-overture.csv, rejected.csv, needs-review.csv
- summary.json

Le script ne modifie aucune base et ne déploie rien.
"""

from __future__ import annotations

import argparse
import collections
import csv
import hashlib
import json
import math
import re
import unicodedata
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT = "2026-11-18.0"
ARABIC_DIACRITICS = re.compile(r"[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]")
ADMIN_RE = re.compile(
    r"(?i)\b(d[ée]partement|department|cercle|province|r[ée]gion|region|commune|"
    r"gouvernorat|prefecture|pr[ée]fecture|sous-pr[ée]fecture|arrondissement)\b"
)
NATURAL_RE = re.compile(
    r"(?i)\b(river|fleuve|lac|mare|barrage|mont|plateau|erg|falaise|for[êe]t|"
    r"sanctuary|vattendrag|klint|periodiskt|hydroelectric)\b"
    r"|\(Mali\)|\(Burkina Faso\)"
)
FOREIGN_RE = re.compile(
    r"(?i)\b(bacolod|nijmegen|kuantan|singingi|vidyalaya|inter college|"
    r"baghpat|provincia|italia|italy|sweden|sverige)\b|[\u4e00-\u9fff]"
)
GENERIC_SITE_DOMAINS = {
    "find.shell.com",
    "totalenergies.ml",
    "bf.totalenergies.com",
    "totalenergies.com",
    "moneygram.com",
    "westernunion.com",
}
GENERIC_DOMAINS = {
    "facebook.com",
    "instagram.com",
    "tiktok.com",
    "maps.app.goo.gl",
    "wa.me",
    "wikipedia.org",
    "en.wikipedia.org",
    "fr.wikipedia.org",
    "ar.wikipedia.org",
    "id.wikipedia.org",
    "pl.wikipedia.org",
    "fa.wikipedia.org",
    "es.wikipedia.org",
    "it.wikipedia.org",
}

CATEGORY_MAP = {
    "gas_station": "station-service",
    "money_transfer_service": "banque",
    "bank": "banque",
    "hotel": "hotel",
    "lodging": "hotel",
    "hostel": "hotel",
    "resort": "hotel",
    "college_university": "ecole",
    "school": "ecole",
    "high_school": "ecole",
    "elementary_school": "ecole",
    "preschool": "ecole",
    "private_school": "ecole",
    "education": "ecole",
    "middle_school": "ecole",
    "restaurant": "restaurant",
    "bar": "restaurant",
    "cafe": "restaurant",
    "fast_food_restaurant": "restaurant",
    "bakery": "restaurant",
    "hospital": "sante",
    "health_care": "sante",
    "pharmacy": "pharmacie",
    "christian_place_of_worship": "lieu-culte",
    "muslim_place_of_worship": "lieu-culte",
    "religious_organization": "lieu-culte",
    "government_office": "administration",
    "embassy": "administration",
    "police_station": "administration",
    "shopping": "commerce",
    "clothing_store": "commerce",
    "mobile_phone_store": "commerce",
    "electronics_store": "commerce",
    "grocery_store": "commerce",
    "shopping_mall": "commerce",
    "convenience_store": "commerce",
    "department_store": "commerce",
    "auto_parts_store": "commerce",
    "real_estate_service": "services-professionnels",
    "professional_service": "services-professionnels",
    "insurance_agency": "services-professionnels",
    "travel_service": "services-professionnels",
    "social_or_community_service": "services-professionnels",
    "building_or_construction_service": "services-professionnels",
    "airport": "transport",
    "train_station": "transport",
    "car_wash": "garage",
}
OUT_OF_SCOPE = {
    "historic_site",
    "national_park",
    "park",
    "museum",
    "arts_and_entertainment",
    "stadium_arena",
    "music_venue",
}
PHONE_PREFIX = {"NE": "227", "ML": "223", "BF": "226"}
COUNTRY_BBOX = {
    "NE": (11.0, 24.0, 0.0, 16.5),
    "ML": (9.5, 25.5, -12.5, 4.5),
    "BF": (9.0, 15.5, -5.8, 2.6),
}


def normalize(value: str | None) -> str:
    value = value or ""
    if re.search(r"[\u0600-\u06ff]", value):
        value = ARABIC_DIACRITICS.sub("", value)
        value = re.sub(r"[\u0623\u0625\u0622\u0671]", "\u0627", value)
        value = value.replace("\u0649", "\u064a").replace("\u0629", "\u0647").replace("\u0640", "")
        return re.sub(r"\s+", " ", value).strip()
    value = unicodedata.normalize("NFD", value)
    value = "".join(char for char in value if unicodedata.category(char) != "Mn").lower()
    value = value.replace("’", "'").replace("'", " ")
    value = re.sub(r"[^a-z0-9\u0600-\u06ff]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def edit_distance(left: str, right: str) -> int:
    if left == right:
        return 0
    if not left:
        return len(right)
    if not right:
        return len(left)
    previous = list(range(len(right) + 1))
    for row, char_left in enumerate(left, 1):
        current = [row]
        for column, char_right in enumerate(right, 1):
            current.append(
                min(
                    previous[column] + 1,
                    current[column - 1] + 1,
                    previous[column - 1] + (char_left != char_right),
                )
            )
        previous = current
    return previous[-1]


def fuzzy_match(query: str, candidate: str) -> bool:
    query = normalize(query)
    candidate = normalize(candidate)
    if not query or not candidate:
        return False
    if query == candidate or query in candidate:
        return True
    query_tokens = query.split()
    candidate_tokens = candidate.split()
    return all(
        any(
            token.startswith(other)
            or other.startswith(token)
            or edit_distance(token, other) <= (2 if len(token) >= 7 else 1 if len(token) >= 4 else 0)
            for other in candidate_tokens
        )
        for token in query_tokens
    )


def haversine_m(left: tuple[float, float], right: tuple[float, float]) -> float:
    lat1, lon1 = left
    lat2, lon2 = right
    radius = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    h = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(h))


def normalize_phone(value: str | None, country: str) -> str | None:
    country = PHONE_PREFIX.get(country, country)
    digits = re.sub(r"\D", "", str(value or "").split(".")[0])
    if not digits:
        return None
    if len(digits) == 8:
        return f"+{country}{digits}"
    if digits.startswith("0") and len(digits) == 9:
        return f"+{country}{digits[1:]}"
    if digits.startswith(country) and len(digits) == len(country) + 8:
        return f"+{digits}"
    if len(digits) >= len(country) + 8:
        return f"+{country}{digits[-8:]}"
    return None


def normalize_domain(value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip().lower()
    value = re.sub(r"^https?://", "", value)
    value = value.split("/")[0].split("?")[0].split("#")[0].removeprefix("www.")
    return value or None


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, Any]], fields: list[str]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def candidate_id(row: dict[str, str], index: int) -> str:
    payload = "|".join(
        [
            row.get("nom", ""),
            row.get("categorie", ""),
            row.get("latitude", ""),
            row.get("longitude", ""),
            row.get("telephone", ""),
            row.get("site_web", ""),
            str(index),
        ]
    )
    return f"overture_{hashlib.sha1(payload.encode()).hexdigest()[:16]}"


def category_for(row: dict[str, str]) -> str | None:
    return CATEGORY_MAP.get(row.get("categorie", ""))


def city_index(geo: dict[str, Any]) -> tuple[dict[str, list[dict[str, Any]]], list[tuple[dict[str, Any], float, float]]]:
    by_name: dict[str, list[dict[str, Any]]] = collections.defaultdict(list)
    points: list[tuple[dict[str, Any], float, float]] = []
    for city in geo["villes"]:
        if city.get("latitude") is None or city.get("longitude") is None:
            continue
        by_name[normalize(city.get("nom"))].append(city)
        if city.get("nom_normalise"):
            by_name[normalize(city["nom_normalise"])].append(city)
        if city.get("type") == "ville" and (city.get("population") or 0) > 0:
            points.append((city, float(city["latitude"]), float(city["longitude"])))
    return by_name, points


def nearest_city(points: list[tuple[dict[str, Any], float, float]], point: tuple[float, float]) -> tuple[float, dict[str, Any]]:
    major = [
        (haversine_m(point, (lat, lon)), city)
        for city, lat, lon in points
        if (city.get("population") or 0) >= 200_000
    ]
    if major:
        distance, city = min(major, key=lambda item: item[0])
        if distance <= 50_000:
            return distance, city
    return min(
        ((haversine_m(point, (lat, lon)), city) for city, lat, lon in points),
        key=lambda item: item[0],
    )


def resolve_locality(
    row: dict[str, str],
    by_name: dict[str, list[dict[str, Any]]],
    points: list[tuple[dict[str, Any], float, float]],
) -> tuple[dict[str, Any] | None, float | None, str]:
    point = (float(row["latitude"]), float(row["longitude"]))
    locality = row.get("localite", "").strip()
    if locality:
        candidates = by_name.get(normalize(locality), [])
        if not candidates:
            locality_norm = normalize(locality)
            for key, values in by_name.items():
                if key and (locality_norm.startswith(key) or key.startswith(locality_norm)):
                    candidates.extend(values)
        if candidates:
            city = min(candidates, key=lambda item: haversine_m(point, (float(item["latitude"]), float(item["longitude"]))))
            return city, haversine_m(point, (float(city["latitude"]), float(city["longitude"]))), "localite_exacte"
        distance, city = nearest_city(points, point)
        return city, distance, "localite_introuvable_ville_la_plus_proche"
    distance, city = nearest_city(points, point)
    return city, distance, "localite_absente_ville_la_plus_proche"


def category_compatible(row: dict[str, str], osm_place: dict[str, Any]) -> bool:
    return category_for(row) == osm_place.get("categorie_slug")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--review-csv", default=str(ROOT / "UPK-revue-candidats-Overture_2.csv"))
    parser.add_argument("--raw-csv", default=str(ROOT / "upk-overture-candidats-a-verifier_2.csv"))
    parser.add_argument("--osm", default=str(ROOT / "seed/osm-sahel-2026-11-27.json"))
    parser.add_argument("--geo", default=str(ROOT / "seed/geonames-sahel-2026-11-27.json"))
    parser.add_argument("--verification", default=str(ROOT / "docs" / "overture" / "verification-web.csv"))
    parser.add_argument("--out", default=str(ROOT / "docs" / "overture"))
    args = parser.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    rows = read_csv(Path(args.review_csv))
    raw_rows = read_csv(Path(args.raw_csv))
    if len(rows) != len(raw_rows):
        raise SystemExit(f"CSV incohérents : {len(rows)} revue / {len(raw_rows)} brut")

    osm = json.loads(Path(args.osm).read_text(encoding="utf-8"))["places"]
    geo = json.loads(Path(args.geo).read_text(encoding="utf-8"))
    by_city, city_points = city_index(geo)
    osm_names = {normalize(place["nom"]) for place in osm}
    verification: dict[str, dict[str, str]] = {}
    verification_path = Path(args.verification)
    if verification_path.exists():
        verification = {
            item["candidat_id"]: item for item in read_csv(verification_path)
        }

    osm_grid: dict[tuple[int, int], list[dict[str, Any]]] = collections.defaultdict(list)
    for place in osm:
        lat, lon = float(place["latitude"]), float(place["longitude"])
        osm_grid[(math.floor(lat * 100), math.floor(lon * 100))].append(place)

    candidate_grid: dict[tuple[int, int], list[int]] = collections.defaultdict(list)
    for index, row in enumerate(rows):
        lat, lon = float(row["latitude"]), float(row["longitude"])
        candidate_grid[(math.floor(lat * 100), math.floor(lon * 100))].append(index)

    def nearby_osm(lat: float, lon: float, radius: float) -> list[tuple[float, dict[str, Any]]]:
        found: list[tuple[float, dict[str, Any]]] = []
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for place in osm_grid.get((math.floor(lat * 100) + dx, math.floor(lon * 100) + dy), []):
                    distance = haversine_m((lat, lon), (float(place["latitude"]), float(place["longitude"])))
                    if distance <= radius:
                        found.append((distance, place))
        return sorted(found, key=lambda item: item[0])

    def osm_matches(row: dict[str, str]) -> list[dict[str, Any]]:
        lat, lon = float(row["latitude"]), float(row["longitude"])
        country = row["code_pays"]
        name = normalize(row["nom"])
        phone = normalize_phone(row["telephone"], country)
        domain = normalize_domain(row["site_web"])
        matches: list[dict[str, Any]] = []
        for distance, place in nearby_osm(lat, lon, 500):
            reasons: list[str] = []
            place_name = normalize(place["nom"])
            compatible = category_compatible(row, place)
            same_name = bool(name and place_name and fuzzy_match(name, place_name))
            if name and name == place_name and distance <= 100:
                reasons.append("nom_exact_100m")
            if phone and place.get("telephone_normalise") and normalize_phone(place["telephone_normalise"], country) == phone:
                reasons.append("telephone_500m")
            if domain and normalize_domain(place.get("site_web")) == domain:
                reasons.append("site_500m")
            if compatible and distance <= 150 and same_name:
                reasons.append("nom_proche_150m_categorie_compatible")
            if reasons:
                strong = (
                    "nom_exact_100m" in reasons
                    or "nom_proche_150m_categorie_compatible" in reasons
                    or (same_name and ("telephone_500m" in reasons or "site_500m" in reasons))
                    or (
                        compatible
                        and "telephone_500m" in reasons
                        and "site_500m" in reasons
                    )
                )
                matches.append(
                    {
                        "distance_m": round(distance, 1),
                        "osm_id": place.get("id"),
                        "osm_nom": place.get("nom"),
                        "osm_categorie": place.get("categorie_slug"),
                        "osm_telephone": place.get("telephone"),
                        "osm_site_web": place.get("site_web"),
                        "raisons": "+".join(reasons),
                        "fort": strong,
                    }
                )
        return sorted(matches, key=lambda item: (not item["fort"], item["distance_m"]))

    def overture_matches(index: int, row: dict[str, str]) -> list[dict[str, Any]]:
        lat, lon = float(row["latitude"]), float(row["longitude"])
        name = normalize(row["nom"])
        phone = normalize_phone(row["telephone"], row["code_pays"])
        domain = normalize_domain(row["site_web"])
        matches: list[dict[str, Any]] = []
        for other_index in candidate_grid.get((math.floor(lat * 100), math.floor(lon * 100)), []):
            if other_index == index:
                continue
            other = rows[other_index]
            distance = haversine_m(
                (lat, lon),
                (float(other["latitude"]), float(other["longitude"])),
            )
            if distance > 100:
                continue
            other_name = normalize(other["nom"])
            other_phone = normalize_phone(other["telephone"], other["code_pays"])
            other_domain = normalize_domain(other["site_web"])
            reasons: list[str] = []
            same_name = bool(name and other_name and fuzzy_match(name, other_name))
            if name and name == other_name:
                reasons.append("nom_exact_100m")
            if phone and other_phone and phone == other_phone:
                reasons.append("telephone_100m")
            if domain and other_domain and domain == other_domain and domain not in GENERIC_DOMAINS:
                reasons.append("site_100m")
            if same_name and distance <= 50 and category_for(row) == category_for(other):
                reasons.append("nom_proche_50m_categorie_compatible")
            if reasons:
                strong = (
                    "nom_exact_100m" in reasons
                    or "nom_proche_50m_categorie_compatible" in reasons
                    or (same_name and ("telephone_100m" in reasons or "site_100m" in reasons))
                )
                matches.append(
                    {
                        "distance_m": round(distance, 1),
                        "candidat_id": candidate_id(other, other_index),
                        "candidat_nom": other["nom"],
                        "raisons": "+".join(reasons),
                        "fort": strong,
                    }
                )
        return sorted(matches, key=lambda item: (not item["fort"], item["distance_m"]))

    phone_counts = collections.Counter(
        normalize_phone(row["telephone"], row["code_pays"]) for row in rows if row.get("telephone")
    )
    domain_counts = collections.Counter(
        normalize_domain(row["site_web"]) for row in rows if row.get("site_web")
    )

    records: list[dict[str, Any]] = []
    for index, row in enumerate(rows):
        lat, lon = float(row["latitude"]), float(row["longitude"])
        country = row["code_pays"]
        name = normalize(row["nom"])
        category = category_for(row)
        city, locality_distance, locality_source = resolve_locality(row, by_city, city_points)
        city_distance = locality_distance
        if locality_source == "localite_exacte" and locality_distance is not None and locality_distance > 10_000:
            city_distance, city = nearest_city(city_points, (lat, lon))
            locality_source = "localite_exacte_eloignee_ville_la_plus_proche"
        bbox = COUNTRY_BBOX.get(country)
        inside_country = bool(bbox and bbox[0] <= lat <= bbox[1] and bbox[2] <= lon <= bbox[3])
        matches_osm = osm_matches(row)
        matches_overture = overture_matches(index, row)

        flags: list[str] = []
        if not category:
            flags.append("categorie_non_mappee")
        if row.get("categorie") in OUT_OF_SCOPE:
            flags.append("categorie_hors_perimetre")
        if ADMIN_RE.search(row["nom"]):
            flags.append("nom_administratif")
        if NATURAL_RE.search(row["nom"]):
            flags.append("nom_naturel")
        if FOREIGN_RE.search(row["nom"]):
            flags.append("nom_etranger")
        if not inside_country:
            flags.append("coordonnees_hors_pays")
        if (
            locality_distance is not None
            and locality_distance > 150_000
            and locality_source.startswith("localite_exacte")
        ):
            flags.append("localite_incoherente")
        if row.get("points_a_verifier") and (
            "incohérent" in row["points_a_verifier"] or "écriture" in row["points_a_verifier"]
        ):
            flags.append("anomalie_contact")

        osm_name_elsewhere = name in osm_names
        if osm_name_elsewhere:
            flags.append("nom_exact_existe_osm_ailleurs")

        best_osm = matches_osm[0] if matches_osm else None
        best_overture = matches_overture[0] if matches_overture else None
        strong_osm = next((match for match in matches_osm if match["fort"]), None)
        strong_overture = next((match for match in matches_overture if match["fort"]), None)

        enrichment_fields: list[str] = []
        if strong_osm:
            candidate_phone = normalize_phone(row["telephone"], country)
            candidate_domain = normalize_domain(row["site_web"])
            if (
                row.get("telephone")
                and not strong_osm.get("osm_telephone")
                and candidate_phone
                and phone_counts[candidate_phone] == 1
            ):
                enrichment_fields.append("telephone")
            if (
                row.get("site_web")
                and not strong_osm.get("osm_site_web")
                and candidate_domain
                and candidate_domain not in GENERIC_DOMAINS
                and candidate_domain not in GENERIC_SITE_DOMAINS
                and domain_counts[candidate_domain] == 1
            ):
                enrichment_fields.append("site_web")

        if row.get("statut", "").strip().lower() in {"closed", "fermé", "ferme"}:
            decision = "CLOSED"
            justification = "Overture indique une fermeture ; à confirmer avant toute suppression."
        elif "categorie_hors_perimetre" in flags:
            decision = "NOT_RELEVANT"
            justification = f"Catégorie Overture hors périmètre UPK ({row['categorie']})."
        elif "categorie_non_mappee" in flags:
            decision = "NOT_RELEVANT"
            justification = f"Catégorie Overture non prise en charge par UPK ({row['categorie']})."
        elif "coordonnees_hors_pays" in flags:
            decision = "INVALID_LOCATION"
            justification = f"Coordonnées hors de l'emprise {country}."
        elif "localite_incoherente" in flags:
            decision = "INVALID_LOCATION"
            justification = (
                f"Localité « {row['localite']} » à {round((locality_distance or 0) / 1000)} km "
                "des coordonnées ; localisation incohérente."
            )
        elif strong_overture:
            decision = "DUPLICATE_OVERTURE"
            justification = (
                f"Doublon interne Overture de {strong_overture['candidat_nom']} "
                f"({strong_overture['raisons']}, {strong_overture['distance_m']} m)."
            )
        elif strong_osm:
            if enrichment_fields:
                decision = "VALIDATED_ENRICHMENT"
                justification = (
                    f"Correspondance OSM {strong_osm['osm_id']} ({strong_osm['osm_nom']}, "
                    f"{strong_osm['distance_m']} m, {strong_osm['raisons']}) ; "
                    f"Overture apporte : {', '.join(enrichment_fields)}."
                )
            else:
                decision = "DUPLICATE_OSM"
                justification = (
                    f"Correspondance OSM {strong_osm['osm_id']} ({strong_osm['osm_nom']}, "
                    f"{strong_osm['distance_m']} m, {strong_osm['raisons']})."
                )
        elif "nom_administratif" in flags:
            decision = "NOT_RELEVANT"
            justification = "Nom de division administrative, pas un établissement du guide."
        elif "nom_naturel" in flags:
            decision = "NOT_RELEVANT"
            justification = "Élément naturel (cours d'eau, relief, réserve), pas un établissement."
        elif "nom_etranger" in flags and row.get("categorie") == "embassy":
            decision = "NEEDS_REVIEW"
            justification = "Ambassade réelle au nom étranger ; vérifier l'adresse et la pertinence avant import."
        elif "nom_etranger" in flags:
            decision = "REJECTED"
            justification = "Nom étranger incompatible avec la localité sahélienne ; candidat écarté."
        elif "anomalie_contact" in flags:
            decision = "NEEDS_REVIEW"
            justification = "Indicatif téléphonique ou écriture incohérent ; vérification humaine requise."
        elif best_osm and not strong_osm:
            decision = "NEEDS_REVIEW"
            justification = (
                f"Correspondance OSM partielle avec {best_osm['osm_nom']} "
                f"({best_osm['distance_m']} m, {best_osm['raisons']}) ; "
                "nom ou catégorie non concordants, pas de fusion automatique."
            )
        elif best_overture and not strong_overture:
            decision = "NEEDS_REVIEW"
            justification = (
                f"Voisin Overture {best_overture['candidat_nom']} à {best_overture['distance_m']} m ; "
                "pas de preuve de doublon."
            )
        else:
            decision = "NEEDS_REVIEW"
            justification = "Aucune correspondance OSM forte ; existence et localisation à confirmer."

        web_check = verification.get(candidate_id(row, index))
        if (
            web_check
            and web_check.get("resultat") == "confirme"
            and decision == "NEEDS_REVIEW"
            and not strong_osm
            and not strong_overture
            and category
            and not osm_name_elsewhere
            and (
                not flags
                or (flags == ["nom_etranger"] and row.get("categorie") == "embassy")
            )
        ):
            decision = "VALIDATED_NEW"
            justification = (
                "Existence confirmée par une page officielle accessible : "
                f"{web_check.get('url_finale') or web_check.get('site_web')} "
                f"({web_check.get('titre_page', '')}). Aucune correspondance OSM "
                "forte à moins de 500 m."
            )
        elif (
            web_check
            and web_check.get("resultat") == "rejete"
            and decision == "NEEDS_REVIEW"
        ):
            decision = "REJECTED"
            justification = f"Contrôle web négatif : {web_check.get('motif', 'source non concluante')}."

        if decision in {"VALIDATED_NEW", "VALIDATED_ENRICHMENT"}:
            review_level = "source_overture_a_confirmer" if decision == "VALIDATED_ENRICHMENT" else "verification_web"
        elif decision == "DUPLICATE_OSM":
            review_level = "dedoublonnage_osm"
        elif decision == "DUPLICATE_OVERTURE":
            review_level = "dedoublonnage_overture"
        else:
            review_level = "revue_humaine"

        records.append(
            {
                "candidat_id": candidate_id(row, index),
                "pays": row["pays"],
                "code_pays": country,
                "nom": row["nom"],
                "nom_normalise": name,
                "categorie_overture": row["categorie"],
                "categorie_upk": category or "",
                "confiance": row["confiance"],
                "localite": row["localite"],
                "region_id": city.get("region_id") if city else "",
                "departement_id": city.get("departement_id") if city else "",
                "commune_id": city.get("commune_id") if city else "",
                "ville_zone_id": city.get("id") if city else "",
                "ville": city.get("nom") if city else "",
                "distance_localite_km": round(locality_distance / 1000, 1) if locality_distance is not None else "",
                "distance_ville_km": round(city_distance / 1000, 1) if city_distance is not None else "",
                "localite_source": locality_source,
                "telephone": row["telephone"],
                "telephone_normalise": normalize_phone(row["telephone"], country) or "",
                "site_web": row["site_web"],
                "latitude": row["latitude"],
                "longitude": row["longitude"],
                "statut_overture": row["statut"],
                "decision": decision,
                "justification": justification,
                "drapeaux": "+".join(flags),
                "osm_match_id": best_osm["osm_id"] if best_osm else "",
                "osm_match_nom": best_osm["osm_nom"] if best_osm else "",
                "osm_match_distance_m": best_osm["distance_m"] if best_osm else "",
                "osm_match_raisons": best_osm["raisons"] if best_osm else "",
                "osm_match_fort": "oui" if strong_osm else "non",
                "doublon_overture_id": strong_overture["candidat_id"] if strong_overture else "",
                "doublon_overture_nom": strong_overture["candidat_nom"] if strong_overture else "",
                "champs_enrichis": ",".join(enrichment_fields),
                "source": "overture",
                "source_version": SNAPSHOT,
                "source_url": "https://overturemaps.org/",
                "licence_source": "CDLA-Permissive-2.0 / ODbL selon la source Overture",
                "review_level": review_level,
                "nom_exact_existe_osm_ailleurs": "oui" if osm_name_elsewhere else "non",
                "verification_externe": (
                    (web_check.get("url_finale") or web_check.get("site_web") or "")
                    if web_check and web_check.get("resultat") == "confirme"
                    else ""
                ),
                "date_audit": "2026-11-21",
            }
        )

    fields = list(records[0].keys())
    write_csv(out / "candidates-classified.csv", records, fields)

    buckets = {
        "validated-new": "VALIDATED_NEW",
        "enrichments-osm": "VALIDATED_ENRICHMENT",
        "duplicates-osm": "DUPLICATE_OSM",
        "duplicates-overture": "DUPLICATE_OVERTURE",
        "invalid-location": "INVALID_LOCATION",
        "invalid-category": "INVALID_CATEGORY",
        "closed": "CLOSED",
        "not-relevant": "NOT_RELEVANT",
        "rejected": "REJECTED",
        "needs-review": "NEEDS_REVIEW",
    }
    for filename, decision in buckets.items():
        write_csv(out / f"{filename}.csv", [record for record in records if record["decision"] == decision], fields)

    counts = collections.Counter(record["decision"] for record in records)
    flags = collections.Counter(
        flag for record in records for flag in record["drapeaux"].split("+") if flag
    )
    summary = {
        "snapshot": SNAPSHOT,
        "date_audit": "2026-11-21",
        "source_rows": len(rows),
        "raw_rows": len(raw_rows),
        "decisions": dict(sorted(counts.items())),
        "flags": dict(sorted(flags.items())),
        "osm_candidates": len(osm),
        "osm_strong_matches": sum(1 for record in records if record["osm_match_fort"] == "oui"),
        "overture_strong_matches": sum(1 for record in records if record["doublon_overture_id"]),
        "web_verified_new": sum(1 for record in records if record["decision"] == "VALIDATED_NEW"),
        "osm_exact_name_elsewhere": sum(
            1 for record in records if record["nom_exact_existe_osm_ailleurs"] == "oui"
        ),
        "notes": [
            "Les scores Overture ne valident pas une existence.",
            "Aucun candidat n'est importé par ce script.",
            "Les correspondances faibles restent NEEDS_REVIEW.",
        ],
    }
    (out / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
