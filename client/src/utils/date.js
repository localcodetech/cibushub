// Dates are stored in UTC and always shown in Ghana time (Africa/Accra).
// "2026-10-09T19:05:00.000Z" -> "9 Oct 2026, 19:05"
export const formatDateTime = (isoText) => {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoText));
};
