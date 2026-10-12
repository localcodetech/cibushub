import { cn } from "@/lib/utils";

// A person's initials in a circle (riders, users, admins). Decorative: the name is always
// written next to it, so screen readers skip it.
//   <Avatar name="Kofi Adjei" />   -> "KA"
//   size: md (40px, list rows) | lg (56px, detail pages)

// "Kofi Adjei" -> "KA", "Yaa Asantewaa Boateng" -> "YB", "Esi" -> "E"
const initialsOf = (name = "") => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
};

const Avatar = ({ name, size = "md", className }) => {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading font-bold text-primary",
        size === "lg" ? "size-14 text-lg" : "size-10 text-[15px]",
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
};

export default Avatar;
