import { todayInGhana } from "./date";

// Date ranges for the analytics pages (admin and owner). Days are Ghana days like "2026-10-09".

const DAY_MS = 24 * 60 * 60 * 1000;
// The server's limit (server/src/validators/admin/analytics.validator.js)
export const MAX_RANGE_DAYS = 92;

// "2026-10-09" moved by a number of days
const addDays = (dayText, count) =>
  new Date(new Date(dayText + "T00:00:00Z").getTime() + count * DAY_MS).toISOString().slice(0, 10);

// The days a preset ("today", "7", "30") covers, ending today in Ghana
export const presetRange = (preset) => {
  const today = todayInGhana();
  if (preset === "today") return { from: today, to: today };
  return { from: addDays(today, -(Number(preset) - 1)), to: today };
};

// What's wrong with a range, or "" when it is fine
export const rangeProblem = ({ from, to }) => {
  if (!from || !to) return "Choose both dates.";
  if (from > to) return "The start date must be before the end date.";
  const days = (new Date(to).getTime() - new Date(from).getTime()) / DAY_MS + 1;
  if (days > MAX_RANGE_DAYS) return "Choose " + MAX_RANGE_DAYS + " days or fewer.";
  return "";
};
