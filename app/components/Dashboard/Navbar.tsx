"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Settings, Eye, EyeOff, Sun, Moon, Flame, Search } from "lucide-react";
import { format } from "date-fns";
import { usePrivacy } from "../../context/PrivacyContext";
import { useText } from "../../hooks/useText";
import { useTheme } from "next-themes";

interface NavbarProps {
  filename: string;
  importedAt: number | Date;
  onSettingsClick: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  filename,
  importedAt,
  onSettingsClick,
  searchQuery,
  onSearchChange,
}) => {
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy();
  const { t } = useText();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = useState(searchQuery);

  const currentTheme = theme === "system" ? (resolvedTheme === "dark" ? "obsidian" : "bone") : (theme as string);
  const themeOrder = ["bone", "obsidian", "ember"];
  const currentThemeIndex = Math.max(0, themeOrder.indexOf(currentTheme));
  const nextTheme = themeOrder[(currentThemeIndex + 1) % themeOrder.length];

  const themeLabel = currentTheme === "bone" ? "Bone" : currentTheme === "ember" ? "Ember" : "Obsidian";
  const ThemeIcon = currentTheme === "bone" ? Sun : currentTheme === "ember" ? Flame : Moon;

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => onSearchChange(query), 250);
    return () => clearTimeout(timer);
  }, [query, onSearchChange]);

  return (
    <nav className="sticky top-0 z-30 w-full border-b border-base-200 bg-base-100/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/" className="btn btn-circle btn-ghost btn-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate max-w-[200px] md:max-w-md">
              {isPrivacyMode ? t("navbar.defaultTitle") : filename}
            </h1>
            <p className="text-[10px] opacity-50 uppercase tracking-wider font-semibold">
              {t("navbar.imported", { date: format(importedAt, "MMM d, yyyy") })}
            </p>
          </div>
        </div>

        <div className="flex-1 min-w-[220px] max-w-md w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/50 z-10" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSearchChange(query);
              }}
              placeholder={t("navbar.search.placeholder")}
              aria-label={t("navbar.search.label")}
              className="input input-bordered input-sm pl-9 w-full rounded-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            className="btn btn-ghost btn-sm gap-2 normal-case font-medium opacity-70 hover:opacity-100"
            onClick={() => setTheme(nextTheme)}
            title={`Theme: ${themeLabel}`}
          >
            <ThemeIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{themeLabel}</span>
          </button>
          <button
            className={`btn btn-sm gap-2 normal-case font-medium ${
              isPrivacyMode ? "btn-primary" : "btn-ghost opacity-70"
            }`}
            onClick={togglePrivacyMode}
            title={isPrivacyMode ? t("navbar.privacy.disable") : t("navbar.privacy.enable")}
          >
            {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="hidden sm:inline">{isPrivacyMode ? t("navbar.privacy.on") : t("navbar.privacy.off")}</span>
          </button>

          <button className="btn btn-ghost btn-sm gap-2 normal-case font-medium" onClick={onSettingsClick}>
            <Settings className="w-4 h-4 opacity-70" />
            <span className="hidden sm:inline">{t("navbar.settings")}</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
