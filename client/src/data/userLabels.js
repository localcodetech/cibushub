// Roles and account statuses in words, for admins
export const ROLE_NAMES = {
  CUSTOMER: "Customer",
  RESTAURANT_OWNER: "Restaurant owner",
  RIDER: "Rider",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super admin",
};

export const ACCOUNT_STATUSES = {
  PENDING_VERIFICATION: { label: "Phone not verified", tone: "muted" },
  PENDING_APPROVAL: { label: "Waiting for approval", tone: "gold" },
  ACTIVE: { label: "Active", tone: "green" },
  SUSPENDED: { label: "Suspended", tone: "red" },
};
