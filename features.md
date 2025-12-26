# Feature Roadmap & Bang-for-Buck Analysis

Based on the current architecture (Local-first, IndexedDB) and recent user feedback.

## 🚀 High Value / Low Effort (Quick Wins)

### 0. Sessions View (The Context King)

- **Description**: A dedicated list of conversation sessions (grouped by time gaps) with start times, duration, and message counts.
- **Why**: "Initiation Rate" implies sessions exist, but users need to _see_ them to understand the flow.
- **Effort**: **Medium**. Logic exists; needs a UI component.
- **Verdict**: Critical missing piece.

### 1. Yap Index (Words per Message)

### 1. Yap Index (Words per Message)

- **Description**: Ratio of Total Words / Total Messages per participant.
- **Why**: Instantly quantifies conversational density. As noted, "your yap is usually about variance", but the baseline average is a great vanity metric.
- **Effort**: **Low**. Data already available in aggregate stats.
- **Verdict**: Implement immediately.

### 2. Initiation Rate (Conversation Load)

- **Description**: Percentage of sessions started by each participant after a long silence.
- **Why**: Reveals who carries the "mental load" of maintaining the connection. High emotional impact.
- **Effort**: **Low**. Session logic (`analysis.ts`) already identifies start times; just need to attribute the first message sender.
- **Verdict**: High priority.

## 🛠 High Value / Medium Effort

### 3. Smart Reply Stats (Median + p90)

- **Description**: Moving beyond "Average Reply Time" to robust statistics (Median, p90) per direction.
- **Why**: Averages are skewed by outliers (e.g., replying next morning). Percentiles reflect "typical" responsiveness.
- **Effort**: **Medium**. Requires sorting `reply_edges` and computing quantiles.
- **Verdict**: Essential for the "Participants" tab.

### 4. Reply-Time Heatmap (Day x Hour)

- **Description**: 2D Grid (Hour of Day × Weekday) showing when each person is most responsive.
- **Why**: "Lifestyle mismatch" detector. Current "Activity by Hour" bar chart is insufficient.
- **Effort**: **Medium**. Data aggregation is straightforward; requires a Grid/Heatmap component.
- **Verdict**: Strong visual addition. **Missing from current build.**

## 💡 Novel / Experimental

### 5. "Time Spent Waiting" (The Patience Card)

- **Description**: Sum of all reply deltas attributable to a person (i.e., how long they made the other person wait total).
- **Why**: "Spicy metric" that contextualizes lag. 1000 fast replies might sum to less waiting time than 10 slow ones.
- **Effort**: **Low/Medium**. Simple sum over `reply_edges`.
- **Verdict**: Fun, "gamified" stat.

### 6. Message Length Distribution

- **Description**: Histogram of message lengths (words/chars).
- **Why**: Shows if someone is a "one-liner" spammer vs. a "novel writer". Captures the "Yap Variance".
- **Effort**: **Medium**. Requires bucketing logic and a bar chart.
- **Verdict**: Good for deep dives.

---

## Recommended Action Plan

1.  **Fix Inconsistencies**: Ensure "Avg Msgs/Day" definition aligns with "Active Days" (or explicitly label it "Calendar Day").
2.  **Add Quick Stats**: Add **Yap Index** and **Initiation Rate** to the Overview/Participant cards.
3.  **Upgrade Reply Analysis**: Replace/Augment simple "Avg Reply" with **Median/p90** and **Time Waiting**.
