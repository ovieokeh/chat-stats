import { Message, MessageType, ExportConfig } from "../types";
import { parse, isValid } from "date-fns";

// Helper to remove bidi chars
const cleanText = (text: string): string => {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "");
};

const SYSTEM_SENDER = "System";

export interface ParseResult {
  messages: Partial<Message>[];
  participants: Set<string>;
}

export const parseChat = (fileContent: string, config: ExportConfig): ParseResult => {
  const lines = fileContent.split("\n");
  const messages: Partial<Message>[] = [];
  const participants = new Set<string>();

  // Regex bits
  // Date: DD/MM/YYYY or MM/DD/YYYY based on config, but mostly just look for digits/slashes
  // Config mentions default: [13/01/2024, 16:02:15] Vera: ...
  // Regex to match header: ^\[(\d{1,2}\/\d{1,2}\/\d{2,4}), (\d{2}:\d{2}:\d{2})\] (.*)$
  // Group 1: Date, Group 2: Time, Group 3: Rest (Sender: Message OR System Message)

  const headerRegex = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}), (\d{2}:\d{2}:\d{2})\] (.*)$/;

  let currentMessage: Partial<Message> | null = null;

  for (const line of lines) {
    const cleanLine = cleanText(line.trim());
    if (!cleanLine) continue;

    const match = cleanLine.match(headerRegex);

    if (match) {
      // New message started
      if (currentMessage) {
        messages.push(currentMessage);
      }

      const dateStr = match[1];
      const timeStr = match[2];
      const contentRest = match[3];

      // Parse Date
      // We need to know format from config. defaulting to dd/MM/yyyy
      const dateTimeStr = `${dateStr} ${timeStr}`;
      let ts: number = 0;

      // Try parsing based on config format
      // Note: date-fns parse takes format string
      // mapped format: DD/MM/YYYY -> dd/MM/yyyy
      const formatStr = config.parsing.dateFormat === "DD/MM/YYYY" ? "dd/MM/yyyy HH:mm:ss" : "MM/dd/yyyy HH:mm:ss";

      const parsedDate = parse(dateTimeStr, formatStr, new Date());
      if (isValid(parsedDate)) {
        ts = parsedDate.getTime();
      } else {
        // Fallback or error? For now fallback to current time or skip?
        // Better to skip invalid dates or log error.
        // Let's try flexible parsing if strict mode is off?
        // simple Date.parse might work if we reformat to ISO
        ts = Date.now(); // Placeholder fallback
      }

      // Check for Sender
      // contentRest is "Sender: Message" OR "System Message"
      // Naive split by ": "
      // WhatsApp names can contain colons? Rare but possible.
      // Usually the first ": " separates sender.

      let rawName = SYSTEM_SENDER;
      let rawText = contentRest;
      let type: MessageType = "system";

      const colonIndex = contentRest.indexOf(": ");
      if (colonIndex !== -1) {
        // It *might* be a sender.
        // Heuristics: System messages often don't have ": " unless it's templates like "security code: changed"
        // But the spec says: "lines with no Sender: ... become type = system"

        const possibleName = contentRest.substring(0, colonIndex);
        const possibleMsg = contentRest.substring(colonIndex + 2);

        // Exclude common system patterns if they look like senders?
        // For now assume if it has ": " it's a user message unless verified otherwise.
        rawName = possibleName;
        rawText = possibleMsg;
        type = "text";
        participants.add(rawName);
      } else {
        // No colon -> System message (e.g. "Messages to this chat and calls are now secured...")
        type = "system";
        rawName = SYSTEM_SENDER; // Or leave undefined
        rawText = contentRest;
      }

      // Check for media placeholders
      if (rawText.includes("image omitted")) type = "media_placeholder";
      if (rawText.includes("video omitted")) type = "media_placeholder";
      if (rawText.includes("sticker omitted")) type = "media_placeholder";
      if (rawText.includes("audio omitted")) type = "media_placeholder";
      // deleted
      if (rawText.includes("This message was deleted")) type = "deleted";

      currentMessage = {
        importId: 0, // Set later
        ts,
        // senderId resolved later
        type, // logic to refine type later
        rawText,
        textClean: rawText.toLowerCase(), // Simple normalization for now
        charCount: rawText.length,
        wordCount: rawText.split(/\s+/).length,
        // Other stats computed in analysis
      };

      // Store temp sender name for ID resolution
      (currentMessage as any)._tempSenderName = rawName === SYSTEM_SENDER ? null : rawName;
    } else {
      // Multiline message append
      if (currentMessage) {
        currentMessage.rawText += "\n" + cleanLine;
        currentMessage.textClean += "\n" + cleanLine.toLowerCase();
        currentMessage.charCount = currentMessage.rawText.length;
        currentMessage.wordCount = currentMessage.rawText.split(/\s+/).length;
      }
    }
  }

  if (currentMessage) {
    messages.push(currentMessage);
  }

  return { messages, participants };
};
