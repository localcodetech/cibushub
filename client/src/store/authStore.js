import { create } from "zustand";
import { getMeRequest, logoutRequest } from "@/api/auth";
import { setSessionExpiredHandler } from "@/lib/api";
import { authChannel } from "@/lib/authChannel";
import { queryClient } from "@/lib/queryClient";

// Remembers who is logged in, for every page to read.
// Only the user's details live here. The login tokens stay in HttpOnly cookies,
// never in JavaScript or localStorage .
//
// In a page:  const user = useAuthStore((state) => state.user);
export const useAuthStore = create((set) => ({
  // The logged-in user, or null for a guest
  user: null,

  // true while we ask the server "who is logged in?" when the app first opens
  isCheckingSession: true,

  // After a successful login
  setUser: (user) => {
    set({ user: user });
  },

  // After logout, or when the session has ended
  clearUser: () => {
    set({ user: null });
  },

  // Logs out everywhere in the app [AC-AUTH-16]:
  // 1. The server cancels the refresh token and clears the cookies.
  // 2. Saved server data is thrown away, so the next person on this phone sees none of it.
  // 3. The user is forgotten, so the guards send them out of private pages.
  logout: async () => {
    try {
      await logoutRequest();
    } catch {
      // Even if the server can't be reached, still log out on this device
    }

    queryClient.clear();
    set({ user: null });

    // Tell the other open tabs, so they log out too
    if (authChannel) {
      authChannel.postMessage("logout");
    }
  },

  // Runs once when the app opens, so a page refresh keeps the user logged in.
  // If the 15-minute cookie has run out, lib/api.js renews it on its own (silent refresh).
  // If that fails too, the visitor is a guest.
  checkSession: async () => {
    try {
      const user = await getMeRequest();
      set({ user: user, isCheckingSession: false });
    } catch {
      set({ user: null, isCheckingSession: false });
    }
  },
}));

// Forget the user on this device: no saved server data, no user.
// The guards then send them out of private pages.
const forgetUser = () => {
  queryClient.clear();
  useAuthStore.setState({ user: null });
};

// The session ended for good (both cookies expired): lib/api.js calls this
setSessionExpiredHandler(forgetUser);

// Another tab logged out: log out here too
if (authChannel) {
  authChannel.onmessage = (event) => {
    if (event.data === "logout") {
      forgetUser();
    }
  };
}
