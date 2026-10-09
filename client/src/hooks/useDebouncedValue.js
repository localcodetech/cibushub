import { useEffect, useState } from "react";

// Gives back `value`, but only after it has stopped changing for `delayMs` [AC-DISC-06].
// Typing "Adum" quickly gives "" ... then "Adum" once, so we send one request, not four.
//
// const debouncedText = useDebouncedValue(text, 400);
export const useDebouncedValue = (value, delayMs) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    // A new value arrived before the time was up: cancel the old timer
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
};
