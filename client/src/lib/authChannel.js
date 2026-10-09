// A radio channel between all open CibusHub tabs in this browser.
// When one tab logs out, it announces it, so the other tabs log out too [plan-review C4].
// null in very old browsers without BroadcastChannel (each tab then finds out on its own).
export const authChannel =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("cibushub-auth") : null;
