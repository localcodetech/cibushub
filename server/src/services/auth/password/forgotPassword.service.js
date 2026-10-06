import { findUserByEmailOrPhone } from "../../../repositories/user.repository.js";
import { sendOtp } from "../otp.service.js";

export const requestPasswordReset = async (identifier) => {
  const user = await findUserByEmailOrPhone(identifier, identifier);

  if (!user || user.status === "SUSPENDED") {
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
