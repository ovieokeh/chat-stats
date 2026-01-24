"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { parseChat } from "../lib/parser";
import { computeMessageFeatures, sessionize, inferReplyEdges } from "../lib/analysis";
import { db } from "../lib/db";
import { DEFAULT_CONFIG } from "../types";
import { useRouter } from "next/navigation";
import { sha256 } from "js-sha256";
import { useText } from "../hooks/useText";

export const FileImporter: React.FC = () => {
  const { t } = useText();
  const [status, setStatus] = useState<"idle" | "parsing" | "analyzing" | "saving" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0); // 0-100
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      try {
        setStatus("parsing");
        setProgress(10);

        const text = await file.text();

        // Generate hash
        const hash = sha256(text);

        // Check if already imported? (Optional, skipping for MVP)

        // Parse
        const { messages, participants: participantNames } = parseChat(text, DEFAULT_CONFIG);
        setProgress(40);

        if (messages.length === 0) {
          throw new Error(t("fileImporter.dropzone.error"));
        }

        setStatus("analyzing");

        // Create Import Record
        const importId = await db.imports.add({
          filename: file.name,
          importedAt: Date.now(),
          hash,
          timezone: DEFAULT_CONFIG.parsing.timezone,
          localeDateFormat: DEFAULT_CONFIG.parsing.dateFormat,
          configJson: JSON.stringify(DEFAULT_CONFIG),
        });

        // Resolve Participants
        const participantMap = new Map<string, number>();

        // Add participants to DB
        for (const name of participantNames) {
          const pId = await db.participants.add({
            importId,
            rawName: name,
            displayName: name,
            isSystem: false,
            colorHint: "", // Color logic later
          });
          participantMap.set(name, pId);
        }

        // Process Messages
        const finalMessages = messages.map((m) => {
          // Link sender
          const senderName = (m as any)._tempSenderName;
          if (senderName && participantMap.has(senderName)) {
            m.senderId = participantMap.get(senderName);
          }
          m.importId = importId;

          // Compute features
          computeMessageFeatures(m, DEFAULT_CONFIG);
          return m as any;
          // casting because computeMessageFeatures modifies in place and we need full Message type
          // but ID is missing, acceptable for add.
        });

        // Batch add messages?
        // Dexie bulkAdd is fast
        await db.messages.bulkAdd(finalMessages as any);
        setProgress(60);

        // Fetch back messages with IDs for session/reply logic?
        // Or just re-query. Re-query is safer.
        const storedMessages = await db.messages.where("importId").equals(importId).sortBy("ts");

        // Sessionize
        const sessions = sessionize(storedMessages, DEFAULT_CONFIG);
        await db.sessions.bulkAdd(sessions);
        setProgress(80);

        // Replies
        const edges = inferReplyEdges(storedMessages, DEFAULT_CONFIG);
        await db.replyEdges.bulkAdd(edges);

        setStatus("done");
        setProgress(100);

        // Redirect after short delay
        setTimeout(() => {
          router.push(`/imports/${importId}`);
        }, 1000);
      } catch (e: any) {
        console.error(e);
        setStatus("error");
        setErrorMsg(e.message || t("common.error"));
      }
    },
    [router],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "text/plain": [".txt"] },
    maxFiles: 1,
    noClick: true, // We will handle click manually via the root div or button to avoid conflicts
  });

  return (
    <div className="w-full max-w-xl mx-auto">
      {status === "idle" || status === "error" ? (
        <div
          {...getRootProps()}
          onClick={open} // Manual trigger for better control
          className={`
                        border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer
                        ${isDragActive ? "border-primary bg-primary/5" : "border-base-300 hover:border-primary/50"}
                        ${status === "error" ? "border-error/50 bg-error/5" : ""}
                    `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-base-200 rounded-full">
              <Upload className="w-8 h-8 text-base-content/60" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">{t("fileImporter.dropzone.idle")}</h3>
              <p className="text-base-content/60 text-sm mb-4">{t("fileImporter.dropzone.or")}</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  open();
                }}
              >
                {t("fileImporter.dropzone.browse")}
              </button>
              <p className="text-base-content/40 text-xs mt-4">{t("fileImporter.dropzone.hint")}</p>
            </div>
            {status === "error" && (
              <div className="flex items-center gap-2 text-error mt-4 bg-error/10 px-4 py-2 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card bg-base-100 border border-base-300/60 shadow-xl rounded-2xl p-8">
          <div className="flex flex-col items-center gap-6">
            {status === "done" ? (
              <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center animate-in zoom-in">
                <CheckCircle className="w-8 h-8" />
              </div>
            ) : (
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            )}

            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold capitalize">{t(`fileImporter.status.${status}`)}</h3>
              <progress className="progress progress-primary w-64" value={progress} max="100"></progress>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
