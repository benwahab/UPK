#!/usr/bin/env python3
"""Read-only Overture Places coverage audit against UPK's existing OSM seed.
Requires: python -m pip install duckdb
Never connects to D1 and never writes to production.
"""
from __future__ import annotations
import argparse, json, math, re, unicodedata
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path

RELEASE = "2026-11-18.0"
DATASET = "s3://overturemaps-us-west-2/release/" + RELEASE + "/theme=places/type=place/*"
COUNTRIES = {
    "NE": ("Niger", (0.15, 11.69, 16.0, 23.53)),
    "ML": ("Mali", (-12.25, 10.15, 4.27, 25.0)),
    "BF": ("Burkina Faso", (-5.52, 9.39, 2.41, 15.08)),
}
R = 6_371_000
CELL = 0.001
UPK_CATEGORY_MAP = {
    "pharmacie": {"pharmacy"},
    "sante": {"hospital", "clinic", "doctor", "dentist", "health_care", "healthcare", "medical_center", "medical_clinic"},
    "restaurant": {"restaurant", "fast_food_restaurant", "cafe", "bar", "food_court"},
    "hotel": {"hotel", "lodging", "motel", "hostel", "guest_house", "resort"},
    "banque": {"bank", "financial_institution"},
    "distributeur": {"atm"},
    "station-service": {"gas_station", "fuel_station"},
    "garage": {"auto_repair", "car_repair", "car_wash", "auto_parts_store", "vehicle_inspection"},
    "ecole": {"school", "private_school", "elementary_school", "middle_school", "high_school", "preschool", "college_university", "education"},
    "marche": {"market", "shopping_mall", "marketplace"},
    "administration": {"government_office", "embassy", "police_station", "fire_station", "courthouse", "post_office", "public_service"},
    "commerce": {"shopping", "grocery_store", "supermarket", "convenience_store", "clothing_store", "electronics_store", "mobile_phone_store", "bakery", "department_store", "hardware_store", "book_store", "store"},
    "transport": {"airport", "bus_station", "taxi_stand", "train_station", "port", "car_rental", "transportation"},
    "loisirs": {"historic_site", "national_park", "park", "museum", "arts_and_entertainment", "stadium_arena", "music_venue", "attraction", "tourist_attraction", "cinema", "zoo"},
    "services-professionnels": {"professional_service", "money_transfer_service", "travel_service", "real_estate_service", "building_or_construction_service", "social_or_community_service", "insurance_agency"},
    "lieu-culte": {"muslim_place_of_worship", "christian_place_of_worship", "mosque", "church", "place_of_worship", "religious_organization"},
}
VALID_UPK_CATEGORIES = set().union(*UPK_CATEGORY_MAP.values())

def norm(value):
    value = unicodedata.normalize("NFKD", str(value or "").casefold())
    value = "".join(c for c in value if not unicodedata.combining(c))
    return " ".join(re.findall(r"[^\W_]+", value, flags=re.UNICODE))

def distance(a, b, c, d):
    p1, p2 = math.radians(a), math.radians(c)
    dp, dl = math.radians(c-a), math.radians(d-b)
    h = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(min(1.0, h)))

def cell(lat, lon):
    return math.floor(lat/CELL), math.floor(lon/CELL)

def load_osm(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    result = {code: [] for code in COUNTRIES}
    for p in data.get("places", []):
        code = str(p.get("pays") or p.get("country_code") or "").upper()
        if code in result:
            result[code].append(p)
    return result

def normalize_phone(value):
    return re.sub(r"\\D", "", str(value or ""))

def normalize_site(value):
    value = str(value or "").strip().lower()
    value = re.sub(r"^https?://", "", value)
    value = re.sub(r"^www\\.", "", value)
    return value.split("/")[0].split("?")[0]

def make_index(places):
    index = defaultdict(list)
    for p in places:
        try:
            lat, lon = float(p["latitude"]), float(p["longitude"])
        except (KeyError, TypeError, ValueError):
            continue
        y, x = cell(lat, lon)
        index[(y, x)].append(p)
    return index

def duplicate(place, index):
    name = norm(place.get("name"))
    phone = normalize_phone(place.get("phone"))
    site = normalize_site(place.get("website"))
    try:
        lat, lon = float(place["latitude"]), float(place["longitude"])
    except (KeyError, TypeError, ValueError):
        return False
    y, x = cell(lat, lon)
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            for p in index.get((y+dy, x+dx), []):
                try:
                    other_lat, other_lon = float(p["latitude"]), float(p["longitude"])
                    metres = distance(lat, lon, other_lat, other_lon)
                except (KeyError, TypeError, ValueError):
                    continue
                if metres > 500:
                    continue
                other_name = norm(p.get("nom") or p.get("name"))
                if name and name == other_name and metres <= 100:
                    return True
                if phone and phone == normalize_phone(p.get("telephone") or p.get("telephone_normalise")):
                    return True
                if site and site == normalize_site(p.get("site_web")):
                    return True
                if name and other_name and min(len(name), len(other_name)) >= 7 and metres <= 100:
                    if SequenceMatcher(None, name, other_name).ratio() >= 0.92:
                        return True
    return False

def query_country(duckdb, code):
    name, (west, south, east, north) = COUNTRIES[code]
    con = duckdb.connect()
    con.execute("INSTALL spatial; LOAD spatial;")
    con.execute("INSTALL httpfs; LOAD httpfs;")
    con.execute("SET s3_region='us-west-2';")
    sql = f"""
      SELECT id, names.primary AS name, taxonomy.primary AS category,
             confidence, ST_Y(geometry) AS latitude, ST_X(geometry) AS longitude,
             addresses[1].locality AS locality, phones[1] AS phone,
             websites[1] AS website, operating_status
      FROM read_parquet('{DATASET}')
      WHERE bbox.xmin BETWEEN ? AND ? AND bbox.ymin BETWEEN ? AND ?
        AND list_contains(list_transform(addresses, lambda a: a.country), ?)
    """
    rows = con.execute(sql, [west, east, south, north, code]).fetchall()
    cols = [c[0] for c in con.description]
    con.close()
    return [dict(zip(cols, row)) for row in rows]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", default="seed/osm-sahel-2026-11-27.json")
    ap.add_argument("--out", default="overture-audit")
    args = ap.parse_args()
    try:
        import duckdb
    except ImportError:
        raise SystemExit("Install dependency: python -m pip install duckdb")

    osm = load_osm(args.seed)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    report = [
        "# Overture Maps coverage audit — UPK",
        "",
        f"- Overture release: {RELEASE}",
        "- Existing UPK reference: OSM seed dated 2026-11-27",
        "- Probable duplicate rule: exact/fuzzy normalized name within 100 m, or identical phone/site within 500 m",
        "- Overture records without an explicit ISO country in addresses are excluded",
        "- Unmatched records are candidates for review, not approved additions",
        "",
        "| Country | UPK OSM | Overture | Confidence ≥ 0.70 | Probable duplicates | Additional candidates | UPK-relevant candidates |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ]
    totals = {}
    for code, (country, _) in COUNTRIES.items():
        print("Querying " + country, flush=True)
        records = query_country(duckdb, code)
        index = make_index(osm[code])
        high = sum(float(p.get("confidence") or 0) >= 0.70 for p in records)
        duplicate_flags = [duplicate(p, index) for p in records]
        dup = sum(duplicate_flags)
        candidates = [
            p for p, is_duplicate in zip(records, duplicate_flags)
            if float(p.get("confidence") or 0) >= 0.70
            and p.get("name") and not is_duplicate
        ]
        relevant = [p for p in candidates if p.get("category") in VALID_UPK_CATEGORIES]
        totals[code] = {
            "country": country,
            "upk_osm_places": len(osm[code]),
            "overture_places": len(records),
            "confidence_ge_070": high,
            "probable_duplicates_name_phone_or_website": dup,
            "additional_candidates_ge_070": len(candidates),
            "upk_relevant_candidates": len(relevant),
            "candidate_sample": relevant[:100],
        }
        report.append(
            f"| {country} | {len(osm[code]):,} | {len(records):,} | "
            f"{high:,} | {dup:,} | {len(candidates):,} | {len(relevant):,} |"
        )
        (out / f"candidates-{code}.json").write_text(
            json.dumps(candidates, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        (out / f"candidates-upk-{code}.json").write_text(
            json.dumps(relevant, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    report += [
        "",
        "## Limits",
        "",
        "- Different spellings, transliterations and nearby branches may evade this first-pass match.",
        "- Categories outside UPK's 16 current categories are excluded from the UPK-relevant count; category mapping still needs review. Closed places and Overture-internal duplicates require a second quality pass.",
        "- Candidates must be reviewed before import; this audit does not modify D1, R2 or the Worker.",
    ]
    (out / "report.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    (out / "report.json").write_text(
        json.dumps({"release": RELEASE, "countries": totals}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print("\n".join(report), flush=True)

if __name__ == "__main__":
    main()
