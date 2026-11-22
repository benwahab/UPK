import { appRouter, type Context } from "@upk/api";
import { getAuth } from "./auth.server";
import { getCategoryRepository, getPlaceRepository } from "./repositories.server";

async function sessionUser(request: Request): Promise<Context["user"]> {
  try {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user) return null;
    return { id: session.user.id, roles: [], permissions: [] };
  } catch {
    return null;
  }
}

export async function createTrpcContext(request: Request): Promise<Context> {
  return {
    user: await sessionUser(request),
    places: getPlaceRepository(),
    categories: getCategoryRepository(),
  };
}

export function createTrpcCaller(context: Context) {
  return appRouter.createCaller(context);
}
