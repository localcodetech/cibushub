import { z } from "zod";
import { identifierField } from "../fields.js";

export const loginSchema = z
  .object({
    identifier: identifierField,
    password: z.string().min(1, "Enter your password").max(72, "Password is too long"),
  })
  .strict();
