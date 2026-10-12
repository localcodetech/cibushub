import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router";
import { CircleAlert } from "lucide-react";
import Container from "@/layouts/Container";
import Text from "@/components/typography/Text";
import FormField from "@/components/form/FormField";
import { Button } from "@/components/ui/button";
import { registerSchema } from "@/validators/auth/registerSchema";
import { registerRequest } from "@/api/auth";
import { registerRoles } from "@/data/registerRoles";
import SocialSignInButtons from "@/components/auth/SocialSignInButtons";
import PageHeader from "@/components/common/PageHeader";

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
      <section className="mx-auto max-w-md py-10">
        <PageHeader title="Create an account" />
        <Text muted className="mt-2">
          Join CibusHub in Kumasi. Choose how you'll use it.
        </Text>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 flex flex-col gap-5">
          {/* Role cards. Each card is a radio button, so only one can be picked.
              has-checked: the card turns green when the radio inside it is ticked. */}
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-[15px] font-bold text-foreground">
              I want to join as
            </legend>

            {registerRoles.map((role) => (
              <label
                key={role.value}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-input p-4 has-checked:border-primary has-checked:bg-primary/5"
              >
                <input
                  type="radio"
                  value={role.value}
                  className="mt-1 size-5 accent-primary"
                  {...register("role")}
                />
                <span>
                  <span className="block font-bold text-foreground">{role.title}</span>
                  <span className="block text-[15px] text-muted-foreground">
                    {role.description}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

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
            hint="We'll text you a code. For example 024 123 4567"
            type="tel"
            autoComplete="tel"
            error={errors.phone?.message}
            {...register("phone")}
          />

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
            hint="At least 8 characters, with a letter and a number"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />

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
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive p-3 text-[15px] text-destructive"
            >
              <CircleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{errors.root.message}</span>
            </div>
          )}

          {/* Disabled while sending, so a double tap can't create two accounts [AC-UX-05] */}
          <Button type="submit" disabled={isSubmitting} className="h-12 w-full text-base font-bold">
            {isSubmitting ? "Creating your account…" : "Continue to phone verification"}
          </Button>
        </form>

        {/* Sign up with Google / Apple instead: uses the role and Terms box above */}
        <SocialSignInButtons getSignupDetails={getSignupDetails} />

        <Text className="mt-6 text-center">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-primary">
            Log in
          </Link>
        </Text>
      </section>
    </Container>
  );
};

export default RegisterPage;
