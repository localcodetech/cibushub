import { findRestaurantById } from "../../repositories/restaurant.repository.js";
import { findItemsForCart } from "../../repositories/menu.repository.js";
import { getOpenStatus, isRestaurantOpen } from "../../utils/restaurant/openingHours.js";

// Problems that stop a line from being ordered at all (a price change only needs a "got it")
const BLOCKING_PROBLEMS = [
  "ITEM_UNAVAILABLE",
  "NOT_ENOUGH_STOCK",
  "OPTION_UNAVAILABLE",
  "OPTIONS_INVALID",
];

const problem = (code, message) => ({ code, message });

// Checks the chosen options against the item's groups, and adds up their extra prices
const checkOptions = (item, optionIds, problems) => {
  const chosenOptions = [];
  let extraPesewas = 0;

  for (const optionId of optionIds) {
    const group = item.optionGroups.find((candidate) =>
      candidate.options.some((option) => option.id === optionId),
    );
    const option = group?.options.find((candidate) => candidate.id === optionId);

    if (!option || !option.isAvailable) {
      problems.push(problem("OPTION_UNAVAILABLE", "One of your choices is no longer available"));
      continue;
    }

    chosenOptions.push({
      id: option.id,
      name: option.name,
      extraPricePesewas: option.extraPricePesewas,
    });
    extraPesewas += option.extraPricePesewas;
  }

  // "Protein: choose exactly 1", "Extras: up to 3" [AC-MENU-06]
  for (const group of item.optionGroups) {
    const chosenInGroup = group.options.filter((option) => optionIds.includes(option.id)).length;

    if (chosenInGroup < group.minSelect || chosenInGroup > group.maxSelect) {
      problems.push(
        problem(
          "OPTIONS_INVALID",
          `Choose between ${group.minSelect} and ${group.maxSelect} for "${group.name}"`,
        ),
      );
    }
  }

  return { chosenOptions, extraPesewas };
};

// Works out one cart line from today's menu, never from what the browser says [AC-CART-07]
const checkLine = (line, item) => {
  const problems = [];

  if (!item || !item.isAvailable || item.stockRemaining === 0) {
    return {
      menuItemId: line.menuItemId,
      name: item ? item.name : null,
      quantity: line.quantity,
      optionIds: line.optionIds,
      options: [],
      unitPricePesewas: null,
      lineTotalPesewas: 0,
      problems: [problem("ITEM_UNAVAILABLE", "This item is no longer available")],
    };
  }

  // null stock means "not tracked": any quantity is fine
  if (item.stockRemaining !== null && line.quantity > item.stockRemaining) {
    problems.push(problem("NOT_ENOUGH_STOCK", `Only ${item.stockRemaining} left today`));
  }

  const { chosenOptions, extraPesewas } = checkOptions(item, line.optionIds, problems);
  const unitPricePesewas = item.pricePesewas + extraPesewas;

  if (unitPricePesewas !== line.seenUnitPricePesewas) {
    problems.push(
      problem(
        "PRICE_CHANGED",
        `The price changed from ${line.seenUnitPricePesewas} to ${unitPricePesewas} pesewas`,
      ),
    );
  }

  return {
    menuItemId: item.id,
    name: item.name,
    quantity: line.quantity,
    optionIds: line.optionIds,
    options: chosenOptions,
    unitPricePesewas,
    lineTotalPesewas: unitPricePesewas * line.quantity,
    problems,
  };
};

const canBeOrdered = (line) => {
  return !line.problems.some((lineProblem) => BLOCKING_PROBLEMS.includes(lineProblem.code));
};

// [AC-CART-07]
export const checkCart = async ({ restaurantId, items }) => {
  const restaurant = await findRestaurantById(restaurantId);

  // Gone, suspended or never approved: nothing in the cart can be ordered
  if (!restaurant || restaurant.status !== "APPROVED") {
    return {
      restaurant: null,
      lines: [],
      subtotalPesewas: 0,
      problems: [problem("RESTAURANT_UNAVAILABLE", "This restaurant is no longer available")],
      hasChanges: true,
      canCheckout: false,
    };
  }

  const now = new Date();
  const restaurantProblems = [];

  if (!isRestaurantOpen(restaurant, now)) {
    restaurantProblems.push(problem("RESTAURANT_CLOSED", "This restaurant is closed right now"));
  }

  const itemIds = items.map((line) => line.menuItemId);
  const menuItems = await findItemsForCart(restaurantId, itemIds);

  const lines = items.map((line) => {
    const item = menuItems.find((candidate) => candidate.id === line.menuItemId);
    return checkLine(line, item);
  });

  const orderableLines = lines.filter(canBeOrdered);
  const subtotalPesewas = orderableLines.reduce((sum, line) => sum + line.lineTotalPesewas, 0);

  // Below the restaurant's minimum order [AC-CART-08]
  if (subtotalPesewas < restaurant.minOrderPesewas) {
    restaurantProblems.push(
      problem("BELOW_MINIMUM_ORDER", `The minimum order is ${restaurant.minOrderPesewas} pesewas`),
    );
  }

  const hasChanges =
    restaurantProblems.length > 0 || lines.some((line) => line.problems.length > 0);

  return {
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      openStatus: getOpenStatus(restaurant, now),
      minOrderPesewas: restaurant.minOrderPesewas,
    },
    lines,
    subtotalPesewas,
    problems: restaurantProblems,
    hasChanges,
    // Any change, even a price, must be seen and accepted before checkout [AC-CART-07]
    canCheckout: !hasChanges,
  };
};
