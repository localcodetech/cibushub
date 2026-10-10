import { refreshOnce } from "./sessionRefresh";

// The ONE place the React app talks to the backend.
// Every page calls api.get / api.post / ... instead of using fetch itself.

// Empty in development: the browser calls /api on localhost:5173 and Vite passes it to the server.
// In production it is the API's address, e.g. https://api.cibushub.com
const API_URL = import.meta.env.VITE_API_URL || "";

// What to do when the session has ended for good (the refresh failed too).
// The auth store fills this in, so this file doesn't need to know about the store.
let handleSessionExpired = () => {};

export const setSessionExpiredHandler = (handler) => {
  handleSessionExpired = handler;
};

// Builds an error the pages can read: error.status, error.code, error.message, error.details
const makeError = (status, code, message, details) => {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.details = details || [];
  return error;
};

// Sends one request and returns the server's answer: { success, data, meta }.
// If anything goes wrong, it throws an error made by makeError.
// isRetry is true for the second try after a refresh, so we never loop.
const request = async (method, path, body, extraHeaders, isRetry) => {
  const headers = { ...extraHeaders };
  // A file upload (FormData) goes as it is: the browser sets its own Content-Type with the
  // "boundary" that separates the parts. Everything else is sent as JSON.
  const isFormData = body instanceof FormData;
  if (body && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await fetch(API_URL + "/api/v1" + path, {
      method,
      headers,
      body: body && !isFormData ? JSON.stringify(body) : body,
      // Send the login cookies with every request (they are HttpOnly: JavaScript can't read them)
      credentials: "include",
    });
  } catch {
    // fetch itself failed: no internet, or the server is down
    throw makeError(
      0,
      "NETWORK_ERROR",
      "Can't reach CibusHub. Check your internet connection and try again.",
    );
  }

  // Our server always answers in JSON. If it didn't (e.g. a proxy error page), result stays null
  let result;
  try {
    result = await response.json();
  } catch {
    result = null;
  }

  // The 15-minute login cookie ran out: renew it quietly, then send the same request again
  const errorCode = result && result.error ? result.error.code : null;
  if (
    response.status === 401 &&
    errorCode === "UNAUTHENTICATED" &&
    !isRetry &&
    path !== "/auth/refresh"
  ) {
    let renewed;
    try {
      renewed = await refreshOnce();
    } catch {
      throw makeError(
        0,
        "NETWORK_ERROR",
        "Can't reach CibusHub. Check your internet connection and try again.",
      );
    }

    if (renewed) {
      return request(method, path, body, extraHeaders, true);
    }

    // The 7-day refresh cookie is gone too: the session has really ended
    handleSessionExpired();
  }

  if (!response.ok || !result || !result.success) {
    const serverError = result && result.error ? result.error : {};
    throw makeError(
      response.status,
      serverError.code || "UNKNOWN_ERROR",
      serverError.message || "Something went wrong. Please try again.",
      serverError.details,
    );
  }

  return result;
};

// Downloads a file from the API (e.g. a PDF receipt) and saves it on the device.
// Same login rules as request(): if the 15-minute cookie ran out, renew it and try once more.
// fileName: the name the saved file gets, e.g. "CibusHub-receipt-CH-261009-006516.pdf"
export const downloadFile = async (path, fileName) => {
  const fetchFile = () => {
    return fetch(API_URL + "/api/v1" + path, { credentials: "include" });
  };

  let response;
  try {
    response = await fetchFile();
    if (response.status === 401) {
      const renewed = await refreshOnce();
      if (!renewed) {
        handleSessionExpired();
      } else {
        response = await fetchFile();
      }
    }
  } catch {
    throw makeError(
      0,
      "NETWORK_ERROR",
      "Can't reach CibusHub. Check your internet connection and try again.",
    );
  }

  // Errors still come back as our JSON envelope
  if (!response.ok) {
    let serverError = {};
    try {
      const result = await response.json();
      serverError = result.error || {};
    } catch {
      // Not JSON: keep the general message
    }
    throw makeError(
      response.status,
      serverError.code || "UNKNOWN_ERROR",
      serverError.message || "Couldn't download the file. Please try again.",
      serverError.details,
    );
  }

  // The file arrives as a "blob" (raw bytes). We give it a temporary address in the browser,
  // click an invisible link with download="name" to save it, then free the address.
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
};

// Shortcuts, so a page writes api.post("/auth/login", { identifier, password })
export const api = {
  get: (path, headers) => request("GET", path, undefined, headers),
  post: (path, body, headers) => request("POST", path, body, headers),
  patch: (path, body, headers) => request("PATCH", path, body, headers),
  put: (path, body, headers) => request("PUT", path, body, headers),
  delete: (path, headers) => request("DELETE", path, undefined, headers),
};
