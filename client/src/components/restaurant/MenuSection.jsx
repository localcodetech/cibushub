import { UtensilsCrossed } from "lucide-react";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import EmptyState from "@/components/common/EmptyState";
import { formatMoney } from "@/utils/money";
import { isItemAvailable } from "@/utils/menu";

// The whole menu: category links at the top, then each category with its dishes [AC-DISC-10].
// menu: [{ id, name, items: [...] }, ...], already in the owner's order
const MenuSection = ({ menu }) => {
  // Hide categories the owner made but hasn't put any dishes in yet
  const categories = menu.filter((category) => category.items.length > 0);

  if (categories.length === 0) {
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
      {/* Category links stick to the top while scrolling; tapping one jumps to it */}
      <nav
        aria-label="Menu categories"
        className="sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto border-b border-border bg-background px-4 py-3"
      >
        {categories.map((category) => (
          <a
            key={category.id}
            href={"#category-" + category.id}
            className="min-h-10 shrink-0 content-center rounded-full border border-border bg-card px-4 text-[15px] font-bold whitespace-nowrap"
          >
            {category.name} ({category.items.length})
          </a>
        ))}
      </nav>

      {categories.map((category) => (
        // scroll-mt leaves room for the sticky links, so the heading isn't hidden under them
        <div key={category.id} id={"category-" + category.id} className="scroll-mt-20 pt-6">
          <Heading level={2}>{category.name}</Heading>
          {/* A menu is a list, not a pile of cards: rows with lines between them */}
          <ul className="mt-2 divide-y divide-border">
            {category.items.map((item) => (
              <MenuItemRow key={item.id} item={item} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
};

// One dish. Sold-out dishes stay on the list, faded, so customers know they exist [AC-MENU-05]
const MenuItemRow = ({ item }) => {
  const isAvailable = isItemAvailable(item);

  return (
    <li className={isAvailable ? "flex gap-4 py-4" : "flex gap-4 py-4 opacity-50"}>
      <div className="min-w-0 flex-1">
        <Heading level={4}>{item.name}</Heading>
        {item.description && (
          <Text size="small" muted className="mt-1 line-clamp-2">
            {item.description}
          </Text>
        )}
        <div className="mt-2 flex items-center gap-3">
          <span className="font-bold">{formatMoney(item.pricePesewas)}</span>
          {!isAvailable && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[13px] font-bold">
              Sold out
            </span>
          )}
        </div>
      </div>

      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          className="size-24 shrink-0 rounded-md object-cover"
        />
      )}
    </li>
  );
};

export default MenuSection;
