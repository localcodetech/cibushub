import { z } from "zod";
import { otpCodeField } from "./fields";

// The code from the SMS, same rule as the server [AC-AUTH-03]
export const verifyPhoneSchema = z.object({
  code: otpCodeField,
});
