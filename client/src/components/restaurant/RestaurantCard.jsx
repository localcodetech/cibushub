import { Link } from "react-router";
import { Clock, MapPin, UtensilsCrossed } from "lucide-react";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import { formatMoney } from "@/utils/money";

// One restaurant in the listing. The whole card is a link to its menu [AC-DISC-01].
// restaurant: one item from GET /restaurants
const RestaurantCard = ({ restaurant }) => {
  const isOpen = restaurant.openStatus.isOpen;

  return (
    <Link
      to={"/restaurants/" + restaurant.id}
      className="block overflow-hidden rounded-lg border border-border bg-card text-card-foreground"
    >
      <CoverImage url={restaurant.coverImageUrl} name={restaurant.name} isOpen={isOpen} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Heading level={3}>{restaurant.name}</Heading>
          {/* Open / Closed / Opens at 18:00, worked out by the server in Ghana time [AC-DISC-04] */}
          <span
            className={
              isOpen
                ? "shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[13px] font-bold text-primary"
                : "shrink-0 rounded-full bg-muted px-2 py-0.5 text-[13px] font-bold text-muted-foreground"
            }
          >
            {restaurant.openStatus.label}
          </span>
        </div>

        {/* ["ghanaian", "grill"] -> "ghanaian · grill" */}
        <Text size="small" muted className="mt-1 capitalize">
          {restaurant.cuisineTags.join(" · ")}
        </Text>

        {/* Only when searching: the dishes that matched, e.g. "Waakye Special" [AC-DISC-05] */}
        {restaurant.matchingDishes && restaurant.matchingDishes.length > 0 && (
          <Text size="small" className="mt-2">
            <span className="font-bold">Matches: </span>
            {restaurant.matchingDishes.map((dish) => dish.name).join(", ")}
          </Text>
        )}

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock size={14} aria-hidden="true" />
            {restaurant.prepTimeMinutes} min
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin size={14} aria-hidden="true" />
            {restaurant.area}
          </span>
          <span>Min. order {formatMoney(restaurant.minOrderPesewas)}</span>
        </div>
      </div>
    </Link>
  );
};

// The photo at the top of the card, or a plain block with an icon if there is none [AC-IMG-05]
const CoverImage = ({ url, name, isOpen }) => {
  if (!url) {
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-muted">
        <UtensilsCrossed size={32} className="text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name}
      // lazy: the phone only downloads the photo when it scrolls near the screen
      loading="lazy"
      // Closed restaurants look faded so open ones stand out
      className={
        isOpen ? "aspect-video w-full object-cover" : "aspect-video w-full object-cover opacity-60"
      }
    />
  );
};

export default RestaurantCard;
