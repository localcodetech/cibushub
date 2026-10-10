// The phone's position, through the browser [AC-RIDER-04].
// Works only on https:// pages (and on localhost while developing).

// The browser's error numbers, as words our screens understand
const PROBLEMS = {
  1: "DENIED", // the rider (or the phone's settings) said no
  2: "UNAVAILABLE", // no GPS signal / location turned off
  3: "TIMEOUT", // took too long
};

const toPoint = (position) => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracyMetres: position.coords.accuracy,
});

// One position now. Resolves { latitude, longitude, accuracyMetres };
// rejects with an Error whose .code is DENIED, UNAVAILABLE, TIMEOUT or UNSUPPORTED.
export const getCurrentPoint = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      const error = new Error("This browser can't share its location");
      error.code = "UNSUPPORTED";
      reject(error);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(toPoint(position)),
      (browserError) => {
        const error = new Error(browserError.message);
        error.code = PROBLEMS[browserError.code] || "UNAVAILABLE";
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  });
};

// Keeps reporting the position as it changes. onPoint(point), onProblem(code).
// Returns a function that stops watching.
export const watchPoints = (onPoint, onProblem) => {
  if (!navigator.geolocation) {
    onProblem("UNSUPPORTED");
    return () => {};
  }
  const watchId = navigator.geolocation.watchPosition(
    (position) => onPoint(toPoint(position)),
    (browserError) => onProblem(PROBLEMS[browserError.code] || "UNAVAILABLE"),
    { enableHighAccuracy: true, maximumAge: 5000 },
  );
  return () => navigator.geolocation.clearWatch(watchId);
};
