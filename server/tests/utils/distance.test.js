import { describe, expect, it } from "vitest";
import { distanceInKm } from "../../src/utils/distance.js";

const ADUM = { latitude: 6.6885, longitude: -1.6244 };
const KNUST = { latitude: 6.6745, longitude: -1.5716 };
const ACCRA = { latitude: 5.6037, longitude: -0.187 };

describe("distanceInKm", () => {
  it("measures across Kumasi (Adum to KNUST is about 6 km)", () => {
    expect(distanceInKm(ADUM, KNUST)).toBe(6);
  });

  it("measures between cities (Kumasi to Accra is about 200 km in a straight line)", () => {
    expect(distanceInKm(ADUM, ACCRA)).toBeCloseTo(199.5, 0);
  });

  it("is 0 for the same place", () => {
    expect(distanceInKm(ADUM, ADUM)).toBe(0);
  });
});
