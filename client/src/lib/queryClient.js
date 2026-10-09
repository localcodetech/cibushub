import { QueryClient } from "@tanstack/react-query";

// TanStack Query keeps a copy of data the pages fetched from the server (a "cache"),
// so going back to a page shows it at once instead of loading again.
// There is ONE queryClient for the whole app; logout empties it.
export const queryClient = new QueryClient();
