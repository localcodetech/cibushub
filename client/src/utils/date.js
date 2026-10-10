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

// Just the time in Ghana: "2026-10-09T19:05:00.000Z" -> "19:05"
export const formatTime = (isoText) => {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoText));
};

// Today in Ghana as "2026-10-10". Ghana is on UTC all year, so the UTC date is Ghana's date.
export const todayInGhana = () => new Date().toISOString().slice(0, 10);

// "2026-10-10" -> "Sat 10 Oct 2026"
export const formatDay = (dayText) => {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dayText + "T12:00:00Z"));
};

// The days a period covers, from the server's { from, to } (to is the start of the NEXT day):
// "5 Oct – 11 Oct 2026"
export const formatRange = (fromIso, toIso) => {
  const lastDay = new Date(new Date(toIso).getTime() - 1);
  const dayMonth = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    day: "numeric",
    month: "short",
  });
  const year = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Accra", year: "numeric" });
  return (
    dayMonth.format(new Date(fromIso)) +
    " – " +
    dayMonth.format(lastDay) +
    " " +
    year.format(lastDay)
  );
};

// "2026-10-10" -> "October 2026"
export const formatMonth = (dayText) => {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    month: "long",
    year: "numeric",
  }).format(new Date(dayText + "T12:00:00Z"));
};
