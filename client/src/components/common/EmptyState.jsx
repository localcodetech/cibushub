import { Link } from "react-router";
import { Inbox } from "lucide-react";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";

// Shown when a list has nothing in it yet, with a next step [AC-UX-03].
//
// <EmptyState
//   icon={ShoppingBag}
//   title="No orders yet"
//   message="Your orders will show here."
//   action={{ label: "Find food", to: "/customer" }}
// />
//
// icon:    a Lucide icon (optional; an inbox by default)
// action:  optional { label, to } for a link to the next step,
//          or { label, onClick } for a button that runs code (e.g. "Clear filters")
const EmptyState = ({ icon, title, message, action }) => {
  // A component passed in as a value: give it a capital name so JSX can draw it
  const Icon = icon || Inbox;

  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <Icon size={40} className="text-muted-foreground" aria-hidden="true" />
      <Heading level={2} className="mt-4">
        {title}
      </Heading>
      {message && (
        <Text muted className="mt-2 max-w-sm">
          {message}
        </Text>
      )}
      {action && action.onClick && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-bold text-primary-foreground"
        >
          {action.label}
        </button>
      )}
      {action && action.to && (
        <Link
          to={action.to}
          className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-bold text-primary-foreground"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
};

export default EmptyState;
