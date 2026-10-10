import { getOptionGroupProblem, isItemAvailable } from "@/utils/menu";

// Works out what "Reorder" can put back in the cart [AC-CUST-10].
// It matches each dish of a past order against TODAY's menu, so prices are today's prices,
// and anything that can't be ordered any more is skipped with a reason.
//
// restaurant: GET /restaurants/:id (with its menu)
// order:      GET /customer/orders/:id (with items and their options)
// Returns { toAdd: [{ item, options, quantity }], skipped: [{ name, reason }] }
export const planReorder = (restaurant, order) => {
  // Every dish on today's menu, in one list
  const menuItems = restaurant.menu.flatMap((category) => category.items);

  const toAdd = [];
  const skipped = [];

  for (const orderItem of order.items) {
    const item = menuItems.find((candidate) => candidate.id === orderItem.menuItemId);

    // Deleted from the menu
    if (!item) {
      skipped.push({ name: orderItem.name, reason: "no longer on the menu" });
      continue;
    }

    if (!isItemAvailable(item)) {
      skipped.push({ name: orderItem.name, reason: "sold out right now" });
      continue;
    }

    // Find each option they chose before, among today's options for this dish
    const todaysOptions = item.optionGroups.flatMap((group) => group.options);
    const options = [];
    let optionMissing = false;

    for (const chosen of orderItem.options) {
      const option = todaysOptions.find((candidate) => candidate.id === chosen.optionId);
      if (!option || !option.isAvailable) {
        optionMissing = true;
        break;
      }
      options.push(option);
    }

    if (optionMissing) {
      skipped.push({ name: orderItem.name, reason: "a choice you made isn't available now" });
      continue;
    }

    // The owner may have changed the rules (e.g. a new required choice)
    const optionIds = options.map((option) => option.id);
    const rulesBroken = item.optionGroups.some(
      (group) => getOptionGroupProblem(group, optionIds) !== null,
    );
    if (rulesBroken) {
      skipped.push({ name: orderItem.name, reason: "its choices have changed; add it again" });
      continue;
    }

    toAdd.push({ item: item, options: options, quantity: orderItem.quantity });
  }

  return { toAdd, skipped };
};
