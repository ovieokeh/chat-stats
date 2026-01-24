"use client";

import React from "react";
import { ExportConfig } from "../types";
import { Save, RotateCcw } from "lucide-react";
import { useText } from "../hooks/useText";

interface ConfigPanelProps {
  config: ExportConfig;
  onSave: (newConfig: ExportConfig) => void;
  onReset: () => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onSave, onReset }) => {
  const { t } = useText();
  const [localConfig, setLocalConfig] = React.useState<ExportConfig>(config);
  const [isDirty, setIsDirty] = React.useState(false);

  // Human-readable time formatting
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} ${t("common.duration.min")}`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours} ${hours > 1 ? t("common.duration.hours") : t("common.duration.hour")}`;
    return `${hours}${t("common.duration.h")} ${mins}${t("common.duration.m")}`;
  };

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
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold">{t("configPanel.title")}</h3>
        <button className="btn btn-ghost btn-sm sm:hidden" onClick={onReset} disabled={!isDirty}>
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Parsing Settings */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider opacity-40">{t("configPanel.parsing.title")}</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">{t("configPanel.parsing.dateFormat.label")}</span>
            </label>
            <select
              className="select select-bordered w-full rounded-xl bg-base-200/50 border-none"
              value={localConfig.parsing.dateFormat}
              onChange={(e) => handleChange("parsing", "dateFormat", e.target.value)}
            >
              <option value="DD/MM/YYYY">{t("configPanel.parsing.dateFormat.euro")}</option>
              <option value="MM/DD/YYYY">{t("configPanel.parsing.dateFormat.us")}</option>
            </select>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">{t("configPanel.parsing.timezone.label")}</span>
            </label>
            <select
              className="select select-bordered w-full rounded-xl bg-base-200/50 border-none"
              value={localConfig.parsing.timezone}
              onChange={(e) => handleChange("parsing", "timezone", e.target.value)}
            >
              {["UTC", ...Intl.supportedValuesOf("timeZone").filter((tz) => tz.includes("/"))].map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-control bg-base-200/30 p-4 rounded-2xl border border-base-200/50">
          <label className="label cursor-pointer justify-start gap-4 p-0">
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={!localConfig.parsing.strictMode}
              onChange={(e) => handleChange("parsing", "strictMode", !e.target.checked)}
            />
            <div>
              <span className="label-text font-bold">{t("configPanel.parsing.strictMode.label")}</span>
              <p className="text-[11px] opacity-60 mt-0.5">{t("configPanel.parsing.strictMode.description")}</p>
            </div>
          </label>
        </div>
      </div>

      <div className="divider opacity-30"></div>

      {/* Session Logic */}
      <div className="space-y-6">
        <h4 className="text-xs font-bold uppercase tracking-wider opacity-40">{t("configPanel.session.title")}</h4>

        <div className="form-control">
          <div className="flex justify-between items-center mb-4">
            <label className="label-text font-bold">{t("configPanel.session.gapThreshold.label")}</label>
            <span className="badge badge-primary badge-outline font-mono text-xs">
              {formatDuration(localConfig.session.gapThresholdMinutes)}
            </span>
          </div>
          <input
            type="range"
            min="15"
            max="480"
            step="15"
            className="w-full range range-primary range-xs"
            value={localConfig.session.gapThresholdMinutes}
            onChange={(e) => handleChange("session", "gapThresholdMinutes", parseInt(e.target.value))}
          />
          <div className="flex justify-between text-[10px] opacity-40 mt-2 px-1 font-medium">
            <span>15m</span>
            <span>2h</span>
            <span>4h</span>
            <span>8h</span>
          </div>
          <p className="text-[11px] opacity-50 mt-3 italic">{t("configPanel.session.gapThreshold.description")}</p>
        </div>

        <div className="form-control">
          <div className="flex justify-between items-center mb-4">
            <label className="label-text font-bold">{t("configPanel.session.replyWindow.label")}</label>
            <span className="badge badge-primary badge-outline font-mono text-xs">
              {formatDuration(localConfig.session.replyWindowMinutes)}
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="120"
            step="5"
            className="w-full range range-primary range-xs"
            value={localConfig.session.replyWindowMinutes}
            onChange={(e) => handleChange("session", "replyWindowMinutes", parseInt(e.target.value))}
          />
          <div className="flex justify-between text-[10px] opacity-40 mt-2 px-1 font-medium">
            <span>5m</span>
            <span>30m</span>
            <span>1h</span>
            <span>2h</span>
          </div>
          <p className="text-[11px] opacity-50 mt-3 italic">{t("configPanel.session.replyWindow.description")}</p>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-base-100 py-4 -mx-6 px-6 border-t border-base-200/50 mt-8">
        <button className="btn btn-ghost btn-sm hidden sm:flex" onClick={onReset} disabled={!isDirty}>
          <RotateCcw className="w-4 h-4" /> {t("configPanel.actions.reset")}
        </button>
        <button
          className="btn btn-primary btn-sm flex-1 sm:flex-none rounded-xl"
          onClick={handleSave}
          disabled={!isDirty}
        >
          <Save className="w-4 h-4" /> {t("configPanel.actions.saveAndRecompute")}
        </button>
      </div>
    </div>
  );
};
