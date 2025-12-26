"use client";

import React from "react";
import { FileImporter } from "./components/FileImporter";
import { db } from "./lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { format } from "date-fns";
import { MessageSquare } from "lucide-react";

export default function Home() {
  const imports = useLiveQuery(() => db.imports.orderBy("importedAt").reverse().toArray());

  return (
    <main className="min-h-screen bg-base-200/50">
      <div className="max-w-4xl mx-auto px-4 py-16 space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">WhatsApp Insights</h1>
          <p className="text-lg text-base-content/70 max-w-lg mx-auto">
            Analyze your chat history locally. Your data never leaves your device.
          </p>
        </div>

        <FileImporter />

        {imports && imports.length > 0 && (
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
        )}
      </div>
    </main>
  );
}
