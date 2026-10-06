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
