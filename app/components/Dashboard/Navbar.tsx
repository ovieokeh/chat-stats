"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { format } from "date-fns";

interface NavbarProps {
  filename: string;
  importedAt: number | Date;
  onSettingsClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ filename, importedAt, onSettingsClick }) => {
  return (
    <nav className="sticky top-0 z-30 w-full border-b border-base-200 bg-base-100/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="btn btn-circle btn-ghost btn-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate max-w-[200px] md:max-w-md">{filename}</h1>
            <p className="text-[10px] opacity-50 uppercase tracking-wider font-semibold">
              Imported {format(importedAt, "MMM d, yyyy")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm gap-2 normal-case font-medium" onClick={onSettingsClick}>
            <Settings className="w-4 h-4 opacity-70" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
