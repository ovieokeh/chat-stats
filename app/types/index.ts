export type ParticipantId = string;
export type MessageId = number;
export type ImportId = number;
export type SessionId = number;

export interface Import {
  id?: ImportId;
  filename: string;
  importedAt: number;
  hash: string;
  timezone: string;
  localeDateFormat: string; // e.g. "DD/MM/YYYY"
  configJson: string; // JSON string of ExportConfig
}

export interface Participant {
  id?: number;
  importId: ImportId;
  rawName: string;
  displayName: string;
  colorHint?: string;
  isSystem: boolean;
}

export type MessageType =
  | "text"
  | "system"
  | "media_placeholder"
  | "deleted"
  | "call"
  | "location"
  | "contact"
  | "link_only"
  | "unknown";

export interface Message {
  id?: MessageId;
  importId: ImportId;
  ts: number; // epoch ms
  senderId?: number; // null/undefined if system
  type: MessageType;
  rawText: string;
  textClean: string;
  charCount: number;
  wordCount: number;
  emojiCount: number;
  hasQuestion: boolean;
  hasUrl: boolean;
  language?: string;
  sentiment?: number;
  tokensJson?: string;
}

export interface Session {
  id?: SessionId;
  importId: ImportId;
  startTs: number;
  endTs: number;
  gapThresholdMinutes: number;
  messageCount: number;
  participantsJson: string; // JSON array of participant IDs
  dominantType: MessageType;
}

export interface ReplyEdge {
  id?: number;
  importId: ImportId;
  fromSenderId: number;
  toSenderId: number;
  fromMessageId: number;
  toMessageId: number;
  deltaSeconds: number;
  sameSession: boolean;
}

export interface DerivedMetric {
  id?: number;
  importId: ImportId;
  metricKey: string;
  metricJson: string;
  computedAt: number;
}

// Configuration Types

export interface Lexicon {
  [category: string]: {
    words: string[];
    weight?: number;
  };
}

export interface ExportConfig {
  parsing: {
    dateFormat: string; // "DD/MM/YYYY" or "MM/DD/YYYY"
    timezone: string;
    strictMode: boolean;
  };
  session: {
    gapThresholdMinutes: number;
    replyWindowMinutes: number;
  };
  textProcessing: {
    minMessageLength: number;
    stopwords: string[];
  };
  privacy: {
    redactionMode: boolean;
    hashNames: boolean;
  };
}

export const DEFAULT_CONFIG: ExportConfig = {
  parsing: {
    dateFormat: "DD/MM/YYYY",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    strictMode: false,
  },
  session: {
    gapThresholdMinutes: 90,
    replyWindowMinutes: 240,
  },
  textProcessing: {
    minMessageLength: 3,
    stopwords: [],
  },
  privacy: {
    redactionMode: false,
    hashNames: false,
  },
};
