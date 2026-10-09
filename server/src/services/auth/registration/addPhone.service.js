import AppError from "../../../utils/AppError.js";
import {
  findUserByPhone,
  findUserById,
  updateUser,
} from "../../../repositories/user.repository.js";
import { sendOtp } from "../otp.service.js";

// Saves the phone of a logged-in user who hasn't verified one yet, and texts a code.
// Used after Google / Apple sign-in, and to fix a mistyped number before verifying.
export const addPhone = async (user, phone) => {
  if (user.phoneVerifiedAt) {
    throw new AppError(
      409,
      "PHONE_ALREADY_VERIFIED",
      "Your phone is already verified. Change it from your profile",
    );
  }

  const owner = await findUserByPhone(phone);
  if (owner && owner.id !== user.id) {
    throw new AppError(409, "PHONE_TAKEN", "This phone number is already used by another account");
  }

  if (user.phone !== phone) {
    try {
      await updateUser(user, { phone });
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        throw new AppError(
          409,
          "PHONE_TAKEN",
          "This phone number is already used by another account",
        );
      }
      throw error;
    }
  }

  await sendOtp(phone);

  return await findUserById(user.id);
};
