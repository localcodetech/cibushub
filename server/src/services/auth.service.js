import AppError from "../utils/AppError.js";
import { hashPassword } from "../utils/password.js";
import {
  createUser,
  findUserByEmailOrPhone,
  findUserById,
} from "../repositories/user.repository.js";



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

  return await findUserById(user.id);
};
