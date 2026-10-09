import { Minus, Plus } from "lucide-react";

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 50;

// [-] 2 [+] buttons for how many of a dish, kept between 1 and 50 [AC-CART-03].
// quantity: the number now    onChange: called with the new number
// label:    the dish name, so screen readers say "One more Jollof", not just "One more"
const QuantityStepper = ({ quantity, onChange, label }) => {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label={"One less " + label}
        disabled={quantity <= MIN_QUANTITY}
        onClick={() => onChange(quantity - 1)}
        className="flex size-11 items-center justify-center rounded-full border border-border disabled:opacity-40"
      >
        <Minus size={18} />
      </button>
      {/* aria-live: screen readers announce the new number after each tap */}
      <span aria-live="polite" className="w-6 text-center font-bold">
        {quantity}
      </span>
      <button
        type="button"
        aria-label={"One more " + label}
        disabled={quantity >= MAX_QUANTITY}
        onClick={() => onChange(quantity + 1)}
        className="flex size-11 items-center justify-center rounded-full border border-border disabled:opacity-40"
      >
        <Plus size={18} />
      </button>
    </div>
  );
};

export default QuantityStepper;
