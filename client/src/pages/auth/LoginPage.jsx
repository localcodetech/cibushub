import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router";
import { CircleAlert } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import FormField from "@/components/form/FormField";
import { Button } from "@/components/ui/button";
import { loginSchema } from "@/validators/auth/loginSchema";
import { loginRequest } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { homePathFor } from "@/utils/roleHome";

const LoginPage = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  // React Hook Form looks after the form: what was typed, the errors, and "is it sending?".
  // zodResolver(loginSchema) checks the typed values with our Zod rules.
  // mode "onTouched": a field shows its error once the user leaves it, then updates as they type.
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { identifier: "", password: "" },
  });

  // Runs only when the Zod rules pass. values = { identifier, password }
  const onSubmit = async (values) => {
    try {
      const user = await loginRequest(values.identifier, values.password);
      setUser(user); // remember who logged in, for every page
      navigate(homePathFor(user.role)); // e.g. a rider goes to /rider
    } catch (error) {
      // The server named the wrong fields: show each message under its field
      if (error.details.length > 0) {
        error.details.forEach((detail) => {
          setError(detail.field, { message: detail.message });
        });
        return;
      }

      // Anything else (wrong password, too many tries, no internet): one message above the button
      setError("root", { message: error.message });
    }
  };

  return (
    <Container>
      <section className="mx-auto max-w-md py-10">
        <Heading level={1}>Welcome back</Heading>
        <Text muted className="mt-2">
          Log in to order from kitchens across Kumasi.
        </Text>

        {/* noValidate: let our Zod messages show, not the browser's own pop-ups */}
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

          <FormField
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />

          <Link to="/forgot-password" className="self-end text-[15px] font-bold text-primary">
            Forgot password?
          </Link>

          {errors.root && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive p-3 text-[15px] text-destructive"
            >
              <CircleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{errors.root.message}</span>
            </div>
          )}

          {/* Disabled while sending, so a double tap can't log in twice [AC-UX-05] */}
          <Button type="submit" disabled={isSubmitting} className="h-12 w-full text-base font-bold">
            {isSubmitting ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <Text className="mt-6 text-center">
          New to CibusHub?{" "}
          <Link to="/register" className="font-bold text-primary">
            Create an account
          </Link>
        </Text>
      </section>
    </Container>
  );
};

export default LoginPage;
