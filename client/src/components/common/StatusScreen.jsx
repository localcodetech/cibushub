import { cn } from "@/lib/utils";

// A whole-page message when something is off: page not found, no access, a crash.
// Calm and centred, in the app's own style, always with a way out.
//
// <StatusScreen icon={Lock} tone="primary" code="403" title="..." message="...">
//   ...buttons and links...
// </StatusScreen>
//
// tone: primary (green: nothing broke, you just can't be here) | danger (red: it broke)
// code: an optional small label above the title (e.g. "404")
const TONES = {
  primary: "bg-primary/10 text-primary",
  danger: "bg-destructive/10 text-destructive",
};

const StatusScreen = ({ icon: Icon, tone = "primary", code, title, message, role, children }) => {
  return (
    <section role={role} className="mx-auto flex max-w-lg flex-col items-center py-16 text-center">
      <span className={cn("flex size-20 items-center justify-center rounded-full", TONES[tone])}>
        <Icon size={40} aria-hidden="true" />
      </span>
      {code && (
        <p className="mt-5 font-heading text-sm font-bold tracking-widest text-muted-foreground">
          {code}
        </p>
      )}
      <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">{title}</h1>
      <span aria-hidden="true" className="mt-3 block h-1 w-10 rounded-full bg-gold" />
      <p className="mt-4 text-muted-foreground">{message}</p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        {children}
      </div>
    </section>
  );
};

export default StatusScreen;
