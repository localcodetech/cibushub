import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const STAR_NUMBERS = [1, 2, 3, 4, 5];

// Choose 1 to 5 stars. Under the hood it is 5 radio buttons, so the keyboard
// (arrow keys) and screen readers ("3 stars, selected") work like any choice list.
//
// <StarPicker name="rating" label="The food" value={rating} onChange={setRating} />
// optional: adds "(optional)" and a "Clear" button, so a choice can be taken back
const StarPicker = ({ name, label, value, onChange, optional = false, error }) => {
  return (
    <fieldset>
      <legend className="font-bold">
        {label}
        {optional && <span className="font-normal text-muted-foreground"> (optional)</span>}
      </legend>

      <div className="mt-2 flex items-center gap-1">
        {STAR_NUMBERS.map((number) => {
          const isFilled = value !== null && number <= value;
          return (
            <label key={number} className="cursor-pointer">
              {/* Hidden radio; the star drawn after it shows the choice and the focus ring */}
              <input
                type="radio"
                name={name}
                value={number}
                checked={value === number}
                onChange={() => onChange(number)}
                className="peer sr-only"
              />
              <Star
                size={36}
                aria-hidden="true"
                className={cn(
                  "rounded-md p-1 peer-focus-visible:outline-2 peer-focus-visible:outline-ring",
                  isFilled ? "fill-gold text-gold" : "text-muted-foreground",
                )}
              />
              <span className="sr-only">
                {number} {number === 1 ? "star" : "stars"}
              </span>
            </label>
          );
        })}

        {optional && value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-2 min-h-11 px-2 text-[15px] font-bold text-primary"
          >
            Clear
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-[15px] text-destructive">{error}</p>}
    </fieldset>
  );
};

export default StarPicker;
