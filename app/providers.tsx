"use client";

import { ThemeProvider } from "./components/ThemeProvider";
import { PrivacyProvider } from "./context/PrivacyContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem value={{ light: "nord", dark: "forest" }}>
      <PrivacyProvider>{children}</PrivacyProvider>
    </ThemeProvider>
  );
}
