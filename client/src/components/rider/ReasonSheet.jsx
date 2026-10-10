import { useState } from "react";
import Sheet from "@/components/common/Sheet";
import { Button } from "@/components/ui/button";

// A pop-up that asks for a short text, then sends it.
// Used for "I can't continue" (reason required) and "Customer unreachable" (note optional).
//
// title, description: the top of the pop-up
// label:     the text box's label
// required:  true when at least 5 characters must be typed
// submitLabel, onSubmit(text): the button, and what it does (throws on failure)
// onClose:   close without sending
const ReasonSheet = ({ title, description, label, required, submitLabel, onSubmit, onClose }) => {
  const [text, setText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (required && trimmed.length < 5) {
      setErrorMessage("Write a few words, at least 5 letters");
      return;
    }

    setErrorMessage("");
    setIsSending(true);
    try {
      await onSubmit(trimmed);
    } catch (error) {
      setErrorMessage(error.message);
      setIsSending(false);
    }
  };

  return (
    <Sheet title={title} description={description} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 p-4">
        <label htmlFor="reason-text" className="text-[15px] font-bold">
          {label}
          {!required && <span className="font-normal text-muted-foreground"> (optional)</span>}
        </label>
        <textarea
          id="reason-text"
          rows={3}
          maxLength={300}
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-invalid={errorMessage ? true : false}
          className="w-full rounded-lg border border-input bg-white p-3 text-base dark:bg-card"
        />
        {errorMessage && (
          <p role="alert" className="text-[15px] text-destructive">
            {errorMessage}
          </p>
        )}
        <Button type="submit" disabled={isSending} className="h-12 text-base font-bold">
          {isSending ? "Sending…" : submitLabel}
        </Button>
      </form>
    </Sheet>
  );
};

export default ReasonSheet;
