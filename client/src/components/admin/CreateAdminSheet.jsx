import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CircleAlert } from "lucide-react";
import Sheet from "@/components/common/Sheet";
import FormField from "@/components/form/FormField";
import { Button } from "@/components/ui/button";
import { createAdminRequest } from "@/api/superAdmin";
import { isGhanaPhone } from "@/utils/phone";
import { passwordField } from "@/validators/auth/fields";

// The same rules as the server [AC-AUTH-03]
const createAdminSchema = z.object({
  fullName: z.string().trim().min(2, "Name is too short").max(100, "Name is too long"),
  email: z.string().trim().pipe(z.email("Enter a valid email")),
  phone: z.string().trim().refine(isGhanaPhone, "Enter a valid Ghana mobile number"),
  password: passwordField,
  role: z.enum(["ADMIN", "SUPER_ADMIN"]),
});

// A new admin account [AC-SADM-01]. The first password is handed over in person; it is never
// sent by SMS or email.
const CreateAdminSheet = ({ onDone, onClose }) => {
  const [rootError, setRootError] = useState("");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createAdminSchema),
    mode: "onTouched",
    defaultValues: { fullName: "", email: "", phone: "", password: "", role: "ADMIN" },
  });

  const onSubmit = async (values) => {
    setRootError("");
    try {
      await createAdminRequest(values);
      await onDone();
      onClose();
    } catch (error) {
      if (error.details && error.details.length > 0) {
        error.details.forEach((detail) => setError(detail.field, { message: detail.message }));
        return;
      }
      setRootError(error.message);
    }
  };

  return (
    <Sheet
      title="Add an admin"
      description="They can log in at once with the password you set. Give it to them in person."
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4 overflow-y-auto p-4"
      >
        <FormField
          id="admin-name"
          label="Full name"
          error={errors.fullName?.message}
          {...register("fullName")}
        />
        <FormField
          id="admin-email"
          label="Email"
          type="email"
          autoComplete="off"
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          id="admin-phone"
          label="Phone"
          type="tel"
          inputMode="tel"
          error={errors.phone?.message}
          {...register("phone")}
        />
        <FormField
          id="admin-password"
          label="First password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters, with a letter and a number. They should change it."
          error={errors.password?.message}
          {...register("password")}
        />
        <fieldset>
          <legend className="font-bold">Role</legend>
          <div className="mt-2 flex flex-col gap-2">
            <label className="flex items-start gap-3">
              <input
                type="radio"
                value="ADMIN"
                className="mt-1 size-5 accent-primary"
                {...register("role")}
              />
              <span>
                <span className="block font-bold">Admin</span>
                <span className="text-[15px] text-muted-foreground">Runs the day to day</span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="radio"
                value="SUPER_ADMIN"
                className="mt-1 size-5 accent-primary"
                {...register("role")}
              />
              <span>
                <span className="block font-bold">Super admin</span>
                <span className="text-[15px] text-muted-foreground">
                  Also manages admins and platform settings
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        {rootError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive p-3 text-[15px] text-destructive"
          >
            <CircleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{rootError}</span>
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="h-12 flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="h-12 flex-1 font-bold">
            {isSubmitting ? "Adding…" : "Add admin"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
};

export default CreateAdminSheet;
