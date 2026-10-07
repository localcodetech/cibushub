import { z } from "zod";
import { DOCUMENT_TYPES } from "../../models/restaurant/restaurantDocument.model.js";

// /documents/FDA_CERTIFICATE → the type must be one we know
export const documentTypeParamsSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES),
});
