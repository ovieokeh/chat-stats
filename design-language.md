# design-language.md

Visual system + component language for a WhatsApp Chat Insights Dashboard  
Optimized for **Tailwind CSS + daisyUI** and **social-media-friendly visuals** (TikTok/IG Reels thumbnails, screen recordings, shareable cards).

---

## 0) Design goals

1. **Instantly legible**: numbers and trends readable at a glance on mobile.
2. **Shareable**: every insight can render as a “card” that looks good in a vertical video crop.
3. **Low-noise**: minimal chrome, high contrast, generous spacing.
4. **Explainable**: every chart/card includes a one-line “why this matters”.
5. **Consistent**: all spacing, radius, typography, and color tokens come from a small set.

---

## 1) Overall aesthetic

**“Data-gloss”**: clean surfaces, soft shadows, sharp type, playful accents.

- Backgrounds: deep neutral or subtle gradient
- Cards: elevated, slightly glossy, crisp borders
- Accents: neon-ish but controlled (use theme tokens; avoid rainbow chaos)
- Motion: micro-animations only (hover, focus, subtle enter)

---

## 2) DaisyUI theme strategy

Use daisyUI themes + allow user switching. Provide at least 3 curated presets:

### Theme presets

1. **Midnight Studio** (default)
   - background: near-black
   - card surface: dark slate
   - accent: electric cyan / violet
2. **Paper Lab**
   - background: warm off-white
   - card: white
   - accent: deep blue / emerald
3. **Candy Neon**
   - background: very dark
   - card: dark
   - accent: hot pink / lime (sparingly)

Implementation:

- Use daisyUI `data-theme` on `html`.
- Keep custom colors minimal; rely on `bg-base-*`, `text-base-content`, `primary`, `secondary`, `accent`.

---

## 3) Layout system

### Viewport-first

- Primary layout is **12-col grid** on desktop, **single-column** on mobile.
- **Vertical video mode**: dedicated “Share Card” view that renders in 9:16.

### Page container

- `max-w-6xl mx-auto px-4 md:px-6`
- Section spacing: `space-y-6 md:space-y-8`

### Grid patterns

- KPI row: `grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4`
- Main dashboard: `grid grid-cols-1 lg:grid-cols-12 gap-4`
  - Main: `lg:col-span-8`
  - Side: `lg:col-span-4`

---

## 4) Spacing & radii tokens (hard rules)

### Spacing

- Card padding:
  - small: `p-4`
  - default: `p-5 md:p-6`
- Card stack spacing: `gap-3 md:gap-4`
- Internal element spacing: `space-y-2` for dense; `space-y-3` for default

### Radius

- Standard card: `rounded-2xl`
- “Hero” share cards: `rounded-3xl`
- Chips/badges: `rounded-full`

### Borders & shadows

- Default border: `border border-base-300/60`
- Elevated: `shadow-lg shadow-black/10` (dark theme) or `shadow-xl shadow-black/5` (light)
- Glow accents (sparingly): `ring-1 ring-primary/20` + `shadow-[0_0_40px_-20px] shadow-primary/40`

---

## 5) Typography scale (TikTok-readable)

Use big numbers and short labels.

### Font choices

- Use system font stack (fast) or a clean variable font.
- Numbers: use `tabular-nums` for alignment.

### Scale

- Page title: `text-2xl md:text-3xl font-semibold tracking-tight`
- Section title: `text-lg md:text-xl font-semibold`
- KPI value: `text-3xl md:text-4xl font-semibold tabular-nums`
- KPI label: `text-xs md:text-sm text-base-content/70`
- Card headline: `text-base md:text-lg font-semibold`
- Body: `text-sm md:text-base text-base-content/80`
- Microcopy: `text-xs text-base-content/60`

**Rule**: Any card intended for social sharing must have:

- Value ≥ `text-4xl` on desktop
- Headline ≤ 6 words
- Subtitle ≤ 90 characters

---

## 6) Component library (design rules + Tailwind/daisyUI recipes)

### 6.1 Insight Card (primary share unit)

**Purpose**: one insight, one chart (optional), one punchline.

**Structure**

- Top: icon + label
- Middle: huge stat
- Bottom: delta + explanation
- Optional: micro sparkline

**Classes (baseline)**

- Container: `card bg-base-100 border border-base-300/60 rounded-3xl shadow-xl`
- Body: `card-body p-6 gap-4`
- Header row: `flex items-center justify-between`
- Stat: `text-4xl md:text-5xl font-semibold tabular-nums leading-none`
- Explanation: `text-sm text-base-content/70`

**Variants**

- `card--glow`: `ring-1 ring-primary/20 shadow-[0_0_50px_-25px] shadow-primary/50`
- `card--danger`: use `text-error` + `ring-error/20`
- `card--success`: use `text-success` + `ring-success/20`

**Example content guidance**

- Title: “Median reply time”
- Value: “3m 12s”
- Delta: “↓ 22% this month”
- Why: “Faster replies correlate with higher session continuity.”

---

### 6.2 KPI Tile (dense grid)

**Purpose**: quick metric scan

**Classes**

- `card bg-base-100 border border-base-300/60 rounded-2xl`
- `card-body p-4 md:p-5`
- Value: `text-2xl md:text-3xl font-semibold tabular-nums`
- Label: `text-xs md:text-sm text-base-content/60`

**Optional trend pill**

- `badge badge-sm badge-outline` + `text-success`/`text-error`

---

### 6.3 Chart Card

**Rules**

- Chart must fill width and have large axis labels.
- Avoid legends when possible; use inline labels.
- Always include a text “takeaway”.

**Classes**

- `card bg-base-100 border border-base-300/60 rounded-2xl`
- Header: `card-title text-base md:text-lg`
- Chart area: `h-48 md:h-64`
- Takeaway: `text-sm text-base-content/70`

---

### 6.4 “Moment” Card (feed item)

**Purpose**: highlight anomalies and interesting events.

**Visual**

- Left rail accent (gradient bar)
- Time + trigger reason + preview

**Classes**

- Container: `card bg-base-100 border border-base-300/60 rounded-2xl`
- Body: `card-body p-5`
- Rail: `before:content-[''] before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:rounded-l-2xl before:bg-primary/60`
- Title: `font-semibold`
- Meta: `text-xs text-base-content/60`

---

### 6.5 Filter Bar (powerful but clean)

**Rules**

- Filters should look like controls on a DJ deck: compact, tactile.
- Keep height consistent: `h-10`.

**Elements**

- Date range: `input input-bordered h-10`
- Participant multi-select: `select select-bordered h-10`
- Toggles: `toggle toggle-sm`
- Presets: `btn btn-sm btn-ghost`

---

### 6.6 Badge + Chip language

Use badges to encode meaning:

- `badge badge-outline` for neutral labels
- `badge badge-primary` for highlighted
- `badge badge-success/error/warning` for sentiment or anomalies

**Rule**: maximum 3 badges per card.

---

## 7) Color & semantic mapping (no arbitrary colors)

Use semantic tokens:

- Positive: `text-success` / `badge-success`
- Negative: `text-error` / `badge-error`
- Warning: `text-warning`
- Info: `text-info`
- Accent: `text-primary` or `text-secondary` (pick one per view)

### Participant colors

Do NOT assign random bright colors.

- Choose from a fixed palette of 8 theme-aligned colors.
- Ensure contrast against `bg-base-100`.
- Always show participant name next to color (never color alone).

---

## 8) Social / TikTok “Share Mode”

### Requirements

- 9:16 canvas export (1080×1920 default).
- High contrast, huge stat, minimal clutter.
- Include small watermark/app name in corner.
- No scroll required; one insight per screen.

### Share Card Layout

- Top: app + chat name (small)
- Middle: big stat + micro chart
- Bottom: “why it matters” + date range label

### Tailwind sizing

- Wrapper: `w-[1080px] h-[1920px] p-16 bg-base-200`
- Card: `rounded-[48px] p-12 shadow-2xl`
- Stat: `text-7xl font-semibold`

### Export

- Provide “Copy as image” (client-side canvas render) OR “Download PNG”.
- Allow toggles:
  - show/hide names (redaction)
  - show/hide message previews
  - theme selection for export

---

## 9) Motion & interaction

- Use daisyUI + Tailwind transitions only (no heavy animation libs required).
- Hover: `hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200`
- Focus: visible rings: `focus:outline-none focus:ring-2 focus:ring-primary/40`
- Loading states: skeletons (`skeleton h-... w-...`)

**Rule**: animations must never distract from reading numbers.

---

## 10) Iconography

- Use `lucide-react`
- Icon size:
  - cards: `w-5 h-5`
  - share cards: `w-7 h-7`
- Icons always accompany text labels (no icon-only semantics).

---

## 11) Data formatting rules

- Always show:
  - date range in the card footer (e.g., “Jan 2024 – Mar 2024”)
  - units (mins, hours, msgs/day)
- Use friendly rounding:
  - reply times: nearest second under 1m, nearest 5s under 5m, nearest 1m above 5m
  - counts: abbreviate (1.2k) only in share mode

---

## 12) Empty, error, and privacy states

### Empty state

- One illustration (simple), one line, one CTA.
- Tone: playful but direct.

### Error state

- Show where parsing failed and allow “download diagnostics”.
- Provide “Try alternate date format” button.

### Privacy mode (global toggle)

- Replace names with “Participant A/B”
- Hide message text (show only counts)
- Blur previews in moment cards

---

## 13) Implementation checklist (for AI dev)

- [ ] Create `components/ui/InsightCard.tsx`, `KpiTile.tsx`, `ChartCard.tsx`, `MomentCard.tsx`, `FilterBar.tsx`
- [ ] Create `lib/format.ts` (numbers, times, ranges)
- [ ] Add `ShareMode` route that renders at 1080×1920
- [ ] Add theme switcher (daisyUI `data-theme`)
- [ ] Add privacy toggle that affects all renderers
- [ ] Ensure mobile-first readability (test at 375px width)
- [ ] Ensure “share” layout works in 9:16 crop
