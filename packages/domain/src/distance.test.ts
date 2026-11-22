import { describe, expect, it } from "vitest";
import { boundingBox, formatDistance, haversineMetres } from "./distance";

describe("haversineMetres", () => {
  it("donne une distance plausible entre deux points de Niamey", () => {
    const d = haversineMetres({ lat: 13.5116, lng: 2.1 }, { lat: 13.5212, lng: 2.1011 });
    expect(d).toBeGreaterThan(1000);
    expect(d).toBeLessThan(1200);
  });
  it("renvoie zéro pour le même point", () => {
    expect(haversineMetres({ lat: 13.5, lng: 2.1 }, { lat: 13.5, lng: 2.1 })).toBe(0);
  });
});

describe("formatDistance", () => {
  it("arrondit à 50 m sous 1 km", () => {
    expect(formatDistance(212)).toBe("200 m");
  });
  it("affiche les kilomètres", () => {
    expect(formatDistance(1500)).toBe("1.5 km");
  });
});

describe("boundingBox", () => {
  it("encadre le centre", () => {
    const box = boundingBox({ lat: 13.5, lng: 2.1 }, 1000);
    expect(box.minLat).toBeLessThan(13.5);
    expect(box.maxLng).toBeGreaterThan(2.1);
  });
});
