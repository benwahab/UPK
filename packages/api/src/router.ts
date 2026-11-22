import { TRPCError } from "@trpc/server";
import {
  contributionInputSchema,
  localeSchema,
  moderationApproveSchema,
  moderationRejectSchema,
  placeIdSchema,
  reportInputSchema,
  reportResolveSchema,
  searchInputSchema,
} from "@upk/domain";
import { z } from "zod";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./trpc";

const CONTRIBUTION_RATE = { limit: 5, windowSeconds: 3600 };
const REPORT_RATE = { limit: 10, windowSeconds: 3600 };

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
  contributions: router({
    create: publicProcedure
      .input(contributionInputSchema)
      .mutation(async ({ ctx, input }) => {
        const rate = await ctx.rateLimits.consume(
          "contribution",
          ctx.client.ipHash,
          CONTRIBUTION_RATE.limit,
          CONTRIBUTION_RATE.windowSeconds,
        );
        if (!rate.allowed) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Trop de propositions. Réessayez plus tard.",
          });
        }
        if (!(await ctx.turnstile.verify(input.turnstileToken, ctx.client.ip))) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Vérification anti-abus échouée.",
          });
        }
        const data = { ...input };
        delete data.turnstileToken;
        const result = await ctx.contributions.create(data, {
          userId: ctx.user?.id ?? null,
          contactEmail: data.contactEmail,
          gpsPrecisionM: data.gpsPrecisionM,
        });
        await ctx.audit.append({
          actorId: ctx.user?.id ?? null,
          actorRole: ctx.user ? "user" : "anonyme",
          action: "contribution.create",
          section: "contribution",
          targetType: "place",
          targetId: result.id,
          result: "en_attente",
        });
        return result;
      }),
  }),
  reports: router({
    create: publicProcedure
      .input(reportInputSchema)
      .mutation(async ({ ctx, input }) => {
        const rate = await ctx.rateLimits.consume(
          "report",
          ctx.client.ipHash,
          REPORT_RATE.limit,
          REPORT_RATE.windowSeconds,
        );
        if (!rate.allowed) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Trop de signalements. Réessayez plus tard.",
          });
        }
        if (!(await ctx.turnstile.verify(input.turnstileToken, ctx.client.ip))) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Vérification anti-abus échouée.",
          });
        }
        const place = await ctx.places.byId(input.placeId);
        if (!place) throw new TRPCError({ code: "NOT_FOUND" });
        const data = { ...input };
        delete data.turnstileToken;
        const result = await ctx.reports.create(data, {
          userId: ctx.user?.id ?? null,
          email: data.email,
        });
        await ctx.audit.append({
          actorId: ctx.user?.id ?? null,
          actorRole: ctx.user ? "user" : "anonyme",
          action: "report.create",
          section: "report",
          targetType: "place",
          targetId: data.placeId,
          result: result.id,
        });
        return result;
      }),
  }),
  moderation: router({
    me: protectedProcedure.query(({ ctx }) => ({
      isAdmin: ctx.user.permissions.includes("moderation:write"),
    })),
    pending: adminProcedure.query(({ ctx }) => ctx.moderation.listPending()),
    reports: adminProcedure.query(({ ctx }) => ctx.moderation.listReports()),
    approve: adminProcedure
      .input(moderationApproveSchema)
      .mutation(async ({ ctx, input }) => {
        const place = await ctx.moderation.findPending(input.id);
        if (!place) throw new TRPCError({ code: "NOT_FOUND" });
        if (
          place.gpsPrecisionM !== null &&
          place.gpsPrecisionM > 20 &&
          !input.forceGps
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Position GPS imprécise (> 20 m) : confirmez explicitement.",
          });
        }
        await ctx.moderation.approve(input.id, ctx.user.id);
        await ctx.audit.append({
          actorId: ctx.user.id,
          actorRole: "admin",
          action: "contribution.approve",
          section: "moderation",
          targetType: "place",
          targetId: input.id,
          result: "valide",
          after: { forceGps: input.forceGps },
        });
        return { ok: true };
      }),
    reject: adminProcedure
      .input(moderationRejectSchema)
      .mutation(async ({ ctx, input }) => {
        const place = await ctx.moderation.findPending(input.id);
        if (!place) throw new TRPCError({ code: "NOT_FOUND" });
        await ctx.moderation.reject(input.id, ctx.user.id, input.motif);
        await ctx.audit.append({
          actorId: ctx.user.id,
          actorRole: "admin",
          action: "contribution.reject",
          section: "moderation",
          targetType: "place",
          targetId: input.id,
          result: "refuse",
          after: { motif: input.motif },
        });
        return { ok: true };
      }),
    resolveReport: adminProcedure
      .input(reportResolveSchema)
      .mutation(async ({ ctx, input }) => {
        await ctx.moderation.resolveReport(
          input.id,
          input.statut,
          input.motif ?? null,
          ctx.user.id,
        );
        await ctx.audit.append({
          actorId: ctx.user.id,
          actorRole: "admin",
          action: "report.resolve",
          section: "moderation",
          targetType: "signalement",
          targetId: input.id,
          result: input.statut,
          after: { motif: input.motif ?? null },
        });
        return { ok: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
