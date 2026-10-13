import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router";
import Container from "@/layouts/Container";
import Text from "@/components/typography/Text";
import FormField from "@/components/form/FormField";
import { Button } from "@/components/ui/button";
import { forgotPasswordSchema } from "@/validators/auth/forgotPasswordSchema";
import { forgotPasswordRequest } from "@/api/auth";
import PageHeader from "@/components/common/PageHeader";
import Alert from "@/components/common/Alert";

// Step 1 of 2: ask for a reset code [AC-AUTH-18]
const ForgotPasswordPage = () => {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onTouched",
    defaultValues: { identifier: "" },
  });

  const onSubmit = async (values) => {
    try {
      await forgotPasswordRequest(values.identifier);

      // Go to step 2 and hand over the email or phone, so it isn't typed again
      navigate("/reset-password", { state: { identifier: values.identifier } });
    } catch (error) {
      // Only things like "no internet" or "too many tries" end up here
      setError("root", { message: error.message });
    }
  };

  return (
    <Container>
      <section className="mx-auto max-w-md py-10">
        <PageHeader back={{ to: "/login", label: "Log in" }} title="Forgot your password?" />
        <Text muted className="mt-2">
          Enter your email or phone number. If it matches an account, we'll text a reset code to
          that account's phone.
        </Text>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 flex flex-col gap-5">
          <FormField
            id="identifier"
            label="Phone number or email"
            hint="For example 024 123 4567 or you@example.com"
            type="text"
            autoComplete="username"
            error={errors.identifier?.message}
            {...register("identifier")}
          />

          {errors.root && (
            <Alert>
              {" "}
              <span>{errors.root.message}</span>
            </Alert>
          )}

          <Button type="submit" disabled={isSubmitting} className="h-12 w-full text-base font-bold">
            {isSubmitting ? "Sending…" : "Send reset code"}
          </Button>
        </form>

        <Text className="mt-6 text-center">
          Remembered it?{" "}
          <Link to="/login" className="font-bold text-primary">
            Log in
          </Link>
        </Text>
      </section>
    </Container>
  );
};

export default ForgotPasswordPage;
