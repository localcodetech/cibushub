import { useEffect, useState } from "react";

// Keeps the screen awake while `isWanted` is true (plan-review C10): phones stop
// sending GPS when the screen locks, and an online rider must keep sharing.
// Returns true while the screen is being kept awake. Some browsers can't (e.g. older iPhones):
// then the page shows a "keep this screen open" note instead.
export const useWakeLock = (isWanted) => {
  const [isAwake, setIsAwake] = useState(false);

  useEffect(() => {
    if (!isWanted || !("wakeLock" in navigator)) {
      return undefined;
    }

    let lock = null;
    let isStopped = false;

    const ask = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
        setIsAwake(true);
        lock.addEventListener("release", () => setIsAwake(false));
      } catch {
        // Refused (e.g. low battery mode): the note on the page covers it
        setIsAwake(false);
      }
    };

    // The lock is lost whenever the page is hidden; ask again when it comes back
    const handleVisible = () => {
      if (document.visibilityState === "visible" && !isStopped) {
        ask();
      }
    };

    ask();
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      isStopped = true;
      document.removeEventListener("visibilitychange", handleVisible);
      if (lock) {
        lock.release();
      }
    };
  }, [isWanted]);

  return isAwake;
};
