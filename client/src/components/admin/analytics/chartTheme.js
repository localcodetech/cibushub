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
