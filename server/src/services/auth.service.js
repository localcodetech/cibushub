import AppError from "../utils/AppError.js";
import { hashPassword } from "../utils/password.js";
import {
  createUser,
  findUserByEmailOrPhone,
  findUserById,
  findUserByPhone,
  updateUser,
} from "../repositories/user.repository.js";
import { sendOtp, verifyOtp } from "./otp.service.js";

export const registerUser = async (data) => {
  const existing = await findUserByEmailOrPhone(data.email, data.phone);

  if (existing) {
    throw new AppError(409, "ACCOUNT_EXISTS", "An account with these details already exists");
  }

  const passwordHash = await hashPassword(data.password);

  const status = data.role === "CUSTOMER" ? "PENDING_VERIFICATION" : "PENDING_APPROVAL";

  let user;
  try {
    user = await createUser({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      passwordHash,
      role: data.role,
      status,
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      throw new AppError(409, "ACCOUNT_EXISTS", "An account with these details already exists");
    }
    throw error;
  }

  await sendOtp(user.phone);

  return await findUserById(user.id);
};

export const verifyPhone = async (phone, code) => {
  await verifyOtp(phone, code);

  const user = await findUserByPhone(phone);
  if (!user) {
    throw new AppError(404, "NOT_FOUND", "Account not found");
  }

  const changes = { phoneVerifiedAt: new Date() };

  if (user.status === "PENDING_VERIFICATION") {
    changes.status = "ACTIVE";
  }

  return await updateUser(user, changes);
};

export const resendVerificationOtp = async (phone) => {
  const user = await findUserByPhone(phone);

  if (!user || user.phoneVerifiedAt) {
    return;
  }

  await sendOtp(phone);
};
