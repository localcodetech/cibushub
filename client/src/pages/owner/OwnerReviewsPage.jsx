import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import Container from "@/layouts/Container";
import Card from "@/components/common/Card";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import Stars from "@/components/review/Stars";
import { getOwnerReviewsRequest, replyToReviewRequest } from "@/api/ownerReviews";
import { formatDateTime } from "@/utils/date";
import { cn } from "@/lib/utils";

const REPLY_MAX_LENGTH = 500;

// /owner/reviews: what customers said, and one public reply to each [AC-REV-06]
const OwnerReviewsPage = () => {
  const [page, setPage] = useState(1);
  const [unansweredOnly, setUnansweredOnly] = useState(false);

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["owner-reviews", { page, unansweredOnly }],
    queryFn: () => getOwnerReviewsRequest(page, unansweredOnly),
    placeholderData: keepPreviousData,
  });

  const handleShowAll = () => {
    setUnansweredOnly(false);
    setPage(1);
  };

  const handleShowUnanswered = () => {
    setUnansweredOnly(true);
    setPage(1);
  };

  return (
    <Container>
      <section className="mx-auto max-w-2xl py-8">
        <Heading level={1}>Reviews</Heading>
        <Text muted className="mt-1">
          Your reply is public and shows under the review. You can reply once to each review.
        </Text>

        {/* All / Waiting for a reply */}
        <div role="group" aria-label="Show" className="mt-6 flex gap-2">
          <FilterButton isActive={!unansweredOnly} onClick={handleShowAll}>
            All
          </FilterButton>
          <FilterButton isActive={unansweredOnly} onClick={handleShowUnanswered}>
            Waiting for a reply
          </FilterButton>
        </div>

        <div className="mt-6">
          <ReviewList
            data={data}
            isPending={isPending}
            error={error}
            onRetry={refetch}
            unansweredOnly={unansweredOnly}
          />
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
    </Container>
  );
};

const FilterButton = ({ isActive, onClick, children }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "min-h-11 rounded-full border px-4 font-bold",
        isActive ? "border-primary bg-primary text-primary-foreground" : "border-border",
      )}
    >
      {children}
    </button>
  );
};

// Loading, error, empty or the list [AC-UX-02 to 04]
const ReviewList = ({ data, isPending, error, onRetry, unansweredOnly }) => {
  if (isPending) {
    return (
      <div role="status" className="space-y-3">
        <span className="sr-only">Loading reviews</span>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={onRetry} />;
  }

  if (data.reviews.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title={unansweredOnly ? "All caught up" : "No reviews yet"}
        message={
          unansweredOnly
            ? "Every review has your reply."
            : "Customers can review an order after it is delivered."
        }
      />
    );
  }

  return (
    <ul className="space-y-4">
      {data.reviews.map((review) => (
        <Card as="li" key={review.id}>
          <OwnerReview review={review} />
        </Card>
      ))}
    </ul>
  );
};

// One review, with my reply or the form to write it
const OwnerReview = ({ review }) => {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">{review.customerName}</p>
        <Text size="small" muted>
          {formatDateTime(review.createdAt)}
        </Text>
      </div>
      <Text size="small" muted>
        {review.restaurant.name}
      </Text>
      <Stars rating={review.rating} size={14} className="mt-1" />
      {/* Plain text, never HTML [AC-REV-08] */}
      {review.comment && <p className="mt-2 break-words whitespace-pre-line">{review.comment}</p>}

      {review.ownerReply ? (
        <div className="mt-3 border-l-2 border-primary pl-3">
          <p className="text-[13px] font-bold">Your reply</p>
          <p className="break-words whitespace-pre-line">{review.ownerReply}</p>
        </div>
      ) : (
        <ReplyForm reviewId={review.id} />
      )}
    </>
  );
};

const ReplyForm = ({ reviewId }) => {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (reply.trim().length < 2) {
      setErrorMessage("Write a reply");
      return;
    }

    setErrorMessage("");
    setIsSaving(true);
    try {
      await replyToReviewRequest(reviewId, reply);
      // Fetch the list again: the review now shows "Your reply"
      await queryClient.invalidateQueries({ queryKey: ["owner-reviews"] });
    } catch (error) {
      setErrorMessage(error.message);
    }
    setIsSaving(false);
  };

  const textareaId = "reply-" + reviewId;

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-3">
      <label htmlFor={textareaId} className="text-[15px] font-bold">
        Public reply
      </label>
      <textarea
        id={textareaId}
        rows={3}
        maxLength={REPLY_MAX_LENGTH}
        value={reply}
        onChange={(event) => setReply(event.target.value)}
        aria-invalid={errorMessage ? true : false}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
      />
      {errorMessage && (
        <p role="alert" className="text-[15px] text-destructive">
          {errorMessage}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between gap-3">
        <Text size="small" muted>
          {reply.length}/{REPLY_MAX_LENGTH}
        </Text>
        {/* Disabled while sending, so a double tap can't send twice [AC-UX-05] */}
        <Button type="submit" disabled={isSaving} className="h-11 font-bold">
          {isSaving ? "Sending…" : "Send reply"}
        </Button>
      </div>
    </form>
  );
};

export default OwnerReviewsPage;
