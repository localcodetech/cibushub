import { LoaderCircle } from "lucide-react";

// Shown for a moment while the app checks who is logged in.
// role="status" makes screen readers say "Loading CibusHub".
const FullPageLoader = () => {
  return (
    <div role="status" className="flex min-h-svh items-center justify-center bg-background">
      <LoaderCircle size={32} className="animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">Loading CibusHub</span>
    </div>
  );
};

export default FullPageLoader;
