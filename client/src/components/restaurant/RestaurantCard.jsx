import { Link } from "react-router";
import { Clock, MapPin } from "lucide-react";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import { formatMoney } from "@/utils/money";
import RatingBadge from "@/components/review/RatingBadge";
import Card from "@/components/common/Card";
import CoverPlaceholder from "./CoverPlaceholder";
import StatusBadge from "@/components/common/StatusBadge";
import TopRatedBadge from "@/components/common/TopRatedBadge";
import { isTopRatedRestaurant } from "@/utils/topRated";

// One restaurant in the listing. The whole card is a link to its menu [AC-DISC-01].
// restaurant: one item from GET /restaurants
const RestaurantCard = ({ restaurant }) => {
  const isOpen = restaurant.openStatus.isOpen;

  return (
    <Card
      as={Link}
      to={"/restaurants/" + restaurant.id}
      interactive
      padding="none"
      className="overflow-hidden"
    >
      <CoverImage url={restaurant.coverImageUrl} name={restaurant.name} isOpen={isOpen} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Heading level={3}>{restaurant.name}</Heading>
          {/* Open / Closed / Opens at 18:00, worked out by the server in Ghana time [AC-DISC-04] */}
          <StatusBadge
            label={restaurant.openStatus.label}
            tone={isOpen ? "success" : "neutral"}
            icon={isOpen ? undefined : Clock}
          />
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
          <RatingBadge
            averageRating={restaurant.averageRating}
            reviewCount={restaurant.reviewCount}
          />
          {isTopRatedRestaurant(restaurant) && (
            <TopRatedBadge label="Top rated" explain="Customers rate it 4.5 stars or more" />
          )}
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
    </Card>
  );
};

// The photo at the top of the card, or a plain block with an icon if there is none [AC-IMG-05]
const CoverImage = ({ url, name, isOpen }) => {
  if (!url) {
    return <CoverPlaceholder name={name} dimmed={!isOpen} />;
  }

  return (
    <img
      src={url}
      alt={name}
      // lazy: the phone only downloads the photo when it scrolls near the screen
      loading="lazy"
      // Closed restaurants look faded so open ones stand out
      // The card is a "group": hovering it zooms the photo gently (the card clips the edges)
      className={
        "aspect-video w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" +
        (isOpen ? "" : " opacity-60")
      }
    />
  );
};

export default RestaurantCard;
