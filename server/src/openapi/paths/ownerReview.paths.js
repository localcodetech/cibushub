import { listOwnerReviewsSchema, replySchema } from "../../validators/review/review.validator.js";
import {
  errorResponse,
  jsonBody,
  listResponse,
  pathParameter,
  queryParameters,
  successResponse,
} from "../helpers.js";

const tags = ["Owner: Reviews"];
const loggedIn = [{ cookieAuth: [] }];

const exampleReview = {
  id: "5b0c1f4e-9a7d-4c2b-8e1f-3d6a2b9c0e11",
  restaurant: { id: "1757f836-937d-4c2c-a944-fb593ac87e63", name: "Golden Pot Kitchen" },
  customerName: "Kofi A.",
  rating: 2,
  comment: "Food was cold when it arrived.",
  createdAt: "2026-10-11T12:00:00.000Z",
  ownerReply: null,
  ownerRepliedAt: null,
};

export const ownerReviewPaths = {
  "/api/v1/owner/reviews": {
    get: {
      tags,
      summary: "Reviews of my restaurants, newest first",
      description: "?unanswered=true shows only the ones still waiting for my reply.",
      security: loggedIn,
      parameters: queryParameters(listOwnerReviewsSchema),
      responses: {
        200: listResponse("One page of reviews", exampleReview, {
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
        }),
      },
    },
  },
  "/api/v1/owner/reviews/{reviewId}/reply": {
    post: {
      tags,
      summary: "My one public reply to a review",
      description:
        "Shown under the review on the restaurant page; the customer gets an in-app notification. One reply per review, not editable [AC-REV-06].",
      security: loggedIn,
      parameters: [pathParameter("reviewId", "A review of one of my restaurants")],
      requestBody: jsonBody(replySchema, { reply: "Sorry, Kofi! We've added heated bags." }),
      responses: {
        200: successResponse("Replied", {
          ...exampleReview,
          ownerReply: "Sorry, Kofi! We've added heated bags.",
          ownerRepliedAt: "2026-10-11T12:30:00.000Z",
        }),
        400: errorResponse("Empty or too long", "VALIDATION_ERROR", "Invalid request data"),
        404: errorResponse("Not my restaurant's review", "NOT_FOUND", "Review not found"),
        409: errorResponse(
          "Already replied",
          "ALREADY_REPLIED",
          "You have already replied to this review",
        ),
      },
    },
  },
};
