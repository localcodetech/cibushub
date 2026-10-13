import { useEffect, useState } from "react";

// True while a CSS media query matches, and updates when it changes (e.g. the window is
// resized or a phone is turned). useMediaQuery("(min-width: 640px)") -> wider than a phone
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const list = window.matchMedia(query);
    const handleChange = () => setMatches(list.matches);
    handleChange();
    list.addEventListener("change", handleChange);
    return () => list.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
};
