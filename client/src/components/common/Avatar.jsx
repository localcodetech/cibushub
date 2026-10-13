import { cn } from "@/lib/utils";

// A person's initials in a circle (riders, users, admins). Decorative: the name is always
// written next to it, so screen readers skip it.
//   <Avatar name="Kofi Adjei" />   -> "KA"
//   size: md (40px, list rows) | lg (56px, detail pages) | xl (96px, the profile page)
//   src:  their photo, if they uploaded one (initials otherwise)

// "Kofi Adjei" -> "KA", "Yaa Asantewaa Boateng" -> "YB", "Esi" -> "E"
const initialsOf = (name = "") => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
};

const SIZES = { md: "size-10 text-[15px]", lg: "size-14 text-lg", xl: "size-24 text-3xl" };

const Avatar = ({ name, src, size = "md", className }) => {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cn("shrink-0 rounded-full object-cover", SIZES[size], className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading font-bold text-primary",
        SIZES[size],
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
};

export default Avatar;
