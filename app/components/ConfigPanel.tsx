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
    <div className="card bg-base-100 border border-base-300/60 shadow-sm">
      <div className="card-body p-6">
        <h3 className="card-title text-lg mb-4">{t("configPanel.title")}</h3>

        {/* Parsing Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide opacity-50">{t("configPanel.parsing.title")}</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t("configPanel.parsing.dateFormat.label")}</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={localConfig.parsing.dateFormat}
                onChange={(e) => handleChange("parsing", "dateFormat", e.target.value)}
              >
                <option value="DD/MM/YYYY">{t("configPanel.parsing.dateFormat.euro")}</option>
                <option value="MM/DD/YYYY">{t("configPanel.parsing.dateFormat.us")}</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t("configPanel.parsing.timezone.label")}</span>
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
                <span className="label-text font-medium">{t("configPanel.parsing.strictMode.label")}</span>
                <p className="text-xs opacity-60 mt-0.5">{t("configPanel.parsing.strictMode.description")}</p>
              </div>
            </label>
          </div>
        </div>

        <div className="divider my-4"></div>

        {/* Session Logic */}
        <div className="space-y-5">
          <h4 className="text-sm font-semibold uppercase tracking-wide opacity-50">{t("configPanel.session.title")}</h4>

          <div className="form-control">
            <div className="flex justify-between items-center mb-2">
              <label className="label-text font-medium">{t("configPanel.session.gapThreshold.label")}</label>
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
              <span>{t("configPanel.session.gapThreshold.markers.15m")}</span>
              <span>{t("configPanel.session.gapThreshold.markers.2h")}</span>
              <span>{t("configPanel.session.gapThreshold.markers.4h")}</span>
              <span>{t("configPanel.session.gapThreshold.markers.8h")}</span>
            </div>
            <p className="text-xs opacity-60 mt-2">{t("configPanel.session.gapThreshold.description")}</p>
          </div>

          <div className="form-control">
            <div className="flex justify-between items-center mb-2">
              <label className="label-text font-medium">{t("configPanel.session.replyWindow.label")}</label>
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
              <span>{t("configPanel.session.replyWindow.markers.5m")}</span>
              <span>{t("configPanel.session.replyWindow.markers.30m")}</span>
              <span>{t("configPanel.session.replyWindow.markers.1h")}</span>
              <span>{t("configPanel.session.replyWindow.markers.2h")}</span>
            </div>
            <p className="text-xs opacity-60 mt-2">{t("configPanel.session.replyWindow.description")}</p>
          </div>
        </div>

        <div className="divider my-4"></div>

        <div className="flex justify-end gap-3">
          <button className="btn btn-ghost" onClick={onReset} disabled={!isDirty}>
            <RotateCcw className="w-4 h-4" /> {t("configPanel.actions.reset")}
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!isDirty}>
            <Save className="w-4 h-4" /> {t("configPanel.actions.saveAndRecompute")}
          </button>
        </div>
      </div>
    </div>
  );
};
