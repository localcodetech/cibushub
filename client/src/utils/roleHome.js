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

// Where to go right after logging in.
// If a guard sent them to login from a page (e.g. /checkout), go back there; otherwise their home.
// returnTo must be a path on our own site ("/checkout"), never "//other-site.com" [AC-SEC]
export const afterLoginPath = (user, location) => {
  const returnTo = location.state ? location.state.returnTo : null;

  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return homePathFor(user.role);
};
