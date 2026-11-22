import { createD1CategoryRepository, createD1PlaceRepository } from "@upk/api";
import { createDb } from "@upk/db";
import { env } from "cloudflare:workers";

let database: ReturnType<typeof createDb> | undefined;
let places: ReturnType<typeof createD1PlaceRepository> | undefined;
let categories: ReturnType<typeof createD1CategoryRepository> | undefined;

function getDb() {
  if (!database) database = createDb(env.DB);
  return database;
}

export function getPlaceRepository() {
  if (!places) places = createD1PlaceRepository(getDb());
  return places;
}

export function getCategoryRepository() {
  if (!categories) categories = createD1CategoryRepository(getDb());
  return categories;
}
