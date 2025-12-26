# WhatsApp Chat Insights Dashboard

System Spec (Next.js 16 + Tailwind + daisyUI, optional IndexedDB). No third-party LLMs. Private/offline-first.

## 1. Goal

Turn a WhatsApp `.txt` chat export into a local, explorable dashboard that surfaces **high-value behavioral + conversational insights** about participants and how the conversation evolves over time—without sending data anywhere.

### Success criteria

- Import a `.txt` export and get a dashboard in < 30 seconds for typical chats.
- Insights are **configurable**, reproducible, and explainable (no “mystery score”).
- Works fully offline; no external API calls required.

## 2. Non-goals

- Not trying to “psychoanalyze” participants or claim ground-truth relationship facts.
- No cloud sync, no multi-device collaboration (can be added later).
- No image/audio content analysis beyond placeholders/metadata (unless user provides files separately).

---

## 3. Tech constraints & choices

### Stack

- Next.js 16 (App Router)
- Tailwind + daisyUI
- Local-only processing (ui to import .txt file, overwrite existing data on every import)

### Local persistence (optional but recommended)

- IndexedDB
- Use FTS5 for message search if available.

### Suggested local libraries (all offline)

- Parsing: `date-fns`, `zod`
- Tokenization/NLP (classic): `natural` OR `wink-nlp`
- Language detection: `franc` (fast + offline)
- Sentiment (lexicon-based): `vader-sentiment` and/or `sentiment`
- Emoji detection: `emoji-regex`
- Topic modeling (offline): simple LDA/NMF via JS libs (or implement NMF with `ml-matrix`)
- Charts: Recharts (optional) or lightweight custom SVG

---

## 4. Data flow

1. **Upload** `.txt` export
2. **Parse** lines into normalized `Message` records (handles multi-line messages)
3. **Normalize/Clean**
   - strip unicode control chars (e.g., bidi marks)
   - classify message types (text/media/system/etc.)
4. **Store** (IndexedDB) OR keep in memory for small datasets
5. **Compute features**
   - per-message features
   - derived structures (sessions, reply edges)
6. **Aggregate metrics**
7. **Render dashboard + filters + exports**

---

## 5. Parsing spec

### Supported format (WhatsApp default export)

Example:
`[13/01/2024, 16:02:15] Vera: Soo sorry I'm running 10' late`

#### Key rules

- **Locale date**: default `DD/MM/YYYY, HH:mm:ss` (configurable).
- **Multi-line messages**: any line not matching header regex is appended to previous message.
- **System messages**: lines with no `Sender:` (or known templates) become `type = system`.
- **Media placeholders**: “image omitted”, “video omitted”, “sticker omitted”, etc. -> `type = media_placeholder`.
- **Deleted message tokens**: detect common strings (configurable) -> `type = deleted`.

#### Base header regex (configurable)

`^$begin:math:display$\(\\d\{1\,2\}\\\/\\d\{1\,2\}\\\/\\d\{2\,4\}\)\, \(\\d\{2\}\:\\d\{2\}\:\\d\{2\}\)$end:math:display$ ([^:]+): (.*)$`

#### Normalization

- Trim, normalize newlines to `\n`
- Remove bidi/control chars: `[\u200e\u200f\u202a-\u202e\u2066-\u2069]`
- Optional: lowercase copy for analysis fields

---

## 6. IndexedDB schema (recommended)

### Tables

#### `imports`

- `id` (pk)
- `filename`
- `imported_at`
- `hash` (sha256 of file)
- `timezone`
- `locale_date_format`
- `config_json` (frozen config used for this import)

#### `participants`

- `id` (pk)
- `import_id` (fk)
- `raw_name`
- `display_name`
- `color_hint` (optional)
- `is_system` (bool)

#### `messages`

- `id` (pk)
- `import_id` (fk)
- `ts` (integer epoch ms)
- `sender_id` (fk nullable if system)
- `type` (text | system | media_placeholder | deleted | call | location | contact | link_only | unknown)
- `raw_text`
- `text_clean`
- `char_count`
- `word_count`
- `emoji_count`
- `has_question` (bool)
- `has_url` (bool)
- `language` (optional)
- `sentiment` (optional numeric)
- `tokens_json` (optional cached)
- indexes: `(import_id, ts)`, `(import_id, sender_id, ts)`

#### `sessions`

- `id` (pk)
- `import_id` (fk)
- `start_ts`, `end_ts`
- `gap_threshold_minutes` (stored for reproducibility)
- `message_count`
- `participants_json`
- `dominant_type`
- indexes: `(import_id, start_ts)`

#### `reply_edges` (optional but high value)

Represents inferred “A replied to B”.

- `id` (pk)
- `import_id` (fk)
- `from_sender_id`
- `to_sender_id`
- `from_message_id`
- `to_message_id`
- `delta_seconds`
- `same_session` (bool)
- indexes: `(import_id, from_sender_id, to_sender_id)`, `(import_id, delta_seconds)`

#### `derived_metrics` (cache)

- `id` (pk)
- `import_id` (fk)
- `metric_key`
- `metric_json`
- `computed_at`

### Optional: FTS

- `messages_fts(text_clean, raw_text)` with `content=messages`

---

## 7. Analysis pipeline

### 7.1 Per-message features (computed once)

Track as many as possible:

- length: chars, words, lines
- punctuation: `!`, `?`, ellipses, ALL CAPS ratio
- emoji count + top emoji
- url detection + domain extraction
- media placeholder type inference (image/video/sticker/gif/audio)
- “burst candidates”: same timestamp or within N seconds
- language (franc) if enabled
- sentiment (vader) if enabled
- keyword flags (from configurable lexicons):
  - planning/logistics
  - affection/warmth
  - conflict/escalation
  - repair/apology
  - check-in/safety (“home”, “arrived”, etc.)
  - finance/work/stress keywords (optional packs)

### 7.2 Sessions

Sessionization by silence gap:

- default `gap_threshold_minutes = 90` (configurable)
- for each session:
  - duration
  - per-participant message share
  - “type mix” (text vs media)
  - response-time stats within session
  - topic distribution (if topic modeling enabled)
  - mood stats (if sentiment enabled)

### 7.3 Reply inference

Without reading “meaning”, infer replies using structure:

- A message by person X “replies to” the most recent message by a different sender within a window `reply_window_minutes` (configurable, default 240).
- For group chats (later), can infer reply graph by nearest previous message + mention heuristics.

### 7.4 Topic modeling (optional but powerful)

- Vectorize messages (TF-IDF, n-grams)
- Run NMF or LDA to extract `k` topics
- Compute topic prevalence over time (weekly/monthly)
- Provide interpretable topic labels by top terms (no LLM labels)
  Config:
- `topic_count (k)`
- `min_doc_length`
- `ngram_range`
- stopwords set (language-specific)

### 7.5 “Alignment / mirroring” metrics (high signal)

Track convergence over time:

- emoji mirroring: probability B uses emoji within N turns after A used emoji
- lexical alignment: overlap of top n-grams between participants per time window
- punctuation style alignment (e.g., exclamation usage)
- message-length alignment (do lengths converge?)

---

## 8. Metrics catalog (highest value insights)

All metrics should be filterable by:

- date range
- participant(s)
- message type
- session type
- time-of-day / day-of-week
- exclude media / include only text
- minimum message length

### 8.1 Volume & cadence

- messages/day, words/day, chars/day
- rolling averages (7d/30d)
- messages/day, words/day, chars/day (Calendar vs Active Day distinction)
- rolling averages (7d/30d)
- active days %, longest inactive streak, average gap
- initiation count (new session starter rate)
- “burstiness” (variance/mean of inter-message intervals)
- “yap index” (words per message ratio)

### 8.2 Response behavior

Using `reply_edges`:

- median/p90 reply time per participant (averages are misleading)
- fast reply rate (<2m, <10m, <60m)
- reciprocity index: abs(median_reply_A - median_reply_B)
- reply-time by hour-of-day (heatmap)
- late-night reply behavior (configurable “night hours”)
- “time spent waiting” (cumulative reply delta per person)

### 8.3 Turn-taking & conversation shape

- alternation rate (A-B-A-B vs streaks)
- streak length distribution (consecutive messages by same sender)
- “wall-of-text index”: % messages > N chars + consecutive long messages
- “drip-feed index”: average messages per turn before speaker switches
- question rate: questions/message, questions/day
- question resolution rate: % questions followed by response from other participant within N turns

### 8.4 Content & themes (classic NLP)

- top words/bigrams/trigrams (per participant and overall)
- distinctive vocabulary (TF-IDF difference between participants)
- keyword category frequency over time (planning/affection/conflict/repair/etc.)
- topics over time (if enabled)

### 8.5 Emotion proxies (lexicon-based)

- sentiment mean/median over time
- sentiment volatility (stddev) per week/month
- “repair after negative”: probability of repair keywords within N turns after negative sentiment spike
- “warmth markers” count (emoji hearts, “miss”, “love”, etc.)

### 8.6 Media behavior

- media placeholder count by type
- media burst size distribution
- who initiates media bursts
- media-to-text ratio over time
- “story dump rate”: bursts > N items within M minutes

### 8.7 Temporal rituals

Detect repeated patterns:

- good morning / good night routines
- “I’m home / arrived safe” check-ins
- weekend vs weekday differences
- seasonality: month-of-year shifts in volume/topics

### 8.8 Links & external references

- url frequency over time
- top shared domains
- domain categories (news/social/video) via simple mapping (configurable)
- “link-only” messages share

### 8.9 Language & code-switching (optional)

- language distribution per participant
- code-switch events per week
- language by topic/session type

### 8.10 Entities (optional, heuristic)

Without heavy NER:

- extract capitalized sequences + common name patterns
- track repeated “entities” (people/places) and their timelines
- configurable ignore list to avoid false positives

### 8.11 Anomalies & “interesting moments”

Local heuristic detection:

- volume spikes (z-score vs rolling baseline)
- sudden sentiment drops/spikes
- unusually long messages
- unusually long reply gaps
- sudden topic shift (topic distribution divergence)
  Output: an “Interesting Moments” feed with explainable triggers.

---

## 9. Dashboard UX (routes + components)

### Routes (App Router)

- `/` – Landing + import CTA
- `/imports` – List of imports (with configs + computed status)
- `/imports/[id]` – Overview dashboard
- `/imports/[id]/messages` – Searchable message explorer (FTS)
- `/imports/[id]/sessions` – Sessions list + session drilldown
- `/imports/[id]/participants` – Participant comparison
- `/imports/[id]/topics` – Topics & drift (if enabled)
- `/imports/[id]/moments` – Interesting moments feed
- `/imports/[id]/settings` – Config panel (recompute triggers)
- `/api/import` – upload/parse
- `/api/recompute` – recompute metrics with current config or import new .txt file

### Core dashboard cards (daisyUI)

**Overview**

- KPI row: total messages, total words, active days, median reply times, sessions count
- Timeline chart: messages/day (toggle words/day)
- Heatmap: hour-of-day × day-of-week (per participant switch)
- Reply time distribution: violin/histogram
- Session types: stacked bars (text vs media vs system)
- “Interesting moments” teaser list

**Participants compare**

- Side-by-side: volume share, reply stats, question rate, emoji rate, long-message rate
- Alignment charts (emoji mirroring, lexical alignment over time)

**Messages explorer**

- Filters: participant, date range, type, has_url, has_question, min_length
- Search: full-text + regex
- Thread context: show ±N messages around selection
- Export selected to CSV/JSON

**Sessions**

- Session list with tags: “logistics-heavy”, “media-burst”, “late-night”
- Drilldown: turn-taking chart + per-session reply times + keyword hits

---

## 10. Configuration options (make it feel powerful)

Expose configs in `/settings` with presets + “advanced”.

### Parsing

- date format: `DD/MM/YYYY` vs `MM/DD/YYYY`
- timezone (default local)
- sender normalization map (merge aliases)
- ignore system templates (editable patterns)
- media placeholder patterns (editable)
- deleted message patterns (editable)
- strict vs lenient parsing mode

### Session & reply logic

- `gap_threshold_minutes` (session break)
- `reply_window_minutes`
- whether to infer replies across session boundaries
- “night hours” definition for late-night metrics

### Text processing

- stopwords set (language packs)
- tokenize mode: simple / aggressive (strip emojis? keep?)
- min message length for NLP (default 3 words)
- include/exclude emojis in tokenization

### Lexicons (user-editable dictionaries)

Each is a list of words/phrases + optional weights:

- planning/logistics
- affection/warmth
- conflict/escalation
- repair/apology
- safety/check-in
- work/stress/finance (optional)
  Options:
- match mode: exact | stemming | contains
- case sensitivity
- phrase priority

### Sentiment (optional)

- enable/disable
- engine: VADER vs simple sentiment
- neutral threshold
- exclude very short messages from sentiment

### Topics (optional)

- enable/disable
- algorithm: LDA or NMF
- `k` topics
- n-gram range (1–2, 1–3)
- min docs per topic
- exclude media/system messages from training
- recompute scope: full vs last N months (speed)

### “Interesting moments”

- spike sensitivity (z-score threshold)
- reply-gap threshold minutes
- sentiment spike threshold
- long-message threshold chars
- topic shift threshold

### Privacy / safety

- “redaction mode” for screenshots/sharing:
  - hash participant names
  - hide message bodies, show only metrics
  - blur/replace profanity (optional)
- never store raw file unless user opts in

---

## 11. Export & sharing

- Export metrics summary JSON (for reproducibility)
- Export filtered messages to CSV/JSON
- Export charts as PNG/SVG
- “Report view” printable page:
  - overview + participants compare + notable moments

---

## 12. Performance & caching

- Compute pipeline stages with progress indicator:
  - parse -> normalize -> store -> features -> sessions -> reply edges -> aggregates -> (topics optional)
- Cache derived metrics keyed by `(import_id, config_hash)`
- For large chats:
  - compute per-month aggregates incrementally
  - lazy-load message explorer pages
  - topic modeling can run async server action, but still local

---

## 13. Testing & validation

- Golden test fixtures for:
  - multi-line messages
  - bidi/control chars in “image omitted”
  - system message templates
  - date parsing locale
  - empty lines and corrupted lines
- Property tests:
  - message order preserved
  - session boundaries monotonic
  - reply edges always point backward in time

---

## 14. MVP milestone (ship fast, high signal)

1. Import + parsing + normalization
2. IndexedDB storage + message explorer
3. Sessions + reply edges
4. Core overview dashboard:
   - timeline, heatmap, reply stats, session list
5. Config panel for session/reply thresholds + parsing
6. Interesting moments feed (volume + reply gaps)

## 15. Phase 2 (power-user)

- Topics & drift
- Lexicon editor + category timelines
- Alignment/mirroring metrics
- Redaction mode + report export
- Entity timelines (heuristic)

---

End of spec.
