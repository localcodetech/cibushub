import { z } from "zod";
import { phoneField } from "../fields.js";

export const addPhoneSchema = z
  .object({
    phone: phoneField,
  })
  .strict();
