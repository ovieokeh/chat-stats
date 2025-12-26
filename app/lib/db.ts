import Dexie, { type EntityTable } from "dexie";
import type { Import, Participant, Message, Session, ReplyEdge, DerivedMetric } from "../types";

const DB_NAME = "ChatAnalyzerDB";

export type ChatDatabase = Dexie & {
  imports: EntityTable<Import, "id">;
  participants: EntityTable<Participant, "id">;
  messages: EntityTable<Message, "id">;
  sessions: EntityTable<Session, "id">;
  replyEdges: EntityTable<ReplyEdge, "id">;
  derivedMetrics: EntityTable<DerivedMetric, "id">;
  stopwords: EntityTable<{ id: number; word: string }, "id">;
};

export const db = new Dexie(DB_NAME) as ChatDatabase;

db.version(1).stores({
  imports: "++id, filename, importedAt, hash",
  participants: "++id, importId, rawName",
  messages: "++id, importId, ts, senderId, [importId+senderId+ts], [importId+ts]",
  sessions: "++id, importId, startTs, [importId+startTs]",
  replyEdges: "++id, importId, deltaSeconds, [importId+fromSenderId+toSenderId]",
  derivedMetrics: "++id, importId, metricKey",
  stopwords: "++id, &word",
});

// Helper to reset/clear db for a specific import or totally
export const clearDatabase = async () => {
  await db.delete();
  await db.open();
};
