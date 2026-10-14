import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router";
import { CircleCheck } from "lucide-react";
import Container from "@/layouts/Container";
import Text from "@/components/typography/Text";
import FormField from "@/components/form/FormField";
import { Button } from "@/components/ui/button";
import { loginSchema } from "@/validators/auth/loginSchema";
import { loginRequest } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { afterLoginPath } from "@/utils/roleHome";
import SocialSignInButtons from "@/components/auth/SocialSignInButtons";
import PageHeader from "@/components/common/PageHeader";
import AuthWelcome from "@/components/auth/AuthWelcome";
import Alert from "@/components/common/Alert";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // A note handed over by the page before, e.g. "Phone verified. Log in to continue."
  let notice = "";
  if (location.state && location.state.message) {
    notice = location.state.message;
  }
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
      // Back to the page they came from (e.g. checkout), or their home: a rider goes to /rider
      navigate(afterLoginPath(user, location));
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
      {/* Phones: just the form. Laptops: what CibusHub is on the left, the form in a card on
          the right, like the Sign up page */}
      <section className="mx-auto grid max-w-md items-start gap-12 py-10 lg:max-w-6xl lg:grid-cols-[1fr_minmax(0,520px)] lg:py-12">
        <AuthWelcome />
        <div className="lg:overflow-hidden lg:rounded-xl lg:border lg:border-border lg:bg-card lg:p-6 lg:shadow-sm">
          {/* Kente across the top of the card, like our emails */}
          <div aria-hidden="true" className="kente-band -mx-6 -mt-6 mb-6 hidden h-1.5 lg:block" />
          <PageHeader title="Welcome back" />
          <Text muted className="mt-2">
            Log in to order from kitchens across Kumasi.
          </Text>

          {notice && (
            <div
              role="status"
              className="mt-6 flex items-start gap-2 rounded-lg border border-primary p-3 text-[15px] text-foreground"
            >
              <CircleCheck size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <span>{notice}</span>
            </div>
          )}

          {/* noValidate: let our Zod messages show, not the browser's own pop-ups */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 flex flex-col gap-4">
            <FormField
              id="identifier"
              label="Phone number or email"
              placeholder="024 123 4567 or you@example.com"
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
              <Alert>
                {" "}
                <span>{errors.root.message}</span>
              </Alert>
            )}

            {/* Disabled while sending, so a double tap can't log in twice [AC-UX-05] */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full text-base font-bold"
            >
              {isSubmitting ? "Logging in…" : "Log in"}
            </Button>
          </form>

          {/* "Continue with Google / Apple / Facebook" (only shows once their IDs are set) */}
          <SocialSignInButtons />

          <Text className="mt-4 text-center">
            New to CibusHub?{" "}
            <Link to="/register" className="font-bold text-primary">
              Create an account
            </Link>
          </Text>
        </div>
      </section>
    </Container>
  );
};

export default LoginPage;
