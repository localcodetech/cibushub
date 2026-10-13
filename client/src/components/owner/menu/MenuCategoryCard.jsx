import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus } from "lucide-react";
import Card from "@/components/common/Card";
import Alert from "@/components/common/Alert";
import Switch from "@/components/common/Switch";
import { ListRow } from "@/components/common/List";
import DishImage from "@/components/restaurant/DishImage";
import Heading from "@/components/typography/Heading";
import { setCategoryAvailabilityRequest, setItemAvailabilityRequest } from "@/api/ownerMenu";
import { MENU_TAGS } from "@/data/menuTags";
import { formatMoney } from "@/utils/money";

const ICON_BUTTON =
  "flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted " +
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-30";

// The small grey line under a dish: its choices, daily stock and tags
const dishDetails = (item) => {
  const parts = [];
  if (item.optionGroups.length > 0) {
    parts.push(item.optionGroups.map((group) => group.name).join(", "));
  }
  if (item.dailyStock) {
    parts.push(item.stockRemaining > 0 ? item.stockRemaining + " left today" : "None left today");
  }
  item.tags.forEach((tag) => parts.push(MENU_TAGS[tag]));
  return parts.join(" · ");
};

// One category in the menu builder: its name, move up / down, edit, every dish with an
// on-sale switch, and "Add a dish" [AC-MENU-01, AC-MENU-05, AC-MENU-10].
//   onMove(-1 | 1): swap with the category above / below
//   onEdit(): rename or delete it; onAddItem(): a new dish here; onEditItem(item): edit one
//   onChanged(): a switch changed something; the page loads the menu again
const MenuCategoryCard = ({
  restaurantId,
  category,
  isFirst,
  isLast,
  onMove,
  onEdit,
  onAddItem,
  onEditItem,
  onChanged,
}) => {
  const [busyId, setBusyId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const anyOnSale = category.items.some((item) => item.isAvailable);

  // Every switch here works the same way: send, reload, or show the problem
  const send = async (id, request) => {
    setErrorMessage("");
    setBusyId(id);
    try {
      await request();
      await onChanged();
    } catch (error) {
      setErrorMessage(error.message);
    }
    setBusyId(null);
  };

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-center gap-1 px-4 pt-3">
        <Heading level={2} className="min-w-0 flex-1 text-lg break-words">
          {category.name}
          <span className="ml-2 text-[15px] font-normal text-muted-foreground">
            {category.items.length}
          </span>
        </Heading>
        <button
          type="button"
          disabled={isFirst}
          onClick={() => onMove(-1)}
          aria-label={"Move " + category.name + " up"}
          className={ICON_BUTTON}
        >
          <ArrowUp size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          disabled={isLast}
          onClick={() => onMove(1)}
          aria-label={"Move " + category.name + " down"}
          className={ICON_BUTTON}
        >
          <ArrowDown size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onEdit}
          aria-label={"Rename or delete " + category.name}
          className={ICON_BUTTON}
        >
          <Pencil size={18} aria-hidden="true" />
        </button>
      </div>

      {/* The whole category at once, e.g. "the soups are finished for today" [AC-MENU-10] */}
      {category.items.length > 0 && (
        <button
          type="button"
          disabled={busyId === category.id}
          onClick={() =>
            send(category.id, () =>
              setCategoryAvailabilityRequest(restaurantId, category.id, !anyOnSale),
            )
          }
          className="mx-4 inline-flex min-h-11 items-center text-[15px] font-bold text-primary disabled:opacity-60"
        >
          {anyOnSale ? "Mark all sold out" : "Put all back on sale"}
        </button>
      )}

      {errorMessage && <Alert className="mx-4 mb-2">{errorMessage}</Alert>}

      <ul className="divide-y divide-border border-t border-border">
        {category.items.map((item) => (
          <ListRow key={item.id} className="flex items-center gap-3">
            {/* The dish itself opens its editor; the switch beside it is separate */}
            <button
              type="button"
              onClick={() => onEditItem(item)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <DishImage item={item} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block font-bold break-words">{item.name}</span>
                <span className="block text-[15px]">{formatMoney(item.pricePesewas)}</span>
                {dishDetails(item) && (
                  <span className="mt-0.5 line-clamp-2 block text-[13px] text-muted-foreground">
                    {dishDetails(item)}
                  </span>
                )}
              </span>
            </button>
            <span className="flex w-16 shrink-0 flex-col items-center">
              <Switch
                size="sm"
                checked={item.isAvailable}
                disabled={busyId === item.id}
                label={item.name + " on sale"}
                onChange={(isAvailable) =>
                  send(item.id, () =>
                    setItemAvailabilityRequest(restaurantId, item.id, isAvailable),
                  )
                }
              />
              <span
                aria-hidden="true"
                className={
                  item.isAvailable
                    ? "text-[11px] text-muted-foreground"
                    : "text-[11px] font-bold text-destructive"
                }
              >
                {item.isAvailable ? "On sale" : "Sold out"}
              </span>
            </span>
          </ListRow>
        ))}
      </ul>

      <div className="border-t border-border px-4 py-1">
        <button
          type="button"
          onClick={onAddItem}
          className="inline-flex min-h-11 items-center gap-2 font-bold text-primary"
        >
          <Plus size={16} aria-hidden="true" />
          Add a dish
        </button>
      </div>
    </Card>
  );
};

export default MenuCategoryCard;
