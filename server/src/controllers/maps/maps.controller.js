import { reverseGeocode, searchPlaces } from "../../services/maps/geocoding.service.js";
import { sendSuccess } from "../../utils/response.js";

export const getPlaceForPin = async (req, res) => {
  const { latitude, longitude } = req.validated.query;
  const place = await reverseGeocode(latitude, longitude);

  return sendSuccess(res, place);
};

export const findPlaces = async (req, res) => {
  const places = await searchPlaces(req.validated.query.q);

  return sendSuccess(res, places);
};
