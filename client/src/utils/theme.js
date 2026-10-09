// Light or dark theme [AC-UX-10].
// The choice is saved in localStorage. That is fine here: it's a display setting,
// not a login token (tokens never go in localStorage).
// index.html reads the same key before the app starts, so the page never flashes the wrong colours.

const THEME_KEY = "cibushub-theme";

// true if the page is dark right now (<html class="dark">)
export const isDarkTheme = () => {
  return document.documentElement.classList.contains("dark");
};

// Switch the page to dark (true) or light (false), and remember the choice
export const setDarkTheme = (isDark) => {
  document.documentElement.classList.toggle("dark", isDark);

  try {
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  } catch {
    // Private mode or blocked storage: the theme still changes, it just isn't remembered
  }
};
