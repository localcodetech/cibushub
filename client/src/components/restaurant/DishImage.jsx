import { cn } from "@/lib/utils";
import { initialsOf } from "@/utils/initials";

// A dish's photo in the menu, or (no photo yet) a soft green tile with its initials, so every
// dish row has the same shape. The tile is decorative: the dish name is written beside it.
//   size: md (96px, the customer's menu) | sm (56px, the owner's menu builder rows)
const DishImage = ({ item, size = "md" }) => {
  const isSmall = size === "sm";
  if (item.imageUrl) {
    return (
      <img
        src={item.imageUrl}
        alt={item.name}
        // lazy: the phone only downloads the photo when it scrolls near the screen
        loading="lazy"
        className={cn(
          "shrink-0 object-cover",
          isSmall ? "size-14 rounded-lg" : "size-24 rounded-xl",
        )}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center bg-primary/10 font-heading font-bold text-primary",
        isSmall ? "size-14 rounded-lg text-lg" : "size-24 rounded-xl text-2xl",
      )}
    >
      {initialsOf(item.name)}
    </div>
  );
};

export default DishImage;
