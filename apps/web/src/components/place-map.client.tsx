import type { PlaceSummary } from "@upk/domain";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useEffect, useRef } from "react";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const NIAMEY: [number, number] = [13.5116, 2.1254];

type PlaceMapProps = {
  places: PlaceSummary[];
  locale: string;
  label: string;
  className?: string;
};

export default function PlaceMap({ places, locale, label, className }: PlaceMapProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = container.current;
    if (!element) return;

    const map = L.map(element, { scrollWheelZoom: false }).setView(NIAMEY, 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const markers = places.map((place) => {
      const marker = L.marker([place.latitude, place.longitude]).addTo(map);
      marker.bindPopup(
        `<a href="/${locale}/places/${encodeURIComponent(place.id)}">${escapeHtml(place.nom)}</a>`,
      );
      return marker;
    });

    if (markers.length > 0) {
      map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2));
    }

    return () => {
      map.remove();
    };
  }, [places, locale]);

  return <div ref={container} className={className} role="region" aria-label={label} />;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char] ?? char;
  });
}
