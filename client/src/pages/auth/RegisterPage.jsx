import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router";
import Container from "@/layouts/Container";
import Text from "@/components/typography/Text";
import FormField from "@/components/form/FormField";
import { Button } from "@/components/ui/button";
import { registerSchema } from "@/validators/auth/registerSchema";
import { registerRequest } from "@/api/auth";
import RoleChoiceCards from "@/components/auth/RoleChoiceCards";
import AuthWelcome from "@/components/auth/AuthWelcome";
import SocialSignInButtons from "@/components/auth/SocialSignInButtons";
import PageHeader from "@/components/common/PageHeader";
import Alert from "@/components/common/Alert";

// Sign-up for customers, restaurant owners and riders [AC-AUTH-01, AC-AUTH-05]

const RegisterPage = () => {
  const navigate = useNavigate();

  // Same setup as the login form: Zod rules, errors shown once a field is left
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: {
      role: "CUSTOMER",
      fullName: "",
      phone: "",
      email: "",
      password: "",
      acceptTerms: false,
      marketingOptIn: false,
    },
  });

  // For the Google / Apple buttons: the chosen role, and whether the Terms box is ticked.
  // Not ticked? The buttons ask in a pop-up instead of stopping here.
  const getSignupDetails = () => {
    return { role: getValues("role"), acceptTerms: getValues("acceptTerms") === true };
  };

  // Runs only when the Zod rules pass
  const onSubmit = async (values) => {
    try {
      const user = await registerRequest({
        role: values.role,
        fullName: values.fullName,
        phone: values.phone,
        email: values.email,
        password: values.password,
        // The server saves when, and which version of the Terms, was accepted
        acceptTerms: values.acceptTerms,
        marketingOptIn: values.marketingOptIn,
      });

      // The server texted a code. The next page asks for it, so it needs the phone number.
      navigate("/verify-phone", { state: { phone: user.phone } });
    } catch (error) {
      // The server named the wrong fields: show each message under its field
      if (error.details.length > 0) {
        error.details.forEach((detail) => {
          setError(detail.field, { message: detail.message });
        });
        return;
      }

      // Anything else (account already exists, too many tries, no internet)
      setError("root", { message: error.message });
    }
  };

  return (
    <Container>
      {/* Phones: just the form. Laptops: what CibusHub is on the left, the form in a card on
          the right (like Facebook's sign-up page) */}
      <section className="mx-auto grid max-w-md items-start gap-12 py-10 lg:max-w-6xl lg:grid-cols-[1fr_minmax(0,600px)] lg:py-8">
        <AuthWelcome />
        <div className="lg:rounded-xl lg:border lg:border-border lg:bg-card lg:p-6 lg:shadow-sm">
          <PageHeader title="Create an account" />
          <Text muted className="mt-2 lg:hidden">
            Join CibusHub in Kumasi. Choose how you'll use it.
          </Text>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="mt-6 flex flex-col gap-4 lg:mt-4"
          >
            {/* Flip cards: one radio button each, so only one role can be chosen */}
            <RoleChoiceCards registerField={register("role")} />

            {/* Side by side on wider screens, one under the other on phones */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="fullName"
                label="Full name"
                type="text"
                autoComplete="name"
                error={errors.fullName?.message}
                {...register("fullName")}
              />

              <FormField
                id="phone"
                label="Phone number"
                placeholder="024 123 4567 (we'll text a code)"
                type="tel"
                autoComplete="tel"
                error={errors.phone?.message}
                {...register("phone")}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                error={errors.email?.message}
                {...register("email")}
              />

              <FormField
                id="password"
                label="Password"
                placeholder="8+ letters and numbers"
                type="password"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register("password")}
              />
            </div>

            {/* Terms and Privacy: must be ticked before signing up */}
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-start gap-3 text-[15px] text-foreground">
                <input
                  type="checkbox"
                  className="mt-0.5 size-5 accent-primary"
                  aria-invalid={errors.acceptTerms ? true : false}
                  {...register("acceptTerms")}
                />
                <span>
                  I agree to the{" "}
                  <Link to="/terms" target="_blank" className="font-bold text-primary">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" target="_blank" className="font-bold text-primary">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              {errors.acceptTerms && (
                <p className="text-[15px] text-destructive">{errors.acceptTerms.message}</p>
              )}
            </div>

            {/* Offers and news: optional, and unticked unless they choose it [AC-NOTIF-09] */}
            <label className="flex cursor-pointer items-start gap-3 text-[15px] text-foreground">
              <input
                type="checkbox"
                className="mt-0.5 size-5 accent-primary"
                {...register("marketingOptIn")}
              />
              <span>Send me offers and news (you can change this any time)</span>
            </label>

            {errors.root && (
              <Alert>
                {" "}
                <span>{errors.root.message}</span>
              </Alert>
            )}

            {/* Disabled while sending, so a double tap can't create two accounts [AC-UX-05] */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full text-base font-bold"
            >
              {isSubmitting ? "Creating your account…" : "Continue to phone verification"}
            </Button>
          </form>

          {/* Sign up with Google / Apple instead: uses the role and Terms box above */}
          <SocialSignInButtons getSignupDetails={getSignupDetails} />

          <Text className="mt-4 text-center">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-primary">
              Log in
            </Link>
          </Text>
        </div>
      </section>
    </Container>
  );
};

export default RegisterPage;
