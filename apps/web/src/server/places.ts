import { createServerFn } from "@tanstack/react-start";
import type { Context } from "@upk/api";
import { getCategoryRepository, getPlaceRepository } from "../lib/repositories.server";
import { createTrpcCaller } from "../lib/trpc.server";

function publicContext(): Context {
  return {
    user: null,
    places: getPlaceRepository(),
    categories: getCategoryRepository(),
  };
}

export const searchPlaces = createServerFn({ method: "GET" })
  .validator((input: { q?: string; categorySlug?: string; limit?: number }) => input)
  .handler(({ data }) =>
    createTrpcCaller(publicContext()).search.places({ ...data, limit: data.limit ?? 20 }),
  );

export const listCategories = createServerFn({ method: "GET" })
  .validator((locale: "fr" | "en" | "ar") => locale)
  .handler(({ data }) => createTrpcCaller(publicContext()).categories.list({ locale: data }));

export const getPlace = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(({ data }) => createTrpcCaller(publicContext()).places.byId({ id: data }));
