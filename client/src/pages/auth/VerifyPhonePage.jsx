import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { CircleAlert } from "lucide-react";
import Container from "@/layouts/Container";
import Text from "@/components/typography/Text";
import FormField from "@/components/form/FormField";
import { Button } from "@/components/ui/button";
import { verifyPhoneSchema } from "@/validators/auth/verifyPhoneSchema";
import { resendOtpRequest, verifyPhoneRequest } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { homePathFor } from "@/utils/roleHome";
import PageHeader from "@/components/common/PageHeader";

// The server allows a new code once every 60 seconds
const RESEND_WAIT_SECONDS = 60;

// Enter the 6-digit code texted after sign-up [AC-AUTH-01]
const VerifyPhonePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  // The phone number comes from the sign-up page (location.state),
  // or from the logged-in user who has not verified yet
  let phone = null;
  if (location.state && location.state.phone) {
    phone = location.state.phone;
  } else if (user) {
    phone = user.phone;
  }

  // Coming straight from sign-up, a code was just sent, so the wait starts at 60
  const justRegistered = Boolean(location.state && location.state.phone);
  const [secondsLeft, setSecondsLeft] = useState(justRegistered ? RESEND_WAIT_SECONDS : 0);

  // Shown after "Send a new code" works
  const [resendMessage, setResendMessage] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(verifyPhoneSchema),
    mode: "onTouched",
    defaultValues: { code: "" },
  });

  // The countdown: while seconds are left, take one away every second.
  // Each change of secondsLeft runs this again, which starts the next 1-second timer.
  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setSecondsLeft(secondsLeft - 1);
    }, 1000);

    // If the page closes before the second is up, cancel the timer
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  // Logged in and already verified: nothing to do here
  if (user && user.phoneVerifiedAt && !justRegistered) {
    return <Navigate to={homePathFor(user.role)} replace />;
  }

  // Logged in but no phone yet (Google / Apple sign-up): add it first
  if (user && !user.phone && !justRegistered) {
    return <Navigate to="/add-phone" replace />;
  }

  // No phone number at all (e.g. the page was opened directly): nothing to verify
  if (!phone) {
    return (
      <Container>
        <section className="mx-auto max-w-md py-10">
          <PageHeader title="Verify your phone" />
          <Text muted className="mt-2">
            We don't know which number to verify. Log in, and we'll bring you back here.
          </Text>
          <Link to="/login" className="mt-6 inline-block font-bold text-primary">
            Go to log in
          </Link>
        </section>
      </Container>
    );
  }

  const onSubmit = async (values) => {
    try {
      const verifiedUser = await verifyPhoneRequest(phone, values.code);

      // Already logged in: update the saved user and go home
      if (user) {
        setUser(verifiedUser);
        navigate(homePathFor(verifiedUser.role));
        return;
      }

      // Not logged in yet: log in next, with a note that it worked
      navigate("/login", { state: { message: "Phone verified. Log in to continue." } });
    } catch (error) {
      // e.g. "Incorrect code. 3 attempts left" or "This code has expired"
      setError("code", { message: error.message });
    }
  };

  const handleResend = async () => {
    setResendMessage("");

    try {
      await resendOtpRequest(phone);
      setResendMessage("A new code is on its way.");
      setSecondsLeft(RESEND_WAIT_SECONDS);
    } catch (error) {
      // The server says how long to wait: use its number for the countdown
      if (error.code === "RATE_LIMITED" && error.details[0] && error.details[0].retryAfterSeconds) {
        setSecondsLeft(error.details[0].retryAfterSeconds);
        return;
      }

      setError("root", { message: error.message });
    }
  };

  return (
    <Container>
      <section className="mx-auto max-w-md py-10">
        <PageHeader title="Verify your phone" />
        <Text muted className="mt-2">
          We texted a 6-digit code to <span className="font-bold text-foreground">{phone}</span>. It
          expires in 5 minutes.
        </Text>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 flex flex-col gap-5">
          {/* One box for all 6 digits. inputMode="numeric" opens the number keypad on phones.
              autoComplete="one-time-code" lets the phone fill in the code from the SMS. */}
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
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive p-3 text-[15px] text-destructive"
            >
              <CircleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{errors.root.message}</span>
            </div>
          )}

          {/* Disabled while sending, so a double tap can't use up an attempt [AC-UX-05] */}
          <Button type="submit" disabled={isSubmitting} className="h-12 w-full text-base font-bold">
            {isSubmitting ? "Checking…" : "Verify"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          {secondsLeft > 0 ? (
            <Text muted>You can ask for a new code in {secondsLeft} seconds.</Text>
          ) : (
            <button type="button" onClick={handleResend} className="font-bold text-primary">
              Send a new code
            </button>
          )}

          {/* Logged in: a mistyped number can be fixed before verifying */}
          {user && (
            <Link to="/add-phone" className="mt-3 block font-bold text-primary">
              Wrong number? Change it
            </Link>
          )}

          {resendMessage && (
            <p role="status" className="mt-2 text-muted-foreground">
              {resendMessage}
            </p>
          )}
        </div>
      </section>
    </Container>
  );
};

export default VerifyPhonePage;
