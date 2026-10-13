import { useState } from "react";
import { CircleCheck } from "lucide-react";
import Card, { CardHeader } from "@/components/common/Card";
import Alert from "@/components/common/Alert";
import FormField from "@/components/form/FormField";
import { Button } from "@/components/ui/button";
import { confirmContactChangeRequest, startContactChangeRequest } from "@/api/profile";
import { useAuthStore } from "@/store/authStore";
import { isGhanaPhone } from "@/utils/phone";

// The words and checks that differ between phone and email
const KINDS = {
  phone: {
    title: "Phone number",
    newLabel: "New phone number",
    inputProps: { type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: "024 123 4567" },
    check: (value) => (isGhanaPhone(value) ? "" : "Enter a valid Ghana mobile number"),
    sentTo: "We texted a 6-digit code to",
    minutes: 5,
    done: "Phone number changed. We told your old number too.",
  },
  email: {
    title: "Email",
    newLabel: "New email address",
    inputProps: { type: "email", inputMode: "email", autoComplete: "email" },
    check: (value) => (/^\S+@\S+\.\S+$/.test(value) ? "" : "Enter a valid email"),
    sentTo: "We emailed a 6-digit code to",
    minutes: 15,
    done: "Email changed.",
  },
};

// Change my phone or email [AC-CUST-02], in two steps so nobody can take over the account
// with a number or address that isn't theirs:
//   1) type the new one -> a code goes to it (the account doesn't change yet)
//   2) type the code    -> it's saved
//   kind: "phone" or "email"
const ContactChangeCard = ({ kind }) => {
  const words = KINDS[kind];
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  // "view" (showing the current one), "enter" (typing a new one), "code" (typing the code)
  const [step, setStep] = useState("view");
  const [newValue, setNewValue] = useState("");
  const [code, setCode] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [doneMessage, setDoneMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const current = user[kind];
  const isVerified = Boolean(kind === "phone" ? user.phoneVerifiedAt : user.emailVerifiedAt);

  const reset = (nextStep) => {
    setStep(nextStep);
    setFieldError("");
    setErrorMessage("");
    setCode("");
  };

  // The same steps for sending and confirming: problems with the box go under it
  const run = async (request) => {
    setFieldError("");
    setErrorMessage("");
    setIsWorking(true);
    try {
      await request();
    } catch (error) {
      const detail = (error.details || []).find(
        (item) => item.field === kind || item.field === "code",
      );
      if (detail) setFieldError(detail.message);
      // Wrong, expired or too many tries: said under the code box
      else if (error.code && error.code.startsWith("OTP_")) setFieldError(error.message);
      else setErrorMessage(error.message);
    }
    setIsWorking(false);
  };

  const sendCode = (event) => {
    event.preventDefault();
    const problem = words.check(newValue.trim());
    if (problem) {
      setFieldError(problem);
      return;
    }
    run(async () => {
      const pending = await startContactChangeRequest(kind, newValue.trim());
      // The server writes it the standard way (e.g. +233241234567)
      setNewValue(pending[kind]);
      reset("code");
    });
  };

  const confirmCode = (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      setFieldError("Enter the 6-digit code");
      return;
    }
    run(async () => {
      setUser(await confirmContactChangeRequest(kind, code.trim()));
      setDoneMessage(words.done);
      setNewValue("");
      reset("view");
    });
  };

  return (
    <Card padding="lg">
      <CardHeader title={words.title} level={2} />
      {doneMessage && step === "view" && (
        <Alert tone="success" className="mb-4">
          {doneMessage}
        </Alert>
      )}
      {errorMessage && <Alert className="mb-4">{errorMessage}</Alert>}

      {step === "view" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold break-all">{current || "Not added yet"}</p>
            {current && isVerified && (
              <p className="flex items-center gap-1 text-[13px] text-muted-foreground">
                <CircleCheck size={14} className="text-success" aria-hidden="true" />
                Verified
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDoneMessage("");
              reset("enter");
            }}
            className="h-11 font-bold"
          >
            Change
          </Button>
        </div>
      )}

      {step === "enter" && (
        <form onSubmit={sendCode} noValidate className="space-y-4">
          <FormField
            id={"new-" + kind}
            label={words.newLabel}
            hint="We send a code to it, to check it's yours."
            value={newValue}
            onChange={(event) => setNewValue(event.target.value)}
            error={fieldError}
            {...words.inputProps}
          />
          <div className="flex gap-3">
            <Button type="submit" disabled={isWorking} className="h-12 font-bold sm:px-8">
              {isWorking ? "Sending…" : "Send code"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => reset("view")}
              className="h-12 font-bold"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={confirmCode} noValidate className="space-y-4">
          <p className="text-[15px] text-muted-foreground">
            {words.sentTo} <span className="font-bold text-foreground">{newValue}</span>. It works
            for {words.minutes} minutes.
          </p>
          {/* inputMode="numeric": number keypad; one-time-code: the phone can fill it in */}
          <FormField
            id={kind + "-code"}
            label="Code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            error={fieldError}
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isWorking} className="h-12 font-bold sm:px-8">
              {isWorking ? "Checking…" : "Confirm"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => reset("enter")}
              className="h-12 font-bold"
            >
              Use a different one
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
};

export default ContactChangeCard;
