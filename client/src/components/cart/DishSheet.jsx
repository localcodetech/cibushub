import { useState } from "react";
import Sheet from "@/components/common/Sheet";
import QuantityStepper from "@/components/cart/QuantityStepper";
import Text from "@/components/typography/Text";
import { formatMoney } from "@/utils/money";
import { describeOptionGroup, getOptionGroupProblem } from "@/utils/menu";

// The sheet that opens when a customer taps "Add" on a dish [AC-CART-01, AC-MENU-06].
// They pick options, choose how many, see the price, and tap "Add to cart".
//
// item:    the dish from the menu (with optionGroups)
// onAdd:   called with (chosenOptions, quantity) when every rule is met
// onClose: called when the sheet is closed without adding
const DishSheet = ({ item, onAdd, onClose }) => {
  // The ids of every option ticked so far, from all groups
  const [selectedIds, setSelectedIds] = useState([]);
  const [quantity, setQuantity] = useState(1);
  // Only show "Choose 1" warnings after they try to add, not the moment the sheet opens
  const [triedToAdd, setTriedToAdd] = useState(false);

  // Every chosen option as a full object, so we can add up the extra prices
  const chosenOptions = [];
  for (const group of item.optionGroups) {
    for (const option of group.options) {
      if (selectedIds.includes(option.id)) {
        chosenOptions.push(option);
      }
    }
  }

  // Price for one = the dish + each chosen option; then times the quantity
  let unitPrice = item.pricePesewas;
  for (const option of chosenOptions) {
    unitPrice += option.extraPricePesewas;
  }
  const totalPrice = unitPrice * quantity;

  // Can we add? Only if no group has a problem
  const hasProblem = item.optionGroups.some(
    (group) => getOptionGroupProblem(group, selectedIds) !== null,
  );

  // "Choose 1" groups act like radio buttons: picking one replaces the other
  const handlePickOne = (group, optionId) => {
    const groupIds = group.options.map((option) => option.id);
    const otherGroups = selectedIds.filter((id) => !groupIds.includes(id));
    setSelectedIds([...otherGroups, optionId]);
  };

  // Other groups act like checkboxes: tap to tick, tap again to untick
  const handleToggle = (optionId) => {
    if (selectedIds.includes(optionId)) {
      setSelectedIds(selectedIds.filter((id) => id !== optionId));
    } else {
      setSelectedIds([...selectedIds, optionId]);
    }
  };

  const handleAdd = () => {
    if (hasProblem) {
      setTriedToAdd(true);
      return;
    }
    onAdd(chosenOptions, quantity);
  };

  return (
    <Sheet title={item.name} description={item.description} onClose={onClose}>
      <div className="space-y-6 p-4">
        {item.optionGroups.map((group) => (
          <OptionGroup
            key={group.id}
            group={group}
            selectedIds={selectedIds}
            showProblem={triedToAdd}
            onPickOne={handlePickOne}
            onToggle={handleToggle}
          />
        ))}

        {/* Quantity stepper, 1 to 50 [AC-CART-03] */}
        <div className="flex items-center justify-between">
          <Text className="font-bold">Quantity</Text>
          <QuantityStepper quantity={quantity} onChange={setQuantity} label={item.name} />
        </div>
      </div>

      {/* Stays at the bottom of the sheet: the price updates as options change */}
      <div className="sticky bottom-0 border-t border-border bg-background p-4">
        <button
          type="button"
          onClick={handleAdd}
          className="min-h-12 w-full rounded-md bg-primary px-5 font-bold text-primary-foreground"
        >
          Add to cart · {formatMoney(totalPrice)}
        </button>
      </div>
    </Sheet>
  );
};

// One group, e.g. "Protein · Required · choose 1", with its options
const OptionGroup = ({ group, selectedIds, showProblem, onPickOne, onToggle }) => {
  const isPickOne = group.maxSelect === 1;
  const problem = getOptionGroupProblem(group, selectedIds);
  const chosenCount = group.options.filter((option) => selectedIds.includes(option.id)).length;
  const isFull = chosenCount >= group.maxSelect;

  return (
    // fieldset + legend: screen readers read the group name before each option
    <fieldset>
      <legend className="flex w-full items-baseline justify-between gap-2">
        <span className="font-bold">{group.name}</span>
        <span className="text-[13px] text-muted-foreground">{describeOptionGroup(group)}</span>
      </legend>

      {showProblem && problem && (
        <p role="alert" className="mt-1 text-[13px] font-bold text-destructive">
          {problem}
        </p>
      )}

      <div className="mt-2 divide-y divide-border">
        {group.options.map((option) => {
          const isChosen = selectedIds.includes(option.id);
          // Sold-out options can't be picked; a full checkbox group blocks more ticks
          const isDisabled = !option.isAvailable || (!isPickOne && isFull && !isChosen);

          return (
            <label
              key={option.id}
              className={
                isDisabled
                  ? "flex min-h-12 items-center gap-3 opacity-50"
                  : "flex min-h-12 cursor-pointer items-center gap-3"
              }
            >
              <input
                type={isPickOne ? "radio" : "checkbox"}
                name={group.id}
                checked={isChosen}
                disabled={isDisabled}
                onChange={() => (isPickOne ? onPickOne(group, option.id) : onToggle(option.id))}
                className="size-5 accent-primary"
              />
              <span className="flex-1">
                {option.name}
                {!option.isAvailable && " (sold out)"}
              </span>
              {option.extraPricePesewas > 0 && (
                <span className="text-[15px] text-muted-foreground">
                  +{formatMoney(option.extraPricePesewas)}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};

export default DishSheet;
