import { z } from "zod";
import { identifierField } from "../fields.js";

export const forgotPasswordSchema = z
  .object({
    identifier: identifierField,
  })
  .strict();
