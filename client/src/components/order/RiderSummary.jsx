import { RIDER_VEHICLES } from "@/data/riderVehicles";

const vehicleLabel = (vehicleType) => {
  const vehicle = RIDER_VEHICLES.find((item) => item.value === vehicleType);
  return vehicle ? vehicle.label : "";
};

// Who is bringing the food: photo (or their initial), first name, vehicle and plate.
// Shown to the customer and the restaurant, so they can spot the rider [AC-RORD-08].
// rider: { firstName, photoUrl, vehicleType, plateNumber }; children: an extra line (e.g. ETA)
const RiderSummary = ({ rider, children }) => {
  return (
    <div className="flex items-center gap-3">
      {rider.photoUrl ? (
        <img
          src={rider.photoUrl}
          alt=""
          className="size-12 shrink-0 rounded-full border border-border object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-lg font-bold text-primary-foreground"
        >
          {rider.firstName.charAt(0)}
        </span>
      )}
      <div className="min-w-0">
        <p className="font-bold">{rider.firstName}</p>
        <p className="text-[15px] text-muted-foreground">
          {vehicleLabel(rider.vehicleType)}
          {rider.plateNumber && " · " + rider.plateNumber}
        </p>
        {children}
      </div>
    </div>
  );
};

export default RiderSummary;
