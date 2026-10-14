import { useState } from "react";
import { Link } from "react-router";
import Sheet from "@/components/common/Sheet";

// Shown when someone new continues with Google / Apple / Facebook without having agreed to the Terms
// [AC-AUTH-01]. Agreeing finishes the sign-up with the same Google / Apple / Facebook sign-in.
//
// providerName:   "Google" or "Apple", for the wording
// isNewCustomer:  true on the login page, where the new account is a customer account
// isSending / onAgree / onClose: from the buttons component
const TermsAgreementSheet = ({ providerName, isNewCustomer, isSending, onAgree, onClose }) => {
  const [hasAgreed, setHasAgreed] = useState(false);

  return (
    <Sheet
      title="Welcome to CibusHub"
      description={
        "You're creating a new account with " + providerName + ". Please agree to our Terms first."
      }
      onClose={onClose}
    >
      <div className="space-y-4 p-4 text-[15px]">
        {/* target="_blank": read them in a new tab, so this sign-in isn't lost */}
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={hasAgreed}
            onChange={(event) => setHasAgreed(event.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-primary"
          />
          <span>
            I agree to the{" "}
            <Link to="/terms" target="_blank" className="font-bold text-primary underline">
              Terms of Service
            </Link>{" "}
            and the{" "}
            <Link to="/privacy" target="_blank" className="font-bold text-primary underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        {isNewCustomer && (
          <p className="text-muted-foreground">
            This will be a customer account. Want to sell food or deliver?{" "}
            <Link to="/register" className="font-bold text-primary underline">
              Sign up as a restaurant or rider
            </Link>
            .
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onAgree}
            disabled={!hasAgreed || isSending}
            className="min-h-12 flex-1 rounded-md bg-primary px-5 font-bold text-primary-foreground disabled:opacity-40"
          >
            {isSending ? "Creating your account…" : "Agree and continue"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 flex-1 rounded-md border border-border px-5 font-bold"
          >
            Cancel
          </button>
        </div>
      </div>
    </Sheet>
  );
};

export default TermsAgreementSheet;
