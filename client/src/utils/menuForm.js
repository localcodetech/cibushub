// The owner's dish form [AC-MENU-03, AC-MENU-04, AC-MENU-06, AC-MENU-07]: turning a saved dish
// into what the form edits, checking it, and turning it back into what the server takes.
// The owner types GHS ("45.50"); the server only ever gets whole pesewas (4550).

// "45.5" -> 4550; null when it isn't an amount like 45 or 45.50
export const ghsToPesewas = (text) => {
  const trimmed = String(text).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
};

// 4550 -> "45.50", for filling a GHS box
export const pesewasToGhs = (pesewas) => (pesewas / 100).toFixed(2);

// A React key for rows that have no id yet
const newKey = () => crypto.randomUUID();

export const emptyOption = () => ({ key: newKey(), name: "", extraGhs: "0", isAvailable: true });

// The usual group: the customer must pick exactly 1 (e.g. "Protein")
export const emptyGroup = () => ({
  key: newKey(),
  name: "",
  minSelect: 1,
  maxSelect: 1,
  options: [emptyOption(), emptyOption()],
});

// A saved dish (or nothing, for a new one) -> the form's values
export const itemToForm = (item, categoryId) => ({
  categoryId: item ? item.categoryId : categoryId,
  name: item ? item.name : "",
  description: item?.description || "",
  priceGhs: item ? pesewasToGhs(item.pricePesewas) : "",
  tags: item ? item.tags : [],
  hasDailyStock: Boolean(item && item.dailyStock),
  dailyStock: item && item.dailyStock ? String(item.dailyStock) : "",
  optionGroups: item
    ? item.optionGroups.map((group) => ({
        key: newKey(),
        name: group.name,
        minSelect: group.minSelect,
        maxSelect: group.maxSelect,
        options: group.options.map((option) => ({
          key: newKey(),
          name: option.name,
          extraGhs: pesewasToGhs(option.extraPricePesewas),
          isAvailable: option.isAvailable,
        })),
      }))
    : [],
});

// Every problem in the form, in the same rules as the server (validators/menu/fields.js).
// Returns { fields: { name, priceGhs, dailyStock }, groups: [{ name, maxSelect, options: [..] }] }
// and isFine. Each message sits under the box it's about.
export const checkItemForm = (form) => {
  const fields = {};
  const name = form.name.trim();
  if (name.length < 2) fields.name = "Name is too short";
  if (name.length > 120) fields.name = "Name is too long";

  const price = ghsToPesewas(form.priceGhs);
  if (price === null) fields.priceGhs = "Enter a price like 45 or 45.50";
  else if (price <= 0) fields.priceGhs = "The price must be more than GHS 0.00";

  if (form.hasDailyStock) {
    const stock = Number(form.dailyStock);
    if (!Number.isInteger(stock) || stock < 1 || stock > 10000) {
      fields.dailyStock = "Enter a whole number from 1 to 10000";
    }
  }

  const groups = form.optionGroups.map((group) => {
    const problems = { options: [] };
    if (group.name.trim().length < 2) problems.name = "Give the group a name, e.g. Protein";
    if (group.maxSelect < Math.max(1, group.minSelect)) {
      problems.maxSelect = "At least " + Math.max(1, group.minSelect);
    } else if (group.maxSelect > group.options.length) {
      problems.maxSelect = "At most " + group.options.length + " (the number of choices)";
    }
    problems.options = group.options.map((option) => {
      const optionProblems = {};
      if (!option.name.trim()) optionProblems.name = "Name the choice";
      if (ghsToPesewas(option.extraGhs) === null) optionProblems.extraGhs = "e.g. 0 or 5.00";
      return optionProblems;
    });
    return problems;
  });

  const groupHasProblem = (problems) =>
    problems.name ||
    problems.maxSelect ||
    problems.options.some((option) => Object.keys(option).length > 0);
  const isFine = Object.keys(fields).length === 0 && !groups.some(groupHasProblem);

  return { fields, groups, isFine };
};

// The form's values (already checked) -> what the server takes
export const formToItem = (form) => ({
  categoryId: form.categoryId,
  name: form.name.trim(),
  description: form.description.trim(),
  pricePesewas: ghsToPesewas(form.priceGhs),
  tags: form.tags,
  // null = no daily limit
  dailyStock: form.hasDailyStock ? Number(form.dailyStock) : null,
  optionGroups: form.optionGroups.map((group) => ({
    name: group.name.trim(),
    minSelect: group.minSelect,
    maxSelect: group.maxSelect,
    options: group.options.map((option) => ({
      name: option.name.trim(),
      extraPricePesewas: ghsToPesewas(option.extraGhs),
      isAvailable: option.isAvailable,
    })),
  })),
});
