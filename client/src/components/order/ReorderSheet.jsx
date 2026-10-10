import { Link } from "react-router";
import Sheet from "@/components/common/Sheet";

// What "Reorder" did: the dishes now in the cart, and the ones skipped with why [AC-CUST-10].
// result:  { restaurant, toAdd: [{ item, quantity }], skipped: [{ name, reason }] }
// onClose: close the sheet
const ReorderSheet = ({ result, onClose }) => {
  const addedSome = result.toAdd.length > 0;
  const isOpen = result.restaurant.openStatus.isOpen;

  return (
    <Sheet
      title={addedSome ? "Added to your cart" : "Couldn't reorder"}
      description={
        addedSome
          ? "At today's prices from " + result.restaurant.name + "."
          : "None of these dishes can be ordered right now."
      }
      onClose={onClose}
    >
      <div className="space-y-4 p-4 text-[15px]">
        {addedSome && (
          <ul className="space-y-1">
            {result.toAdd.map((line) => (
              <li key={line.item.id}>
                <span className="font-bold">{line.quantity} ×</span> {line.item.name}
              </li>
            ))}
          </ul>
        )}

        {result.skipped.length > 0 && (
          <div className="rounded-md bg-muted px-3 py-2">
            <p className="font-bold">Skipped</p>
            <ul className="mt-1 space-y-0.5">
              {result.skipped.map((line, index) => (
                // The same dish can be skipped twice (different options), so add the index
                <li key={line.name + index}>
                  {line.name}: {line.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {addedSome && !isOpen && (
          <p className="text-muted-foreground">
            {result.restaurant.name} is closed right now ({result.restaurant.openStatus.label}).
            Your cart is saved for when it opens.
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          {addedSome && (
            <Link
              to="/cart"
              className="flex min-h-12 flex-1 items-center justify-center rounded-md bg-primary px-5 font-bold text-primary-foreground"
            >
              Go to cart
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 flex-1 rounded-md border border-border px-5 font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </Sheet>
  );
};

export default ReorderSheet;
