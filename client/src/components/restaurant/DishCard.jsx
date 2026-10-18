import { Link } from "react-router";
import { MapPin } from "lucide-react";
import Card from "@/components/common/Card";
import RatingBadge from "@/components/review/RatingBadge";
import { formatMoney } from "@/utils/money";
import { isItemAvailable } from "@/utils/menu";
import { initialsOf } from "@/utils/initials";
import { cn } from "@/lib/utils";

// One dish in the dish search: its photo, price and the kitchen that cooks it.
// The whole card opens that restaurant with this dish's sheet already open (?dish=).
// dish: one item from GET /dishes
const DishCard = ({ dish }) => {
  const { restaurant } = dish;
  const isOpen = restaurant.openStatus.isOpen;
  const isAvailable = isItemAvailable(dish);

  // Why it can't be ordered right now, written on the photo
  let notice = null;
  if (!isAvailable) {
    notice = "Sold out";
  } else if (!isOpen) {
    notice = restaurant.openStatus.label;
  }

  return (
    <Card
      as={Link}
      to={`/restaurants/${restaurant.id}?dish=${dish.id}`}
      interactive
      padding="none"
      className="group flex flex-col overflow-hidden"
    >
      <span className="relative block aspect-4/3 overflow-hidden bg-primary/10">
        {dish.imageUrl ? (
          <img
            src={dish.imageUrl}
            alt=""
            loading="lazy"
            className={cn(
              "size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100",
              notice && "opacity-60",
            )}
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-full items-center justify-center font-heading text-3xl font-bold text-primary"
          >
            {initialsOf(dish.name)}
          </span>
        )}
        {notice && (
          <span className="absolute top-2 left-2 rounded-full bg-background/95 px-2.5 py-1 text-[13px] font-bold text-foreground">
            {notice}
          </span>
        )}
      </span>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 font-bold">{dish.name}</h3>
        <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
          at <span className="font-bold text-foreground">{restaurant.name}</span>
        </p>
        <p className="mt-0.5 inline-flex items-center gap-1 text-[13px] text-muted-foreground">
          <MapPin size={13} aria-hidden="true" className="shrink-0" />
          <span className="truncate">{restaurant.area}</span>
        </p>
        {/* mt-auto: price and stars sit on the bottom line of every card in the row */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 pt-2">
          <span className="font-bold">{formatMoney(dish.pricePesewas)}</span>
          <span className="text-[13px] text-muted-foreground">
            <RatingBadge
              averageRating={restaurant.averageRating}
              reviewCount={restaurant.reviewCount}
            />
          </span>
        </div>
      </div>
    </Card>
  );
};

export default DishCard;
