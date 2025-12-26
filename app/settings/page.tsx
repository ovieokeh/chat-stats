"use client";

import React from "react";
import { ConfigPanel } from "../components/ConfigPanel";
import { DEFAULT_CONFIG, ExportConfig } from "../types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
// import { toast } from "sonner";
// Actually I don't see sonner in package.json from list_dir (it wasn't listed fully).
// I'll assume no toast lib for now and just use state.

export default function SettingsPage() {
  const [config, setConfig] = React.useState<ExportConfig>(() => {
    // Load from localStorage or default
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chat-analyzer-default-config");
      if (saved) return JSON.parse(saved);
    }
    return DEFAULT_CONFIG;
  });

  const handleSave = (newConfig: ExportConfig) => {
    setConfig(newConfig);
    if (typeof window !== "undefined") {
      localStorage.setItem("chat-analyzer-default-config", JSON.stringify(newConfig));
      alert("Default configuration saved for future imports.");
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="btn btn-circle btn-ghost">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="space-y-6">
        <div className="alert bg-base-200 border-none">
          <span>
            These settings will apply as defaults for <strong>new imports</strong>. Existing imports have their own
            frozen configuration.
          </span>
        </div>

        <ConfigPanel config={config} onSave={handleSave} onReset={handleReset} />
      </div>
    </main>
  );
}
