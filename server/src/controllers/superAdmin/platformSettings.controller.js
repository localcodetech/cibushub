import {
  getSettings,
  listSettingsHistory,
  updateSettings,
} from "../../services/settings/platformSettings.service.js";
import { sendSuccess } from "../../utils/response.js";

export const showSettings = async (req, res) => {
  const [current, history] = await Promise.all([getSettings(), listSettingsHistory()]);

  return sendSuccess(res, { ...current, history });
};

export const changeSettings = async (req, res) => {
  const { settings, reason } = req.validated.body;
  const superAdmin = { id: req.user.id, ipAddress: req.ip };
  const updated = await updateSettings(superAdmin, settings, reason);

  return sendSuccess(res, updated);
};
