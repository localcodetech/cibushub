// Gives every option group and option its position, in the order they are written
const withDisplayOrder = (optionGroups = []) => {
  return optionGroups.map((group, groupPosition) => ({
    ...group,
    displayOrder: groupPosition,
    options: group.options.map((option, optionPosition) => ({
      ...option,
      displayOrder: optionPosition,
    })),
  }));
};

module.exports = { withDisplayOrder };
