import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export const hashPassword = (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = (password, hash) => {
  return bcrypt.compare(password, hash);
};
