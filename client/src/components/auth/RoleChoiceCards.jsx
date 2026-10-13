import { Check } from "lucide-react";
import { registerRoles } from "@/data/registerRoles";

// "I want to join as": three small flip cards. The front shows the role; choosing it flips the
// card to a green back with a tick. Underneath, each card is a real radio button, so only one
// can be chosen and keyboards and screen readers work as usual (arrow keys move between them).
// Reduced motion: the card turns over instantly, without the spin.
//   registerField: what register("role") returns (React Hook Form)
const RoleChoiceCards = ({ registerField }) => {
  return (
    <fieldset>
      <legend className="mb-2 text-[15px] font-bold text-foreground">I want to join as</legend>

      <div className="grid gap-2 sm:grid-cols-3">
        {registerRoles.map((role) => {
          const Icon = role.icon;
          return (
            <label key={role.value} className="group block cursor-pointer perspective-distant">
              <input type="radio" value={role.value} className="peer sr-only" {...registerField} />

              {/* The card that turns over: front and back share the same space */}
              <span className="relative block h-14 rounded-lg transition-transform duration-500 ease-out transform-3d peer-checked:rotate-y-180 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 motion-reduce:transition-none">
                {/* Front: the role */}
                <span className="absolute inset-0 flex items-center gap-2.5 rounded-lg border border-input bg-card px-3 backface-hidden group-hover:border-primary/50">
                  <Icon size={20} className="shrink-0 text-primary" aria-hidden="true" />
                  <span className="text-[15px] leading-tight font-bold text-foreground">
                    {role.title}
                  </span>
                </span>

                {/* Back: chosen */}
                <span className="absolute inset-0 flex rotate-y-180 items-center gap-2.5 rounded-lg border-2 border-primary bg-primary px-3 text-primary-foreground backface-hidden">
                  <Check size={20} strokeWidth={3} className="shrink-0" aria-hidden="true" />
                  <span className="text-[15px] leading-tight font-bold">{role.title}</span>
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};

export default RoleChoiceCards;
