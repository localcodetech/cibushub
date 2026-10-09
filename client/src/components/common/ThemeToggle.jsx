import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { isDarkTheme, setDarkTheme } from "@/utils/theme";

// The sun/moon button in the navbar that switches light and dark [AC-UX-10]
const ThemeToggle = () => {
  // Start with whatever index.html already chose
  const [isDark, setIsDark] = useState(isDarkTheme);

  const handleToggle = () => {
    setDarkTheme(!isDark);
    setIsDark(!isDark);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="flex size-11 items-center justify-center rounded-md"
    >
      {isDark ? <Sun size={22} /> : <Moon size={22} />}
    </button>
  );
};

export default ThemeToggle;
