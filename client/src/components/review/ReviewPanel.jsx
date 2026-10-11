import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import Card from "@/components/common/Card";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import { Button } from "@/components/ui/button";
import Stars from "./Stars";
import StarPicker from "./StarPicker";
import { editReviewRequest, getMyReviewRequest, writeReviewRequest } from "@/api/reviews";
import { formatDateTime } from "@/utils/date";

const COMMENT_MAX_LENGTH = 500;

// On a delivered order: write a review, see mine, or change it within 24 hours
// [AC-REV-01 to 03]. Only drawn for DELIVERED orders (see OrderDetailPage).
const ReviewPanel = ({ orderId }) => {
  const [isEditing, setIsEditing] = useState(false);

  const { data, isPending, error } = useQuery({
    queryKey: ["review", orderId],
    queryFn: () => getMyReviewRequest(orderId),
  });

  // Nothing to show while loading, or if it failed: the order page still works
  if (isPending || error) {
    return null;
  }

  const { review, canWrite, canEdit, canRateRider } = data;

  // Reviewed: show it, with "Change" during the first 24 hours
  if (review && !isEditing) {
    return (
      <Card className="mt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold">Your review</p>
            <Stars rating={review.rating} className="mt-1" />
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="min-h-11 px-2 font-bold text-primary"
            >
              Change
            </button>
          )}
        </div>
        {/* Plain text: React shows anything typed, even "<b>", as text [AC-REV-08] */}
        {review.comment && <p className="mt-2 break-words whitespace-pre-line">{review.comment}</p>}
        <Text size="small" muted className="mt-2">
          {formatDateTime(review.createdAt)}
        </Text>
      </Card>
    );
  }

  // Too late to write one (more than 7 days after delivery)
  if (!review && !canWrite) {
    return null;
  }

  return (
    <ReviewForm
      orderId={orderId}
      review={review}
      canRateRider={canRateRider}
      onDone={() => setIsEditing(false)}
    />
  );
};

// The form, empty for a new review or filled in to change one
const ReviewForm = ({ orderId, review, canRateRider, onDone }) => {
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(review ? review.rating : null);
  const [riderRating, setRiderRating] = useState(review ? review.riderRating : null);
  const [comment, setComment] = useState(review && review.comment ? review.comment : "");
  const [ratingError, setRatingError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Picking stars clears the "Choose 1 to 5 stars" message
  const handleRatingChange = (newRating) => {
    setRating(newRating);
    setRatingError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    // The restaurant's stars are the one thing we must have
    if (rating === null) {
      setRatingError("Choose 1 to 5 stars");
      return;
    }
    setRatingError("");

    const details = { rating, riderRating, comment };
    setIsSaving(true);
    try {
      if (review) {
        await editReviewRequest(orderId, details);
      } else {
        await writeReviewRequest(orderId, details);
      }
      // Fetch my review again: the panel now shows it
      await queryClient.invalidateQueries({ queryKey: ["review", orderId] });
      onDone();
    } catch (error) {
      setErrorMessage(error.message);
    }
    setIsSaving(false);
  };

  return (
    <Card className="mt-6">
      <Heading level={2}>{review ? "Change your review" : "How was your order?"}</Heading>

      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-5">
        <StarPicker
          name="rating"
          label="The food and the restaurant"
          value={rating}
          onChange={handleRatingChange}
          error={ratingError}
        />

        {canRateRider && (
          <StarPicker
            name="riderRating"
            label="Your rider"
            value={riderRating}
            onChange={setRiderRating}
            optional
          />
        )}

        <div>
          <label htmlFor="review-comment" className="font-bold">
            Comment <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="review-comment"
            rows={4}
            maxLength={COMMENT_MAX_LENGTH}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
          />
          <Text size="small" muted className="text-right">
            {comment.length}/{COMMENT_MAX_LENGTH}
          </Text>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive p-3 text-[15px] text-destructive"
          >
            <CircleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex gap-3">
          {/* Disabled while saving, so a double tap can't send two [AC-UX-05] */}
          <Button type="submit" disabled={isSaving} className="h-12 flex-1 text-base font-bold">
            {isSaving ? "Saving…" : review ? "Save changes" : "Send review"}
          </Button>
          {review && (
            <Button type="button" variant="outline" onClick={onDone} className="h-12">
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
};

export default ReviewPanel;
