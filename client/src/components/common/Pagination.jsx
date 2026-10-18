import Text from "@/components/typography/Text";

// "Previous  Page 2 of 5  Next". Hidden when everything fits on one page.
// meta: the list's { page, totalPages }    onChangePage(newPage)
const Pagination = ({ meta, onChangePage }) => {
  if (meta.totalPages <= 1) {
    return null;
  }

  const isFirstPage = meta.page <= 1;
  const isLastPage = meta.page >= meta.totalPages;

  return (
    <nav aria-label="Pages" className="mt-8 flex items-center justify-between gap-4">
      <button
        type="button"
        disabled={isFirstPage}
        onClick={() => onChangePage(meta.page - 1)}
        className="min-h-11 rounded-md border border-border px-4 font-bold disabled:opacity-40"
      >
        Previous
      </button>
      <Text size="small" muted>
        Page {meta.page} of {meta.totalPages}
      </Text>
      <button
        type="button"
        disabled={isLastPage}
        onClick={() => onChangePage(meta.page + 1)}
        className="min-h-11 rounded-md border border-border px-4 font-bold disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );
};

export default Pagination;
