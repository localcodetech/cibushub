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
const FormField = ({ id, label, hint, error, className, ...inputProps }) => {
  const hintId = id + "-hint";
  const errorId = id + "-error";

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

      <input
        id={id}
        aria-invalid={error ? true : false}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={cn(
          "h-12 rounded-lg border border-input bg-white px-3.5 text-base text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
          error && "border-destructive",
        )}
        {...inputProps}
      />

      {error && (
        <p id={errorId} className="text-[15px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
