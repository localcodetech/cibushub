import { SETTINGS_BY_KEY, formatSettingValue, settingLabel } from "@/data/settingLabels";
import { formatMoney } from "@/utils/money";

// The before → after fields of audit lines, in words people read [AC-ADM-07].
// Platform settings use the settings page's own labels; any field ending in "Pesewas" is money;
// everything else is turned from code words into plain words.

const isSetting = (key) => key in SETTINGS_BY_KEY || key === "paymentMethods";

// "hiddenReason" -> "Hidden reason", "refundAmountPesewas" -> "Refund amount"
export const fieldLabel = (key) => {
  if (isSetting(key)) return settingLabel(key);
  const words = key
    .replace(/Pesewas$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// "SUSPENDED" -> "Suspended", "READY_FOR_PICKUP" -> "Ready for pickup"
const wordsOf = (code) => {
  const words = code.toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// One value as short text: money, settings, map points, yes/no, status codes
export const fieldValue = (key, value) => {
  if (value === null || value === undefined) return "—";
  if (isSetting(key)) return formatSettingValue(key, value);
  if (key.endsWith("Pesewas") && typeof value === "number") return formatMoney(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  // A map point: "6.68860, -1.62440" instead of its raw data
  if (typeof value === "object" && "latitude" in value && "longitude" in value) {
    return Number(value.latitude).toFixed(5) + ", " + Number(value.longitude).toFixed(5);
  }
  if (typeof value === "object") return JSON.stringify(value);
  // An all-capitals code such as a status
  if (typeof value === "string" && /^[A-Z][A-Z_]+$/.test(value)) return wordsOf(value);
  return String(value);
};
