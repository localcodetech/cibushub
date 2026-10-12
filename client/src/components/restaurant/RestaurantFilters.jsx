import { Search } from "lucide-react";
import { cuisineOptions, sortOptions } from "@/data/restaurantFilters";
import { Chip, ChipRow } from "@/components/common/Chips";

// Search box, cuisine chips, "Open now" and sort for the restaurant listing [AC-DISC-05 to 08].
// This component only draws the controls. The page owns the values and decides what to do.
//
// searchText:      what is typed in the box right now
// filters:         { cuisine, openNow, sort } read from the URL
// onSearchChange:  called with the new text on every key press
// onFilterChange:  called with one change, e.g. { cuisine: "pizza" } or { openNow: "" }
// onClear:         removes every filter
const RestaurantFilters = ({ searchText, filters, onSearchChange, onFilterChange, onClear }) => {
  const hasFilters = searchText !== "" || filters.cuisine || filters.openNow || filters.sort;

  // Tapping the chosen cuisine again un-chooses it
  const handleCuisineClick = (value) => {
    if (filters.cuisine === value) {
      onFilterChange({ cuisine: "" });
    } else {
      onFilterChange({ cuisine: value });
    }
  };

  const handleOpenNowClick = () => {
    onFilterChange({ openNow: filters.openNow ? "" : "true" });
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          size={18}
          className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchText}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search jollof, waakye, pizza…"
          aria-label="Search restaurants and dishes"
          className="min-h-11 w-full rounded-md border border-input bg-background pr-3 pl-10"
        />
      </div>

      {/* One row of chips; on a narrow phone it scrolls sideways instead of wrapping */}
      <ChipRow label="Filters">
        <Chip selected={filters.openNow === "true"} onClick={handleOpenNowClick}>
          Open now
        </Chip>
        {cuisineOptions.map((option) => (
          <Chip
            key={option.value}
            selected={filters.cuisine === option.value}
            onClick={() => handleCuisineClick(option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </ChipRow>

      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-[15px] text-muted-foreground">
          Sort by
          <select
            value={filters.sort}
            onChange={(event) => onFilterChange({ sort: event.target.value })}
            className="min-h-11 rounded-md border border-input bg-background px-2 text-foreground"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            className="min-h-11 px-2 text-[15px] font-bold text-primary"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};

export default RestaurantFilters;
