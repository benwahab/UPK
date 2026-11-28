import { useEffect, useRef } from "react";

type AdMedia =
  | { type: "image"; src: string; alt: string; href?: string }
  | { type: "video"; src: string; poster?: string; href?: string };

const demoMedia: AdMedia[] = [
  { type: "image", src: "/upk-logo.png", alt: "UPK — aperçu de l’espace publicitaire" },
  { type: "image", src: "/upk-logo.png", alt: "UPK — aperçu de l’espace publicitaire" },
  { type: "image", src: "/upk-logo.png", alt: "UPK — aperçu de l’espace publicitaire" },
  { type: "image", src: "/upk-logo.png", alt: "UPK — aperçu de l’espace publicitaire" },
];

function MediaCard({ item }: { item: AdMedia }) {
  const content =
    item.type === "video" ? (
      <video
        className="h-full w-full object-contain"
        src={item.src}
        poster={item.poster}
        muted
        loop
        autoPlay
        playsInline
        preload="metadata"
        aria-label="Publicité vidéo"
      />
    ) : (
      <img className="h-full w-full object-contain p-3" src={item.src} alt={item.alt} />
    );

  return (
    <div className="h-[88px] w-[210px] shrink-0 overflow-hidden rounded-xl border border-[var(--upk-border)] bg-[var(--upk-card)] sm:w-[240px]">
      {item.href ? (
        <a href={item.href} target="_blank" rel="noreferrer" className="block h-full w-full">
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
}

export function AdCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const videos = track.querySelectorAll("video");
    const tryPlay = () => videos.forEach((video) => void video.play().catch(() => {}));
    tryPlay();
    document.addEventListener("visibilitychange", tryPlay);
    return () => document.removeEventListener("visibilitychange", tryPlay);
  }, []);

  const repeated = [...demoMedia, ...demoMedia];

  return (
    <aside className="mt-auto w-full overflow-hidden pb-3 pt-4" aria-label="Espace publicitaire">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--upk-muted-fg)]">
          Espace publicitaire
        </span>
        <span className="text-[10px] text-[var(--upk-muted-fg)]">Aperçu</span>
      </div>
      <div className="upk-ad-viewport overflow-hidden">
        <div ref={trackRef} className="upk-ad-track flex w-max gap-3">
          {repeated.map((item, index) => (
            <MediaCard key={`${item.src}-${index}`} item={item} />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes upk-ad-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .upk-ad-track {
          animation: upk-ad-scroll 32s linear infinite;
          will-change: transform;
        }
        .upk-ad-viewport:hover .upk-ad-track,
        .upk-ad-viewport:focus-within .upk-ad-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .upk-ad-track { animation: none; }
        }
      `}</style>
    </aside>
  );
}
