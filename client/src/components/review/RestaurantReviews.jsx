import { useInfiniteQuery } from "@tanstack/react-query";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Skeleton from "@/components/common/Skeleton";
import Stars from "./Stars";
import RatingBadge from "./RatingBadge";
import { getRestaurantReviewsRequest } from "@/api/reviews";
import { formatDateTime } from "@/utils/date";

// The reviews on a restaurant page, newest first, 20 at a time [AC-REV-05].
// useInfiniteQuery keeps every page loaded so far; "Show more reviews" fetches the next one
// and adds it underneath.
const RestaurantReviews = ({ restaurant }) => {
  const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["restaurant-reviews", restaurant.id],
      queryFn: ({ pageParam }) => getRestaurantReviewsRequest(restaurant.id, pageParam),
      initialPageParam: 1,
      // The next page number, or undefined when there are no more pages
      getNextPageParam: (lastPage) => {
        if (lastPage.meta.page < lastPage.meta.totalPages) {
          return lastPage.meta.page + 1;
        }
        return undefined;
      },
    });

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Heading level={2}>Reviews</Heading>
        <span className="text-[15px] text-muted-foreground">
          <RatingBadge
            averageRating={restaurant.averageRating}
            reviewCount={restaurant.reviewCount}
          />
        </span>
      </div>

      <ReviewList
        data={data}
        isPending={isPending}
        error={error}
        onShowMore={fetchNextPage}
        hasMore={hasNextPage}
        isLoadingMore={isFetchingNextPage}
      />
    </section>
  );
};

const ReviewList = ({ data, isPending, error, onShowMore, hasMore, isLoadingMore }) => {
  if (isPending) {
    return (
      <div role="status" className="mt-4 space-y-3">
        <span className="sr-only">Loading reviews</span>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  // Reviews are extra: if they can't load, say so quietly and keep the menu usable
  if (error) {
    return (
      <Text muted className="mt-3">
        Reviews couldn't load right now.
      </Text>
    );
  }

  // Every page's reviews, one after the other
  const reviews = data.pages.flatMap((page) => page.reviews);

  if (reviews.length === 0) {
    return (
      <Text muted className="mt-3">
        No reviews yet. Order and be the first to review!
      </Text>
    );
  }

  return (
    <>
      <ul className="mt-4 divide-y divide-border">
        {reviews.map((review) => (
          <li key={review.id} className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">{review.customerName}</p>
              <Text size="small" muted>
                {formatDateTime(review.createdAt)}
              </Text>
            </div>
            <Stars rating={review.rating} size={14} className="mt-1" />
            {/* Plain text: React shows anything typed, even "<script>", as text [AC-REV-08] */}
            {review.comment && (
              <p className="mt-2 break-words whitespace-pre-line">{review.comment}</p>
            )}
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          type="button"
          onClick={() => onShowMore()}
          disabled={isLoadingMore}
          className="mt-2 min-h-11 w-full rounded-md border border-border font-bold disabled:opacity-40"
        >
          {isLoadingMore ? "Loading…" : "Show more reviews"}
        </button>
      )}
    </>
  );
};

export default RestaurantReviews;
