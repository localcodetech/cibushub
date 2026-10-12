// "Maame Akua's Chop Bar" -> "MA", "Waakye with wele" -> "WW": the first letters of the first
// two words, for placeholder tiles (restaurants and dishes without a photo)
export const initialsOf = (name = "") => {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};
