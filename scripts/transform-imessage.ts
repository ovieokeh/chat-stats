import fs from "fs";
import path from "path";

const inputFile = path.join(process.cwd(), "imessage.txt");
const outputFile = path.join(process.cwd(), "imessage_transformed.txt");

if (!fs.existsSync(inputFile)) {
  console.error(`Input file not found: ${inputFile}`);
  process.exit(1);
}

const content = fs.readFileSync(inputFile, "utf-8");
const lines = content.split(/\r?\n/);

// Strict Regex:
// 1. Must start at index 0 (no leading whitespace) -> Skips indented reply blocks.
// 2. Matches Date Format.
// 3. Allows optional "(Read by you...)" metadata.
// 4. Must Enforce End of Line (possibly with trailing whitespace) -> Skips lines where date is followed by content.
const datePart = "[A-Za-z]{3} \\d{1,2}, \\d{4}\\s+\\d{1,2}:\\d{2}:\\d{2} [AP]M";
const metaPart = "(\\s*\\(Read by you.*\\))?";
const strictDateRegex = new RegExp(`^${datePart}${metaPart}\\s*$`);

// Regex to detect indented blocks (Context/Thread lines) which we want to skip entirely
const indentedDateRegex = new RegExp(`^\\s+${datePart}`);

const monthMap: Record<string, string> = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

function formatTimestamp(rawDate: string): string {
  // Extract just the date part for formatting, ignoring "Read by you..."
  const match = rawDate.match(/([A-Za-z]{3}) (\d{1,2}), (\d{4})\s+(\d{1,2}):(\d{2}):(\d{2}) ([AP]M)/);
  if (!match) return rawDate;

  const [, monthStr, dayStr, year, hourStr, min, sec, ampm] = match;
  const month = monthMap[monthStr];
  const day = dayStr.padStart(2, "0");

  let hour = parseInt(hourStr, 10);
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  const formattedHour = hour.toString().padStart(2, "0");

  return `[${day}/${month}/${year}, ${formattedHour}:${min}:${sec}]`;
}

const transformedLines: string[] = [];
let i = 0;

while (i < lines.length) {
  const line = lines[i];

  // 1. Check for INDENTED context block - SKIP these
  if (indentedDateRegex.test(line)) {
    // Skip this line and potentially subsequent lines of this block?
    // Indented blocks usually: IndentedDate -> IndentedSender? -> IndentedMessage -> EmptyLine
    // Or just IndentedDate -> ... -> EmptyLine
    // Actually, we can just skip this INDIVIDUAL line if it's a date line.
    // What about content lines of the indented block?
    // If we just continue, the loop for content collection won't run.
    // So 'i' increments.
    // The next line (Sender/Content of indented block) will be processed in next iteration.
    // If it's just text, it falls through?
    // Wait, if it falls through, it enters the outer look.
    // Does it match date regex? No.
    // So nothing happens? Correct. The code only does something if `strictDateRegex.test(line)` is true.
    // Text lines that are NOT headers are ignored by the outer loop!
    // So simply skipping the header is enough?
    // Yes! Because `messageContent` accumulation describes specific blocks.
    // If we are NOT in a block (no strictDateRegex match), we just increment 'i'.
    // So random text lines (from indented blocks) are dropped.
    // This is exactly what we want.
    i++;
    continue;
  }

  // 2. Check for VALID message block start
  if (strictDateRegex.test(line)) {
    const timestamp = formatTimestamp(line.trim());

    // The next non-empty line is usually the sender
    let j = i + 1;
    while (j < lines.length && lines[j].trim() === "") {
      j++;
    }

    if (j < lines.length) {
      if (strictDateRegex.test(lines[j]) || indentedDateRegex.test(lines[j])) {
        // Next line is another date (or indented date), so this block has NO sender/content?
        // This happens for system messages sometimes?
        // Or if 'j' skipped to next block.
        // If lines[j] is a date, we stop this block.
        // But we haven't found sender yet.
        // Effectively empty message.
        // We should probably just process it next iteration.
        i = j;
        continue;
      }

      const sender = lines[j].trim();
      const messageContent: string[] = [];

      // Now collect content until the next VALID date match or INDENTED date or end of file
      let k = j + 1;
      while (k < lines.length) {
        if (strictDateRegex.test(lines[k]) || indentedDateRegex.test(lines[k])) {
          // Found the next message block (valid or context)
          break;
        }

        const contentLine = lines[k];
        const trimmedContentValue = contentLine.trim();

        if (trimmedContentValue !== "") {
          const skipPatterns = [
            /^This message responded to an earlier message\.$/,
            /^Tapbacks:$/,
            /^Liked by .*/,
            /^Loved by .*/,
            /^Disliked by .*/,
            /^Questioned by .*/,
            /^Emphasized by .*/,
            /^Laughed at by .*/,
            /^Edited$/, // Just "Edited"
          ];

          const shouldSkip = skipPatterns.some((p) => p.test(trimmedContentValue));

          if (!shouldSkip) {
            // Check if the line looks like "Date ... Content" (The Edit case)
            // If so, strip the date prefix?
            // Date format: Starts with Month Name.
            // We can check if it strictly matches a 'loose' date start?
            // Loose date regex: `^[A-Za-z]{3} \d{1,2}, \d{4}`
            const datePrefixMatch = contentLine.match(
              /^([A-Za-z]{3} \d{1,2}, \d{4}\s+\d{1,2}:\d{2}:\d{2} [AP]M)\s+(.*)/,
            );
            if (datePrefixMatch) {
              // It's a line like "Jul 07... What do you mean..."
              // Keep only the content part
              messageContent.push(datePrefixMatch[2].trim());
            } else {
              messageContent.push(trimmedContentValue);
            }
          }
        }
        k++;
      }

      if (messageContent.length > 0) {
        transformedLines.push(`${timestamp} ${sender}: ${messageContent[0]}`);
        for (let m = 1; m < messageContent.length; m++) {
          transformedLines.push(messageContent[m]);
        }
      }

      // Advance i to k-1
      i = k - 1;
    }
  }
  i++;
}

const result = transformedLines.join("\n");
fs.writeFileSync(outputFile, result, "utf-8");

console.log(`Transformation complete. ${transformedLines.length} lines written to ${outputFile}`);
