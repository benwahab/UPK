import { readFileSync } from "node:fs";
import { normalizePhone, normalizeSearch } from "../../packages/domain/src/normalize.ts";

type SeedPlace = {
  nom: string;
  categorie_slug: string;
  adresse: string | null;
  quartier: string | null;
  latitude: number;
  longitude: number;
  telephone: string | null;
  site_web: string | null;
  osm_id: string;
  osm_type: string;
  licence_source: string;
};

type SeedFile = { snapshot: string; places: SeedPlace[] };

const url = new URL("../../seed/niamey-2026-08-30.json", import.meta.url);
const data = JSON.parse(readFileSync(url, "utf8")) as SeedFile;
const now = new Date(`${data.snapshot}T00:00:00Z`).toISOString();

function sql(value: string | number | null): string {
  if (value === null) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${value.replace(/'/g, "''")}'`;
}

const categories = [...new Set(data.places.map((place) => place.categorie_slug))].sort();
const lines: string[] = [
  "-- Généré depuis seed/niamey-2026-08-30.json (OpenStreetMap, ODbL-1.0)",
  "PRAGMA foreign_keys = ON;",
  "BEGIN;",
];

for (const slug of categories) {
  const nom = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
  lines.push(
    `INSERT INTO categories (id, nom, slug, ordre, created_at) VALUES ('cat_${slug}', ${sql(nom)}, ${sql(slug)}, 0, ${sql(now)}) ON CONFLICT(slug) DO NOTHING;`,
  );
}

for (const place of data.places) {
  const id = `osm_${place.osm_type}_${place.osm_id}`;
  const phone = place.telephone ? normalizePhone(place.telephone) : null;
  lines.push(
    `INSERT INTO places (id, nom, nom_normalise, category_id, adresse, quartier, latitude, longitude, telephone, telephone_normalise, site_web, statut_publication, statut_verification, source, osm_id, osm_type, licence_source, importe_le, langue, actif, created_at, updated_at) VALUES (${sql(id)}, ${sql(place.nom)}, ${sql(normalizeSearch(place.nom))}, 'cat_${place.categorie_slug}', ${sql(place.adresse)}, ${sql(place.quartier)}, ${place.latitude}, ${place.longitude}, ${sql(place.telephone)}, ${sql(phone)}, ${sql(place.site_web)}, 'valide', 'source_fiable', 'openstreetmap', ${sql(place.osm_id)}, ${sql(place.osm_type)}, ${sql(place.licence_source)}, ${sql(now)}, 'fr', 1, ${sql(now)}, ${sql(now)}) ON CONFLICT(id) DO NOTHING;`,
  );
}

lines.push("COMMIT;");
process.stdout.write(`${lines.join("\n")}\n`);
