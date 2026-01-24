"use client";

import { Loader2 } from "lucide-react";
import { ConfigPanel } from "../ConfigPanel";
import { ExportConfig } from "../../types";
import { useText } from "../../hooks/useText";

interface AnalysisConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ExportConfig | null;
  onSave: (config: ExportConfig) => Promise<void>;
  isRecomputing: boolean;
  onDeleteAllData: () => void;
}

export const AnalysisConfigModal: React.FC<AnalysisConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
  isRecomputing,
  onDeleteAllData,
}) => {
  const { t } = useText();
  return (
    <dialog id="analysis_config_modal" className="modal modal-bottom sm:modal-middle" open={isOpen}>
      <div className="modal-box p-0 max-w-2xl bg-base-100">
        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={onClose}>
          ✕
        </button>
        <div className="p-6">
          {config && <ConfigPanel config={config} onSave={onSave} onReset={() => {}} />}
          {isRecomputing && (
            <div className="absolute inset-0 bg-base-100/80 flex items-center justify-center z-10 rounded-xl">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          <div className="divider my-6">{t("modals.config.dangerZone")}</div>
          <div className="bg-error/10 border border-error/20 p-4 rounded-xl flex items-center justify-between">
            <div>
              <h4 className="font-bold text-error">{t("modals.config.destroyData")}</h4>
              <p className="text-sm opacity-70">{t("modals.config.destroyDescription")}</p>
            </div>
            <button className="btn btn-error btn-outline btn-sm" onClick={onDeleteAllData}>
              {t("modals.config.delete")}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};
