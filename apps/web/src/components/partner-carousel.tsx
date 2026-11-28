import type { Locale } from "@upk/domain";

type Partner = { id: string; name: string; logoUrl: string; websiteUrl: string };

export function PartnerCarousel({ partners, locale }: { partners: Partner[]; locale: Locale }) {
  if (partners.length === 0) return null;
  const title = locale === "ar" ? "شركاؤنا" : locale === "en" ? "Our partners" : "Nos partenaires";
  const items = [...partners, ...partners];

  return (
    <section aria-label={title} className="mb-5 overflow-hidden">
      <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--upk-muted-fg)]">
        {title}
      </h2>
      <div className="partner-marquee relative w-full overflow-hidden" role="region" aria-label={title}>
        <div className="partner-marquee__track flex w-max items-center gap-3">
          {items.map((partner, index) => {
            const logo = (
              <img
                src={partner.logoUrl}
                alt={index < partners.length ? partner.name : ""}
                aria-hidden={index >= partners.length}
                loading={index < partners.length ? "eager" : "lazy"}
                className="h-14 w-28 object-contain"
              />
            );
            const key = `${partner.id}-${index}`;
            return partner.websiteUrl ? (
              <a
                key={key}
                href={partner.websiteUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={index < partners.length ? partner.name : undefined}
                tabIndex={index < partners.length ? 0 : -1}
                aria-hidden={index >= partners.length}
                className="flex h-16 w-32 shrink-0 items-center justify-center rounded-xl border border-[var(--upk-border)] bg-[var(--upk-card)] px-2 py-1.5"
              >
                {logo}
              </a>
            ) : (
              <div
                key={key}
                aria-hidden={index >= partners.length}
                className="flex h-16 w-32 shrink-0 items-center justify-center rounded-xl border border-[var(--upk-border)] bg-[var(--upk-card)] px-2 py-1.5"
              >
                {logo}
              </div>
            );
          })}
        </div>
      </div>
      <style>{`
        @keyframes upk-partner-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .partner-marquee__track {
          animation: upk-partner-marquee 28s linear infinite;
          will-change: transform;
        }
        .partner-marquee:hover .partner-marquee__track,
        .partner-marquee:focus-within .partner-marquee__track {
          animation-play-state: running;
        }
        @media (prefers-reduced-motion: reduce) {
          .partner-marquee__track { animation: none; }
        }
      `}</style>
    </section>
  );
}
