import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { getAuth } from "../../lib/auth.server";

type ApplicationInput = {
  accountType?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  organizationName?: unknown;
  establishmentType?: unknown;
  city?: unknown;
  commune?: unknown;
  neighborhood?: unknown;
  interventionSector?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  gpsAccuracy?: unknown;
};

const clean = (value: unknown, max = 160) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export const Route = createFileRoute("/api/account-applications")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getAuth().api.getSession({ headers: request.headers });
        if (!session?.user) return json({ message: "Non connecté." }, 401);
        const admins = (env.ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase());
        if (admins.includes(session.user.email.toLowerCase())) return json({ isAdmin: true, status: "approved" });
        const application = await env.DB.prepare(
          "SELECT status FROM account_applications WHERE user_id = ? LIMIT 1",
        ).bind(session.user.id).first<{ status: string }>();
        return json({ isAdmin: false, status: application?.status ?? "not_submitted" });
      },
      POST: async ({ request }) => {
        const session = await getAuth().api.getSession({ headers: request.headers });
        if (!session?.user) return json({ message: "Connectez-vous pour envoyer votre demande." }, 401);
        const admins = (env.ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase());
        if (admins.includes(session.user.email.toLowerCase())) return json({ message: "Ce compte est déjà administrateur." }, 409);

        let body: ApplicationInput;
        try {
          body = (await request.json()) as ApplicationInput;
        } catch {
          return json({ message: "Données invalides." }, 400);
        }

        const accountType = body.accountType === "moderation" || body.accountType === "professional"
          ? body.accountType
          : null;
        const firstName = clean(body.firstName, 80);
        const lastName = clean(body.lastName, 80);
        const phone = clean(body.phone, 30);
        const organizationName = clean(body.organizationName);
        const establishmentType = clean(body.establishmentType, 100);
        const city = clean(body.city, 100);
        const commune = clean(body.commune, 100);
        const neighborhood = clean(body.neighborhood, 120);
        const interventionSector = clean(body.interventionSector, 160);
        const latitude = body.latitude == null ? null : Number(body.latitude);
        const longitude = body.longitude == null ? null : Number(body.longitude);
        const gpsAccuracy = body.gpsAccuracy == null ? null : Number(body.gpsAccuracy);
        const hasValidGps =
          latitude !== null && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
          longitude !== null && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180 &&
          gpsAccuracy !== null && Number.isFinite(gpsAccuracy) && gpsAccuracy > 0 && gpsAccuracy <= 10000;

        if (!accountType || !phone || !city || !commune || !neighborhood ||
          (accountType === "professional" && !hasValidGps)) {
          return json({ message: "Vérifiez les champs obligatoires" + (accountType === "professional" ? " et la position GPS." : "." ) }, 400);
        }
        if (accountType === "moderation" && (!firstName || !lastName)) {
          return json({ message: "Le nom et le prénom sont obligatoires." }, 400);
        }
        if (accountType === "professional" && (!organizationName || !establishmentType)) {
          return json({ message: "Le nom et le type de structure sont obligatoires." }, 400);
        }

        const existing = await env.DB.prepare(
          "SELECT id FROM account_applications WHERE user_id = ? LIMIT 1",
        ).bind(session.user.id).first<{ id: string }>();
        if (existing) return json({ message: "Une demande existe déjà pour ce compte." }, 409);

        const now = new Date().toISOString();
        const id = crypto.randomUUID();
        await env.DB.prepare(`
          INSERT INTO account_applications (
            id, user_id, account_type, first_name, last_name, phone,
            organization_name, establishment_type, city, commune, neighborhood,
            intervention_sector, latitude, longitude, gps_accuracy, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `).bind(
          id, session.user.id, accountType, firstName || null, lastName || null, phone,
          organizationName || null, establishmentType || null, city, commune, neighborhood,
          interventionSector || null, latitude, longitude, gpsAccuracy, now, now,
        ).run();

        return json({ submitted: true, status: "pending" }, 201);
      },
    },
  },
});
