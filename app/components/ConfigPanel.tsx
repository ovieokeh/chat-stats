"use client";

import React from "react";
import { ExportConfig, DEFAULT_CONFIG } from "../types";
import { Save, RotateCcw } from "lucide-react";

interface ConfigPanelProps {
  config: ExportConfig;
  onSave: (newConfig: ExportConfig) => void;
  onReset: () => void;
}

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
                <span className="label-text">Strict Mode</span>
              </label>
              <label className="label cursor-pointer justify-start gap-4">
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={localConfig.parsing.strictMode}
                  onChange={(e) => handleChange("parsing", "strictMode", e.target.checked)}
                />
                <span className="label-text-alt">Fail on bad lines</span>
              </label>
            </div>
          </div>
        </div>

        <div className="divider my-4"></div>

        {/* Session Logic */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide opacity-50">Session Logic</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Session Gap Threshold (min)</span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={localConfig.session.gapThresholdMinutes}
                onChange={(e) => handleChange("session", "gapThresholdMinutes", parseInt(e.target.value))}
              />
              <div className="label">
                <span className="label-text-alt">Time between messages to split a session</span>
              </div>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Reply Window (min)</span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={localConfig.session.replyWindowMinutes}
                onChange={(e) => handleChange("session", "replyWindowMinutes", parseInt(e.target.value))}
              />
              <div className="label">
                <span className="label-text-alt">Max lookup time for reply inference</span>
              </div>
            </div>
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
