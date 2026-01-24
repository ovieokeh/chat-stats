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
      <div className="modal-box p-0 max-w-2xl bg-base-100 flex flex-col max-h-[90vh]">
        <button className="btn btn-sm btn-circle btn-ghost absolute right-4 top-2 z-20" onClick={onClose}>
          ✕
        </button>
        <div className="p-6 pt-12 overflow-y-auto">
          {config && <ConfigPanel config={config} onSave={onSave} onReset={() => {}} />}
          {isRecomputing && (
            <div className="absolute inset-0 bg-base-100/80 flex items-center justify-center z-30 rounded-xl">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          <div className="divider my-8 opacity-30">{t("modals.config.dangerZone")}</div>
          <div className="bg-error/5 border border-error/10 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h4 className="font-bold text-error text-sm">{t("modals.config.destroyData")}</h4>
              <p className="text-[11px] opacity-60 mt-1">{t("modals.config.destroyDescription")}</p>
            </div>
            <button className="btn btn-error btn-outline btn-sm w-full sm:w-auto rounded-xl" onClick={onDeleteAllData}>
              {t("modals.config.delete")}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};
