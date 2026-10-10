import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

// A label, an input and its error message, used in every form [AC-UX-05].
//
// <FormField id="email" label="Email" error={errors.email?.message} {...register("email")} />
//
// id:    links the label to the input (tapping the label focuses the input)
// label: the text above the input
// hint:  optional help text under the label
// error: the message to show under the input, or nothing
// ...inputProps: everything else (type, placeholder, and what register() gives) goes onto the <input>
//
// type="password" fields get an eye button to show or hide what was typed.
const FormField = ({ id, label, hint, error, className, type, ...inputProps }) => {
  const hintId = id + "-hint";
  const errorId = id + "-error";

  // Only used by password fields: true while the password is shown as plain text
  const [isPasswordShown, setIsPasswordShown] = useState(false);
  const isPassword = type === "password";

  // A shown password becomes a normal text box; everything else keeps its type
  let inputType = type;
  if (isPassword && isPasswordShown) {
    inputType = "text";
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-[15px] font-bold text-foreground">
        {label}
      </label>

      {hint && (
        <p id={hintId} className="text-[13px] text-muted-foreground">
          {hint}
        </p>
      )}

      {/* relative: lets the eye button sit inside the right end of the box */}
      <div className="relative">
        <input
          id={id}
          type={inputType}
          aria-invalid={error ? true : false}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            "h-12 w-full rounded-lg border border-input bg-white px-3.5 text-base text-foreground dark:bg-card",
            "placeholder:text-muted-foreground",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
            isPassword && "pr-12",
            error && "border-destructive",
          )}
          {...inputProps}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setIsPasswordShown(!isPasswordShown)}
            aria-label={isPasswordShown ? "Hide password" : "Show password"}
            aria-pressed={isPasswordShown}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground"
          >
            {isPasswordShown ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>

      {error && (
        <p id={errorId} className="text-[15px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
