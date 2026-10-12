import { formatMoney } from "@/utils/money";

// The platform settings a super admin can change [AC-SADM-02], in words, grouped as on screen.
// key:    the server's name for it
// unit:   "money" (pesewas, typed in GHS), or the word shown after a whole number
// min/max: the same limits as the server's validator
export const SETTING_GROUPS = [
  {
    title: "Fees",
    settings: [
      {
        key: "deliveryBasePesewas",
        label: "Delivery fee: base",
        hint: "Every delivery starts at this",
        unit: "money",
        max: 10000,
      },
      {
        key: "deliveryPerKmPesewas",
        label: "Delivery fee: per km",
        hint: "Added for each road kilometre",
        unit: "money",
        max: 5000,
      },
      {
        key: "serviceFeePesewas",
        label: "Service fee",
        hint: "Added to every order",
        unit: "money",
        max: 5000,
      },
      {
        key: "commissionPercent",
        label: "Commission",
        hint: "CibusHub's share of the food subtotal",
        unit: "%",
        min: 0,
        max: 50,
      },
    ],
  },
  {
    title: "Finding a rider",
    settings: [
      {
        key: "searchRadiusKm",
        label: "First search radius",
        hint: "How far from the restaurant riders are looked for",
        unit: "km",
        min: 1,
        max: 30,
      },
      {
        key: "widenedRadiusKm",
        label: "Second, wider search radius",
        hint: "Used if nobody accepts in the first search",
        unit: "km",
        min: 1,
        max: 50,
      },
      {
        key: "offerSeconds",
        label: "Time to answer an offer",
        unit: "seconds",
        min: 20,
        max: 300,
      },
    ],
  },
  {
    title: "Time limits",
    settings: [
      {
        key: "restaurantResponseMinutes",
        label: "Restaurant must accept within",
        hint: "After this a paid order is rejected and refunded",
        unit: "minutes",
        min: 2,
        max: 30,
      },
      {
        key: "unpaidOrderMinutes",
        label: "Unpaid order is cancelled after",
        unit: "minutes",
        min: 10,
        max: 120,
      },
    ],
  },
];

// Every setting by key, for the history list
export const SETTINGS_BY_KEY = Object.fromEntries(
  SETTING_GROUPS.flatMap((group) => group.settings).map((setting) => [setting.key, setting]),
);

export const PAYMENT_METHOD_NAMES = {
  PAYSTACK: "Paystack (MoMo and card)",
};

// One value as a person reads it: 500 -> "GHS 5.00", 12 -> "12 %", ["PAYSTACK"] -> "Paystack…"
export const formatSettingValue = (key, value) => {
  if (key === "paymentMethods") {
    return value.map((method) => PAYMENT_METHOD_NAMES[method] || method).join(", ");
  }
  const setting = SETTINGS_BY_KEY[key];
  if (!setting) return String(value);
  if (setting.unit === "money") return formatMoney(value);
  return value + " " + setting.unit;
};

export const settingLabel = (key) => {
  if (key === "paymentMethods") return "Ways to pay";
  return SETTINGS_BY_KEY[key] ? SETTINGS_BY_KEY[key].label : key;
};
