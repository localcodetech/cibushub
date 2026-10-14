import { useState } from "react";
import { useNavigate } from "react-router";
import Card, { CardHeader } from "@/components/common/Card";
import Alert from "@/components/common/Alert";
import Sheet from "@/components/common/Sheet";
import FormField from "@/components/form/FormField";
import { Button } from "@/components/ui/button";
import { deleteAccountRequest } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";

// Delete my account [AC-CUST-11]: what goes, what stays, and a sheet that asks for the
// password and the word DELETE, so it can't happen by a slip. The server checks that nothing
// is still in progress (an order on its way, a refund, a delivery) and says what to wait for.
const DeleteAccountCard = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const clearCart = useCartStore((state) => state.clearCart);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const closeSheet = () => {
    setIsSheetOpen(false);
    setPassword("");
    setConfirmText("");
    setPasswordError("");
    setErrorMessage("");
  };

  const handleDelete = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setErrorMessage("");
    setIsDeleting(true);
    try {
      await deleteAccountRequest(password, confirmText.trim());
      // Gone on the server: forget everything on this device too, then say goodbye
      clearCart();
      await logout();
      navigate("/login", {
        replace: true,
        state: { message: "Your account and personal details have been deleted. Goodbye!" },
      });
    } catch (error) {
      const detail = (error.details || []).find((item) => item.field === "password");
      if (detail) setPasswordError(detail.message);
      else setErrorMessage(error.message);
      setIsDeleting(false);
    }
  };

  return (
    <Card tone="danger" padding="lg">
      <CardHeader title="Delete my account" level={2} />
      <p className="text-[15px]">
        This removes your name, phone, email, photo and saved addresses, and logs you out
        everywhere. It can't be undone.
      </p>
      <p className="mt-2 text-[15px] text-muted-foreground">
        Records of past orders and payments are kept for tax and accounting, without your name or
        contact details.
      </p>
      <Button
        type="button"
        variant="destructive"
        onClick={() => setIsSheetOpen(true)}
        className="mt-4 h-12 font-bold"
      >
        Delete my account
      </Button>

      {isSheetOpen && (
        <Sheet
          title="Delete your account?"
          description="Your personal details are removed for good. This can't be undone."
          onClose={closeSheet}
        >
          <form onSubmit={handleDelete} noValidate className="space-y-5 p-4">
            {errorMessage && <Alert>{errorMessage}</Alert>}
            <FormField
              id="delete-password"
              label="Your password"
              hint="Signed up with Google, Apple or Facebook and never set a password? Leave this empty."
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={passwordError}
            />
            <FormField
              id="delete-confirm"
              label="Type DELETE to confirm"
              autoComplete="off"
              autoCapitalize="characters"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="submit"
                variant="destructive"
                disabled={isDeleting || confirmText.trim() !== "DELETE"}
                className="h-12 font-bold"
              >
                {isDeleting ? "Deleting…" : "Delete my account for good"}
              </Button>
              <Button type="button" variant="ghost" onClick={closeSheet} className="h-12 font-bold">
                Keep my account
              </Button>
            </div>
          </form>
        </Sheet>
      )}
    </Card>
  );
};

export default DeleteAccountCard;
