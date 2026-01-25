import { db } from "./db";
import { sessionize, inferReplyEdges } from "./analysis";
import { ExportConfig } from "../types";

/**
 * Re-runs the analysis pipeline (sessionization, reply inference) for a given import.
 * To be called when the configuration (e.g., session gap threshold) changes.
 *
 * This operation involves:
 * 1. Fetching all messages for the import.
 * 2. Deleting existing derived data (Sessions, ReplyEdges).
 * 3. Re-calculating Sessions and ReplyEdges using the new config.
 * 4. Saving the new data to the DB.
 */
export const recomputeImportAnalysis = async (importId: number) => {
  // 1. Fetch necessary data
  const [importRecord, messages] = await Promise.all([
    db.imports.get(importId),
    db.messages.where("importId").equals(importId).sortBy("ts"),
  ]);

  if (!importRecord || !messages || messages.length === 0) {
    return;
  }

  const config: ExportConfig = importRecord.configJson ? JSON.parse(importRecord.configJson) : ({} as ExportConfig); // Should fallback to default if empty, but analysis functions handle it or we assume valid config

  // 2. Clear existing derived data
  // We use a transaction to ensure atomicity if possible, or just sequential awaits
  // Dexie transactions are better for consistency.
  await db.transaction("rw", [db.sessions, db.replyEdges], async () => {
    await db.sessions.where("importId").equals(importId).delete();
    await db.replyEdges.where("importId").equals(importId).delete();
  });

  // 3. Re-compute
  // Note: These functions are synchronous CPU bound.
  // For very large datasets, this might freeze UI. In that case, we'd need Web Workers.
  // For MVP (<50k msgs), it should be tolerable (hundreds of ms).
  const newSessions = sessionize(messages, config);
  const newEdges = inferReplyEdges(messages, config);

  // 4. Save new data
  await db.transaction("rw", [db.sessions, db.replyEdges], async () => {
    if (newSessions.length > 0) {
      await db.sessions.bulkAdd(newSessions);
    }
    if (newEdges.length > 0) {
      await db.replyEdges.bulkAdd(newEdges);
    }
  });

  console.log(
    `Re-computation complete for import ${importId}. ` + `Sessions: ${newSessions.length}, Edges: ${newEdges.length}`,
  );
};
