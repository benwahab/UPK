import { localeSchema, placeIdSchema, searchInputSchema } from "@upk/domain";
import { z } from "zod";
import { publicProcedure, router } from "./trpc";

export const appRouter = router({
  search: router({
    places: publicProcedure
      .input(searchInputSchema)
      .query(({ ctx, input }) => ctx.places.search(input)),
  }),
  places: router({
    byId: publicProcedure
      .input(placeIdSchema)
      .query(({ ctx, input }) => ctx.places.byId(input.id)),
  }),
  categories: router({
    list: publicProcedure
      .input(z.object({ locale: localeSchema.default("fr") }))
      .query(({ ctx, input }) => ctx.categories.list(input.locale)),
  }),
});

export type AppRouter = typeof appRouter;
