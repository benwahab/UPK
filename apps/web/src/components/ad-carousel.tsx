import { useEffect, useState } from "react";

type AdMedia =
  | { type: "image"; src: string; alt: string; href?: string }
  | { type: "video"; src: string; poster?: string; href?: string };

const demoMedia: AdMedia[] = [
  { type: "image", src: "/upk-logo.png", alt: "UPK — aperçu de l’espace publicitaire" },
  { type: "image", src: "/upk-logo.png", alt: "UPK — aperçu de l’espace publicitaire" },
  { type: "image", src: "/upk-logo.png", alt: "UPK — aperçu de l’espace publicitaire" },
  { type: "image", src: "/upk-logo.png", alt: "UPK — aperçu de l’espace publicitaire" },
];

export function AdCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeAd = demoMedia[activeIndex];

  useEffect(() => {
    if (activeAd.type !== "image" || demoMedia.length < 2) return;
    const timeout = window.setTimeout(() => {
      setActiveIndex((index) => (index + 1) % demoMedia.length);
    }, 10_000);
    return () => window.clearTimeout(timeout);
  }, [activeIndex, activeAd.type]);

  const advance = () => {
    setActiveIndex((index) => (index + 1) % demoMedia.length);
  };

  const media =
    activeAd.type === "video" ? (
      <video
        key={activeAd.src}
        className="h-full w-full object-contain"
        src={activeAd.src}
        poster={activeAd.poster}
        muted
        autoPlay
        playsInline
        controls
        preload="auto"
        onEnded={advance}
        aria-label="Publicité vidéo"
      />
    ) : (
      <img
        key={activeAd.src}
        className="h-full w-full object-contain"
        src={activeAd.src}
        alt={activeAd.alt}
      />
    );

  return (
    <aside
      className="mx-auto mt-auto w-full max-w-5xl px-3 pb-5 pt-5"
      aria-label="Espace publicitaire"
    >
      <div className="mb-3 text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--upk-muted-fg)]">
          Espace publicitaire
        </span>
      </div>
      <div className="mx-auto aspect-video w-full overflow-hidden rounded-2xl border border-[var(--upk-border)] bg-[var(--upk-card)] shadow-sm">
        {activeAd.href ? (
          <a
            href={activeAd.href}
            target="_blank"
            rel="noreferrer"
            className="block h-full w-full"
          >
            {media}
          </a>
        ) : (
          media
        )}
      </div>
      {demoMedia.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2" aria-label="Position dans les annonces">
          {demoMedia.map((item, index) => (
            <span
              key={`${item.src}-${index}`}
              className={`h-1.5 rounded-full transition-all ${index === activeIndex ? "w-6 bg-[var(--upk-fg)]" : "w-1.5 bg-[var(--upk-muted-fg)]/40"}`}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
