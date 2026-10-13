import { useState } from "react";
import Card, { CardHeader } from "@/components/common/Card";
import Avatar from "@/components/common/Avatar";
import FileUploadRow from "@/components/common/FileUploadRow";
import FormField from "@/components/form/FormField";
import { Button } from "@/components/ui/button";
import { updateNameRequest, uploadAvatarRequest } from "@/api/profile";
import { useAuthStore } from "@/store/authStore";
import { ROLE_NAMES } from "@/data/userLabels";

// My photo and my name [AC-CUST-01]. Both are saved straight to the account, so the navbar
// and every other page show the change at once (setUser).
const ProfileNameCard = () => {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [fullName, setFullName] = useState(user.fullName);
  const [nameError, setNameError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (event) => {
    event.preventDefault();
    setSavedMessage("");
    const trimmed = fullName.trim();
    if (trimmed.length < 2) {
      setNameError("Name is too short");
      return;
    }
    setNameError("");
    setIsSaving(true);
    try {
      setUser(await updateNameRequest(trimmed));
      setSavedMessage("Saved.");
    } catch (error) {
      const detail = (error.details || []).find((item) => item.field === "fullName");
      setNameError(detail ? detail.message : error.message);
    }
    setIsSaving(false);
  };

  return (
    <Card padding="lg">
      <CardHeader title="You" level={2} />
      <div className="flex items-center gap-4">
        <Avatar name={user.fullName} src={user.avatarUrl} size="xl" />
        <div className="min-w-0">
          <p className="font-heading text-lg font-bold break-words">{user.fullName}</p>
          <p className="text-[15px] text-muted-foreground">{ROLE_NAMES[user.role]}</p>
        </div>
      </div>
      <FileUploadRow
        title="Photo"
        hint="Riders and restaurants see it. JPG, PNG or WebP, up to 5 MB."
        accept="image/jpeg,image/png,image/webp"
        isDone={Boolean(user.avatarUrl)}
        onUpload={async (file) => setUser(await uploadAvatarRequest(file))}
      />

      <form onSubmit={handleSave} noValidate className="mt-2 space-y-4">
        <FormField
          id="profile-name"
          label="Full name"
          autoComplete="name"
          maxLength={100}
          value={fullName}
          onChange={(event) => {
            setFullName(event.target.value);
            setSavedMessage("");
          }}
          error={nameError}
        />
        <div className="flex items-center gap-4">
          <Button
            type="submit"
            disabled={isSaving || fullName.trim() === user.fullName}
            className="h-12 font-bold sm:px-8"
          >
            {isSaving ? "Saving…" : "Save name"}
          </Button>
          {savedMessage && (
            <p role="status" className="text-[15px] text-muted-foreground">
              {savedMessage}
            </p>
          )}
        </div>
      </form>
    </Card>
  );
};

export default ProfileNameCard;
