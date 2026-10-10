import {
  getMyRiderApplication,
  saveRiderDetails,
  saveRiderDocument,
  saveRiderPhoto,
  submitRiderApplication,
} from "../../services/rider/riderApplication.service.js";
import { sendSuccess } from "../../utils/response.js";

export const getApplication = async (req, res) => {
  const application = await getMyRiderApplication(req.user.id);

  return sendSuccess(res, application);
};

export const saveDetails = async (req, res) => {
  const application = await saveRiderDetails(req.user.id, req.validated.body);

  return sendSuccess(res, application);
};

export const uploadPhoto = async (req, res) => {
  const application = await saveRiderPhoto(req.user.id, req.file);

  return sendSuccess(res, application);
};

export const uploadDocument = async (req, res) => {
  const application = await saveRiderDocument(
    req.user.id,
    req.validated.params.documentType,
    req.file,
  );

  return sendSuccess(res, application);
};

export const submit = async (req, res) => {
  const application = await submitRiderApplication(req.user.id);

  return sendSuccess(res, application);
};
