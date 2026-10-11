import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CircleAlert } from "lucide-react";
import FormField from "@/components/form/FormField";
import { Button } from "@/components/ui/button";
import { saveRiderDetailsRequest } from "@/api/riderApplication";
import { RIDER_VEHICLES, isMotorised } from "@/data/riderVehicles";
import { cn } from "@/lib/utils";

// The same rules as the server, so mistakes show before sending [AC-RIDER-01]
const detailsSchema = z
  .object({
    vehicleType: z.enum(["MOTORBIKE", "BICYCLE", "CAR"], "Choose your vehicle"),
    plateNumber: z.string().trim().toUpperCase(),
    ghanaCardNumber: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^GHA-\d{9}-\d$/, "Use the format on your card, e.g. GHA-123456789-0"),
  })
  .refine((values) => !isMotorised(values.vehicleType) || values.plateNumber.length >= 4, {
    message: "Enter the plate number, e.g. GR 1234-21",
    path: ["plateNumber"],
  });

// Step 1 of the rider application: vehicle, plate number and Ghana Card number.
// application: what the server has so far; onSaved(application): called with the new version
const RiderDetailsForm = ({ application, onSaved }) => {
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(detailsSchema),
    mode: "onTouched",
    defaultValues: {
      vehicleType: application.vehicleType || "MOTORBIKE",
      plateNumber: application.plateNumber || "",
      ghanaCardNumber: application.ghanaCardNumber || "",
    },
  });

  // Bicycles have no plate, so the field hides when "Bicycle" is chosen
  const vehicleType = useWatch({ control, name: "vehicleType" });
  const needsPlate = isMotorised(vehicleType);

  const onSubmit = async (values) => {
    const details = { vehicleType: values.vehicleType, ghanaCardNumber: values.ghanaCardNumber };
    if (needsPlate) {
      details.plateNumber = values.plateNumber;
    }

    try {
      const saved = await saveRiderDetailsRequest(details);
      onSaved(saved);
    } catch (error) {
      // e.g. "This Ghana Card number is already registered"
      if (error.code === "GHANA_CARD_TAKEN") {
        setError("ghanaCardNumber", { message: error.message });
        return;
      }
      setError("root", { message: error.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <fieldset>
        <legend className="text-[15px] font-bold">Your vehicle</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {RIDER_VEHICLES.map((vehicle) => (
            // The label is the big tap target; the radio inside it is what the form reads
            <label
              key={vehicle.value}
              className={cn(
                "flex min-h-12 cursor-pointer items-center justify-center rounded-lg border px-2 font-bold",
                vehicleType === vehicle.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border",
              )}
            >
              <input
                type="radio"
                value={vehicle.value}
                className="sr-only"
                {...register("vehicleType")}
              />
              {vehicle.label}
            </label>
          ))}
        </div>
      </fieldset>

      {needsPlate && (
        <FormField
          id="plateNumber"
          label="Plate number"
          placeholder="GR 1234-21"
          autoCapitalize="characters"
          error={errors.plateNumber?.message}
          {...register("plateNumber")}
        />
      )}

      <FormField
        id="ghanaCardNumber"
        label="Ghana Card number"
        hint="As printed on your card"
        placeholder="GHA-123456789-0"
        autoCapitalize="characters"
        error={errors.ghanaCardNumber?.message}
        {...register("ghanaCardNumber")}
      />

      {errors.root && (
        <p role="alert" className="flex items-center gap-2 text-[15px] text-destructive">
          <CircleAlert size={18} aria-hidden="true" />
          {errors.root.message}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="h-12 text-base font-bold">
        {isSubmitting ? "Saving…" : "Save details"}
      </Button>
    </form>
  );
};

export default RiderDetailsForm;
