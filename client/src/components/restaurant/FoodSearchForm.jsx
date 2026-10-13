import { useState } from "react";
import { useNavigate } from "react-router";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

// "Waakye, jollof, fufu…" + Find food: opens the restaurant list with those words
// (/restaurants?q=...), or the whole list when empty. Used on the home pages.
//   onDark: the gold button and ring for a dark green background (the home page hero)
const FoodSearchForm = ({ onDark = false, className }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const words = search.trim();
    navigate(words ? "/restaurants?q=" + encodeURIComponent(words) : "/restaurants");
  };

  return (
    <form onSubmit={handleSubmit} role="search" className={cn("flex max-w-xl gap-2", className)}>
      <label htmlFor="food-search" className="sr-only">
        Search for food or a restaurant
      </label>
      <div className="relative flex-1">
        <Search
          size={20}
          className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id="food-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Waakye, jollof, fufu…"
          className={cn(
            "h-12 w-full rounded-lg pr-3 pl-11 text-base text-foreground placeholder:text-muted-foreground",
            "focus-visible:ring-2 focus-visible:outline-none",
            onDark
              ? "bg-white focus-visible:ring-gold dark:bg-background"
              : "border border-input bg-white focus-visible:ring-ring dark:bg-card",
          )}
        />
      </div>
      <button
        type="submit"
        className={cn(
          "h-12 shrink-0 rounded-md px-5 font-bold focus-visible:ring-2 focus-visible:outline-none",
          onDark
            ? "bg-gold text-gold-foreground focus-visible:ring-white"
            : "bg-primary text-primary-foreground focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        Find food
      </button>
    </form>
  );
};

export default FoodSearchForm;
