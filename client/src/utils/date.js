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

// How long ago, in words, for things that just happened [AC-NOTIF-07]:
// "Just now", "5 min ago", "3 h ago", "Yesterday, 15:34", then the full date.
//   now: for tests; the current time by default
export const formatRelative = (isoText, now = new Date()) => {
  const then = new Date(isoText);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return minutes + " min ago";
  if (isSameGhanaDay(then, now)) return Math.floor(minutes / 60) + " h ago";
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (isSameGhanaDay(then, yesterday)) return "Yesterday, " + formatTime(isoText);
  return formatDateTime(isoText);
};

// True when both moments fall on the same day in Ghana (= UTC, all year)
export const isSameGhanaDay = (first, second) => {
  return new Date(first).toISOString().slice(0, 10) === new Date(second).toISOString().slice(0, 10);
};
