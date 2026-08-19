import { describe, it, expect } from "vitest";
import { calculateDistanceMeters, formatDistance } from "./haversine";

describe("Geodesic Haversine Engine", () => {
  it("calcula distância zero para o mesmo ponto", () => {
    const point = { latitude: -25.4284, longitude: -49.2733 };
    const dist = calculateDistanceMeters(point, point);
    expect(dist).toBe(0);
  });

  it("calcula proximidade em metros corretamente para pequenas distâncias", () => {
    const venue = { latitude: -25.4284, longitude: -49.2733 };
    // Pequeno deslocamento (~33 metros)
    const client = { latitude: -25.4284 + 0.0002, longitude: -49.2733 + 0.0002 };
    const dist = calculateDistanceMeters(venue, client);
    expect(dist).toBeGreaterThan(20);
    expect(dist).toBeLessThan(50);
  });

  it("formata distâncias de forma amigável", () => {
    expect(formatDistance(45)).toBe("45 m");
    expect(formatDistance(850)).toBe("850 m");
    expect(formatDistance(1500)).toBe("1.5 km");
    expect(formatDistance(3200)).toBe("3.2 km");
  });
});
