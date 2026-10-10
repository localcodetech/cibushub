import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useConnectionStore } from "@/store/connectionStore";

// How long a drop must last before we mention it: short blips stay invisible
const SHOW_AFTER_MS = 2000;

// A small "Reconnecting…" pill while live updates are down [AC-RT-08].
// The page keeps working; it just isn't updating itself until the connection is back.
const ConnectionIndicator = () => {
  const status = useConnectionStore((state) => state.status);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (status !== "reconnecting") {
      return undefined;
    }
    const timer = setTimeout(() => setIsVisible(true), SHOW_AFTER_MS);
    return () => {
      clearTimeout(timer);
      setIsVisible(false);
    };
  }, [status]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg"
    >
      <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
      Reconnecting…
    </div>
  );
};

export default ConnectionIndicator;
