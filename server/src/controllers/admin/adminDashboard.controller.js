import { getDashboard } from "../../services/admin/dashboard.service.js";
import { sendSuccess } from "../../utils/response.js";

export const showDashboard = async (req, res) => {
  const dashboard = await getDashboard();

  return sendSuccess(res, dashboard);
};
