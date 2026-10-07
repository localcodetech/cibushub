import { z } from "zod";
import { emailField, otpCodeField, phoneField } from "../auth/fields.js";

// Step 1: ask for a code to be sent to the new phone or email [AC-CUST-02]
export const changePhoneSchema = z.object({ phone: phoneField }).strict();

export const changeEmailSchema = z.object({ email: emailField }).strict();

// Step 2: send back the code that arrived
export const confirmChangeSchema = z.object({ code: otpCodeField }).strict();
