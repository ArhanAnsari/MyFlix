"use client";

import { ThemeProvider } from "@/lib/theme-context";
import { useEffect, useState } from "react";

export function AppWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Apply body class for styling
  useEffect(() => {
    if (!mounted) return;

    const handleThemeChange = () => {
      const isDark = document.documentElement.classList.contains("dark");
      document.body.classList.toggle("dark", isDark);
      document.body.classList.toggle("light", !isDark);
    };

    handleThemeChange();

    // Listen for changes
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, [mounted]);

  // Always wrap with ThemeProvider to ensure context is available
  return <ThemeProvider>{children}</ThemeProvider>;
}
