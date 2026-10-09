import Sheet from "@/components/common/Sheet";

// Asked when the cart already has food from another restaurant [AC-CART-02].
// One order comes from one kitchen, so the customer chooses: start again, or keep the cart.
//
// currentName: the restaurant already in the cart    newName: the one they are adding from
const NewCartSheet = ({ currentName, newName, onConfirm, onClose }) => {
  return (
    <Sheet
      title={"Start a new cart with " + newName + "?"}
      description={
        "Your cart has food from " +
        currentName +
        ". An order can only come from one restaurant, so starting a new cart removes it."
      }
      onClose={onClose}
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row-reverse">
        <button
          type="button"
          onClick={onConfirm}
          className="min-h-12 flex-1 rounded-md bg-primary px-5 font-bold text-primary-foreground"
        >
          Start new cart
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-12 flex-1 rounded-md border border-border px-5 font-bold"
        >
          Cancel
        </button>
      </div>
    </Sheet>
  );
};

export default NewCartSheet;
