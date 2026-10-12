// What every admin chart shares [AC-ANL-01]: quiet axes and grid, and the colours from
// index.css (--chart-1, --chart-2), so dark mode picks its own checked colours.

export const SERIES_COLORS = {
  first: "var(--chart-1)",
  second: "var(--chart-2)",
};

// Axis text: small and muted, so the data stands out
export const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 13 };

// Faint horizontal lines only
export const GRID_PROPS = { stroke: "var(--border)", vertical: false };

// "2026-10-09" -> "9 Oct" for the x axis
export const shortDay = (dayText) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" }).format(
    new Date(dayText + "T12:00:00Z"),
  );

// An amount on a money axis: 1234500 -> "GHS 12,345" (whole cedis; tooltips show the exact
// amount). Steps smaller than a cedi keep their pesewas (250 -> "GHS 2.50"), so a small or
// empty chart never shows "GHS 0" several times.
export const cedisTick = (pesewas) => {
  if (pesewas % 100 !== 0) {
    return "GHS " + (pesewas / 100).toFixed(2);
  }
  return "GHS " + (pesewas / 100).toLocaleString("en-GB");
};

// The axis of a money chart reaches at least GHS 10, so an empty or tiny chart still has
// sensible steps (GHS 0, 2.50, 5, 7.50, 10) instead of fractions of a pesewa
export const MONEY_AXIS_MIN_TOP = 1000;
