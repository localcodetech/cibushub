import pkg from "../../package.json" with { type: "json" };
import { sendSuccess } from "../utils/response.js";

export const getHealth = (req, res) => {
  return sendSuccess(res, {
    status: "ok",
    version: pkg.version,
    uptime: Math.floor(process.uptime()),
  });
};
