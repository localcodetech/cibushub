import { CloudOff } from "lucide-react";
import Text from "@/components/typography/Text";

// Shown in place of a list or page section that failed to load, with "Try again" [AC-UX-04].
// The rest of the page keeps working.
//
// With TanStack Query:
//   const { data, error, refetch } = useQuery(...);
//   if (error) return <ErrorState message={error.message} onRetry={refetch} />;
//
// message: what went wrong (our API errors already have friendly messages)
// onRetry: the function that loads the data again (optional)
const ErrorState = ({ message, onRetry }) => {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-lg border border-border px-4 py-10 text-center"
    >
      <CloudOff size={40} className="text-destructive" aria-hidden="true" />
      <Text className="mt-4 font-bold">Couldn't load this</Text>
      <Text muted className="mt-1 max-w-sm">
        {message || "Something went wrong. Please try again."}
      </Text>
      {onRetry && (
        <button
          type="button"
          onClick={() => onRetry()}
          className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-bold text-primary-foreground"
        >
          Try again
        </button>
      )}
    </div>
  );
};

export default ErrorState;
