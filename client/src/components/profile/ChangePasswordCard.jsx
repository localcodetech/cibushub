import { useState } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Card, { CardHeader } from "@/components/common/Card";
import Alert from "@/components/common/Alert";
import FormField from "@/components/form/FormField";
import { Button } from "@/components/ui/button";
import { changePasswordRequest } from "@/api/auth";
import { passwordField } from "@/validators/auth/fields";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordField,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "The two new passwords don't match",
    path: ["confirmPassword"],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: "Choose a password different from your current one",
    path: ["newPassword"],
  });

// Change my password [AC-AUTH-20]. The current password proves it's really me. This device
// stays logged in; every other device is logged out, and we send a "password changed" notice.

const ChangePasswordCard = () => {
  const [doneMessage, setDoneMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    mode: "onTouched",
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values) => {
    setDoneMessage("");
    setErrorMessage("");
    try {
      await changePasswordRequest(values.currentPassword, values.newPassword);
      reset();
      setDoneMessage("Password changed. Any other phone or computer was logged out.");
    } catch (error) {
      // e.g. "Current password is incorrect" goes under that box
      const fieldDetails = (error.details || []).filter((detail) => detail.field in values);
      fieldDetails.forEach((detail) => setError(detail.field, { message: detail.message }));
      if (fieldDetails.length === 0) setErrorMessage(error.message);
    }
  };

  return (
    <Card padding="lg">
      <CardHeader title="Password" level={2} />
      {doneMessage && (
        <Alert tone="success" className="mb-4">
          {doneMessage}
        </Alert>
      )}
      {errorMessage && <Alert className="mb-4">{errorMessage}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField
          id="current-password"
          label="Current password"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register("currentPassword")}
        />
        <FormField
          id="new-password"
          label="New password"
          hint="At least 8 characters, with a letter and a number."
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <FormField
          id="confirm-password"
          label="New password again"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={isSubmitting} className="h-12 font-bold sm:px-8">
            {isSubmitting ? "Saving…" : "Change password"}
          </Button>
          {/* Google / Apple / Facebook accounts have no password yet: this is how they set one */}
          <Link
            to="/forgot-password"
            className="inline-flex min-h-11 items-center font-bold text-primary underline-offset-4 hover:underline"
          >
            Forgot your password?
          </Link>
        </div>
      </form>
    </Card>
  );
};

export default ChangePasswordCard;
