"use strict";

// Fictional demo riders for Kumasi. Names, phones, Ghana Card and plate numbers are made up.
// No documents are uploaded: the approved riders are approved directly by the seeder.

const riders = [
  {
    user: {
      fullName: "Yaw Darko",
      email: "yaw.rider@example.com",
      phone: "+233240000401",
      status: "ACTIVE",
    },
    profile: {
      vehicleType: "MOTORBIKE",
      plateNumber: "AS 1201-24",
      ghanaCardNumber: "GHA-900000401-1",
      status: "APPROVED",
    },
  },
  {
    user: {
      fullName: "Efua Ansah",
      email: "efua.rider@example.com",
      phone: "+233240000402",
      status: "ACTIVE",
    },
    profile: {
      vehicleType: "BICYCLE",
      plateNumber: null,
      ghanaCardNumber: "GHA-900000402-2",
      status: "APPROVED",
    },
  },
  {
    user: {
      fullName: "Kojo Amponsah",
      email: "kojo.rider@example.com",
      phone: "+233240000403",
      status: "ACTIVE",
    },
    profile: {
      vehicleType: "CAR",
      plateNumber: "AS 4415-23",
      ghanaCardNumber: "GHA-900000403-3",
      status: "APPROVED",
    },
  },
  // Waiting in the admin review queue (submitted, not yet approved)
  {
    user: {
      fullName: "Abena Frimpong",
      email: "abena.rider@example.com",
      phone: "+233240000404",
      status: "PENDING_APPROVAL",
    },
    profile: {
      vehicleType: "MOTORBIKE",
      plateNumber: "AS 7781-25",
      ghanaCardNumber: "GHA-900000404-4",
      status: "PENDING_APPROVAL",
    },
  },
];

module.exports = { riders };
