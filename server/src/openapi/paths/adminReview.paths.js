import {
  adminListReviewsSchema,
  moderateReviewSchema,
} from "../../validators/review/review.validator.js";
import {
  errorResponse,
  jsonBody,
  listResponse,
  pathParameter,
  queryParameters,
  successResponse,
} from "../helpers.js";

const tags = ["Admin: Reviews"];
const loggedIn = [{ cookieAuth: [] }];

const exampleReview = {
  id: "5b0c1f4e-9a7d-4c2b-8e1f-3d6a2b9c0e11",
  orderId: "0f1e2d3c-4b5a-4968-8776-655443322110",
  rating: 1,
  riderRating: 2,
  comment: "Abusive words here",
  ownerReply: null,
  hiddenAt: "2026-10-11T13:00:00.000Z",
  hiddenReason: "Insults the staff",
  hiddenBy: "7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f",
  customer: { id: "9a8b7c6d-5e4f-4321-8765-0fedcba98765", fullName: "Ama Owusu" },
  restaurant: { id: "1757f836-937d-4c2c-a944-fb593ac87e63", name: "Golden Pot Kitchen" },
  createdAt: "2026-10-11T12:00:00.000Z",
};

const moderated = (summary, description, action) => ({
  tags,
  summary,
  description,
  security: loggedIn,
  parameters: [pathParameter("reviewId", "Any review")],
  requestBody: jsonBody(moderateReviewSchema, { reason: "Insults the staff" }),
  responses: {
    200: successResponse("Done", exampleReview),
    400: errorResponse("No reason", "VALIDATION_ERROR", "Invalid request data"),
    404: errorResponse("No such review", "NOT_FOUND", "Review not found"),
    409: errorResponse("Already in that state", action, "This review is already hidden"),
  },
});

export const adminReviewPaths = {
  "/api/v1/admin/reviews": {
    get: {
      tags,
      summary: "Every review, hidden ones too, newest first",
      description: "Filters: hidden=true|false, restaurantId, maxRating (e.g. 2 for 1-2 stars).",
      security: loggedIn,
      parameters: queryParameters(adminListReviewsSchema),
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
  "/api/v1/admin/reviews/{reviewId}/hide": {
    post: moderated(
      "Hide an abusive review",
      "In one transaction: hidden, its stars leave the restaurant's (and rider's) averages, and an audit log line records who and why [AC-REV-07, AC-ADM-07].",
      "REVIEW_ALREADY_HIDDEN",
    ),
  },
  "/api/v1/admin/reviews/{reviewId}/show": {
    post: moderated(
      "Show a hidden review again",
      "Back in the list and the averages; audited with the reason.",
      "REVIEW_NOT_HIDDEN",
    ),
  },
};
