import { TRPCError, initTRPC } from "@trpc/server";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (ctx.user.roles.includes("pending")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Votre compte est en attente de vérification et d'activation.",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export function requirePermission(permission: string) {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
    if (!ctx.user.permissions.includes(permission)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Permission requise : ${permission}`,
      });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

export const adminProcedure = protectedProcedure.use(requirePermission("moderation:write"));
