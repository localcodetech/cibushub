import Heading from "@/components/typography/Heading";

// The server numbers days like JavaScript does: 0 is Sunday, 6 is Saturday
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Ghana (Africa/Accra) is on UTC all year, so the UTC day of the week is the day in Ghana
const todayInGhana = () => new Date().getUTCDay();

// A table of the week's hours, with today in bold [AC-DISC-10].
// openingHours: [{ dayOfWeek, isClosed, opensAt: "09:00:00", closesAt: "22:00:00" }, ...]
const OpeningHours = ({ openingHours }) => {
  const today = todayInGhana();

  // Monday first, Sunday last, the way people read a week
  const weekOrder = [1, 2, 3, 4, 5, 6, 0];

  return (
    <section>
      <Heading level={2}>Opening hours</Heading>
      <dl className="mt-3 space-y-1 text-[15px]">
        {weekOrder.map((dayNumber) => {
          const day = openingHours.find((hours) => hours.dayOfWeek === dayNumber);
          const isToday = dayNumber === today;

          return (
            <div
              key={dayNumber}
              className={
                isToday
                  ? "flex justify-between font-bold"
                  : "flex justify-between text-muted-foreground"
              }
            >
              <dt>
                {DAY_NAMES[dayNumber]}
                {isToday && " (today)"}
              </dt>
              <dd>{formatHours(day)}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
};

// { opensAt: "09:00:00", closesAt: "22:00:00" } -> "09:00 – 22:00". No row, or closed -> "Closed"
const formatHours = (day) => {
  if (!day || day.isClosed) {
    return "Closed";
  }
  return day.opensAt.slice(0, 5) + " – " + day.closesAt.slice(0, 5);
};

export default OpeningHours;
