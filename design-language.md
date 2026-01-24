# Design Language

**WhatsApp Chat Insights Dashboard**  
A visual system built for virality, not mediocrity.

---

## The Vision

> **One glance. One emotion. One share.**

This isn't a dashboard. It's a conversation piece. Every screen should make someone pause their scroll, screenshot, and send to a friend with "look at this."

**We're building for the 3-second attention span.**

---

## Aesthetic Direction: Neo-Editorial

Clean like a magazine spread. Bold like a poster. Personal like a love letter.

| Principle    | Expression                                          |
| ------------ | --------------------------------------------------- |
| **Contrast** | Massive numbers against whisper-quiet backgrounds   |
| **Tension**  | Sharp geometric layouts with organic accent moments |
| **Intimacy** | Data that feels like it knows you                   |
| **Drama**    | Every insight earns its space on screen             |

This is NOT:

- ❌ Corporate dashboard gray
- ❌ SaaS template energy
- ❌ "Clean and professional"
- ❌ Forgettable

---

## Typography: The Star of the Show

### Font Stack

```css
--font-display: "Satoshi", "Cabinet Grotesk", sans-serif;
--font-body: "General Sans", "Switzer", sans-serif;
--font-mono: "JetBrains Mono", "SF Mono", monospace;
```

**Never use**: Inter, Roboto, Arial, system-ui as display fonts. They are invisible.

### Scale (Viewport-Responsive)

| Role              | Mobile | Desktop | Weight |
| ----------------- | ------ | ------- | ------ |
| **Hero Stat**     | 72px   | 120px   | 700    |
| **Card Stat**     | 48px   | 64px    | 600    |
| **Section Title** | 24px   | 32px    | 600    |
| **Card Label**    | 14px   | 16px    | 500    |
| **Body**          | 15px   | 17px    | 400    |
| **Caption**       | 12px   | 13px    | 400    |

**Rules**:

- Numbers use `font-feature-settings: 'tnum'` (tabular)
- Tracking: tight on headlines (-0.02em), loose on small caps (+0.05em)
- Line height: 1.1 for stats, 1.5 for body

---

## Color: Intentional Palettes

Three modes. Each with character.

### Obsidian (Default Dark)

```css
--bg-primary: hsl(240 10% 6%); /* near-black with warmth */
--bg-card: hsl(240 8% 10%); /* elevated dark */
--bg-hover: hsl(240 8% 13%); /* interaction state */

--text-primary: hsl(0 0% 98%); /* bright white */
--text-secondary: hsl(240 5% 65%); /* soft gray */
--text-muted: hsl(240 5% 45%); /* receded */

--accent: hsl(165 80% 55%); /* mint electric */
--accent-glow: hsl(165 80% 55% / 0.3);

--success: hsl(145 65% 50%);
--danger: hsl(0 72% 60%);
--warning: hsl(35 90% 55%);
```

### Bone (Light Mode)

```css
--bg-primary: hsl(40 30% 96%); /* warm cream */
--bg-card: hsl(0 0% 100%); /* pure white cards */

--text-primary: hsl(240 10% 8%); /* rich black */
--accent: hsl(250 80% 55%); /* royal violet */
```

### Ember (Statement Mode)

```css
--bg-primary: hsl(0 0% 3%); /* void black */
--accent: hsl(15 100% 55%); /* fire orange */
```

**Rule**: Cards float. Background recedes. Accents punctuate.

---

## Spatial System

### The Grid

```
Desktop: 12-column, 24px gutter
Tablet: 8-column, 20px gutter
Mobile: 4-column, 16px gutter
```

### Section Rhythm

```css
--section-gap: clamp(48px, 8vw, 96px);
--card-gap: clamp(12px, 2vw, 20px);
```

### Card Padding

| Size       | Padding                    |
| ---------- | -------------------------- |
| Compact    | 16px                       |
| Default    | 24px                       |
| Hero       | 32px mobile / 48px desktop |
| Share Card | 64px                       |

### Radius Scale

```css
--radius-sm: 8px; /* chips, badges */
--radius-md: 16px; /* standard cards */
--radius-lg: 24px; /* feature cards */
--radius-xl: 32px; /* hero/share cards */
--radius-pill: 999px;
```

---

## Components

### Insight Card (The Star)

A single truth, beautifully told.

```
┌─────────────────────────────────────┐
│  📊  Reply Speed                    │
│                                     │
│         3m 12s                      │
│                                     │
│  ↓ 22% faster than last month      │
│  ─────────────────── (sparkline)   │
│                                     │
│  "You're getting snappier."        │
└─────────────────────────────────────┘
```

**Anatomy**:

1. **Icon + Label**: Top-left, understated
2. **Hero Value**: Centered, massive, magnetic
3. **Trend Indicator**: Direction + delta + timeframe
4. **Mini Viz**: Optional sparkline or progress bar
5. **Insight Line**: One-sentence human takeaway (italic, softer)

**Styling**:

```css
.insight-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 32px;
  box-shadow:
    0 1px 2px hsl(0 0% 0% / 0.05),
    0 8px 32px hsl(0 0% 0% / 0.08);
  border: 1px solid hsl(0 0% 100% / 0.06);
}

.insight-card--glow {
  box-shadow:
    0 0 0 1px var(--accent-glow),
    0 0 60px -20px var(--accent);
}
```

---

### KPI Strip

Horizontal scan of key metrics. Dense but clear.

```
┌────────┬────────┬────────┬────────┐
│ 12.4k  │  847   │  3:42  │  89%   │
│messages│ media  │  avg   │ active │
└────────┴────────┴────────┴────────┘
```

**Rules**:

- All tiles same height
- Value always larger than label
- Monospace numbers
- Subtle dividers, not borders

---

### Chart Card

Data visualization with narrative.

**Rules**:

1. No chart legends—inline labels only
2. One color per data series (use opacity for secondary)
3. Large axis labels (min 12px)
4. Always include a text takeaway below
5. Generous whitespace around chart area

**Chart Aesthetic**:

- Line charts: 2.5px stroke, subtle glow on accent lines
- Bar charts: Rounded tops (4px radius)
- Area charts: Gradient fill fading to transparent
- No gridlines darker than 8% opacity

---

### Moment Card

Highlighted events and anomalies.

```
┌─────────────────────────────────────┐
│ ◆ Peak Activity Detected           │
│ Jan 14, 2024 · 11:34 PM            │
│                                     │
│ 847 messages in one hour.          │
│ That's 12x your daily average.     │
│                                     │
│ "Someone had a lot to say."        │
└─────────────────────────────────────┘
```

**Styling**:

- Left accent bar (4px, gradient)
- Subtle background tint matching accent
- Icon: filled diamond or custom per event type

---

### Share Card (9:16 Export)

The viral unit. One insight, perfectly framed for stories.

**Canvas**: 1080 × 1920px

```
┌─────────────────────────────────────┐
│                                     │
│         (app logo, subtle)          │
│                                     │
│                                     │
│                                     │
│           12,847                    │
│          messages                   │
│                                     │
│    ════════════════════════         │
│    (mini chart or accent line)      │
│                                     │
│   "That's a novel's worth of        │
│    conversation."                   │
│                                     │
│                                     │
│         Jan 2024 – Mar 2024         │
│           (chat name)               │
│                                     │
└─────────────────────────────────────┘
```

**Requirements**:

- Value: 120px+ font size
- Maximum 6 words in headline
- High contrast (WCAG AAA for story overlays)
- Subtle branding in corner
- Optional: show/hide names toggle for privacy

---

## Motion

Motion serves meaning. Never decoration.

### Timing Functions

```css
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Interactions

| Trigger         | Animation                                 |
| --------------- | ----------------------------------------- |
| Card hover      | translateY(-2px), shadow intensify, 200ms |
| Card press      | scale(0.98), 100ms                        |
| Number count-up | 600ms ease-out                            |
| Chart reveal    | Draw-in from left, 800ms                  |
| Page enter      | Stagger children 50ms, fade + rise        |

### Rules

- Never animate while user is reading numbers
- Respect `prefers-reduced-motion`
- Loading: use skeleton shapes, not spinners

---

## Iconography

Use **Lucide** or **Phosphor** icons.

| Context          | Size |
| ---------------- | ---- |
| Inline with text | 16px |
| Card headers     | 20px |
| Feature callouts | 24px |
| Share cards      | 32px |

**Rules**:

- Icons accompany labels (never standalone for meaning)
- Stroke width: 1.5px for light icons, 2px for bold
- Tint icons with `currentColor` to match text

---

## Data Display Rules

### Number Formatting

| Type           | Format          | Example  |
| -------------- | --------------- | -------- |
| Duration < 1m  | seconds         | "47s"    |
| Duration 1-60m | min:sec         | "3:42"   |
| Duration > 1h  | hours, mins     | "2h 15m" |
| Counts < 10k   | full number     | "8,472"  |
| Counts ≥ 10k   | abbreviated     | "12.4k"  |
| Percentages    | one decimal max | "73.2%"  |

### Context Requirements

Every stat must show:

- **Unit** (messages, hours, replies)
- **Timeframe** (date range)
- **Comparison** when relevant (vs last period)

---

## States

### Empty

- Friendly illustration (hand-drawn style)
- One-line explanation
- Single CTA button
- Tone: helpful, not sad

### Loading

- Skeleton cards matching final layout
- Subtle shimmer animation
- No spinners, no "Loading..."

### Error

- Clear error message (not technical)
- Suggested action button
- Option to download debug info

### Privacy Mode

- Names → "Person A", "Person B"
- Messages → redacted or hidden
- Previews → blurred
- Global toggle, persisted in settings

---

## Implementation Notes

### CSS Architecture

```
styles/
├── tokens.css      # All custom properties
├── reset.css       # Minimal reset
├── typography.css  # Type scale + utilities
├── components/     # Component-specific styles
└── themes/         # Color mode overrides
```

### Component Files

```
components/
├── InsightCard.tsx
├── KpiStrip.tsx
├── ChartCard.tsx
├── MomentCard.tsx
├── ShareCard.tsx
├── FilterBar.tsx
└── ThemeToggle.tsx
```

### Critical Paths

- [ ] `InsightCard` with glow variant
- [ ] `ShareCard` with 9:16 canvas export
- [ ] Theme switcher (3 modes)
- [ ] Privacy toggle affecting all views
- [ ] Number formatting utilities
- [ ] Skeleton loading states

---

## The Litmus Test

Before shipping any screen, ask:

1. **Would I screenshot this?**
2. **Can I read the main number in 0.5 seconds?**
3. **Does it feel like something I haven't seen before?**
4. **Would this look good in a TikTok?**

If any answer is "no"—iterate.

---

_Remember: We're not building a tool. We're building something people want to show off._
