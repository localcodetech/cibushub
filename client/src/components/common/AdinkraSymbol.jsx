import { cn } from "@/lib/utils";
import { ADINKRA } from "@/data/adinkra";

// One Adinkra symbol, in one colour (the text colour around it: Forest Green, or Ashanti Gold
// on green), at icon size. Each symbol has one job: see data/adinkra.js and the design guide.
//
// <AdinkraSymbol symbol="sankofa" size={18} />                   -> next to words that explain it
// <AdinkraSymbol symbol="adinkrahene" label="Adinkrahene symbol" /> -> read out by screen readers
//
// label: what screen readers say. Leave it out when the words beside it already explain it.
const AdinkraSymbol = ({ symbol, size = 20, label, className }) => {
  const art = ADINKRA[symbol];

  return (
    <svg
      viewBox={art.viewBox}
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : "true"}
      className={cn("shrink-0", className)}
    >
      {art.paths &&
        art.paths.map((path, index) => <path key={index} d={path} fill="currentColor" />)}
      {art.rings &&
        art.rings.map((radius) => (
          <circle
            key={radius}
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
          />
        ))}
    </svg>
  );
};

export default AdinkraSymbol;
