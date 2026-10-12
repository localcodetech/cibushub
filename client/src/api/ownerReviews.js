import { api } from "@/lib/api";

// The owner's review calls [AC-REV-06].

// Reviews of my restaurants, newest first. unansweredOnly: just the ones waiting for a reply.
// Returns { reviews, meta }
export const getOwnerReviewsRequest = async (page, unansweredOnly) => {
  let path = "/owner/reviews?page=" + page;
  if (unansweredOnly) {
    path += "&unanswered=true";
  }
  const result = await api.get(path);
  return { reviews: result.data, meta: result.meta };
};

// My one public reply to a review
export const replyToReviewRequest = async (reviewId, reply) => {
  const result = await api.post("/owner/reviews/" + reviewId + "/reply", { reply });
  return result.data;
};
