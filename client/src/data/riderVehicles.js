// The vehicles a rider can use. Motorbikes and cars need a plate number and a driver's licence.
export const RIDER_VEHICLES = [
  { value: "MOTORBIKE", label: "Motorbike", motorised: true },
  { value: "BICYCLE", label: "Bicycle", motorised: false },
  { value: "CAR", label: "Car", motorised: true },
];

export const isMotorised = (vehicleType) => {
  const vehicle = RIDER_VEHICLES.find((item) => item.value === vehicleType);
  return vehicle ? vehicle.motorised : false;
};
