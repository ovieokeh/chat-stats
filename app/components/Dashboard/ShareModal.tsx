"use client";

import React, { useState } from "react";
import {
  X,
  Download,
  Smartphone,
  Layout,
  Share2,
  Loader2,
  CheckCircle2,
  MessageSquare,
  Clock,
  Ghost,
  Zap,
  Moon,
  Award,
  Users,
} from "lucide-react";
import { toPng } from "html-to-image";
import { ExportPoster, ExportPlatform, ExportType } from "./ExportPoster";
import { useText } from "../../hooks/useText";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ExportType; // This might come in as 'overview' initially, but we'll default to 'persona' for the modal
  data: any;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, type: initialType, data }) => {
  const { t } = useText();
  const [platform, setPlatform] = useState<ExportPlatform>("stories");
  const [activeTab, setActiveTab] = useState<"persona" | "summary">("persona");
  const [insightId, setInsightId] = useState<string>("volume");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const personas = [
    {
      id: "volume",
      label: t("dashboard.participantStats.badges.volume.label"),
      icon: <Award className="w-4 h-4" />,
      description: t("dashboard.participantStats.badges.volume.description"),
    },
    {
      id: "yap",
      label: t("dashboard.participantStats.badges.yap.label"),
      icon: <Share2 className="w-4 h-4" />,
      description: t("dashboard.participantStats.badges.yap.description"),
    },
    {
      id: "speed",
      label: t("dashboard.participantStats.badges.speed.label"),
      icon: <Zap className="w-4 h-4" />,
      description: t("dashboard.participantStats.badges.speed.description"),
    },
    {
      id: "night",
      label: t("dashboard.participantStats.badges.nightOwl.label"),
      icon: <Moon className="w-4 h-4" />,
      description: t("dashboard.participantStats.badges.nightOwl.description"),
    },
    {
      id: "ghost",
      label: t("dashboard.participantStats.badges.ghost.label"),
      icon: <Ghost className="w-4 h-4" />,
      description: t("dashboard.participantStats.badges.ghost.description"),
    },
    {
      id: "double",
      label: t("dashboard.participantStats.badges.doubleText.label"),
      icon: <MessageSquare className="w-4 h-4" />,
      description: t("dashboard.participantStats.badges.doubleText.description"),
    },
  ];

  const handleDownload = async () => {
    const node = document.getElementById("export-poster");
    if (!node) return;

    setIsGenerating(true);
    try {
      // Small delay to ensure everything is rendered
      await new Promise((r) => setTimeout(r, 500));

      const dataUrl = await toPng(node, {
        cacheBust: true,
        width: 1080,
        height: platform === "stories" ? 1920 : 1080,
        pixelRatio: 2, // Better quality
      });

      const link = document.createElement("a");
      link.download = `chat-card-${insightId}-${platform}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      setIsDone(true);
      setTimeout(() => {
        setIsDone(false);
        setIsGenerating(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to generate image", err);
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-base-300/80 backdrop-blur-xl transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-6xl bg-base-100 border border-base-200 shadow-2xl rounded-[3rem] overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300 h-[85vh]">
        {/* Left: Preview Area */}
        <div className="md:w-7/12 bg-base-200/50 p-6 flex flex-col items-center justify-center relative min-h-[500px] overflow-hidden">
          <div className="text-xs font-bold opacity-30 uppercase tracking-[0.2em] mb-4">
            {t("dashboard.shareModal.preview.label")}
          </div>

          <div
            className="relative shadow-2xl transition-all duration-300 origin-center"
            style={{ transform: platform === "stories" ? "scale(0.25)" : "scale(0.35)" }}
          >
            {/* The actual poster that will be captured */}
            <div
              id="export-poster-container"
              className="rounded-[40px] overflow-hidden shadow-[0_0_50px_-12px_rgba(0,0,0,0.25)]"
            >
              <ExportPoster
                type={activeTab === "summary" ? "leaderboard" : "persona"}
                platform={platform}
                insightId={insightId}
                data={data}
              />
            </div>
          </div>

          <p className="text-[10px] opacity-40 absolute bottom-6 text-center px-12">
            {t("dashboard.shareModal.preview.disclaimer", {
              resolution: platform === "stories" ? "1080x1920" : "1080x1080",
            })}
          </p>
        </div>

        {/* Right: Controls */}
        <div className="md:w-5/12 p-8 flex flex-col relative bg-base-100">
          <button onClick={onClose} className="absolute top-8 right-8 btn btn-ghost btn-circle btn-sm z-10">
            <X className="w-5 h-5" />
          </button>

          <div className="mb-6">
            <h2 className="text-3xl font-black tracking-tight mb-1">{t("dashboard.shareModal.title")}</h2>
            <p className="opacity-50 text-sm">{t("dashboard.shareModal.subtitle")}</p>
          </div>

          {/* Type Toggle */}
          <div className="flex p-1 bg-base-200/50 rounded-2xl mb-6 border border-base-200">
            <button
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                activeTab === "persona"
                  ? "bg-base-100 shadow-sm text-base-content border border-base-200"
                  : "text-base-content/50 hover:text-base-content hover:bg-base-200/50"
              }`}
              onClick={() => setActiveTab("persona")}
            >
              {t("dashboard.shareModal.tabs.personas")}
            </button>
            <button
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                activeTab === "summary"
                  ? "bg-base-100 shadow-sm text-base-content border border-base-200"
                  : "text-base-content/50 hover:text-base-content hover:bg-base-200/50"
              }`}
              onClick={() => setActiveTab("summary")}
            >
              {t("dashboard.shareModal.tabs.summary")}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-6">
            {activeTab === "persona" && (
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider opacity-60">
                  {t("dashboard.shareModal.selection")}
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {personas.map((persona) => (
                    <button
                      key={persona.id}
                      onClick={() => setInsightId(persona.id)}
                      className={`group relative flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                        insightId === persona.id
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-base-200 hover:border-base-300 bg-base-50"
                      }`}
                    >
                      <div
                        className={`p-3 rounded-xl transition-colors ${insightId === persona.id ? "bg-primary text-primary-content" : "bg-base-200 group-hover:bg-base-300"}`}
                      >
                        {persona.icon}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{persona.label}</div>
                        <div className="text-xs opacity-60">{persona.description}</div>
                      </div>
                      {insightId === persona.id && (
                        <div className="absolute right-4 text-primary">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "summary" && (
              <div className="text-center py-10 opacity-60 bg-base-200/50 rounded-3xl border border-dashed border-base-300">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-bold">{t("dashboard.shareModal.summaryView.title")}</p>
                <p className="text-sm">{t("dashboard.shareModal.summaryView.description")}</p>
              </div>
            )}

            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider opacity-60">
                {t("dashboard.shareModal.format.label")}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPlatform("stories")}
                  className={`btn h-auto py-4 flex flex-col gap-2 rounded-2xl border-2 ${
                    platform === "stories"
                      ? "btn-active border-primary bg-primary/5"
                      : "btn-ghost border-base-200 bg-base-50"
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  <span className="text-xs font-bold">{t("dashboard.shareModal.format.story")}</span>
                </button>
                <button
                  onClick={() => setPlatform("feed")}
                  className={`btn h-auto py-4 flex flex-col gap-2 rounded-2xl border-2 ${
                    platform === "feed"
                      ? "btn-active border-primary bg-primary/5"
                      : "btn-ghost border-base-200 bg-base-50"
                  }`}
                >
                  <Layout className="w-5 h-5" />
                  <span className="text-xs font-bold">{t("dashboard.shareModal.format.square")}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-base-200">
            <button
              onClick={handleDownload}
              disabled={isGenerating || isDone}
              className={`btn btn-primary btn-lg w-full rounded-2xl gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all ${
                isDone ? "btn-success" : ""
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t("dashboard.shareModal.actions.generating")}
                </>
              ) : isDone ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  {t("dashboard.shareModal.actions.saved")}
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  {t("dashboard.shareModal.actions.download")}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
