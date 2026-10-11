import { api } from "@/lib/api";

// Every call to the /profile endpoints lives here.

// Yes or no to offers and news [AC-NOTIF-09]. Returns the updated user.
export const updatePreferencesRequest = async (marketingOptIn) => {
  const result = await api.patch("/profile/preferences", { marketingOptIn });
  return result.data;
};
