import { Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { DAY_NAMES, MONDAY_FIRST } from "@/utils/openingHours";

// The week's opening hours [AC-REST-04]: a Closed switch and two times per day.
// A closing time earlier than the opening time means "after midnight" (e.g. 18:00 to 02:00).
//   value: 7 days [{ dayOfWeek, isClosed, opensAt, closesAt }]; onChange: gets the new week
const OpeningHoursEditor = ({ value, onChange }) => {
  const changeDay = (dayOfWeek, changes) => {
    onChange(value.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...changes } : day)));
  };

  // Most kitchens keep the same hours all week: copy Monday's to every other open day
  const copyMonday = () => {
    const monday = value.find((day) => day.dayOfWeek === 1);
    onChange(
      value.map((day) =>
        day.isClosed ? day : { ...day, opensAt: monday.opensAt, closesAt: monday.closesAt },
      ),
    );
  };

  return (
    <div>
      <ul className="divide-y divide-border">
        {MONDAY_FIRST.map((dayOfWeek) => {
          const day = value.find((item) => item.dayOfWeek === dayOfWeek);
          const name = DAY_NAMES[dayOfWeek];
          return (
            <li key={dayOfWeek} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <span className="w-24 font-bold">{name}</span>
              <label className="flex min-h-11 items-center gap-2 text-[15px]">
                <input
                  type="checkbox"
                  checked={day.isClosed}
                  onChange={(event) => changeDay(dayOfWeek, { isClosed: event.target.checked })}
                  className="size-5 accent-primary"
                />
                Closed
              </label>
              <div className={cn("flex items-center gap-2", day.isClosed && "opacity-40")}>
                <label className="sr-only" htmlFor={"opens-" + dayOfWeek}>
                  {name} opens at
                </label>
                <input
                  id={"opens-" + dayOfWeek}
                  type="time"
                  value={day.opensAt}
                  disabled={day.isClosed}
                  onChange={(event) => changeDay(dayOfWeek, { opensAt: event.target.value })}
                  className="h-11 rounded-md border border-input bg-white px-2 text-base dark:bg-card"
                />
                <span aria-hidden="true">to</span>
                <label className="sr-only" htmlFor={"closes-" + dayOfWeek}>
                  {name} closes at
                </label>
                <input
                  id={"closes-" + dayOfWeek}
                  type="time"
                  value={day.closesAt}
                  disabled={day.isClosed}
                  onChange={(event) => changeDay(dayOfWeek, { closesAt: event.target.value })}
                  className="h-11 rounded-md border border-input bg-white px-2 text-base dark:bg-card"
                />
              </div>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={copyMonday}
        className="mt-2 inline-flex min-h-11 items-center gap-2 font-bold text-primary"
      >
        <Copy size={16} aria-hidden="true" />
        Copy Monday's hours to every open day
      </button>
    </div>
  );
};

export default OpeningHoursEditor;
