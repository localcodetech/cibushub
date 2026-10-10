import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { CircleAlert } from "lucide-react";
import { socialSignInRequest } from "@/api/auth";
import TermsAgreementSheet from "@/components/auth/TermsAgreementSheet";
import { loadScript } from "@/lib/loadScript";
import { useAuthStore } from "@/store/authStore";
import { afterLoginPath } from "@/utils/roleHome";
import { isDarkTheme } from "@/utils/theme";

// Public IDs from the Google and Apple developer consoles (safe to show in the browser).
// A button only appears once its ID is set in client/.env.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const APPLE_SERVICE_ID = import.meta.env.VITE_APPLE_SERVICE_ID;

const GOOGLE_SCRIPT = "https://accounts.google.com/gsi/client";
const APPLE_SCRIPT =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

// "Continue with Google" and "Continue with Apple".
// getSignupDetails: only on the sign-up page. Returns { role, acceptTerms } from its form.
// Someone new who hasn't agreed to the Terms gets a pop-up to agree, then carries on.
const SocialSignInButtons = ({ getSignupDetails }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAuthStore((state) => state.setUser);
  const googleButtonRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  // A Google / Apple sign-in kept aside while the Terms pop-up is open:
  // { provider, idToken, fullName }, or null when the pop-up is closed
  const [waitingForTerms, setWaitingForTerms] = useState(null);

  // Send the ID token to our server, then go home (the guards take it from there).
  // agreedInPopup: true when this is the retry after "Agree and continue".
  const finishSignIn = async (provider, idToken, fullName, agreedInPopup) => {
    setErrorMessage("");

    const details = { provider, idToken };
    if (fullName) {
      details.fullName = fullName;
    }

    // On the sign-up page: the chosen role, and whether its Terms box is ticked
    if (getSignupDetails) {
      const signupDetails = getSignupDetails();
      details.role = signupDetails.role;
      if (signupDetails.acceptTerms) {
        details.acceptTerms = true;
      }
    }
    if (agreedInPopup) {
      details.acceptTerms = true;
    }

    setIsSending(true);
    try {
      const user = await socialSignInRequest(details);
      setWaitingForTerms(null);
      setUser(user);
      navigate(afterLoginPath(user, location));
    } catch (error) {
      // Someone new who hasn't agreed yet: keep this sign-in and ask in a pop-up.
      // (People who already have an account never get here: the Terms are only for new ones.)
      if (error.code === "TERMS_NOT_ACCEPTED") {
        setWaitingForTerms({ provider, idToken, fullName });
      } else {
        setWaitingForTerms(null);
        setErrorMessage(error.message);
      }
    } finally {
      setIsSending(false);
    }
  };

  // "Agree and continue": the same Google / Apple sign-in again, now with the Terms accepted
  const handleAgreeToTerms = () => {
    finishSignIn(waitingForTerms.provider, waitingForTerms.idToken, waitingForTerms.fullName, true);
  };

  // Google draws its own button into our empty <div> (its brand rules require that).
  // When someone picks their account, Google calls our callback with the ID token.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      return;
    }

    loadScript(GOOGLE_SCRIPT)
      .then(() => {
        if (!googleButtonRef.current) {
          return;
        }
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => finishSignIn("GOOGLE", response.credential),
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: "standard",
          theme: isDarkTheme() ? "filled_black" : "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: googleButtonRef.current.offsetWidth || 320,
        });
      })
      .catch(() => {
        setErrorMessage("Google sign-in couldn't load. Check your connection.");
      });
    // Run once when the buttons appear. finishSignIn reads the form when it runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apple opens a pop-up. When it closes, we get the ID token, and on the very first
  // sign-in only, the person's name.
  const handleAppleClick = async () => {
    setErrorMessage("");
    try {
      await loadScript(APPLE_SCRIPT);
      window.AppleID.auth.init({
        clientId: APPLE_SERVICE_ID,
        scope: "name email",
        // The page Apple returns to; it must be listed in the Apple console
        redirectURI: import.meta.env.VITE_APPLE_REDIRECT_URI || window.location.origin,
        usePopup: true,
      });
      const response = await window.AppleID.auth.signIn();

      let fullName = null;
      if (response.user && response.user.name) {
        fullName = (response.user.name.firstName + " " + response.user.name.lastName).trim();
      }

      await finishSignIn("APPLE", response.authorization.id_token, fullName);
    } catch (error) {
      // Closing the pop-up is not an error worth showing
      if (error && error.error === "popup_closed_by_user") {
        return;
      }
      setErrorMessage("Apple sign-in didn't work. Please try again.");
    }
  };

  // Neither ID set yet: draw nothing
  if (!GOOGLE_CLIENT_ID && !APPLE_SERVICE_ID) {
    return null;
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {/* The "or" line between the form and the buttons */}
      <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      {GOOGLE_CLIENT_ID && <div ref={googleButtonRef} className="flex min-h-11 justify-center" />}

      {APPLE_SERVICE_ID && (
        <button
          type="button"
          onClick={handleAppleClick}
          disabled={isSending}
          className="flex h-11 items-center justify-center gap-2 rounded-md bg-black font-bold text-white dark:bg-white dark:text-black"
        >
          <svg viewBox="0 0 17 20" className="size-4 fill-current" aria-hidden="true">
            <path d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM11.6 3c.7-.9 1.2-2 1-3.2-1 .1-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z" />
          </svg>
          Continue with Apple
        </button>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive p-3 text-[15px] text-destructive"
        >
          <CircleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {waitingForTerms && (
        <TermsAgreementSheet
          providerName={waitingForTerms.provider === "APPLE" ? "Apple" : "Google"}
          isNewCustomer={!getSignupDetails}
          isSending={isSending}
          onAgree={handleAgreeToTerms}
          onClose={() => setWaitingForTerms(null)}
        />
      )}
    </div>
  );
};

export default SocialSignInButtons;
