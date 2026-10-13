import {
  deleteAccountForAdmin,
  deleteMyAccount,
} from "../../services/profile/deleteAccount.service.js";
import { clearAuthCookies } from "../../utils/auth/cookies.js";
import { sendSuccess } from "../../utils/response.js";

// The person deletes their own account; this browser is logged out at once
export const deleteAccount = async (req, res) => {
  const { password } = req.validated.body;
  await deleteMyAccount(req.user.id, password, req.ip);

  clearAuthCookies(res);

  return sendSuccess(res, { message: "Your account has been deleted" });
};

// An admin deletes an account at the person's request, with a reason (audited)
export const deleteUserForAdmin = async (req, res) => {
  await deleteAccountForAdmin(
    { id: req.user.id, ipAddress: req.ip },
    req.params.userId,
    req.validated.body.reason,
  );

  return sendSuccess(res, { message: "The account has been deleted" });
};
