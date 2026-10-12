import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ORDER_JOURNEY, ORDER_STATUSES } from "@/data/orderStatuses";
import { formatDateTime } from "@/utils/date";

// Where the order is now [AC-ORD-06]: a progress bar, the current step and the next one.
// Earlier steps fold away behind "Show N earlier steps" (with the time of each), so the
// list stays short on a phone.
// status:   the order's status now
// timeline: [{ status, at, reason }] from the server, oldest first
const OrderTimeline = ({ status, timeline }) => {
  const [showEarlier, setShowEarlier] = useState(false);

  // When each status was reached, e.g. { PAID: "2026-10-09T22:09:46Z", ... }
  const reachedAt = {};
  for (const entry of timeline) {
    reachedAt[entry.status] = entry.at;
  }

  const endedEarly = status === "CANCELLED" || status === "REJECTED";

  // A normal order shows the whole journey (future steps in grey).
  // A cancelled or rejected one shows only the steps it reached, then how it ended.
  let steps = ORDER_JOURNEY;
  if (endedEarly) {
    steps = ORDER_JOURNEY.filter((step) => reachedAt[step]);
    steps = [...steps, status];
  }

  const endEntry = timeline.find((entry) => entry.status === status);
  const currentIndex = Math.max(0, steps.indexOf(status));

  // Folded: the current step and the next one. Unfolded: everything.
  const firstShown = showEarlier ? 0 : currentIndex;
  const lastShown = showEarlier ? steps.length - 1 : Math.min(currentIndex + 1, steps.length - 1);
  const hiddenEarlier = currentIndex;

  return (
    <div>
      {/* How far along the journey; it slides forward when the order moves on */}
      {!endedEarly && (
        <div className="mb-5">
          <p className="text-[13px] font-bold text-muted-foreground">
            Step {currentIndex + 1} of {steps.length}
          </p>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-label="Order progress"
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={currentIndex + 1}
          >
            <div
              className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-400"
              style={{ width: ((currentIndex + 1) / steps.length) * 100 + "%" }}
            />
          </div>
        </div>
      )}

      {hiddenEarlier > 0 && (
        <button
          type="button"
          onClick={() => setShowEarlier(!showEarlier)}
          aria-expanded={showEarlier}
          className="mb-4 inline-flex min-h-11 items-center gap-1 rounded-md text-[15px] font-bold text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ChevronDown
            size={18}
            className={cn("motion-safe:transition-transform", showEarlier && "rotate-180")}
            aria-hidden="true"
          />
          {showEarlier
            ? "Hide earlier steps"
            : "Show " + hiddenEarlier + " earlier " + (hiddenEarlier === 1 ? "step" : "steps")}
        </button>
      )}

      <ol>
        {steps.map((step, index) => {
          if (index < firstShown || index > lastShown) {
            return null;
          }
          const isCurrent = step === status;
          // The step it is at now always counts as reached, even if its history row is missing
          const isDone = Boolean(reachedAt[step]) || isCurrent;
          const isLast = index === lastShown;
          const isBadEnd = isCurrent && endedEarly;
          // The line down is green only when the NEXT step has happened too
          const nextIsDone =
            !isLast && (Boolean(reachedAt[steps[index + 1]]) || steps[index + 1] === status);

          return (
            <li key={step} className="flex gap-3">
              {/* The dot and the line down to the next step */}
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-full border-2",
                    isCurrent ? "size-8" : "size-6",
                    isDone ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    isCurrent && !isBadEnd && "ring-4 ring-primary/20",
                    isBadEnd && "border-destructive bg-destructive text-white",
                  )}
                  aria-hidden="true"
                >
                  {isDone && !isBadEnd && <Check size={isCurrent ? 16 : 14} strokeWidth={3} />}
                  {isBadEnd && <X size={16} strokeWidth={3} />}
                </span>
                {!isLast && (
                  <span className={cn("w-0.5 flex-1", nextIsDone ? "bg-primary" : "bg-border")} />
                )}
              </div>

              {/* The words, with the time it happened */}
              <div className={cn("pb-5", !isDone && "text-muted-foreground")}>
                <p
                  className={cn(
                    isCurrent ? "font-heading text-lg font-bold" : "",
                    isBadEnd && "text-destructive",
                  )}
                >
                  {ORDER_STATUSES[step].description}
                  {/* Screen readers: say which step is now, since they can't see the ring */}
                  {isCurrent && <span className="sr-only"> (current step)</span>}
                  {!isDone && !isCurrent && index === currentIndex + 1 && (
                    <span className="sr-only"> (next)</span>
                  )}
                </p>
                {reachedAt[step] && (
                  <p className="text-[13px] text-muted-foreground">
                    {formatDateTime(reachedAt[step])}
                  </p>
                )}
                {isBadEnd && endEntry && endEntry.reason && (
                  <p className="text-[13px] text-muted-foreground">Reason: {endEntry.reason}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default OrderTimeline;
