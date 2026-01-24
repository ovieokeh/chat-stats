"use client";

import React from "react";
import { ExportConfig, DEFAULT_CONFIG } from "../types";
import { Save, RotateCcw } from "lucide-react";

interface ConfigPanelProps {
  config: ExportConfig;
  onSave: (newConfig: ExportConfig) => void;
  onReset: () => void;
}

// Human-readable time formatting
const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
  return `${hours}h ${mins}m`;
};

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onSave, onReset }) => {
  const [localConfig, setLocalConfig] = React.useState<ExportConfig>(config);
  const [isDirty, setIsDirty] = React.useState(false);

  const handleChange = (section: keyof ExportConfig, key: string, value: any) => {
    setLocalConfig((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
    setIsDirty(true);
  };

  const handleSave = () => {
    onSave(localConfig);
    setIsDirty(false);
  };

  return (
    <div className="card bg-base-100 border border-base-300/60 shadow-sm">
      <div className="card-body p-6">
        <h3 className="card-title text-lg mb-4">Analysis Configuration</h3>

        {/* Parsing Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide opacity-50">Parsing & formatting</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Date Format</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={localConfig.parsing.dateFormat}
                onChange={(e) => handleChange("parsing", "dateFormat", e.target.value)}
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (Euro)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Timezone</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={localConfig.parsing.timezone}
                onChange={(e) => handleChange("parsing", "timezone", e.target.value)}
              >
                {/* Common timezones or all supported */}
                {["UTC", ...Intl.supportedValuesOf("timeZone").filter((tz) => tz.includes("/"))].map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-control bg-base-200/50 p-4 rounded-xl">
            <label className="label cursor-pointer justify-start gap-4">
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={!localConfig.parsing.strictMode}
                onChange={(e) => handleChange("parsing", "strictMode", !e.target.checked)}
              />
              <div>
                <span className="label-text font-medium">Skip problematic lines</span>
                <p className="text-xs opacity-60 mt-0.5">
                  When enabled, unparseable messages are skipped. Disable to stop on errors.
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="divider my-4"></div>

        {/* Session Logic */}
        <div className="space-y-5">
          <h4 className="text-sm font-semibold uppercase tracking-wide opacity-50">Conversation Sessions</h4>

          <div className="form-control">
            <div className="flex justify-between items-center mb-2">
              <label className="label-text font-medium">Session break after silence</label>
              <span className="badge badge-primary badge-outline font-mono">
                {formatDuration(localConfig.session.gapThresholdMinutes)}
              </span>
            </div>
            <input
              type="range"
              min="15"
              max="480"
              step="15"
              className="w-full range range-primary range-sm"
              value={localConfig.session.gapThresholdMinutes}
              onChange={(e) => handleChange("session", "gapThresholdMinutes", parseInt(e.target.value))}
            />
            <div className="flex justify-between text-[10px] opacity-50 mt-1 px-1">
              <span>15 min</span>
              <span>2 hours</span>
              <span>4 hours</span>
              <span>8 hours</span>
            </div>
            <p className="text-xs opacity-60 mt-2">A new conversation starts when there's no activity for this long.</p>
          </div>

          <div className="form-control">
            <div className="flex justify-between items-center mb-2">
              <label className="label-text font-medium">Reply detection window</label>
              <span className="badge badge-primary badge-outline font-mono">
                {formatDuration(localConfig.session.replyWindowMinutes)}
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="120"
              step="5"
              className="w-full range range-primary range-sm"
              value={localConfig.session.replyWindowMinutes}
              onChange={(e) => handleChange("session", "replyWindowMinutes", parseInt(e.target.value))}
            />
            <div className="flex justify-between text-[10px] opacity-50 mt-1 px-1">
              <span>5 min</span>
              <span>30 min</span>
              <span>1 hour</span>
              <span>2 hours</span>
            </div>
            <p className="text-xs opacity-60 mt-2">Messages sent within this time frame are considered replies.</p>
          </div>
        </div>

        <div className="divider my-4"></div>

        <div className="flex justify-end gap-3">
          <button className="btn btn-ghost" onClick={onReset} disabled={!isDirty}>
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!isDirty}>
            <Save className="w-4 h-4" /> Save & Recompute
          </button>
        </div>
      </div>
    </div>
  );
};
