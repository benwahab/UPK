import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Locale } from "@upk/domain";

type Partner = { id: string; name: string; logoUrl: string; websiteUrl: string };
type Content = { socials: { facebook: string; tiktok: string; instagram: string }; partners: Partner[] };
const EMPTY: Content = { socials: { facebook: "", tiktok: "", instagram: "" }, partners: [] };
const labels = {
  fr: { title: "Accueil et partenaires", intro: "Gérez les partenaires affichés sur l'accueil et les liens des réseaux sociaux.", social: "Réseaux sociaux", partners: "Partenaires", facebook: "Lien Facebook", tiktok: "Lien TikTok", instagram: "Lien Instagram", name: "Nom du partenaire", logo: "Logo", website: "Site web (facultatif)", add: "Ajouter un partenaire", save: "Enregistrer les modifications", saving: "Enregistrement…", upload: "Choisir un logo", remove: "Supprimer", saved: "Modifications enregistrées.", error: "Une erreur est survenue. Vérifiez les informations et réessayez.", empty: "Aucun partenaire ajouté pour le moment." },
  en: { title: "Homepage and partners", intro: "Manage homepage partners and social network links.", social: "Social networks", partners: "Partners", facebook: "Facebook link", tiktok: "TikTok link", instagram: "Instagram link", name: "Partner name", logo: "Logo", website: "Website (optional)", add: "Add a partner", save: "Save changes", saving: "Saving…", upload: "Choose a logo", remove: "Remove", saved: "Changes saved.", error: "Something went wrong. Check the information and try again.", empty: "No partners added yet." },
  ar: { title: "الصفحة الرئيسية والشركاء", intro: "إدارة شعارات الشركاء وروابط الشبكات الاجتماعية.", social: "الشبكات الاجتماعية", partners: "الشركاء", facebook: "رابط فيسبوك", tiktok: "رابط تيك توك", instagram: "رابط إنستغرام", name: "اسم الشريك", logo: "الشعار", website: "الموقع الإلكتروني (اختياري)", add: "إضافة شريك", save: "حفظ التغييرات", saving: "جارٍ الحفظ…", upload: "اختيار شعار", remove: "حذف", saved: "تم حفظ التغييرات.", error: "حدث خطأ. تحقق من البيانات وحاول مجدداً.", empty: "لم تتم إضافة شركاء بعد." },
};
async function getContent(): Promise<Content> {
  const response = await fetch("/api/partners");
  if (!response.ok) throw new Error("load");
  return { ...EMPTY, ...(await response.json() as Partial<Content>) };
}
export function SiteContentAdmin({ locale }: { locale: Locale }) {
  const t = labels[locale];
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["site-content"], queryFn: getContent });
  const [content, setContent] = useState<Content>(EMPTY);
  const [message, setMessage] = useState("");
  useEffect(() => { if (query.data) setContent(query.data); }, [query.data]);
  const save = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/partners", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(content),
      });
      if (!response.ok) throw new Error("save");
      return response.json() as Promise<Content>;
    },
    onSuccess: (data) => { setContent({ ...EMPTY, ...data }); void queryClient.invalidateQueries({ queryKey: ["site-content"] }); setMessage(t.saved); },
    onError: () => setMessage(t.error),
  });
  function setSocial(key: keyof Content["socials"], value: string) {
    setContent((current) => ({ ...current, socials: { ...current.socials, [key]: value } }));
    setMessage("");
  }
  function updatePartner(id: string, field: keyof Partner, value: string) {
    setContent((current) => ({ ...current, partners: current.partners.map((p) => p.id === id ? { ...p, [field]: value } : p) }));
    setMessage("");
  }
  async function uploadLogo(id: string, file?: File) {
    if (!file) return;
    const form = new FormData(); form.set("file", file);
    const response = await fetch("/api/partners", { method: "POST", body: form });
    if (!response.ok) { setMessage(t.error); return; }
    const result = await response.json() as { url: string };
    updatePartner(id, "logoUrl", result.url);
  }
  async function removePartner(id: string) {
    const partner = content.partners.find((p) => p.id === id);
    if (partner?.logoUrl.includes("/api/partners?asset=")) {
      try {
        const key = decodeURIComponent(partner.logoUrl.split("asset=")[1] ?? "");
        await fetch("/api/partners", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ key }) });
      } catch { /* La suppression du logo ne bloque pas la mise à jour de la liste. */ }
    }
    setContent((current) => ({ ...current, partners: current.partners.filter((p) => p.id !== id) }));
  }
  return (
    <section className="mt-8 rounded-2xl border border-[var(--upk-border)] bg-[var(--upk-card)] p-4 sm:p-6">
      <h2 className="text-xl font-semibold">{t.title}</h2>
      <p className="mt-1 text-sm text-[var(--upk-muted-fg)]">{t.intro}</p>
      {query.isPending && <p className="mt-4 text-sm">{locale === "ar" ? "جارٍ التحميل…" : locale === "en" ? "Loading…" : "Chargement…"}</p>}
      {query.error && <p role="alert" className="mt-3 text-sm text-red-700">{t.error}</p>}
      <div className="mt-6">
        <h3 className="font-semibold">{t.social}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(["facebook", "tiktok", "instagram"] as const).map((key) => (
            <label key={key} className="block text-sm font-medium">
              {t[key]}
              <input type="url" value={content.socials[key]} onChange={(e) => setSocial(key, e.target.value)} placeholder="https://" dir="ltr" className="mt-1 h-11 w-full rounded-lg border border-[var(--upk-border)] bg-[var(--upk-bg)] px-3 font-normal" />
            </label>
          ))}
        </div>
      </div>
      <div className="mt-7">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">{t.partners}</h3>
          <button type="button" onClick={() => setContent((c) => ({ ...c, partners: [...c.partners, { id: crypto.randomUUID(), name: "", logoUrl: "", websiteUrl: "" }] }))} className="rounded-lg border border-[var(--upk-border)] px-3 py-2 text-sm font-medium">{t.add}</button>
        </div>
        {content.partners.length === 0 && <p className="mt-3 text-sm text-[var(--upk-muted-fg)]">{t.empty}</p>}
        <div className="mt-3 flex flex-col gap-3">
          {content.partners.map((partner) => (
            <div key={partner.id} className="rounded-xl border border-[var(--upk-border)] p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">{t.name}<input value={partner.name} onChange={(e) => updatePartner(partner.id, "name", e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[var(--upk-border)] bg-[var(--upk-bg)] px-3 font-normal" /></label>
                <label className="text-sm font-medium">{t.website}<input type="url" dir="ltr" value={partner.websiteUrl} onChange={(e) => updatePartner(partner.id, "websiteUrl", e.target.value)} placeholder="https://" className="mt-1 h-11 w-full rounded-lg border border-[var(--upk-border)] bg-[var(--upk-bg)] px-3 font-normal" /></label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {partner.logoUrl && <img src={partner.logoUrl} alt={partner.name || t.logo} className="h-14 w-28 rounded-lg border border-[var(--upk-border)] bg-white object-contain p-2" />}
                <label className="text-sm font-medium">{t.logo}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => void uploadLogo(partner.id, e.target.files?.[0])} className="mt-1 block max-w-full text-xs" /></label>
                <button type="button" onClick={() => void removePartner(partner.id)} className="ms-auto rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700">{t.remove}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => save.mutate()} disabled={save.isPending || query.isPending} className="rounded-lg bg-[var(--upk-primary)] px-5 py-3 text-sm font-semibold text-[var(--upk-primary-fg)] disabled:opacity-60">{save.isPending ? t.saving : t.save}</button>
        {message && <p role="status" className="text-sm text-[var(--upk-muted-fg)]">{message}</p>}
      </div>
    </section>
  );
}
