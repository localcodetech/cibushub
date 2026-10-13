import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router";
import Container from "@/layouts/Container";
import Text from "@/components/typography/Text";
import FormField from "@/components/form/FormField";
import { Button } from "@/components/ui/button";
import { resetPasswordSchema } from "@/validators/auth/resetPasswordSchema";
import { resetPasswordRequest } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import PageHeader from "@/components/common/PageHeader";
import Alert from "@/components/common/Alert";

// Step 2 of 2: the SMS code and a new password [AC-AUTH-19]
const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const clearUser = useAuthStore((state) => state.clearUser);

  // The email or phone typed on step 1
  let identifier = null;
  if (location.state && location.state.identifier) {
    identifier = location.state.identifier;
  }

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onTouched",
    defaultValues: { code: "", newPassword: "", confirmPassword: "" },
  });

  // Opened directly, without step 1: we don't know which account
  if (!identifier) {
    return (
      <Container>
        <section className="mx-auto max-w-md py-10">
          <PageHeader title="Reset your password" />
          <Text muted className="mt-2">
            Start by asking for a reset code.
          </Text>
          <Link to="/forgot-password" className="mt-6 inline-block font-bold text-primary">
            Get a reset code
          </Link>
        </section>
      </Container>
    );
  }

  const onSubmit = async (values) => {
    try {
      await resetPasswordRequest(identifier, values.code, values.newPassword);

      // The server logged out every device, so forget the user here too
      clearUser();
      navigate("/login", {
        state: { message: "Your password has been changed. Log in with your new password." },
      });
    } catch (error) {
      // Wrong, expired or used-up code: show it under the code box
      if (error.code.startsWith("OTP_")) {
        setError("code", { message: error.message });
        return;
      }

      // The server didn't like the new password: show it under that box
      const passwordProblem = error.details.find((detail) => detail.field === "newPassword");
      if (passwordProblem) {
        setError("newPassword", { message: passwordProblem.message });
        return;
      }

      setError("root", { message: error.message });
    }
  };

  return (
    <Container>
      <section className="mx-auto max-w-md py-10">
        <PageHeader title="Reset your password" />
        <Text muted className="mt-2">
          If <span className="font-bold text-foreground">{identifier}</span> matches an account, we
          texted a 6-digit code to its phone. It expires in 15 minutes.
        </Text>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 flex flex-col gap-5">
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

          <FormField
            id="newPassword"
            label="New password"
            hint="At least 8 characters, with a letter and a number"
            type="password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />

          <FormField
            id="confirmPassword"
            label="Type it again"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          {errors.root && (
            <Alert>
              {" "}
              <span>{errors.root.message}</span>
            </Alert>
          )}

          <Button type="submit" disabled={isSubmitting} className="h-12 w-full text-base font-bold">
            {isSubmitting ? "Saving…" : "Set new password"}
          </Button>
        </form>

        <Text className="mt-6 text-center">
          No code?{" "}
          <Link to="/forgot-password" className="font-bold text-primary">
            Ask for a new one
          </Link>
        </Text>
      </section>
    </Container>
  );
};

export default ResetPasswordPage;
