import { LoaderCircle } from "lucide-react";

// Shown inside the page area (navbar and footer stay) while a page's code downloads.
const PageLoader = () => {
  return (
    <div role="status" className="flex min-h-[50svh] items-center justify-center">
      <LoaderCircle size={32} className="animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">Loading page</span>
    </div>
  );
};

export default PageLoader;
