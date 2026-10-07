import env from "../../config/env/env.js";
import logger from "../../config/logger.js";
import AppError from "../../utils/AppError.js";

const TIMEOUT_MS = 15000;

// Calls one Paystack endpoint with the secret key; the key never leaves the server [AC-PAY-03]
const callPaystack = async (method, path, body) => {
  let response;

  try {
    response = await fetch(`${env.PAYSTACK_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    logger.error({ err: error, path }, "Could not reach Paystack");
    throw new AppError(
      502,
      "PAYMENT_PROVIDER_ERROR",
      "Payment service is not responding. Please try again",
    );
  }

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.status !== true) {
    logger.error(
      { path, httpStatus: response.status, message: result.message },
      "Paystack refused",
    );
    throw new AppError(
      502,
      "PAYMENT_PROVIDER_ERROR",
      "Payment service refused the request. Please try again",
    );
  }

  return result.data;
};

// Starts a payment; Paystack answers with a checkout page link [AC-PAY-01, AC-PAY-02]
export const initializeTransaction = async ({
  email,
  amountPesewas,
  reference,
  callbackUrl,
  metadata,
}) => {
  const data = await callPaystack("POST", "/transaction/initialize", {
    email,
    amount: amountPesewas, // Paystack counts GHS in pesewas, like us
    currency: "GHS",
    reference,
    callback_url: callbackUrl,
    channels: ["card", "mobile_money"], // mobile money covers MTN MoMo, Telecel Cash, AirtelTigo Money
    metadata,
  });

  return { authorizationUrl: data.authorization_url, accessCode: data.access_code };
};

// Asks Paystack directly what happened to a payment; webhooks alone are never trusted [AC-PAY-05]
export const verifyTransaction = async (reference) => {
  const data = await callPaystack("GET", `/transaction/verify/${encodeURIComponent(reference)}`);

  return {
    status: data.status, // "success", "failed", "abandoned"...
    amountPesewas: data.amount,
    currency: data.currency,
    reference: data.reference,
    channel: data.channel,
    providerTransactionId: String(data.id),
    gatewayResponse: data.gateway_response,
    paidAt: data.paid_at ? new Date(data.paid_at) : null,
  };
};
