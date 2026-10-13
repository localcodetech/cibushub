import { useState } from "react";
import Text from "@/components/typography/Text";
import { Button } from "@/components/ui/button";
import Alert from "@/components/common/Alert";

// The customer's 4-digit code, typed by the rider at the door [AC-DEL-06].
// attemptsLeft: from the server; 0 means locked until an admin unlocks it
// onSubmit(code): sends it; throws (with the server's message) when it's wrong
const DeliveryCodeForm = ({ attemptsLeft, onSubmit }) => {
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  if (attemptsLeft <= 0) {
    return (
      <Alert>
        {" "}
        <Text className="text-[15px]">
          Too many wrong codes. CibusHub support has been told and will contact you. Stay with the
          customer.
        </Text>
      </Alert>
    );
  }

  // Digits only, at most 4
  const handleChange = (event) => {
    setCode(event.target.value.replace(/\D/g, "").slice(0, 4));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (code.length !== 4) {
      setErrorMessage("Enter all 4 digits");
      return;
    }
    setErrorMessage("");
    setIsSending(true);
    try {
      await onSubmit(code);
    } catch (error) {
      setErrorMessage(error.message);
      setCode("");
    }
    setIsSending(false);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <label htmlFor="delivery-code" className="text-[15px] font-bold">
        Ask the customer for their 4-digit code
      </label>
      <input
        id="delivery-code"
        // numeric keyboard on phones; "one-time-code" stops password managers interfering
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={handleChange}
        aria-invalid={errorMessage ? true : false}
        aria-describedby={errorMessage ? "delivery-code-error" : "delivery-code-help"}
        className="h-14 w-full rounded-lg border border-input bg-white text-center font-heading text-3xl tracking-[0.5em] dark:bg-card"
      />
      {/* The error message already says how many are left */}
      {!errorMessage && (
        <p id="delivery-code-help" className="text-[13px] text-muted-foreground">
          {attemptsLeft} attempt(s) left
        </p>
      )}
      {errorMessage && (
        <p id="delivery-code-error" role="alert" className="text-[15px] font-bold text-destructive">
          {errorMessage}
        </p>
      )}
      <Button type="submit" disabled={isSending} className="h-12 text-base font-bold">
        {isSending ? "Checking…" : "Complete delivery"}
      </Button>
    </form>
  );
};

export default DeliveryCodeForm;
