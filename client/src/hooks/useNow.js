import { useEffect, useState } from "react";

// The current time, refreshed every `everyMs`, for countdowns and "12 min ago" labels.
// Returns milliseconds (like Date.now()).
export const useNow = (everyMs) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(timer);
  }, [everyMs]);

  return now;
};
