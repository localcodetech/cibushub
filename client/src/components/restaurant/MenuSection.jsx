import { useEffect, useRef, useState } from "react";
import { Plus, Search, UtensilsCrossed, X } from "lucide-react";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import EmptyState from "@/components/common/EmptyState";
import DishSheet from "@/components/cart/DishSheet";
import NewCartSheet from "@/components/cart/NewCartSheet";
import { isFromAnotherRestaurant, useCartStore } from "@/store/cartStore";
import { formatMoney } from "@/utils/money";
import { isItemAvailable } from "@/utils/menu";
import StatusBadge from "@/components/common/StatusBadge";
import DishImage from "./DishImage";

// The whole menu: a dish search, category links at the top, then each category with its
// dishes [AC-DISC-10]. Wider screens show the dishes in two columns.
// Tapping "Add" opens the dish sheet; adding from a second restaurant asks first [AC-CART-01, 02].
// restaurant: the data from GET /restaurants/:id (menu is [{ id, name, items: [...] }, ...])
const MenuSection = ({ restaurant }) => {
  const cartRestaurant = useCartStore((state) => state.restaurant);
  const addLine = useCartStore((state) => state.addLine);
  const clearCart = useCartStore((state) => state.clearCart);

  // The dish whose sheet is open, or null when no sheet is open
  const [openItem, setOpenItem] = useState(null);
  // A dish waiting for "Start new cart?": { item, options, quantity }, or null
  const [waitingToAdd, setWaitingToAdd] = useState(null);

  // What the customer typed in "Search this menu"
  const [search, setSearch] = useState("");
  const words = search.trim().toLowerCase();

  // A dish matches when its name or description has the typed words (any case)
  const matches = (item) =>
    !words ||
    item.name.toLowerCase().includes(words) ||
    (item.description || "").toLowerCase().includes(words);

  // Each category keeps only the matching dishes; empty ones are hidden (that also hides
  // categories the owner made but hasn't put any dishes in yet)
  const categories = restaurant.menu
    .map((category) => ({ ...category, items: category.items.filter(matches) }))
    .filter((category) => category.items.length > 0);
  const hasDishes = restaurant.menu.some((category) => category.items.length > 0);
  // A closed restaurant shows its menu, but nothing can be added
  const canOrder = restaurant.openStatus.isOpen;

  // The category being read right now, highlighted in the sticky links
  const [currentId, setCurrentId] = useState(categories[0] ? categories[0].id : null);
  const linksRef = useRef(null);

  // Watches which category heading sits just under the sticky links while scrolling.
  // rootMargin: only a band near the top of the screen counts as "being read".
  useEffect(() => {
    const sections = categories
      .map((category) => document.getElementById("category-" + category.id))
      .filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) {
          setCurrentId(visible[0].target.id.replace("category-", ""));
        }
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
    // categories is rebuilt every render; its ids only change with the restaurant's menu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.menu, words]);

  // Keep the highlighted link in view inside the sideways-scrolling bar
  useEffect(() => {
    const link = linksRef.current?.querySelector('[aria-current="true"]');
    if (link) {
      link.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [currentId]);

  // The customer tapped "Add to cart" in the dish sheet
  const handleAdd = (options, quantity) => {
    if (isFromAnotherRestaurant(cartRestaurant, restaurant.id)) {
      // Keep their choices and ask first; nothing is added yet [AC-CART-02]
      setWaitingToAdd({ item: openItem, options: options, quantity: quantity });
    } else {
      addLine(restaurant, openItem, options, quantity);
    }
    setOpenItem(null);
  };

  // "Start new cart": empty the old cart, then add the dish they were choosing
  const handleStartNewCart = () => {
    clearCart();
    addLine(restaurant, waitingToAdd.item, waitingToAdd.options, waitingToAdd.quantity);
    setWaitingToAdd(null);
  };

  if (!hasDishes) {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="No dishes yet"
        message="This restaurant is still adding its menu."
      />
    );
  }

  return (
    <section>
      {/* Search this menu: the list below shrinks to the matching dishes as you type */}
      <div role="search" className="relative">
        <label htmlFor="menu-search" className="sr-only">
          Search this menu
        </label>
        <Search
          size={20}
          aria-hidden="true"
          className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id="menu-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search this menu, e.g. fish, jollof"
          className="h-12 w-full rounded-lg border border-input bg-white pr-12 pl-11 text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:bg-card [&::-webkit-search-cancel-button]:hidden"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {categories.length === 0 && (
        <div className="py-10 text-center">
          <Text className="font-bold">No dishes match "{search.trim()}"</Text>
          <button
            type="button"
            onClick={() => setSearch("")}
            className="mt-2 min-h-11 font-bold text-primary"
          >
            Show the whole menu
          </button>
        </div>
      )}

      {/* Category links stick to the top while scrolling; tapping one jumps to it */}
      <nav
        ref={linksRef}
        aria-label="Menu categories"
        className={
          "sticky top-0 z-10 -mx-4 mt-3 flex gap-2 overflow-x-auto border-b border-border bg-background px-4 py-3" +
          (categories.length === 0 ? " hidden" : "")
        }
      >
        {categories.map((category) => {
          const isCurrent = String(category.id) === String(currentId);
          return (
            <a
              key={category.id}
              href={"#category-" + category.id}
              onClick={() => setCurrentId(category.id)}
              aria-current={isCurrent ? "true" : undefined}
              className={
                "min-h-10 shrink-0 content-center rounded-full border px-4 text-[15px] font-bold whitespace-nowrap transition-colors duration-100 " +
                (isCurrent
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground")
              }
            >
              {category.name} ({category.items.length})
            </a>
          );
        })}
      </nav>

      {categories.map((category) => (
        // scroll-mt leaves room for the sticky links, so the heading isn't hidden under them
        <div key={category.id} id={"category-" + category.id} className="scroll-mt-20 pt-6">
          <Heading level={2}>{category.name}</Heading>
          {/* A menu is a list, not a pile of cards: rows with lines under them.
              Two columns from tablet width, so a long menu needs half the scrolling. */}
          <ul className="mt-2 md:grid md:grid-cols-2 md:gap-x-6">
            {category.items.map((item) => (
              <MenuItemRow
                key={item.id}
                item={item}
                canOrder={canOrder}
                onAddClick={() => setOpenItem(item)}
              />
            ))}
          </ul>
        </div>
      ))}

      {/* key: a different dish gets a fresh sheet, with nothing ticked */}
      {openItem && (
        <DishSheet
          key={openItem.id}
          item={openItem}
          onAdd={handleAdd}
          onClose={() => setOpenItem(null)}
        />
      )}

      {waitingToAdd && (
        <NewCartSheet
          currentName={cartRestaurant.name}
          newName={restaurant.name}
          onConfirm={handleStartNewCart}
          onClose={() => setWaitingToAdd(null)}
        />
      )}
    </section>
  );
};

// One dish. Sold-out dishes stay on the list, faded, so customers know they exist [AC-MENU-05]
// canOrder: false when the restaurant is closed    onAddClick: opens the dish sheet
const MenuItemRow = ({ item, canOrder, onAddClick }) => {
  const isAvailable = isItemAvailable(item);

  return (
    <li
      className={
        "flex gap-4 border-b border-border py-4" + (isAvailable ? " group" : " opacity-50")
      }
    >
      <div className="min-w-0 flex-1">
        <Heading level={4}>{item.name}</Heading>
        {item.description && (
          <Text size="small" muted className="mt-1 line-clamp-2">
            {item.description}
          </Text>
        )}
        <div className="mt-2 flex items-center gap-3">
          <span className="font-bold">{formatMoney(item.pricePesewas)}</span>
          {!isAvailable && <StatusBadge label="Sold out" tone="neutral" icon={null} />}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <DishImage item={item} />
        {isAvailable && canOrder && (
          <button
            type="button"
            onClick={onAddClick}
            aria-label={"Add " + item.name}
            className="inline-flex min-h-10 items-center gap-1 rounded-full bg-primary px-4 font-bold text-primary-foreground"
          >
            <Plus size={16} aria-hidden="true" />
            Add
          </button>
        )}
      </div>
    </li>
  );
};

export default MenuSection;
