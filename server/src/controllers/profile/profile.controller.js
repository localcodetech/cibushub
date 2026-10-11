import {
  replaceMyAvatar,
  updateMyName,
  updateMyPreferences,
} from "../../services/profile/profile.service.js";
import { sendSuccess } from "../../utils/response.js";

export const updateProfile = async (req, res) => {
  const user = await updateMyName(req.user.id, req.validated.body.fullName);

  return sendSuccess(res, user);
};

export const updatePreferences = async (req, res) => {
  const user = await updateMyPreferences(req.user.id, req.validated.body);

  return sendSuccess(res, user);
};

export const uploadAvatar = async (req, res) => {
  const user = await replaceMyAvatar(req.user.id, req.file);

  return sendSuccess(res, user);
};
