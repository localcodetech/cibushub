import { User } from "../../src/models/index.js";
import { hashPassword } from "../../src/utils/auth/password.js";

export const TEST_PASSWORD = "Kofi2026";

export const createTestUser = async (overrides = {}) => {
  return User.create({
    fullName: "Test User",
    email: "user@example.com",
    phone: "+233241234567",
    passwordHash: await hashPassword(TEST_PASSWORD),
    role: "CUSTOMER",
    status: "ACTIVE",
    ...overrides,
  });
};

export const cookieValue = (response, name) => {
  const cookies = response.headers["set-cookie"] || [];
  const cookie = cookies.find((line) => line.startsWith(`${name}=`));

  return cookie ? cookie.split(";")[0].split("=")[1] : undefined;
};
