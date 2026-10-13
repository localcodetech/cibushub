import { cn } from "@/lib/utils";
import { initialsOf } from "@/utils/initials";

// A dish's photo in the menu, or (no photo yet) a soft green tile with its initials, so every
// dish row has the same shape. The tile is decorative: the dish name is written beside it.
//   size: md (96px, the customer's menu) | sm (56px, the owner's menu builder rows)
const DishImage = ({ item, size = "md" }) => {
  const isSmall = size === "sm";
  if (item.imageUrl) {
    return (
      // The frame clips the photo, so it can zoom gently when its row is hovered ("group")
      <span
        className={cn(
          "block shrink-0 overflow-hidden",
          isSmall ? "size-14 rounded-lg" : "size-24 rounded-xl",
        )}
      >
        <img
          src={item.imageUrl}
          alt={item.name}
          // lazy: the phone only downloads the photo when it scrolls near the screen
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </span>
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
