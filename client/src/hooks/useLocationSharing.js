import { useEffect, useRef, useState } from "react";
import { watchPoints } from "@/lib/geolocation";
import { sendRiderLocation } from "@/lib/liveUpdates";

const SEND_EVERY_MS = 5000; // AC-RT-04: every 5 to 10 seconds (the server allows one per 3 s)

// While `isSharing` is true: follow the phone's position and send the newest one
// every 5 seconds [AC-RT-04]. Returns { lastSentAt, problem }:
//   lastSentAt: when the server last accepted a position (ms), or null
//   problem:    "DENIED" | "UNAVAILABLE" | "TIMEOUT" | "UNSUPPORTED" | null
export const useLocationSharing = (isSharing) => {
  const [lastSentAt, setLastSentAt] = useState(null);
  const [problem, setProblem] = useState(null);
  // The newest position, kept in a ref: changing it must not redraw the screen
  const latestPoint = useRef(null);

  useEffect(() => {
    if (!isSharing) {
      return undefined;
    }

    const stopWatching = watchPoints(
      (point) => {
        latestPoint.current = point;
        setProblem(null);
      },
      (code) => setProblem(code),
    );

    const timer = setInterval(async () => {
      const point = latestPoint.current;
      if (!point) {
        return;
      }
      const answer = await sendRiderLocation(point);
      if (answer.ok) {
        setLastSentAt(Date.now());
      }
    }, SEND_EVERY_MS);

    return () => {
      stopWatching();
      clearInterval(timer);
    };
  }, [isSharing]);

  return { lastSentAt, problem };
};
