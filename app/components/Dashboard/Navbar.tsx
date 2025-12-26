"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Settings, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { usePrivacy } from "../../context/PrivacyContext";

interface NavbarProps {
  filename: string;
  importedAt: number | Date;
  onSettingsClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ filename, importedAt, onSettingsClick }) => {
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy();

  return (
    <nav className="sticky top-0 z-30 w-full border-b border-base-200 bg-base-100/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="btn btn-circle btn-ghost btn-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate max-w-[200px] md:max-w-md">
              {isPrivacyMode ? "Conversation Analysis" : filename}
            </h1>
            <p className="text-[10px] opacity-50 uppercase tracking-wider font-semibold">
              Imported {format(importedAt, "MMM d, yyyy")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={`btn btn-sm gap-2 normal-case font-medium ${
              isPrivacyMode ? "btn-primary" : "btn-ghost opacity-70"
            }`}
            onClick={togglePrivacyMode}
            title={isPrivacyMode ? "Disable Privacy Mode" : "Enable Privacy Mode"}
          >
            {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="hidden sm:inline">{isPrivacyMode ? "Privacy On" : "Privacy Mode"}</span>
          </button>

          <button className="btn btn-ghost btn-sm gap-2 normal-case font-medium" onClick={onSettingsClick}>
            <Settings className="w-4 h-4 opacity-70" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
