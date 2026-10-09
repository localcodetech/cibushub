import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, LocateFixed } from "lucide-react";
import FormField from "@/components/form/FormField";
import { Button } from "@/components/ui/button";
import PinMap from "@/components/address/PinMap";
import PlaceSearch from "@/components/address/PlaceSearch";
import { addressLabels } from "@/data/addressLabels";
import { addressSchema } from "@/validators/address/addressSchema";
import { getPlaceForPinRequest } from "@/api/addresses";

// Quick taps that add a common note for the rider
const QUICK_INSTRUCTIONS = [
  "Call when you arrive",
  "Call when at the junction",
  "Meet at the gate",
];

// 6 decimal places is about 10 cm: more than enough, and keeps numbers short
const roundCoordinate = (number) => Math.round(number * 1e6) / 1e6;

// The add / edit address form [AC-CUST-03 to 06].
// address:  the address being edited, or null for a new one
// onSave:   called with the details to send; it should throw the server's error if saving fails
const AddressForm = ({ address, onSave }) => {
  // The pin lives outside the form fields: it comes from the map, not from typing
  const [pin, setPin] = useState(
    address ? { latitude: address.latitude, longitude: address.longitude } : null,
  );
  const [pinMessage, setPinMessage] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  // Counts pin moves, so an old, slow area lookup can't overwrite a newer one
  const latestLookup = useRef(0);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    getFieldState,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(addressSchema),
    mode: "onTouched",
    defaultValues: {
      label: address ? address.label : "HOME",
      area: address?.area || "",
      ghanaPostGps: address?.ghanaPostGps || "",
      landmark: address?.landmark || "",
      deliveryInstructions: address?.deliveryInstructions || "",
    },
  });

  // Fill in the area from the pin, unless the customer typed their own [AC-CUST-05, AC-MAP-02]
  const fillAreaFrom = (areaName) => {
    const typedByHand = getFieldState("area").isDirty;
    if (areaName && !typedByHand) {
      setValue("area", areaName);
    }
  };

  // Every way the pin moves (tap, drag, location, search) comes through here
  const handlePinChange = async (newPin) => {
    const rounded = {
      latitude: roundCoordinate(newPin.latitude),
      longitude: roundCoordinate(newPin.longitude),
    };
    setPin(rounded);
    setPinMessage("");

    latestLookup.current += 1;
    const thisLookup = latestLookup.current;

    try {
      const place = await getPlaceForPinRequest(rounded.latitude, rounded.longitude);
      // The pin moved again while we waited: this answer is for an old spot
      if (thisLookup !== latestLookup.current) {
        return;
      }
      fillAreaFrom(place.area);
    } catch {
      // No area name is fine: the customer can type it
    }
  };

  // A search result: put the pin there and use its area
  const handlePickPlace = (place) => {
    handlePinChange({ latitude: place.latitude, longitude: place.longitude });
    fillAreaFrom(place.area);
  };

  // "Use my current location" [AC-CUST-05]
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setPinMessage("This browser can't share your location. Tap the map to place the pin.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        handlePinChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        setIsLocating(false);
        // error.code 1 means the customer (or the browser) said no
        if (error.code === 1) {
          setPinMessage(
            "Location is blocked. Allow it in your browser settings, or tap the map to place the pin yourself.",
          );
        } else {
          setPinMessage("We couldn't find your location. Tap the map to place the pin yourself.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // A quick note button adds its text to the instructions box
  const handleQuickInstruction = (text) => {
    const current = getValues("deliveryInstructions").trim();
    const updated = current ? current + ". " + text : text;
    setValue("deliveryInstructions", updated, { shouldDirty: true });
  };

  const onSubmit = async (values) => {
    // No pin, no address: riders navigate by it [AC-CUST-04]
    if (!pin) {
      setPinMessage("Drop a pin on the map so the rider can find you.");
      return;
    }

    // Leave out empty optional fields; the server refuses empty text
    const details = { label: values.label, latitude: pin.latitude, longitude: pin.longitude };
    if (values.area) details.area = values.area;
    if (values.ghanaPostGps) details.ghanaPostGps = values.ghanaPostGps.toUpperCase();
    if (values.landmark) details.landmark = values.landmark;
    if (values.deliveryInstructions) details.deliveryInstructions = values.deliveryInstructions;

    try {
      await onSave(details);
    } catch (error) {
      setError("root", { message: error.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      {/* ── Where: search, current location, map ── */}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-[15px] font-bold">Delivery spot</legend>
        <p className="text-[13px] text-muted-foreground">
          Tap the map or drag the pin to your exact door. The rider follows this pin.
        </p>

        <PlaceSearch onPick={handlePickPlace} />

        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={isLocating}
          className="inline-flex min-h-11 items-center gap-2 self-start font-bold text-primary disabled:opacity-60"
        >
          <LocateFixed size={18} aria-hidden="true" />
          {isLocating ? "Finding you…" : "Use my current location"}
        </button>

        <PinMap pin={pin} onPinChange={handlePinChange} />

        {pinMessage && (
          <p role="alert" className="text-[15px] text-destructive">
            {pinMessage}
          </p>
        )}
      </fieldset>

      {/* ── Label: Home / Work / Other, as big tappable choices ── */}
      <fieldset>
        <legend className="mb-2 text-[15px] font-bold">Save as</legend>
        <div className="flex gap-2">
          {addressLabels.map((option) => {
            const Icon = option.icon;
            return (
              // has-checked: style the label when the radio inside it is chosen
              <label
                key={option.value}
                className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border font-bold has-checked:border-primary has-checked:bg-primary/10 has-checked:text-primary has-focus-visible:ring-2 has-focus-visible:ring-ring"
              >
                <input
                  type="radio"
                  value={option.value}
                  className="sr-only"
                  {...register("label")}
                />
                <Icon size={18} aria-hidden="true" />
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <FormField
        id="area"
        label="Area"
        hint="Filled in from the pin. Change it if it's not right."
        type="text"
        autoComplete="address-level3"
        error={errors.area?.message}
        {...register("area")}
      />

      <FormField
        id="landmark"
        label="Landmark (optional)"
        hint="Something a rider can see, e.g. opposite the Total filling station"
        type="text"
        error={errors.landmark?.message}
        {...register("landmark")}
      />

      <FormField
        id="ghanaPostGps"
        label="Ghana Post GPS (optional)"
        hint="For example AK-039-5028"
        type="text"
        autoCapitalize="characters"
        error={errors.ghanaPostGps?.message}
        {...register("ghanaPostGps")}
      />

      <div className="flex flex-col gap-2">
        <label htmlFor="deliveryInstructions" className="text-[15px] font-bold">
          Instructions for the rider (optional)
        </label>
        <div className="flex flex-wrap gap-2">
          {QUICK_INSTRUCTIONS.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => handleQuickInstruction(text)}
              className="min-h-10 rounded-full border border-border px-3 text-[13px] font-bold"
            >
              + {text}
            </button>
          ))}
        </div>
        <textarea
          id="deliveryInstructions"
          rows={3}
          aria-invalid={errors.deliveryInstructions ? true : false}
          className="rounded-lg border border-input bg-white px-3.5 py-3 text-base dark:bg-card"
          {...register("deliveryInstructions")}
        />
        {errors.deliveryInstructions && (
          <p className="text-[15px] text-destructive">{errors.deliveryInstructions.message}</p>
        )}
      </div>

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
        {isSubmitting ? "Saving…" : "Save address"}
      </Button>
    </form>
  );
};

export default AddressForm;
