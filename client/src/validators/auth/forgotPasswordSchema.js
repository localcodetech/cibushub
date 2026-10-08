import { z } from "zod";
import { identifierField } from "./fields";

// Forgot password: which account? [AC-AUTH-18]
export const forgotPasswordSchema = z.object({
  identifier: identifierField,
});
