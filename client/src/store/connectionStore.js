import { create } from "zustand";

// Is the live connection (Socket.IO) up? The "Reconnecting…" pill reads this [AC-RT-08].
//   "off"           no live connection wanted (a guest)
//   "connecting"    the first connection is being made
//   "connected"     live updates are arriving
//   "reconnecting"  it was connected and dropped; Socket.IO is trying again on its own
export const useConnectionStore = create(() => ({
  status: "off",
}));

export const setConnectionStatus = (status) => {
  useConnectionStore.setState({ status: status });
};
