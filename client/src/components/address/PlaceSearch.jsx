import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { searchPlacesRequest } from "@/api/addresses";

const SEARCH_DELAY_MS = 400;
const MIN_LETTERS = 3;

// "Search a place" above the map: KNUST, Kejetia, Asafo market... [AC-MAP-02].
// Picking a result moves the pin there; the customer then drags it to their exact door.
// onPick: called with { name, area, displayName, latitude, longitude }
const PlaceSearch = ({ onPick }) => {
  const [text, setText] = useState("");
  const searchText = useDebouncedValue(text.trim(), SEARCH_DELAY_MS);

  const {
    data: places,
    error,
    isFetching,
  } = useQuery({
    queryKey: ["places", searchText],
    queryFn: () => searchPlacesRequest(searchText),
    // Only search once there are enough letters
    enabled: searchText.length >= MIN_LETTERS,
    // A place doesn't move: keep the answer for an hour
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  const handlePick = (place) => {
    onPick(place);
    // Close the list
    setText("");
  };

  const showResults = text.trim().length >= MIN_LETTERS;

  return (
    <div className="relative">
      <Search
        size={18}
        className="absolute top-3.5 left-3 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Search a place, e.g. KNUST, Kejetia"
        aria-label="Search a place to move the pin"
        className="h-12 w-full rounded-lg border border-input bg-white pr-3 pl-10 text-base dark:bg-card"
      />

      {showResults && (
        <div className="mt-1 rounded-lg border border-border bg-background">
          <SearchResults
            places={places}
            error={error}
            isFetching={isFetching}
            onPick={handlePick}
          />
        </div>
      )}
    </div>
  );
};

// What sits under the search box: searching, a problem, nothing found, or the places
const SearchResults = ({ places, error, isFetching, onPick }) => {
  if (isFetching) {
    return <p className="p-3 text-[15px] text-muted-foreground">Searching…</p>;
  }

  // The server's message says what to do: "Move the pin instead"
  if (error) {
    return <p className="p-3 text-[15px] text-destructive">{error.message}</p>;
  }

  if (!places) {
    return null;
  }

  if (places.length === 0) {
    return (
      <p className="p-3 text-[15px] text-muted-foreground">
        No places found. Try a nearby landmark, or move the pin on the map.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {places.map((place) => (
        <li key={place.latitude + "," + place.longitude}>
          <button
            type="button"
            onClick={() => onPick(place)}
            className="w-full px-3 py-2 text-left"
          >
            <span className="block font-bold">{place.name}</span>
            <span className="block truncate text-[13px] text-muted-foreground">
              {place.displayName}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};

export default PlaceSearch;
