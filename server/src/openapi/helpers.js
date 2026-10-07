import { z } from "zod";

const toOpenApiSchema = (zodSchema) => {
  const jsonSchema = z.toJSONSchema(zodSchema, { io: "input" });
  delete jsonSchema.$schema;
  return jsonSchema;
};

export const jsonBody = (zodSchema, example) => ({
  required: true,
  content: {
    "application/json": {
      schema: toOpenApiSchema(zodSchema),
      example,
    },
  },
});

export const successResponse = (description, exampleData) => ({
  description,
  content: {
    "application/json": {
      example: { success: true, data: exampleData, meta: {} },
    },
  },
});

export const errorResponse = (description, code, message) => ({
  description,
  content: {
    "application/json": {
      example: { success: false, error: { code, message, details: [] } },
    },
  },
});

// ?page=1&q=jollof → one Swagger input box per query field, built from the Zod schema
export const queryParameters = (zodSchema) => {
  const jsonSchema = toOpenApiSchema(zodSchema);
  const requiredFields = jsonSchema.required || [];

  return Object.entries(jsonSchema.properties).map(([name, fieldSchema]) => ({
    name,
    in: "query",
    required: requiredFields.includes(name),
    schema: fieldSchema,
  }));
};

// /restaurants/{restaurantId} → the ID box in Swagger
export const pathParameter = (name, description) => ({
  name,
  in: "path",
  required: true,
  description,
  schema: { type: "string", format: "uuid" },
});

// A list response with pagination info in meta [AC-GLOBAL-04]
export const listResponse = (description, exampleItem, meta) => ({
  description,
  content: {
    "application/json": {
      example: { success: true, data: [exampleItem], meta },
    },
  },
});

// A form with one file in it (logo, dish photo, document) → a file picker in Swagger
export const fileBody = (fieldName, description) => ({
  required: true,
  content: {
    "multipart/form-data": {
      schema: {
        type: "object",
        required: [fieldName],
        properties: {
          [fieldName]: { type: "string", format: "binary", description },
        },
      },
    },
  },
});
