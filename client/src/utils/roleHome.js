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
