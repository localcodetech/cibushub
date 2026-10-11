import { useState } from "react";
import Sheet from "@/components/common/Sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// What can go wrong at the door [AC-DEL-08]. Two of them need calls first.
const PROBLEMS = [
  {
    type: "UNREACHABLE",
    label: "Customer unreachable",
    hint: "Not answering calls",
    callsFirst: true,
  },
  {
    type: "NOT_AT_ADDRESS",
    label: "Customer not at the address",
    hint: "Not at the pin, or has moved",
    callsFirst: true,
  },
  {
    type: "REFUSED_CODE",
    label: "Customer won't give the code",
    hint: "They are here but refuse",
    callsFirst: false,
  },
];

// "Problem at the door": choose what's wrong, add a note, send. Then a 10-minute wait starts.
// callAttempts / callsNeededFirst: from the server; onSubmit(type, note) throws on failure
const DoorProblemSheet = ({ callAttempts, callsNeededFirst, onSubmit, onClose }) => {
  const [chosen, setChosen] = useState("");
  const [note, setNote] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const hasCalledEnough = callAttempts >= callsNeededFirst;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!chosen) {
      setErrorMessage("Choose what's wrong");
      return;
    }
    setErrorMessage("");
    setIsSending(true);
    try {
      await onSubmit(chosen, note.trim());
    } catch (error) {
      setErrorMessage(error.message);
      setIsSending(false);
    }
  };

  return (
    <Sheet
      title="Problem at the door"
      description="You'll wait 10 minutes here. If nobody takes the food, you take it back to the restaurant and earn 1.5x."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 p-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[15px] font-bold">What's wrong?</legend>
          {PROBLEMS.map((problem) => {
            const isBlocked = problem.callsFirst && !hasCalledEnough;
            return (
              <label
                key={problem.type}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2",
                  chosen === problem.type ? "border-primary bg-primary/10" : "border-border",
                  isBlocked && "cursor-not-allowed opacity-50",
                )}
              >
                <input
                  type="radio"
                  name="problem"
                  value={problem.type}
                  checked={chosen === problem.type}
                  disabled={isBlocked}
                  onChange={() => setChosen(problem.type)}
                  className="size-5 accent-primary"
                />
                <span>
                  <span className="block font-bold">{problem.label}</span>
                  <span className="block text-[13px] text-muted-foreground">
                    {isBlocked
                      ? "Call the customer " + callsNeededFirst + " times first"
                      : problem.hint}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <label htmlFor="problem-note" className="text-[15px] font-bold">
          Anything we should know?{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="problem-note"
          rows={2}
          maxLength={300}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="w-full rounded-lg border border-input bg-white p-3 text-base dark:bg-card"
        />

        {errorMessage && (
          <p role="alert" className="text-[15px] text-destructive">
            {errorMessage}
          </p>
        )}
        <Button type="submit" disabled={isSending} className="h-12 text-base font-bold">
          {isSending ? "Sending…" : "Report and start waiting"}
        </Button>
      </form>
    </Sheet>
  );
};

export default DoorProblemSheet;
