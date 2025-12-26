"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../lib/db"; // Adjust path: app/imports/[id]/moments/[momentId]/page.tsx -> ../../../../lib/db
import { findInterestingMoments } from "../../../../lib/analysis";
import { DEFAULT_CONFIG } from "../../../../types";
import { ArrowLeft, Calendar, Share2 } from "lucide-react";
import { ChatViewer } from "../../../../components/Dashboard/ChatViewer";
import { MomentCard } from "../../../../components/UI/MomentCard";
import Link from "next/link";
import { format } from "date-fns";

export default function MomentDetailsPage() {
  const params = useParams();
  const importId = parseInt(Array.isArray(params.id) ? params.id[0] : params.id);
  const momentId = Array.isArray(params.momentId) ? params.momentId[0] : params.momentId;
  const router = useRouter();

  const data = useLiveQuery(async () => {
    if (!importId) return null;
    const [messages, sessions, importRecord] = await Promise.all([
      db.messages.where("importId").equals(importId).toArray(),
      db.sessions.where("importId").equals(importId).toArray(),
      db.imports.get(importId),
    ]);

    if (!messages || !sessions || !importRecord) return null;

    const config = importRecord.configJson ? JSON.parse(importRecord.configJson) : DEFAULT_CONFIG;
    const moments = findInterestingMoments(messages, sessions, config);
    const moment = moments.find((m) => m.id === momentId);

    return { moment, importRecord };
  }, [importId, momentId]);

  if (!data) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const { moment, importRecord } = data;

  if (!moment) {
    return (
      <div className="p-8 text-center max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Moment Not Found</h1>
        <p className="mb-4">It seems this moment ID is invalid or the data has changed.</p>
        <Link href={`/imports/${importId}`} className="btn btn-primary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8 pb-32 h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 shrink-0">
        <button onClick={() => router.back()} className="btn btn-circle btn-ghost" title="Go Back">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <div className="flex items-center gap-2 text-sm text-base-content/60">
            <span>{importRecord.filename}</span>
            <span>•</span>
            <span>Moments</span>
          </div>
          <h1 className="text-2xl font-bold">{moment.title}</h1>
        </div>
        <div className="ml-auto">
          {/* Placeholder for Share/Export */}
          <button className="btn btn-ghost btn-circle" title="Share Moment (Coming Soon)">
            <Share2 className="w-5 h-5 opacity-50" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Sidebar: Moment Card + Context */}
        <div className="space-y-6 lg:col-span-1 overflow-y-auto pr-2">
          <MomentCard moment={moment} className="shadow-lg border-primary/20" />

          <div className="card bg-base-100 border border-base-300/60 p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Context
            </h3>
            <div className="text-sm space-y-4 text-base-content/80">
              <p>
                This event occurred on <strong>{format(moment.ts, "EEEE, MMMM d")}</strong>.
              </p>
              {moment.data?.startTs && moment.data?.endTs && (
                <p>
                  Time: <strong>{format(moment.data.startTs, "HH:mm")}</strong> -{" "}
                  <strong>{format(moment.data.endTs, "HH:mm")}</strong>
                </p>
              )}
              <p>
                Type: <span className="badge badge-outline">{moment.type}</span>
              </p>
              <p className="text-xs opacity-50">Moment ID: {moment.id}</p>
            </div>
          </div>
        </div>

        {/* Main: Chat Wrapper focused on time */}
        <div className="lg:col-span-2 flex flex-col min-h-0 bg-base-100 rounded-2xl border border-base-300/60 shadow-xl overflow-hidden">
          <div className="p-4 border-b border-base-300/60 bg-base-100 z-10">
            <h3 className="font-semibold text-sm uppercase tracking-wide opacity-70">Conversation History</h3>
          </div>
          <div className="flex-1 min-h-0 relative">
            {/* Reuse ChatViewer but pass initial timestamp */}
            <div className="absolute inset-0">
              {/* ChatViewer has its own card styling which we might want to override or just nest. 
                           The ChatViewer creates a fixed height card. simpler to just let it render. 
                           actually ChatViewer has "h-[600px]". We might want to make it flexible.
                           For now, let it be.
                       */}
              <ChatViewer
                importId={importId}
                initialScrollToTimestamp={moment.ts}
                timeRange={
                  moment.data?.startTs && moment.data?.endTs
                    ? { startTs: moment.data.startTs, endTs: moment.data.endTs }
                    : undefined
                }
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
