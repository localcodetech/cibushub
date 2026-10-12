// Roles and account statuses in words, for admins
export const ROLE_NAMES = {
  CUSTOMER: "Customer",
  RESTAURANT_OWNER: "Restaurant owner",
  RIDER: "Rider",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super admin",
};

export const ACCOUNT_STATUSES = {
  PENDING_VERIFICATION: { label: "Phone not verified", tone: "neutral" },
  PENDING_APPROVAL: { label: "Waiting for approval", tone: "attention" },
  ACTIVE: { label: "Active", tone: "success" },
  SUSPENDED: { label: "Suspended", tone: "danger" },
};
