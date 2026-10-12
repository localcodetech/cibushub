import { useState } from "react";
import { Check } from "lucide-react";
import Container from "@/layouts/Container";
import Card from "@/components/common/Card";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import { updatePreferencesRequest } from "@/api/profile";
import { useAuthStore } from "@/store/authStore";
import PageHeader from "@/components/common/PageHeader";

// What we always send: these keep orders and accounts working, so they have no switch
const ALWAYS_SENT = [
  "Sign-in and verification codes",
  "Receipts and refunds",
  "Updates about your orders and deliveries",
  "Changes to your account",
];

// /notifications/settings: yes or no to offers and news [AC-NOTIF-09]
const NotificationSettingsPage = () => {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  // The box shows the choice at once; if saving fails it goes back [AC-UX-06]
  const [wantsMarketing, setWantsMarketing] = useState(user.marketingOptIn);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Saved the moment the box is ticked or unticked
  const handleToggle = async (event) => {
    const newChoice = event.target.checked;
    setWantsMarketing(newChoice);
    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const updatedUser = await updatePreferencesRequest(newChoice);
      setUser(updatedUser);
      if (newChoice) {
        setMessage("Saved. We'll send you offers and news.");
      } else {
        setMessage("Saved. No more offers and news.");
      }
    } catch (error) {
      setWantsMarketing(!newChoice);
      setErrorMessage(error.message);
    }
    setIsSaving(false);
  };

  return (
    <Container>
      <section className="mx-auto max-w-2xl py-8">
        <PageHeader
          back={{ to: "/notifications", label: "Notifications" }}
          title="Notification settings"
        />

        <Card className="mt-6">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 size-5 accent-primary"
              checked={wantsMarketing}
              disabled={isSaving}
              onChange={handleToggle}
            />
            <span>
              <span className="block font-bold">Offers and news</span>
              <span className="block text-[15px] text-muted-foreground">
                Deals from restaurants and news about CibusHub, by email and SMS.
              </span>
            </span>
          </label>

          {message && (
            <p role="status" className="mt-3 text-[15px] text-muted-foreground">
              {message}
            </p>
          )}
          {errorMessage && (
            <p role="alert" className="mt-3 text-[15px] text-destructive">
              {errorMessage}
            </p>
          )}
        </Card>

        <Heading level={2} className="mt-8">
          Always sent
        </Heading>
        <Text muted className="mt-1">
          These keep your orders and account working, so they can't be turned off.
        </Text>
        <ul className="mt-3 space-y-2">
          {ALWAYS_SENT.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Check size={18} className="shrink-0 text-primary" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
};

export default NotificationSettingsPage;
