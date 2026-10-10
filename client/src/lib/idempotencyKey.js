// A random key for one "Place order" attempt [AC-CHK-09].
// If the same key arrives twice (double tap, network retry), the server returns the first order
// instead of making a second one.
//
// crypto.getRandomValues works on http:// too (e.g. testing on a phone over Wi-Fi),
// unlike crypto.randomUUID, which needs https.
export const makeIdempotencyKey = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // 16 random bytes -> 32 hex characters, e.g. "9f04c1..."
  let key = "";
  for (const byte of bytes) {
    key += byte.toString(16).padStart(2, "0");
  }
  return key;
};
