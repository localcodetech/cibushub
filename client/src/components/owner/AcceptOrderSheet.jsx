import { useState } from "react";
import { cn } from "@/lib/utils";
import Sheet from "@/components/common/Sheet";
import { PREP_TIME_CHOICES } from "@/data/ownerBoard";

// "Accept order" with how long it will take [AC-RORD-03].
// The restaurant's usual time is chosen already, so one tap on Accept is enough.
//
// order:        the order being accepted
// isAccepting / error: from the page's request
// onConfirm:    called with the minutes chosen
// onClose:      closes without accepting
const AcceptOrderSheet = ({ order, isAccepting, error, onConfirm, onClose }) => {
  const usualMinutes = order.restaurant?.prepTimeMinutes || 20;
  const [minutes, setMinutes] = useState(usualMinutes);

  // The usual time is always on offer, even if it isn't one of the standard choices
  const choices = [...new Set([...PREP_TIME_CHOICES, usualMinutes])].sort((a, b) => a - b);

  return (
    <Sheet
      title={"Accept " + order.orderNumber + "?"}
      description="The customer sees when their food will be ready."
      onClose={onClose}
    >
      <div className="space-y-4 p-4">
        <fieldset>
          <legend className="mb-2 text-[15px] font-bold">Ready in</legend>
          <div className="grid grid-cols-3 gap-2">
            {choices.map((choice) => (
              <label
                key={choice}
                className={cn(
                  "flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-md border text-[15px] font-bold has-focus-visible:ring-2 has-focus-visible:ring-ring",
                  minutes === choice
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border",
                )}
              >
                <input
                  type="radio"
                  name="prep-time"
                  checked={minutes === choice}
                  onChange={() => setMinutes(choice)}
                  className="sr-only"
                />
                {choice} min
                {choice === usualMinutes && <span className="text-[12px] font-normal">usual</span>}
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="text-[15px] text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            onClick={() => onConfirm(minutes)}
            disabled={isAccepting}
            className="min-h-12 flex-1 rounded-md bg-primary px-5 font-bold text-primary-foreground disabled:opacity-60"
          >
            {isAccepting ? "Accepting…" : "Accept, ready in " + minutes + " min"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 flex-1 rounded-md border border-border px-5 font-bold"
          >
            Not yet
          </button>
        </div>
      </div>
    </Sheet>
  );
};

export default AcceptOrderSheet;
