import { describe, expect, it } from "vitest";
import {
  getOpenStatus,
  isRestaurantOpen,
  isWithinOpeningHours,
} from "../../src/utils/restaurant/openingHours.js";

// Ghana time is the same as UTC, so "2026-10-09T12:00:00Z" is 12:00 noon in Kumasi.
// 2026-10-09 is a Friday, 2026-10-10 a Saturday, 2026-10-11 a Sunday.
const FRIDAY = 5;
const SATURDAY = 6;
const SUNDAY = 0;

const openDay = (dayOfWeek, opensAt, closesAt) => ({
  dayOfWeek,
  isClosed: false,
  opensAt,
  closesAt,
});
const closedDay = (dayOfWeek) => ({ dayOfWeek, isClosed: true, opensAt: null, closesAt: null });

describe("Opening hours [AC-REST-05, AC-DISC-04]", () => {
  it("is open inside normal daytime hours", () => {
    const hours = [openDay(FRIDAY, "08:00", "22:00")];

    expect(isWithinOpeningHours(hours, new Date("2026-10-09T12:00:00Z"))).toBe(true);
  });

  it("is closed before opening time and exactly at closing time", () => {
    const hours = [openDay(FRIDAY, "08:00", "22:00")];

    expect(isWithinOpeningHours(hours, new Date("2026-10-09T07:59:00Z"))).toBe(false);
    expect(isWithinOpeningHours(hours, new Date("2026-10-09T22:00:00Z"))).toBe(false);
  });

  it("is closed on a day marked closed", () => {
    const hours = [closedDay(FRIDAY)];

    expect(isWithinOpeningHours(hours, new Date("2026-10-09T12:00:00Z"))).toBe(false);
  });

  it("is closed on a day with no hours saved", () => {
    expect(isWithinOpeningHours([], new Date("2026-10-09T12:00:00Z"))).toBe(false);
  });

  it("is open in the evening part of hours that cross midnight (18:00-02:00)", () => {
    const hours = [openDay(FRIDAY, "18:00", "02:00")];

    expect(isWithinOpeningHours(hours, new Date("2026-10-09T23:00:00Z"))).toBe(true);
  });

  it("is still open after midnight on the next day, until closing time", () => {
    const hours = [openDay(FRIDAY, "18:00", "02:00"), closedDay(SATURDAY)];

    expect(isWithinOpeningHours(hours, new Date("2026-10-10T01:30:00Z"))).toBe(true);
    expect(isWithinOpeningHours(hours, new Date("2026-10-10T02:00:00Z"))).toBe(false);
  });

  it("wraps from Saturday night into Sunday morning", () => {
    const hours = [openDay(SATURDAY, "20:00", "03:00"), closedDay(SUNDAY)];

    expect(isWithinOpeningHours(hours, new Date("2026-10-11T01:00:00Z"))).toBe(true);
  });
});

describe("Accepting orders switch [AC-REST-06]", () => {
  it("is closed when the owner turned off accepting orders, even inside opening hours", () => {
    const restaurant = {
      isAcceptingOrders: false,
      openingHours: [openDay(FRIDAY, "08:00", "22:00")],
    };

    expect(isRestaurantOpen(restaurant, new Date("2026-10-09T12:00:00Z"))).toBe(false);
  });

  it("is open when accepting orders and inside opening hours", () => {
    const restaurant = {
      isAcceptingOrders: true,
      openingHours: [openDay(FRIDAY, "08:00", "22:00")],
    };

    expect(isRestaurantOpen(restaurant, new Date("2026-10-09T12:00:00Z"))).toBe(true);
  });
});

describe("Open status label [AC-DISC-04]", () => {
  const eveningPlace = {
    isAcceptingOrders: true,
    openingHours: [openDay(FRIDAY, "18:00:00", "02:00:00")],
  };

  it("says when it opens later today", () => {
    expect(getOpenStatus(eveningPlace, new Date("2026-10-09T12:00:00Z"))).toEqual({
      isOpen: false,
      label: "Opens at 18:00",
    });
  });

  it("says Open inside opening hours", () => {
    expect(getOpenStatus(eveningPlace, new Date("2026-10-09T20:00:00Z")).label).toBe("Open");
  });

  it("says Closed after closing time", () => {
    expect(getOpenStatus(eveningPlace, new Date("2026-10-10T03:00:00Z")).label).toBe("Closed");
  });

  it("says Closed when the owner switched off orders, even inside hours", () => {
    const switchedOff = { ...eveningPlace, isAcceptingOrders: false };

    expect(getOpenStatus(switchedOff, new Date("2026-10-09T20:00:00Z")).label).toBe("Closed");
  });
});
