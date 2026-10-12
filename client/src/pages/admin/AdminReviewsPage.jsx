import { useState } from "react";
import { Link } from "react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import StatusPill from "@/components/admin/StatusPill";
import ConfirmActionSheet from "@/components/admin/ConfirmActionSheet";
import Stars from "@/components/review/Stars";
import { getAdminReviewsRequest, hideReviewRequest, showReviewRequest } from "@/api/admin";
import { formatDateTime } from "@/utils/date";
import { cn } from "@/lib/utils";
import { List } from "@/components/common/List";

// The views. Abuse is usually in the 1- and 2-star reviews, so they come first.
const VIEWS = [
  { value: "low", label: "1–2 stars", filters: { hidden: false, maxRating: 2 } },
  { value: "shown", label: "All shown", filters: { hidden: false } },
  { value: "hidden", label: "Hidden", filters: { hidden: true } },
];

// /admin/reviews: hide abusive reviews, or show them again, with a reason [AC-ADM-09, AC-REV-07]
const AdminReviewsPage = () => {
  const queryClient = useQueryClient();
  const [view, setView] = useState("low");
  const [page, setPage] = useState(1);
  // { review, action: "hide" | "show" } while its sheet is open
  const [acting, setActing] = useState(null);

  const filters = { ...VIEWS.find((option) => option.value === view).filters, page };
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["admin-reviews", filters],
    queryFn: () => getAdminReviewsRequest(filters),
    placeholderData: keepPreviousData,
  });

  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    // The restaurant's public reviews and rating changed too
    queryClient.invalidateQueries({ queryKey: ["restaurant-reviews"] });
  };

  return (
    <Container>
      <section className="py-8">
        <Heading level={1}>Reviews</Heading>
        <Text muted className="mt-1">
          A hidden review disappears from the restaurant page and its rating. Hide only abuse,
          insults or personal details, not honest bad reviews.
        </Text>

        <div role="group" aria-label="Show" className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {VIEWS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setView(option.value);
                setPage(1);
              }}
              aria-pressed={view === option.value}
              className={cn(
                "min-h-11 shrink-0 rounded-full border px-4 font-bold",
                view === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {isPending && (
            <div role="status" className="space-y-3">
              <span className="sr-only">Loading reviews</span>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
          {error && <ErrorState message={error.message} onRetry={refetch} />}
          {data && data.reviews.length === 0 && (
            <EmptyState
              icon={MessageSquare}
              title={view === "hidden" ? "No hidden reviews" : "No reviews here"}
            />
          )}
          {data && data.reviews.length > 0 && (
            <List>
              {data.reviews.map((review) => (
                <li key={review.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Stars rating={review.rating} size={14} />
                    <span className="text-[13px] text-muted-foreground">
                      {formatDateTime(review.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    <Link to={"/admin/users/" + review.customer.id} className="underline">
                      {review.customer.fullName}
                    </Link>{" "}
                    on{" "}
                    <Link to={"/admin/restaurants/" + review.restaurant.id} className="underline">
                      {review.restaurant.name}
                    </Link>
                  </p>
                  {/* Plain text, never HTML [AC-REV-08] */}
                  {review.comment ? (
                    <p className="mt-2 break-words whitespace-pre-line">{review.comment}</p>
                  ) : (
                    <p className="mt-2 text-muted-foreground">No comment</p>
                  )}
                  {review.ownerReply && (
                    <p className="mt-2 border-l-2 border-primary pl-3 text-[15px]">
                      {review.ownerReply}
                    </p>
                  )}

                  {review.hiddenAt ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusPill label="Hidden" tone="red" />
                      <span className="text-[13px] text-muted-foreground">
                        {review.hiddenReason}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActing({ review, action: "show" })}
                        className="min-h-11 px-2 font-bold text-primary"
                      >
                        Show again
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActing({ review, action: "hide" })}
                      className="mt-2 min-h-11 rounded-md border border-border px-3 font-bold text-destructive"
                    >
                      Hide
                    </button>
                  )}
                </li>
              ))}
            </List>
          )}
        </div>

        {data && data.meta.totalPages > 1 && (
          <nav aria-label="Pages" className="mt-6 flex items-center justify-between gap-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="min-h-11 rounded-md border border-border px-4 font-bold disabled:opacity-40"
            >
              Previous
            </button>
            <Text size="small" muted>
              Page {data.meta.page} of {data.meta.totalPages}
            </Text>
            <button
              type="button"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage(page + 1)}
              className="min-h-11 rounded-md border border-border px-4 font-bold disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        )}
      </section>

      {acting && acting.action === "hide" && (
        <ConfirmActionSheet
          title="Hide this review?"
          description="It disappears from the restaurant page and its rating. You can show it again later."
          confirmLabel="Hide review"
          needsReason
          reasonMinLength={5}
          isDangerous
          onConfirm={async (reason) => {
            await hideReviewRequest(acting.review.id, reason);
            await refreshAll();
          }}
          onClose={() => setActing(null)}
        />
      )}
      {acting && acting.action === "show" && (
        <ConfirmActionSheet
          title="Show this review again?"
          description="It comes back on the restaurant page and counts in the rating again."
          confirmLabel="Show review"
          needsReason
          reasonMinLength={5}
          onConfirm={async (reason) => {
            await showReviewRequest(acting.review.id, reason);
            await refreshAll();
          }}
          onClose={() => setActing(null)}
        />
      )}
    </Container>
  );
};

export default AdminReviewsPage;
