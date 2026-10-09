// Silent refresh [AC-AUTH-14, plan-review C4].
//
// The login cookie (access token) lasts 15 minutes. When it runs out, a request gets
// 401 UNAUTHENTICATED. Instead of logging the user out, we swap the 7-day refresh
// cookie for new cookies (POST /auth/refresh), then send the request again.
//
// The danger: each refresh cookie works ONCE. If two refreshes use the same one, the
// server thinks it was stolen and logs the user out on every device. So:
// 1. In one tab, only one refresh runs. Other requests wait for it (refreshPromise).
// 2. Across tabs, a browser lock lets only one tab refresh at a time.
//    A tab that waited first checks if the other tab already renewed the cookies.

const API_URL = import.meta.env.VITE_API_URL || "";

// The refresh running right now in this tab, or null
let refreshPromise = null;

// Runs one refresh. true = the session was renewed, false = it has ended.
// If there is no internet, fetch throws and the caller sees a network error.
const renewSession = async () => {
  // Another tab may have renewed the cookies while we waited for the lock.
  // Cookies are shared by all tabs, so if /auth/me works now, we're done.
  const meResponse = await fetch(API_URL + "/api/v1/auth/me", { credentials: "include" });
  if (meResponse.ok) {
    return true;
  }

  const refreshResponse = await fetch(API_URL + "/api/v1/auth/refresh", {
    method: "POST",
    credentials: "include",
  });
  return refreshResponse.ok;
};

// navigator.locks is like a single key for all tabs of the site: one tab holds it,
// the others queue. Very old browsers don't have it, so they just run the task.
const oneTabAtATime = (task) => {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request("cibushub-refresh", task);
  }
  return task();
};

// Every request that got 401 calls this. The first one starts the refresh;
// the rest get the same promise, so they all wait for that one refresh.
export const refreshOnce = () => {
  if (!refreshPromise) {
    refreshPromise = oneTabAtATime(renewSession).finally(() => {
      // Done (worked or not): the next 401 may start a new refresh
      refreshPromise = null;
    });
  }
  return refreshPromise;
};
