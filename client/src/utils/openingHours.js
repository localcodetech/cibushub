// Opening hours for the owner's forms [AC-REST-04].
// The server numbers days like JavaScript: 0 is Sunday. People read Monday first.
export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];

// A usual Kumasi kitchen: 08:00 to 21:00, closed on Sunday (the owner changes what differs)
export const DEFAULT_HOURS = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  isClosed: dayOfWeek === 0,
  opensAt: "08:00",
  closesAt: "21:00",
}));

// The server's "09:00:00" -> "09:00" (the time boxes and the API both use HH:MM)
export const toEditableHours = (openingHours) =>
  [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
    const day = openingHours.find((hours) => hours.dayOfWeek === dayOfWeek);
    if (!day) return { dayOfWeek, isClosed: true, opensAt: "08:00", closesAt: "21:00" };
    return {
      dayOfWeek,
      isClosed: day.isClosed,
      opensAt: (day.opensAt || "08:00").slice(0, 5),
      closesAt: (day.closesAt || "21:00").slice(0, 5),
    };
  });

// What's wrong with these hours, or "" when they are fine (the same rules as the server)
export const hoursProblem = (hours) => {
  for (const day of hours) {
    if (day.isClosed) continue;
    if (!day.opensAt || !day.closesAt) return DAY_NAMES[day.dayOfWeek] + ": give both times.";
    if (day.opensAt === day.closesAt) {
      return DAY_NAMES[day.dayOfWeek] + ": opening and closing can't be the same time.";
    }
  }
  return "";
};
