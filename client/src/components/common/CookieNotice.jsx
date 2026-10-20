import { useState } from "react";
import { Link } from "react-router";
import { Cookie } from "lucide-react";

// A thin strip above the navbar, shown once: we tell people we use cookies.
// It is a notice, not an "Allow / Deny" choice: our only cookies keep people logged in, and
// those don't need permission. If tracking cookies are ever added, this must become a choice.
const SEEN_KEY = "cibushub-cookie-notice";

// Saved on the device (not a secret). Private mode or blocked storage: the notice just shows again.
const hasSeenNotice = () => {
  try {
    return localStorage.getItem(SEEN_KEY) === "seen";
  } catch {
    return false;
  }
};

const CookieNotice = () => {
  const [isVisible, setIsVisible] = useState(() => !hasSeenNotice());

  if (!isVisible) {
    return null;
  }

  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, "seen");
    } catch {
      // Not remembered, but it still closes for now
    }
    setIsVisible(false);
  };

  return (
    <div role="region" aria-label="Cookie notice" className="bg-muted print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-1.5 text-[13px] sm:justify-center">
        <Cookie size={16} aria-hidden="true" className="shrink-0" />
        {/* One flowing sentence, so on a phone it wraps like normal text */}
        <p className="min-w-0 flex-1 sm:flex-none">
          We only use cookies that keep you logged in. No ads or tracking.{" "}
          <Link to="/cookies" className="font-bold whitespace-nowrap underline">
            Learn more
          </Link>
        </p>
        <button
          type="button"
          onClick={close}
          className="min-h-9 shrink-0 rounded-md border border-border bg-background px-3 font-bold"
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default CookieNotice;
