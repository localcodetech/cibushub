import { Briefcase, Home, MapPin } from "lucide-react";

// The three address labels the server accepts [AC-CUST-03], with an icon for each
export const addressLabels = [
  { value: "HOME", label: "Home", icon: Home },
  { value: "WORK", label: "Work", icon: Briefcase },
  { value: "OTHER", label: "Other", icon: MapPin },
];

// "WORK" -> { value: "WORK", label: "Work", icon: Briefcase }
export const findAddressLabel = (value) => {
  return addressLabels.find((option) => option.value === value) || addressLabels[2];
};

// The server allows 10 per customer [AC-CUST-08]
export const MAX_ADDRESSES = 10;
