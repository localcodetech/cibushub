import { z } from "zod";
import { otpCodeField } from "./fields";

// The code from the email, same rule as the server [AC-AUTH-01]
export const verifyEmailSchema = z.object({
  code: otpCodeField,
});
