import {
  categoryAvailabilitySchema,
  createCategorySchema,
  updateCategorySchema,
} from "../../validators/menu/category.validator.js";
import {
  createItemSchema,
  itemAvailabilitySchema,
  updateItemSchema,
} from "../../validators/menu/item.validator.js";
import { errorResponse, fileBody, jsonBody, pathParameter, successResponse } from "../helpers.js";

const exampleCategory = {
  id: "1c3e5a7b-2d4f-4a6b-8c0d-1e2f3a4b5c6d",
  restaurantId: "9b2f4c1e-3a7d-4e8f-9c21-5d6e7f8a9b0c",
  name: "Rice dishes",
  displayOrder: 0,
};

const exampleItem = {
  id: "7f8e9d0c-1b2a-4c3d-9e4f-5a6b7c8d9e0f",
  restaurantId: "9b2f4c1e-3a7d-4e8f-9c21-5d6e7f8a9b0c",
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
      name: "Extra protein",
      minSelect: 0,
      maxSelect: 2,
      displayOrder: 0,
      options: [
        {
          id: "3b4c5d6e-7f8a-4b9c-8d0e-1f2a3b4c5d6f",
          name: "Fried fish",
          extraPricePesewas: 1500,
          isAvailable: true,
          displayOrder: 0,
        },
      ],
    },
  ],
};

const tags = ["Owner: Menu"];
const loggedIn = [{ cookieAuth: [] }];
const menuUrl = "/api/v1/owner/restaurants/{restaurantId}/menu";

const restaurantId = pathParameter("restaurantId", "One of your restaurants");
const categoryId = pathParameter("categoryId", "A category in that restaurant");
const itemId = pathParameter("itemId", "An item in that restaurant");

const validationError = errorResponse("Invalid input", "VALIDATION_ERROR", "Invalid request data");
const categoryNotFound = errorResponse(
  "Not yours, or does not exist",
  "NOT_FOUND",
  "Category not found",
);
const itemNotFound = errorResponse(
  "Not yours, or does not exist",
  "NOT_FOUND",
  "Menu item not found",
);
const notApproved = errorResponse(
  "Owner not approved yet",
  "ACCOUNT_PENDING_APPROVAL",
  "Your account is waiting for admin approval",
);

export const ownerMenuPaths = {
  [menuUrl]: {
    get: {
      tags,
      summary: "My full menu, including sold-out items",
      description: "Every menu endpoint needs an approved (ACTIVE) owner account.",
      security: loggedIn,
      parameters: [restaurantId],
      responses: {
        200: successResponse("The menu", [{ ...exampleCategory, items: [exampleItem] }]),
        403: notApproved,
      },
    },
  },

  [`${menuUrl}/categories`]: {
    post: {
      tags,
      summary: "Add a category",
      security: loggedIn,
      parameters: [restaurantId],
      requestBody: jsonBody(createCategorySchema, { name: "Rice dishes" }),
      responses: {
        201: successResponse("Added", exampleCategory),
        400: validationError,
        403: notApproved,
      },
    },
  },

  [`${menuUrl}/categories/{categoryId}`]: {
    patch: {
      tags,
      summary: "Rename or move a category",
      security: loggedIn,
      parameters: [restaurantId, categoryId],
      requestBody: jsonBody(updateCategorySchema, { name: "Rice and beans", displayOrder: 1 }),
      responses: {
        200: successResponse("Saved", { ...exampleCategory, name: "Rice and beans" }),
        400: validationError,
        404: categoryNotFound,
      },
    },
    delete: {
      tags,
      summary: "Delete an empty category",
      security: loggedIn,
      parameters: [restaurantId, categoryId],
      responses: {
        200: successResponse("Deleted", null),
        404: categoryNotFound,
        409: errorResponse(
          "Still has items",
          "CATEGORY_NOT_EMPTY",
          "This category still has 3 item(s). Move or delete them first",
        ),
      },
    },
  },

  [`${menuUrl}/categories/{categoryId}/availability`]: {
    patch: {
      tags,
      summary: "Mark every item in a category available or sold out",
      security: loggedIn,
      parameters: [restaurantId, categoryId],
      requestBody: jsonBody(categoryAvailabilitySchema, { isAvailable: false }),
      responses: {
        200: successResponse("Saved", { itemsChanged: 4 }),
        400: validationError,
        404: categoryNotFound,
      },
    },
  },

  [`${menuUrl}/items`]: {
    post: {
      tags,
      summary: "Add a menu item with its option groups",
      description:
        "Prices are whole pesewas: 4500 means GHS 45.00. Zero, negative and decimal prices are refused.",
      security: loggedIn,
      parameters: [restaurantId],
      requestBody: jsonBody(createItemSchema, {
        categoryId: "1c3e5a7b-2d4f-4a6b-8c0d-1e2f3a4b5c6d",
        name: "Waakye Special",
        description: "Waakye with wele, egg, gari and shito",
        pricePesewas: 4500,
        tags: ["spicy"],
        optionGroups: [
          {
            name: "Extra protein",
            minSelect: 0,
            maxSelect: 2,
            options: [
              { name: "Fried fish", extraPricePesewas: 1500 },
              { name: "Boiled egg", extraPricePesewas: 300 },
            ],
          },
        ],
      }),
      responses: {
        201: successResponse("Added", exampleItem),
        400: validationError,
        403: notApproved,
      },
    },
  },

  [`${menuUrl}/items/{itemId}`]: {
    patch: {
      tags,
      summary: "Edit an item",
      description: "Send only what changes. Sending optionGroups replaces all of them.",
      security: loggedIn,
      parameters: [restaurantId, itemId],
      requestBody: jsonBody(updateItemSchema, { pricePesewas: 5000 }),
      responses: {
        200: successResponse("Saved", { ...exampleItem, pricePesewas: 5000 }),
        400: validationError,
        404: itemNotFound,
      },
    },
    delete: {
      tags,
      summary: "Delete an item",
      description: "Soft delete: it leaves the menu, but old orders still show it.",
      security: loggedIn,
      parameters: [restaurantId, itemId],
      responses: {
        200: successResponse("Deleted", null),
        404: itemNotFound,
      },
    },
  },

  [`${menuUrl}/items/{itemId}/availability`]: {
    patch: {
      tags,
      summary: "Mark one item available or sold out",
      security: loggedIn,
      parameters: [restaurantId, itemId],
      requestBody: jsonBody(itemAvailabilitySchema, { isAvailable: false }),
      responses: {
        200: successResponse("Saved", { ...exampleItem, isAvailable: false }),
        400: validationError,
        404: itemNotFound,
      },
    },
  },

  [`${menuUrl}/items/{itemId}/image`]: {
    put: {
      tags,
      summary: "Upload or replace a dish photo",
      description: "JPEG, PNG or WebP, at most 5 MB. Saved as WebP. The old photo is deleted.",
      security: loggedIn,
      parameters: [restaurantId, itemId],
      requestBody: fileBody("image", "The dish photo"),
      responses: {
        200: successResponse("Saved", {
          ...exampleItem,
          imageUrl: "https://res.cloudinary.com/demo/image/upload/cibushub/menu-items/abc.webp",
        }),
        400: errorResponse(
          "Wrong file type, over 5 MB, or no file",
          "UNSUPPORTED_FILE_TYPE",
          "Only these file types are allowed: image/jpeg, image/png, image/webp",
        ),
        404: itemNotFound,
      },
    },
  },
};
