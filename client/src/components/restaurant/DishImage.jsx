import { initialsOf } from "@/utils/initials";

// A dish's photo in the menu, or (no photo yet) a soft green tile with its initials, so every
// dish row has the same shape. The tile is decorative: the dish name is written beside it.
const DishImage = ({ item }) => {
  if (item.imageUrl) {
    return (
      <img
        src={item.imageUrl}
        alt={item.name}
        // lazy: the phone only downloads the photo when it scrolls near the screen
        loading="lazy"
        className="size-24 rounded-xl object-cover"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="flex size-24 items-center justify-center rounded-xl bg-primary/10 font-heading text-2xl font-bold text-primary"
    >
      {initialsOf(item.name)}
    </div>
  );
};

export default DishImage;
