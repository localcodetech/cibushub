// true if a customer can order this dish right now [AC-MENU-05, AC-DISC-10].
// The owner can switch a dish off, and a dish with a daily stock sells out at 0.
// (stockRemaining is null when the dish has no daily limit.)
export const isItemAvailable = (item) => {
  if (!item.isAvailable) {
    return false;
  }
  if (item.stockRemaining !== null && item.stockRemaining <= 0) {
    return false;
  }
  return true;
};
