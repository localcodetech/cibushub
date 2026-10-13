import { api } from "@/lib/api";

// Every call to the /profile endpoints lives here.

// Yes or no to offers and news [AC-NOTIF-09]. Returns the updated user.
export const updatePreferencesRequest = async (marketingOptIn) => {
  const result = await api.patch("/profile/preferences", { marketingOptIn });
  return result.data;
};

// My name. Returns the updated user.
export const updateNameRequest = async (fullName) => {
  const result = await api.patch("/profile", { fullName });
  return result.data;
};

// My photo (form field "image"). Returns the updated user.
export const uploadAvatarRequest = async (file) => {
  const form = new FormData();
  form.append("image", file);
  const result = await api.put("/profile/avatar", form);
  return result.data;
};

// Changing my phone or email takes two steps [AC-CUST-02]:
//   1) startContactChangeRequest: a code goes to the NEW phone / email; nothing changes yet
//   2) confirmContactChangeRequest: the right code saves it; returns the updated user
// kind: "phone" or "email"
export const startContactChangeRequest = async (kind, value) => {
  const result = await api.post("/profile/" + kind, { [kind]: value });
  return result.data;
};

export const confirmContactChangeRequest = async (kind, code) => {
  const result = await api.post("/profile/" + kind + "/confirm", { code });
  return result.data;
};
