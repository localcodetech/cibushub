import { Clock, MapPin, ShoppingBag, UtensilsCrossed } from "lucide-react";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import { formatMoney } from "@/utils/money";
import RatingBadge from "@/components/review/RatingBadge";
import StatusBadge from "@/components/common/StatusBadge";

// The top of a restaurant page: cover photo, name, open status and the key facts [AC-DISC-10].
// restaurant: the data from GET /restaurants/:id
const RestaurantHeader = ({ restaurant }) => {
  const isOpen = restaurant.openStatus.isOpen;

  return (
    <div>
      {restaurant.coverImageUrl ? (
        <img
          src={restaurant.coverImageUrl}
          alt={restaurant.name}
          className="aspect-21/9 w-full rounded-lg object-cover"
        />
      ) : (
        <div className="flex aspect-21/9 w-full items-center justify-center rounded-lg bg-muted">
          <UtensilsCrossed size={40} className="text-muted-foreground" aria-hidden="true" />
        </div>
      )}

      <div className="mt-4 flex items-start justify-between gap-3">
        <Heading level={1}>{restaurant.name}</Heading>
        <StatusBadge
          label={restaurant.openStatus.label}
          tone={isOpen ? "success" : "neutral"}
          icon={isOpen ? undefined : Clock}
          className="mt-1"
        />
      </div>

      <Text size="small" muted className="mt-1 capitalize">
        {restaurant.cuisineTags.join(" · ")}
      </Text>

      {restaurant.description && <Text className="mt-3">{restaurant.description}</Text>}

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[15px] text-muted-foreground">
        {/* Tapping the rating jumps down to the reviews */}
        <a href="#reviews">
          <RatingBadge
            averageRating={restaurant.averageRating}
            reviewCount={restaurant.reviewCount}
          />
        </a>
        <span className="inline-flex items-center gap-1.5">
          <Clock size={16} aria-hidden="true" />
          About {restaurant.prepTimeMinutes} min to prepare
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShoppingBag size={16} aria-hidden="true" />
          Min. order {formatMoney(restaurant.minOrderPesewas)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={16} aria-hidden="true" />
          {restaurant.addressLine}, {restaurant.area}
        </span>
      </div>

      {/* Closed restaurants still show their menu, but customers know they can't order yet */}
      {!isOpen && (
        <div role="status" className="mt-4 rounded-md bg-muted px-4 py-3 text-[15px]">
          This restaurant is not taking orders right now. You can still look at the menu.
        </div>
      )}
    </div>
  );
};

export default RestaurantHeader;
