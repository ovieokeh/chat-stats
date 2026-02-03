"use client";

import { ThemeProvider } from "./components/ThemeProvider";
import { PrivacyProvider } from "./context/PrivacyContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      themes={["bone", "obsidian", "ember"]}
      value={{ light: "bone", dark: "obsidian", bone: "bone", obsidian: "obsidian", ember: "ember" }}
    >
      <PrivacyProvider>{children}</PrivacyProvider>
    </ThemeProvider>
  );
}
