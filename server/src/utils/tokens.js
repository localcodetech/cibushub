import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import env from "../config/env/env.js";

export const ACCESS_TOKEN_LIFETIME_SECONDS = 15 * 60;
export const REFRESH_TOKEN_LIFETIME_SECONDS = 7 * 24 * 60 * 60;

export const signAccessToken = (user) => {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_ACCESS_SECRET, {
    algorithm: "HS256",
    expiresIn: ACCESS_TOKEN_LIFETIME_SECONDS,
  });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] });
};

export const generateRefreshToken = () => {
  return randomBytes(32).toString("base64url");
};

export const hashRefreshToken = (token) => {
  return createHash("sha256").update(token).digest("hex");
};
