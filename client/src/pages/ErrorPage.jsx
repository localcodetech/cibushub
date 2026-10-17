import { useEffect } from "react";
import { useRouteError } from "react-router";
import { RefreshCw, TriangleAlert } from "lucide-react";
import Container from "@/layouts/Container";
import StatusScreen from "@/components/common/StatusScreen";
import { reportError } from "@/lib/errorReporting";

// Shown instead of a blank screen when a page crashes while drawing [AC-UX-04].
// React Router catches the crash and draws this page in its place (errorElement in App.jsx).
const ErrorPage = () => {
  // The error that crashed the page
  const error = useRouteError();

  // Developers see the details in the browser console. Users never see them.
  if (import.meta.env.DEV) {
    console.error(error);
  }

  // After a new version is published, an open tab may ask for page code that no longer
  // exists. Loading the page again fetches the new version.
  const isOldVersion =
    error instanceof Error && error.message.includes("dynamically imported module");

  // Tell Sentry about the crash, once per error. An old open tab after an update isn't a bug.
  useEffect(() => {
    if (!isOldVersion) {
      reportError(error);
    }
  }, [error, isOldVersion]);

  // Load the whole app again from the server, a fresh start
  const handleTryAgain = () => {
    window.location.reload();
  };

  return (
    <Container>
      <StatusScreen
        role="alert"
        icon={isOldVersion ? RefreshCw : TriangleAlert}
        tone={isOldVersion ? "primary" : "danger"}
        title={isOldVersion ? "CibusHub has been updated" : "Something went wrong"}
        message={
          isOldVersion
            ? "Reload to get the latest version."
            : "Sorry, this page stopped working. Try again, or go back to the home page."
        }
      >
        <button
          type="button"
          onClick={handleTryAgain}
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-bold text-primary-foreground"
        >
          {isOldVersion ? "Reload" : "Try again"}
        </button>

        {/* A plain <a>, not <Link>: it reloads the app, in case the crash broke the router */}
        <a href="/" className="inline-flex min-h-11 items-center px-2 font-bold text-primary">
          Go to the home page
        </a>
      </StatusScreen>
    </Container>
  );
};

export default ErrorPage;
