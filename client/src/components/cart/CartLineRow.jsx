import { AlertTriangle } from "lucide-react";
import QuantityStepper from "@/components/cart/QuantityStepper";
import { formatMoney } from "@/utils/money";

// One line of the cart: name, options, stepper, price, Remove, and any problem the server found.
//
// line:      a line from the cart store (what the customer chose)
// checked:   the same line from the server's check, or undefined while it is loading
// onQuantityChange, onRemove, onAcceptPrice: what the buttons do
const CartLineRow = ({ line, checked, onQuantityChange, onRemove, onAcceptPrice }) => {
  // Before the check arrives, show the price the customer saw
  const lineTotal = checked ? checked.lineTotalPesewas : line.unitPricePesewas * line.quantity;
  const problems = checked ? checked.problems : [];
  const isUnavailable = problems.some((problem) => problem.code === "ITEM_UNAVAILABLE");

  return (
    <li className="py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={isUnavailable ? "font-bold line-through" : "font-bold"}>{line.name}</p>
          {line.options.length > 0 && (
            <p className="mt-0.5 text-[15px] text-muted-foreground">
              {line.options.map((option) => option.name).join(", ")}
            </p>
          )}
        </div>
        <p className="shrink-0 font-bold">{formatMoney(lineTotal)}</p>
      </div>

      {/* A line can have the same kind of problem twice (two option groups), so add the index */}
      {problems.map((problem, index) => (
        <LineProblem
          key={problem.code + index}
          problem={problem}
          seenPrice={line.unitPricePesewas}
          newPrice={checked.unitPricePesewas}
          onAcceptPrice={onAcceptPrice}
        />
      ))}

      <div className="mt-3 flex items-center justify-between">
        {/* An unavailable dish can only be removed, not changed */}
        {isUnavailable ? (
          <span />
        ) : (
          <QuantityStepper quantity={line.quantity} onChange={onQuantityChange} label={line.name} />
        )}
        <button
          type="button"
          onClick={onRemove}
          className="min-h-11 px-2 text-[15px] font-bold text-destructive"
        >
          Remove
        </button>
      </div>
    </li>
  );
};

// One warning under a line. A price change only needs "Accept"; the others need Remove or a change.
const LineProblem = ({ problem, seenPrice, newPrice, onAcceptPrice }) => {
  // The server's message says "pesewas"; we write our own with GHS
  let message = problem.message;
  if (problem.code === "PRICE_CHANGED") {
    message = "Price changed from " + formatMoney(seenPrice) + " to " + formatMoney(newPrice) + ".";
  }

  return (
    <div
      role="alert"
      className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md bg-destructive/10 px-3 py-2 text-[15px]"
    >
      <AlertTriangle size={16} className="shrink-0 text-destructive" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {problem.code === "PRICE_CHANGED" && (
        <button
          type="button"
          onClick={onAcceptPrice}
          className="min-h-10 rounded-md bg-primary px-3 font-bold text-primary-foreground"
        >
          Accept
        </button>
      )}
    </div>
  );
};

export default CartLineRow;
