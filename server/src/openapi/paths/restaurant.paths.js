import { publicListRestaurantsSchema } from "../../validators/restaurant/publicListRestaurants.validator.js";
import { publicListDishesSchema } from "../../validators/restaurant/publicListDishes.validator.js";
import { listReviewsSchema } from "../../validators/review/review.validator.js";
import {
  errorResponse,
  listResponse,
  pathParameter,
  queryParameters,
  successResponse,
} from "../helpers.js";

const exampleCard = {
  id: "9b2f4c1e-3a7d-4e8f-9c21-5d6e7f8a9b0c",
  name: "Auntie Akos Kitchen",
  description: "Home-style Ghanaian dishes, cooked fresh every morning",
  cuisineTags: ["ghanaian", "local"],
  area: "Adum",
  city: "Kumasi",
  logoUrl: null,
  coverImageUrl: null,
  minOrderPesewas: 3000,
  prepTimeMinutes: 25,
  deliveryRadiusKm: 8,
  openStatus: { isOpen: true, label: "Open" },
  createdAt: "2026-10-06T09:00:00.000Z",
};

const exampleMenu = [
  {
    id: "1c3e5a7b-2d4f-4a6b-8c0d-1e2f3a4b5c6d",
    restaurantId: exampleCard.id,
    name: "Rice dishes",
    displayOrder: 0,
    items: [
      {
        id: "7f8e9d0c-1b2a-4c3d-9e4f-5a6b7c8d9e0f",
        restaurantId: exampleCard.id,
        categoryId: "1c3e5a7b-2d4f-4a6b-8c0d-1e2f3a4b5c6d",
        name: "Waakye Special",
        description: "Waakye with wele, egg, gari and shito",
        pricePesewas: 4500,
        imageUrl: null,
        tags: ["spicy"],
        isAvailable: true,
        dailyStock: null,
        stockRemaining: null,
        displayOrder: 0,
        optionGroups: [
          {
            id: "2a3b4c5d-6e7f-4a8b-9c0d-1e2f3a4b5c6e",
            menuItemId: "7f8e9d0c-1b2a-4c3d-9e4f-5a6b7c8d9e0f",
            name: "Extra protein",
            minSelect: 0,
            maxSelect: 2,
            displayOrder: 0,
            options: [
              {
                id: "3b4c5d6e-7f8a-4b9c-8d0e-1f2a3b4c5d6f",
                optionGroupId: "2a3b4c5d-6e7f-4a8b-9c0d-1e2f3a4b5c6e",
                name: "Fried fish",
                extraPricePesewas: 1500,
                isAvailable: true,
                displayOrder: 0,
              },
            ],
          },
        ],
      },
    ],
  },
];

const tags = ["Restaurants"];

const notFound = errorResponse("Not found or not approved", "NOT_FOUND", "Restaurant not found");

export const restaurantPaths = {
  "/api/v1/dishes": {
    get: {
      tags,
      summary: "Dish search: the same dish from every kitchen that cooks it",
      description:
        "No login needed. Dishes whose name or description match q, from approved restaurants only. Order: dishes that can be ordered now (kitchen open, not sold out) first, then dishes NAMED after the words, then nearest (with latitude and longitude) or cheapest. The website opens /restaurants/:id?dish=:dishId from each result.",
      parameters: queryParameters(publicListDishesSchema),
      responses: {
        200: listResponse(
          "One page of dishes",
          {
            id: "7f8e9d0c-1b2a-4c3d-9e4f-5a6b7c8d9e0f",
            name: "Waakye Special",
            description: "Waakye with wele, egg, gari and shito",
            pricePesewas: 4500,
            imageUrl: null,
            tags: ["spicy"],
            isAvailable: true,
            stockRemaining: null,
            restaurant: {
              id: exampleCard.id,
              name: exampleCard.name,
              area: exampleCard.area,
              prepTimeMinutes: exampleCard.prepTimeMinutes,
              openStatus: exampleCard.openStatus,
              averageRating: 4.5,
              reviewCount: 12,
              distanceKm: 1.4,
              deliversToYou: true,
            },
          },
          { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
        ),
        400: errorResponse("No words, or bad filters", "VALIDATION_ERROR", "Invalid request data"),
      },
    },
  },
  "/api/v1/restaurants": {
    get: {
      tags,
      summary: "Browse and search approved restaurants",
      description:
        "No login needed. Only approved restaurants are listed. Send latitude and longitude to get distanceKm and deliversToYou, and to sort by distance. A search (q) also returns up to 3 matchingDishes per restaurant.",
      parameters: queryParameters(publicListRestaurantsSchema),
      responses: {
        200: listResponse(
          "One page of restaurants",
          {
            ...exampleCard,
            distanceKm: 1.4,
            deliversToYou: true,
            matchingDishes: [
              {
                id: "7f8e9d0c-1b2a-4c3d-9e4f-5a6b7c8d9e0f",
                restaurantId: exampleCard.id,
                name: "Waakye Special",
                pricePesewas: 4500,
                isAvailable: true,
              },
            ],
          },
          { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
        ),
        400: errorResponse("Invalid filters", "VALIDATION_ERROR", "Invalid request data"),
      },
    },
  },

  "/api/v1/restaurants/{restaurantId}": {
    get: {
      tags,
      summary: "One approved restaurant with its full menu",
      description:
        "No login needed. Pending, rejected and suspended restaurants return 404, as if they did not exist.",
      parameters: [pathParameter("restaurantId", "The restaurant's ID")],
      responses: {
        200: successResponse("The restaurant page", {
          ...exampleCard,
          phone: "+233241234567",
          addressLine: "12 Prempeh II Street",
          latitude: 6.6885,
          longitude: -1.6244,
          openingHours: [
            { dayOfWeek: 1, isClosed: false, opensAt: "08:00:00", closesAt: "21:00:00" },
          ],
          menu: exampleMenu,
        }),
        404: notFound,
      },
    },
  },
  "/api/v1/restaurants/{restaurantId}/reviews": {
    get: {
      tags,
      summary: "A restaurant's reviews, newest first (no login needed)",
      description:
        "Customer shown as first name and last initial. comment is plain text: show it as text, never as HTML [AC-REV-05, AC-REV-08]. The average and count are on the restaurant itself (averageRating, reviewCount).",
      parameters: [
        {
          name: "restaurantId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
        ...queryParameters(listReviewsSchema),
      ],
      responses: {
        200: listResponse(
          "One page of reviews",
          {
            id: "5b0c1f4e-9a7d-4c2b-8e1f-3d6a2b9c0e11",
            customerName: "Ama O.",
            rating: 4,
            comment: "Hot and tasty, rider was quick!",
            createdAt: "2026-10-11T12:00:00.000Z",
          },
          { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
        ),
        404: notFound,
      },
    },
  },
};
