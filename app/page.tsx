"use client";

import React from "react";
import { FileImporter } from "./components/FileImporter";
import { db } from "./lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { format } from "date-fns";
import { MessageSquare } from "lucide-react";
import { PageLayout } from "./components/Layout/PageLayout";
import { Skeleton } from "./components/UI/Skeleton";

export default function Home() {
  const imports = useLiveQuery(() => db.imports.orderBy("importedAt").reverse().toArray());

  return (
    <PageLayout maxWidth="4xl">
      <div className="space-y-12 py-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">WhatsApp Insights</h1>
          <p className="text-lg text-base-content/70 max-w-lg mx-auto">
            Analyze your chat history locally. Your data never leaves your device.
          </p>
        </div>

        <FileImporter />

        {!imports ? (
          <div className="space-y-4">
            <Skeleton className="h-7 w-32 mb-4 ml-2" />
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card bg-base-100 border border-base-300 h-24 p-4">
                  <div className="flex items-center gap-4 h-full">
                    <Skeleton variant="rectangular" className="h-12 w-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : imports.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold ml-2 opacity-80">Recent Imports</h2>
            <div className="grid gap-4">
              {imports.map((imp) => (
                <Link key={imp.id} href={`/imports/${imp.id}`}>
                  <div className="card bg-base-100 hover:shadow-lg transition-all border border-base-300">
                    <div className="card-body flex-row items-center gap-4">
                      <div className="p-3 bg-primary/10 text-primary rounded-xl">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{imp.filename}</h3>
                        <p className="text-sm opacity-60">{format(imp.importedAt, "MMM d, yyyy • HH:mm")}</p>
                      </div>
                      <button className="btn btn-ghost btn-sm">View Dashboard</button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="pt-12 pb-8 flex justify-center border-t border-base-300/30">
          <button
            className="text-xs font-semibold opacity-30 hover:opacity-100 hover:text-error transition-all uppercase tracking-widest p-2"
            onClick={async () => {
              if (confirm("Reset everything? All your imported data will be wiped.")) {
                const { clearDatabase } = await import("./lib/db");
                await clearDatabase();
                window.location.reload();
              }
            }}
          >
            Clear Application Data
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
