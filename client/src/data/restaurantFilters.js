// Cuisine chips on the restaurant listing [AC-DISC-07].
// value is what the server stores in a restaurant's cuisineTags (always lowercase).
export const cuisineOptions = [
  { label: "Ghanaian", value: "ghanaian" },
  { label: "Local", value: "local" },
  { label: "Rice", value: "rice" },
  { label: "Soups", value: "soups" },
  { label: "Grills", value: "grills" },
  { label: "Breakfast", value: "breakfast" },
  { label: "Fast food", value: "fast food" },
  { label: "Burgers", value: "burgers" },
  { label: "Pizza", value: "pizza" },
];

// Sort choices [AC-DISC-08]. An empty value lets the server choose: open restaurants first, then A to Z.
// "distance" is added once the customer has a delivery address (Task 5).
export const sortOptions = [
  { label: "Recommended", value: "" },
  { label: "Fastest", value: "deliveryTime" },
  { label: "Newest", value: "newest" },
  { label: "A to Z", value: "name" },
];
