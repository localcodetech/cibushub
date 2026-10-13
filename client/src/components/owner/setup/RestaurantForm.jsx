import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LocateFixed } from "lucide-react";
import FormField from "@/components/form/FormField";
import { Button } from "@/components/ui/button";
import Card, { CardHeader } from "@/components/common/Card";
import Alert from "@/components/common/Alert";
import { Chip } from "@/components/common/Chips";
import PinMap from "@/components/address/PinMap";
import PlaceSearch from "@/components/address/PlaceSearch";
import OpeningHoursEditor from "./OpeningHoursEditor";
import { getPlaceForPinRequest } from "@/api/addresses";
import { ownerCuisineOptions } from "@/data/restaurantFilters";
import { DEFAULT_HOURS, hoursProblem, toEditableHours } from "@/utils/openingHours";
import { isGhanaPhone } from "@/utils/phone";

const OWNER_MAPS = "/owner/maps";

// Six decimal places (about 10 cm) is plenty for a door
const roundCoordinate = (number) => Math.round(number * 1e6) / 1e6;

// "20" or "20.50" -> 2050 pesewas; money is always whole pesewas on the server
const toPesewas = (text) => Math.round(Number(text) * 100);

// The same rules as the server (validators/restaurant/fields.js) [AC-REST-01]
const restaurantSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120, "Name is too long"),
  legalName: z.string().trim().min(2, "Legal name is too short").max(160, "Legal name is too long"),
  description: z.string().trim().max(1000, "Description is too long"),
  phone: z.string().trim().refine(isGhanaPhone, "Enter a valid Ghana phone number"),
  addressLine: z.string().trim().min(3, "Address is too short").max(255, "Address is too long"),
  area: z.string().trim().min(2, "Area is too short").max(80, "Area is too long"),
  minOrderGhs: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 20 or 20.50"),
  deliveryRadiusKm: z
    .number({ error: "Enter a number" })
    .min(1, "At least 1 km")
    .max(30, "At most 30 km"),
  prepTimeMinutes: z
    .number({ error: "Enter a number" })
    .int("Use whole minutes")
    .min(5, "At least 5 minutes")
    .max(120, "At most 120 minutes"),
});

// Registering a restaurant, and later editing it [AC-REST-01, AC-REST-04].
//   restaurant: the saved restaurant when editing; nothing when registering a new one
//   submitLabel: e.g. "Send for review" or "Save changes"
//   onSave(details): the page sends them to the server; throw the API error to show it here
const RestaurantForm = ({ restaurant, submitLabel, onSave }) => {
  const [pin, setPin] = useState(
    restaurant
      ? { latitude: Number(restaurant.latitude), longitude: Number(restaurant.longitude) }
      : null,
  );
  const [pinMessage, setPinMessage] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [cuisines, setCuisines] = useState(restaurant ? restaurant.cuisineTags : []);
  const [cuisineMessage, setCuisineMessage] = useState("");
  const [hours, setHours] = useState(
    restaurant ? toEditableHours(restaurant.openingHours || []) : DEFAULT_HOURS,
  );
  const [hoursMessage, setHoursMessage] = useState("");
  const [rootError, setRootError] = useState("");
  // Counts pin moves, so an old, slow area lookup can't overwrite a newer one
  const latestLookup = useRef(0);

  const {
    register,
    handleSubmit,
    setValue,
    getFieldState,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(restaurantSchema),
    mode: "onTouched",
    defaultValues: {
      name: restaurant?.name || "",
      legalName: restaurant?.legalName || "",
      description: restaurant?.description || "",
      phone: restaurant?.phone || "",
      addressLine: restaurant?.addressLine || "",
      area: restaurant?.area || "",
      minOrderGhs: restaurant ? (restaurant.minOrderPesewas / 100).toFixed(2) : "0",
      deliveryRadiusKm: restaurant ? Number(restaurant.deliveryRadiusKm) : 5,
      prepTimeMinutes: restaurant ? restaurant.prepTimeMinutes : 20,
    },
  });

  // The pin gives the area name, unless the owner typed their own
  const fillAreaFrom = (areaName) => {
    if (areaName && !getFieldState("area").isDirty) {
      setValue("area", areaName, { shouldValidate: true });
    }
  };

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
      const place = await getPlaceForPinRequest(rounded.latitude, rounded.longitude, OWNER_MAPS);
      if (thisLookup === latestLookup.current) fillAreaFrom(place.area);
    } catch {
      // No area name is fine: the owner can type it
    }
  };

  const handlePickPlace = (place) => {
    handlePinChange({ latitude: place.latitude, longitude: place.longitude });
    fillAreaFrom(place.area);
  };

  // Standing in the kitchen: "use my location" is the quickest way to an exact pin
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
      () => {
        setIsLocating(false);
        setPinMessage("We couldn't get your location. Search for the place or tap the map.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const toggleCuisine = (value) => {
    setCuisineMessage("");
    setCuisines(
      cuisines.includes(value) ? cuisines.filter((item) => item !== value) : [...cuisines, value],
    );
  };

  // The checks the form library can't see: pin, cuisines and hours. Shown together with the
  // typed fields' errors, so the owner sees every problem in one go. true when all is fine.
  const checkExtras = () => {
    let fine = true;
    if (!pin) {
      setPinMessage("Put the pin on your restaurant's door, so riders can find it.");
      fine = false;
    }
    if (cuisines.length === 0) {
      setCuisineMessage("Pick at least one cuisine.");
      fine = false;
    }
    const problem = hoursProblem(hours);
    setHoursMessage(problem);
    if (problem) fine = false;
    return fine;
  };

  const onSubmit = async (values) => {
    setRootError("");
    if (!checkExtras()) return;

    const details = {
      name: values.name,
      legalName: values.legalName,
      phone: values.phone,
      cuisineTags: cuisines,
      addressLine: values.addressLine,
      area: values.area,
      latitude: pin.latitude,
      longitude: pin.longitude,
      openingHours: hours.map((day) =>
        day.isClosed
          ? { dayOfWeek: day.dayOfWeek, isClosed: true }
          : {
              dayOfWeek: day.dayOfWeek,
              isClosed: false,
              opensAt: day.opensAt,
              closesAt: day.closesAt,
            },
      ),
      minOrderPesewas: toPesewas(values.minOrderGhs),
      deliveryRadiusKm: values.deliveryRadiusKm,
      prepTimeMinutes: values.prepTimeMinutes,
    };
    // The server refuses an empty description: leave it out instead
    if (values.description) details.description = values.description;

    try {
      await onSave(details);
    } catch (error) {
      // Field problems go under their boxes; anything else at the bottom
      const fieldDetails = (error.details || []).filter((detail) => detail.field in values);
      fieldDetails.forEach((detail) => setError(detail.field, { message: detail.message }));
      if (fieldDetails.length === 0) setRootError(error.message);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        // Show the pin, cuisine and hours problems even while typed fields still have errors
        checkExtras();
        handleSubmit(onSubmit)(event);
      }}
      noValidate
      className="space-y-6"
    >
      <Card padding="lg">
        <CardHeader title="About the restaurant" level={2} />
        <div className="space-y-4">
          <FormField
            id="restaurant-name"
            label="Restaurant name"
            hint="The name customers see, e.g. Maame Akua's Chop Bar"
            error={errors.name?.message}
            {...register("name")}
          />
          <FormField
            id="restaurant-legal-name"
            label="Registered business name"
            hint="As on your business registration. Our team checks it."
            error={errors.legalName?.message}
            {...register("legalName")}
          />
          <div>
            <label htmlFor="restaurant-description" className="text-[15px] font-bold">
              Short description (optional)
            </label>
            <p className="mt-1 text-[13px] text-muted-foreground">
              What you are known for, e.g. "Fufu and light soup, served hot every day."
            </p>
            <textarea
              id="restaurant-description"
              rows={3}
              maxLength={1000}
              className="mt-2 w-full rounded-lg border border-input bg-white px-3.5 py-2 text-base dark:bg-card"
              {...register("description")}
            />
          </div>
          {/* min-w-0: a fieldset otherwise refuses to shrink below its content's width */}
          <fieldset className="min-w-0">
            <legend className="text-[15px] font-bold">Cuisines</legend>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Customers filter by these. Pick all that fit.
            </p>
            {/* Wraps instead of scrolling sideways: the owner picks several, so all stay in view */}
            <div className="mt-2 flex flex-wrap gap-2">
              {ownerCuisineOptions.map((option) => (
                <Chip
                  key={option.value}
                  selected={cuisines.includes(option.value)}
                  onClick={() => toggleCuisine(option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
            {cuisineMessage && (
              <p className="mt-2 text-[15px] text-destructive">{cuisineMessage}</p>
            )}
          </fieldset>
        </div>
      </Card>

      <Card padding="lg" id="restaurant-location">
        <CardHeader title="Where is it?" level={2} />
        <p className="text-[15px] text-muted-foreground">
          Put the pin on your door. Riders follow it to collect orders.
        </p>
        <div className="mt-3 space-y-3">
          <PlaceSearch onPick={handlePickPlace} mapsBase={OWNER_MAPS} />
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={isLocating}
            className="inline-flex min-h-11 items-center gap-2 font-bold text-primary disabled:opacity-60"
          >
            <LocateFixed size={18} aria-hidden="true" />
            {isLocating ? "Finding you…" : "I'm at the restaurant: use my location"}
          </button>
          <PinMap pin={pin} onPinChange={handlePinChange} />
          {pinMessage && <Alert>{pinMessage}</Alert>}
          <FormField
            id="restaurant-address"
            label="Street address"
            hint="e.g. 14 Prempeh II Street, opposite the bank"
            error={errors.addressLine?.message}
            {...register("addressLine")}
          />
          <FormField
            id="restaurant-area"
            label="Area"
            hint="Filled in from the pin. Change it if it's not right."
            error={errors.area?.message}
            {...register("area")}
          />
        </div>
      </Card>

      <Card padding="lg">
        <CardHeader title="Contact and delivery" level={2} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="restaurant-phone"
            label="Restaurant phone"
            type="tel"
            inputMode="tel"
            hint="Riders and customers call this about orders"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <FormField
            id="restaurant-min-order"
            label="Minimum order (GHS)"
            inputMode="decimal"
            hint="0 for no minimum"
            error={errors.minOrderGhs?.message}
            {...register("minOrderGhs")}
          />
          <FormField
            id="restaurant-radius"
            label="Delivery distance (km)"
            type="number"
            inputMode="decimal"
            hint="How far from you customers can order. 1 to 30 km."
            error={errors.deliveryRadiusKm?.message}
            {...register("deliveryRadiusKm", { valueAsNumber: true })}
          />
          <FormField
            id="restaurant-prep"
            label="Usual preparation time (minutes)"
            type="number"
            inputMode="numeric"
            hint="Customers see this. You can change it for each order."
            error={errors.prepTimeMinutes?.message}
            {...register("prepTimeMinutes", { valueAsNumber: true })}
          />
        </div>
      </Card>

      <Card padding="lg">
        <CardHeader title="Opening hours" level={2} />
        <OpeningHoursEditor value={hours} onChange={setHours} />
        {hoursMessage && <Alert className="mt-3">{hoursMessage}</Alert>}
      </Card>

      {rootError && <Alert>{rootError}</Alert>}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full font-bold sm:w-auto sm:px-8"
      >
        {isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
};

export default RestaurantForm;
