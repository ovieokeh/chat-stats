"use client";

import { ThemeProvider } from "./components/ThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem value={{ light: "nord", dark: "forest" }}>
      {children}
    </ThemeProvider>
  );
}
