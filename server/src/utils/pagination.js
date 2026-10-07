// page 3 with pageSize 20 → skip the first 40 rows, take the next 20
export const toLimitAndOffset = ({ page, pageSize }) => {
  return {
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
};

// The "meta" part of a list response, so the frontend can draw page buttons
export const buildPageMeta = ({ page, pageSize }, totalItems) => {
  return {
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
  };
};
