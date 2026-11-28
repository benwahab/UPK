import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { getAuth } from "../../lib/auth.server";

type Partner = { id: string; name: string; logoUrl: string; websiteUrl: string };
type SiteContent = { socials: { facebook: string; tiktok: string; instagram: string }; partners: Partner[] };
const EMPTY: SiteContent = { socials: { facebook: "", tiktok: "", instagram: "" }, partners: [] };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store" } });
const clean = (value: unknown, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";
function validUrl(value: string) {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; }
}
async function isAdmin(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) return false;
  const admins = (env.ADMIN_EMAILS ?? "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  return admins.includes(session.user.email.toLowerCase());
}
export const Route = createFileRoute("/api/partners")({
  server: { handlers: {
    GET: async ({ request }) => {
      const asset = new URL(request.url).searchParams.get("asset");
      if (asset) {
        if (!asset.startsWith("partners/") || asset.includes("..") || !env.PHOTOS) return new Response("Not found", { status: 404 });
        const object = await env.PHOTOS.get(asset);
        if (!object) return new Response("Not found", { status: 404 });
        return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType ?? "application/octet-stream", "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" } });
      }
      const row = await env.DB.prepare("SELECT content_json FROM site_content WHERE id = 'homepage'").first<{ content_json: string }>();
      if (!row) return json(EMPTY);
      try { return json({ ...EMPTY, ...JSON.parse(row.content_json) }); } catch { return json(EMPTY); }
    },
    POST: async ({ request }) => {
      if (!(await isAdmin(request))) return json({ message: "Accès réservé à l'administrateur." }, 403);
      if (request.headers.get("content-type")?.includes("multipart/form-data")) {
        if (!env.PHOTOS) return json({ message: "Stockage indisponible." }, 503);
        const form = await request.formData(); const file = form.get("file");
        if (!(file instanceof File)) return json({ message: "Fichier manquant." }, 400);
        const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/svg+xml": "svg" };
        const ext = extensions[file.type];
        if (!ext) return json({ message: "Formats acceptés : JPG, PNG, WebP ou SVG." }, 415);
        if (file.size > 2 * 1024 * 1024) return json({ message: "Logo limité à 2 Mo." }, 413);
        const key = `partners/${crypto.randomUUID()}.${ext}`;
        await env.PHOTOS.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
        return json({ key, url: `/api/partners?asset=${encodeURIComponent(key)}` }, 201);
      }
      let body: SiteContent;
      try { body = await request.json() as SiteContent; } catch { return json({ message: "Données invalides." }, 400); }
      const socials = { facebook: clean(body?.socials?.facebook), tiktok: clean(body?.socials?.tiktok), instagram: clean(body?.socials?.instagram) };
      const partners = Array.isArray(body?.partners) ? body.partners.slice(0, 30).map((p) => ({
        id: clean(p?.id, 80) || crypto.randomUUID(), name: clean(p?.name, 100), logoUrl: clean(p?.logoUrl, 500), websiteUrl: clean(p?.websiteUrl, 500),
      })) : [];
      if (Object.values(socials).some((v) => !validUrl(v)) || partners.some((p) => !p.name || !p.logoUrl || !validUrl(p.logoUrl) || !validUrl(p.websiteUrl))) return json({ message: "Vérifiez les noms et les adresses URL." }, 400);
      const content = JSON.stringify({ socials, partners });
      await env.DB.prepare("INSERT INTO site_content (id, content_json, updated_at) VALUES ('homepage', ?, ?) ON CONFLICT(id) DO UPDATE SET content_json = excluded.content_json, updated_at = excluded.updated_at").bind(content, new Date().toISOString()).run();
      return json({ saved: true, socials, partners });
    },
    DELETE: async ({ request }) => {
      if (!(await isAdmin(request))) return json({ message: "Accès réservé à l'administrateur." }, 403);
      if (!env.PHOTOS) return json({ deleted: false });
      let body: { key?: string };
      try { body = await request.json() as { key?: string }; } catch { return json({ message: "Données invalides." }, 400); }
      const key = clean(body.key, 200);
      if (!key.startsWith("partners/") || key.includes("..")) return json({ message: "Fichier invalide." }, 400);
      await env.PHOTOS.delete(key); return json({ deleted: true });
    },
  } },
});
