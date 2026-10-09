import { StrictMode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { useAuthStore } from "@/store/authStore";
import { queryClient } from "@/lib/queryClient";

// Ask the server "who is logged in?" once, as the app starts.
// It runs here, not inside a component, so it can never run twice
// (two refreshes at the same moment would end the session on the server).
useAuthStore.getState().checkSession();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* Lets every page use TanStack Query to fetch server data */}
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
