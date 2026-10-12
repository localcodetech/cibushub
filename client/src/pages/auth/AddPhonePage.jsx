import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Navigate, useNavigate } from "react-router";
import { z } from "zod";
import { CircleAlert } from "lucide-react";
import Container from "@/layouts/Container";
import Text from "@/components/typography/Text";
import FormField from "@/components/form/FormField";
import { Button } from "@/components/ui/button";
import { addPhoneRequest } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { homePathFor } from "@/utils/roleHome";
import { isGhanaPhone } from "@/utils/phone";
import PageHeader from "@/components/common/PageHeader";

const addPhoneSchema = z.object({
  phone: z.string().trim().refine(isGhanaPhone, "Enter a valid Ghana mobile number"),
});

// After a first Google / Apple sign-in (no phone yet), or to fix a mistyped number
// before verifying. Then the SMS code screen proves the phone is theirs.
const AddPhonePage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(addPhoneSchema),
    mode: "onTouched",
    defaultValues: { phone: "" },
  });

  // Only for logged-in users whose phone isn't verified yet
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.phoneVerifiedAt) {
    return <Navigate to={homePathFor(user.role)} replace />;
  }

  const onSubmit = async (values) => {
    try {
      const updatedUser = await addPhoneRequest(values.phone);
      setUser(updatedUser);
      // A code is on its way: enter it on the next screen
      navigate("/verify-phone", { state: { phone: updatedUser.phone } });
    } catch (error) {
      // e.g. "This phone number is already used by another account"
      if (error.code === "PHONE_TAKEN" || error.details.length > 0) {
        setError("phone", { message: error.message });
        return;
      }
      setError("root", { message: error.message });
    }
  };

  return (
    <Container>
      <section className="mx-auto max-w-md py-10">
        <PageHeader title="Add your phone number" />
        <Text muted className="mt-2">
          Riders and restaurants use it to reach you about your order. We'll text you a code to
          check it's yours.
        </Text>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 flex flex-col gap-5">
          <FormField
            id="phone"
            label="Phone number"
            hint="For example 024 123 4567"
            type="tel"
            autoComplete="tel"
            error={errors.phone?.message}
            {...register("phone")}
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

          <Button type="submit" disabled={isSubmitting} className="h-12 w-full text-base font-bold">
            {isSubmitting ? "Sending code…" : "Send code"}
          </Button>
        </form>
      </section>
    </Container>
  );
};

export default AddPhonePage;
