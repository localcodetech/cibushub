import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import Container from "@/layouts/Container";
import Text from "@/components/typography/Text";
import FormField from "@/components/form/FormField";
import { Button } from "@/components/ui/button";
import { verifyEmailSchema } from "@/validators/auth/verifyEmailSchema";
import { sendEmailCodeRequest, verifyEmailRequest } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { homePathFor, isSafeLocalPath } from "@/utils/roleHome";
import PageHeader from "@/components/common/PageHeader";
import Alert from "@/components/common/Alert";

// The server allows a new code once every 60 seconds
const RESEND_WAIT_SECONDS = 60;

// /verify-email?next=/customer: enter the 6-digit code we emailed [AC-AUTH-01].
// Shown right after login while the email isn't confirmed. It can be skipped: the phone is
// already verified, so nothing is blocked. They'll be asked again at the next login.
const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  // Where to go afterwards (their home if "next" is missing or not one of our pages)
  let nextPath = user ? homePathFor(user.role) : "/";
  if (isSafeLocalPath(searchParams.get("next"))) {
    nextPath = searchParams.get("next");
  }

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sendMessage, setSendMessage] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(verifyEmailSchema),
    mode: "onTouched",
    defaultValues: { code: "" },
  });

  // Asks the server to email a code, and starts the 60-second wait
  const sendCode = async () => {
    setSendMessage("");
    try {
      await sendEmailCodeRequest();
      setSendMessage("We've sent a code. Check your inbox (and spam folder).");
      setSecondsLeft(RESEND_WAIT_SECONDS);
    } catch (error) {
      // A code went out less than a minute ago (e.g. the page was reloaded): use that one
      if (error.code === "RATE_LIMITED" && error.details && error.details[0]) {
        setSendMessage("We sent you a code a moment ago. Check your inbox (and spam folder).");
        setSecondsLeft(error.details[0].retryAfterSeconds);
        return;
      }
      // Confirmed on another screen in the meantime: nothing left to do
      if (error.code === "EMAIL_ALREADY_VERIFIED") {
        navigate(nextPath, { replace: true });
        return;
      }
      setError("root", { message: error.message });
    }
  };

  // Send the first code when the page opens. The ref stops React's development
  // double-run from sending two.
  const firstCodeSent = useRef(false);
  useEffect(() => {
    if (firstCodeSent.current || !user || !user.email || user.emailVerifiedAt) {
      return;
    }
    firstCodeSent.current = true;
    sendCode();
    // Only once, when the page opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The countdown, one second at a time (as on the phone page)
  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }
    const timer = setTimeout(() => {
      setSecondsLeft(secondsLeft - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  // Not logged in: log in first
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // No email, or already confirmed: nothing to do here
  if (!user.email || user.emailVerifiedAt) {
    return <Navigate to={nextPath} replace />;
  }

  const onSubmit = async (values) => {
    try {
      const updatedUser = await verifyEmailRequest(values.code);
      setUser(updatedUser);
      navigate(nextPath, { replace: true });
    } catch (error) {
      // e.g. "Incorrect code. 3 attempts left" or "This code has expired"
      setError("code", { message: error.message });
    }
  };

  const handleSkip = () => {
    navigate(nextPath, { replace: true });
  };

  return (
    <Container>
      <section className="mx-auto max-w-md py-10">
        <PageHeader title="Confirm your email" />
        <Text muted className="mt-2">
          We emailed a 6-digit code to{" "}
          <span className="font-bold break-all text-foreground">{user.email}</span>. It expires in
          15 minutes. Your receipts and account updates go to this address.
        </Text>

        {/* Resend told us mail to this address bounced [AC-NOTIF-08] */}
        {user.emailBouncedAt && (
          <Alert className="mt-6">
            {" "}
            <span>
              Our last email to this address bounced, so we've stopped sending you receipts and
              updates by email. Check your inbox for the code. If it doesn't arrive, the address may
              be mistyped: contact support to change it.
            </span>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 flex flex-col gap-5">
          {/* One box for all 6 digits; the number keypad on phones */}
          <FormField
            id="code"
            label="Code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="[&_input]:text-center [&_input]:text-2xl [&_input]:tracking-[0.5em]"
            error={errors.code?.message}
            {...register("code")}
          />

          {errors.root && (
            <Alert>
              {" "}
              <span>{errors.root.message}</span>
            </Alert>
          )}

          {/* Disabled while sending, so a double tap can't use up an attempt [AC-UX-05] */}
          <Button type="submit" disabled={isSubmitting} className="h-12 w-full text-base font-bold">
            {isSubmitting ? "Checking…" : "Confirm email"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          {secondsLeft > 0 ? (
            <Text muted>You can ask for a new code in {secondsLeft} seconds.</Text>
          ) : (
            <button type="button" onClick={sendCode} className="font-bold text-primary">
              Send a new code
            </button>
          )}

          {sendMessage && (
            <p role="status" className="mt-2 text-muted-foreground">
              {sendMessage}
            </p>
          )}

          <button
            type="button"
            onClick={handleSkip}
            className="mt-6 block w-full font-bold text-muted-foreground underline"
          >
            Skip for now
          </button>
        </div>
      </section>
    </Container>
  );
};

export default VerifyEmailPage;
