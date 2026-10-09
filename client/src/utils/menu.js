// true if a customer can order this dish right now [AC-MENU-05, AC-DISC-10].
// The owner can switch a dish off, and a dish with a daily stock sells out at 0.
// (stockRemaining is null when the dish has no daily limit.)
export const isItemAvailable = (item) => {
  if (!item.isAvailable) {
    return false;
  }
  if (item.stockRemaining !== null && item.stockRemaining <= 0) {
    return false;
  }
  return true;
};

// What is wrong with the choices in one option group, or null if they are fine [AC-MENU-06].
// group: { name, minSelect, maxSelect, options }   selectedIds: every option id chosen in the sheet
// Example: Protein (choose exactly 1) with nothing chosen -> "Choose 1"
export const getOptionGroupProblem = (group, selectedIds) => {
  const chosenCount = group.options.filter((option) => selectedIds.includes(option.id)).length;

  if (chosenCount < group.minSelect) {
    return group.minSelect === 1 ? "Choose 1" : `Choose at least ${group.minSelect}`;
  }
  if (chosenCount > group.maxSelect) {
    return `Choose at most ${group.maxSelect}`;
  }
  return null;
};

// "Required · choose 1", "Optional · up to 3", "Required · choose 2 to 3"
export const describeOptionGroup = (group) => {
  const needed = group.minSelect > 0 ? "Required" : "Optional";

  if (group.minSelect === group.maxSelect) {
    return `${needed} · choose ${group.maxSelect}`;
  }
  if (group.minSelect === 0) {
    return `${needed} · up to ${group.maxSelect}`;
  }
  return `${needed} · choose ${group.minSelect} to ${group.maxSelect}`;
};
