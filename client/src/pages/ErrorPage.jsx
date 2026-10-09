import { useRouteError } from "react-router";
import { TriangleAlert } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";

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

  // Load the whole app again from the server, a fresh start
  const handleTryAgain = () => {
    window.location.reload();
  };

  return (
    <Container>
      <section role="alert" className="py-16 text-center">
        <TriangleAlert size={48} className="mx-auto text-destructive" aria-hidden="true" />
        <Heading level={1} className="mt-4">
          {isOldVersion ? "CibusHub has been updated" : "Something went wrong"}
        </Heading>
        <Text muted className="mt-2">
          {isOldVersion
            ? "Reload to get the latest version."
            : "Sorry, this page stopped working. Try again, or go back to the home page."}
        </Text>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleTryAgain}
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-bold text-primary-foreground"
          >
            {isOldVersion ? "Reload" : "Try again"}
          </button>

          {/* A plain <a>, not <Link>: it reloads the app, in case the crash broke the router */}
          <a href="/" className="inline-flex min-h-11 items-center font-bold text-primary">
            Go to the home page
          </a>
        </div>
      </section>
    </Container>
  );
};

export default ErrorPage;
