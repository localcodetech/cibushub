import { findUserByEmailOrPhone } from "../../../repositories/user.repository.js";
import { sendOtp } from "../otp.service.js";

export const requestPasswordReset = async (identifier) => {
  const user = await findUserByEmailOrPhone(identifier, identifier);

  // No phone yet (Google / Apple user): nowhere to send the code
  if (!user || user.status === "SUSPENDED" || !user.phone) {
    return;
  }

  try {
    await sendOtp(user.phone, "reset");
  } catch (error) {
    if (error.statusCode === 429) {
      return;
    }
    throw error;
  }
};
