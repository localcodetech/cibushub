// Where each role lands after logging in [AC-RBAC-08]
const ROLE_HOME = {
  CUSTOMER: "/customer",
  RESTAURANT_OWNER: "/owner",
  RIDER: "/rider",
  ADMIN: "/admin",
  SUPER_ADMIN: "/admin",
};

// homePathFor("RIDER") -> "/rider". Unknown role -> the public home page.
export const homePathFor = (role) => {
  return ROLE_HOME[role] || "/";
};

// A path on our own site ("/checkout"), never "//other-site.com" or a full address [AC-SEC]
export const isSafeLocalPath = (path) => {
  return Boolean(path) && path.startsWith("/") && !path.startsWith("//");
};

// Where to go right after logging in.
// If a guard sent them to login from a page (e.g. /checkout), go back there; otherwise their home.
// An email not confirmed yet (and the phone already is): ask for the email code first,
// then carry on to that page [AC-AUTH-01].
export const afterLoginPath = (user, location) => {
  const returnTo = location.state ? location.state.returnTo : null;

  let nextPath = homePathFor(user.role);
  if (isSafeLocalPath(returnTo)) {
    nextPath = returnTo;
  }

  if (user.email && !user.emailVerifiedAt && user.phoneVerifiedAt) {
    return "/verify-email?next=" + encodeURIComponent(nextPath);
  }
  return nextPath;
};
