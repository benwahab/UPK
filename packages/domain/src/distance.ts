export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_M = 6_371_000;

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineMetres(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function boundingBox(center: LatLng, radiusM: number) {
  const latDelta = (radiusM / EARTH_RADIUS_M) * (180 / Math.PI);
  const lngDelta = latDelta / Math.cos(toRad(center.lat));
  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}

export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres / 50) * 50} m`;
  const km = metres / 1000;
  return `${km < 10 ? km.toFixed(1).replace(".0", "") : Math.round(km)} km`;
}
