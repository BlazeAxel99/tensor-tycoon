export const INITIAL_CHUNKS = [
  { id: 1, label: "PharmaCorp Q3 Earnings Call Transcript", category: "Financial", tokens: 820, relevance: 0.92, freshness: 0.95, source: "CRM" },
  { id: 2, label: "PharmaCorp CEO LinkedIn Post (this week)", category: "News", tokens: 120, relevance: 0.78, freshness: 0.99, source: "Web" },
  { id: 3, label: "Pharma Industry Digital Transformation Report 2024", category: "Industry", tokens: 1100, relevance: 0.85, freshness: 0.60, source: "Docs" },
  { id: 4, label: "EY Prior Engagement Notes — PharmaCorp 2023", category: "Engagement", tokens: 450, relevance: 0.96, freshness: 0.70, source: "CRM" },
  { id: 5, label: "PharmaCorp Competitor Analysis (Roche, Novartis)", category: "Competitive", tokens: 680, relevance: 0.88, freshness: 0.65, source: "Docs" },
  { id: 6, label: "EY Digital Health Practice Credentials Deck", category: "Credentials", tokens: 540, relevance: 0.72, freshness: 0.55, source: "Docs" },
  { id: 7, label: "PharmaCorp Key Stakeholders — CRM Profile", category: "People", tokens: 230, relevance: 0.94, freshness: 0.88, source: "CRM" },
  { id: 8, label: "FDA Regulatory Updates Q4 2024", category: "Regulatory", tokens: 390, relevance: 0.80, freshness: 0.92, source: "Web" },
  { id: 9, label: "PharmaCorp Annual Report 2023 (Full)", category: "Financial", tokens: 1800, relevance: 0.75, freshness: 0.50, source: "Docs" },
  { id: 10, label: "Meeting Agenda Draft (from user's calendar)", category: "Meeting", tokens: 95, relevance: 0.99, freshness: 1.0, source: "Profile" },
  { id: 11, label: "EY Thought Leadership: AI in Pharma 2025", category: "Credentials", tokens: 470, relevance: 0.68, freshness: 0.82, source: "Docs" },
  { id: 12, label: "PharmaCorp LinkedIn Company Page Summary", category: "News", tokens: 180, relevance: 0.70, freshness: 0.95, source: "Web" },
  { id: 13, label: "Prior Meeting Notes — PharmaCorp April 2024", category: "Engagement", tokens: 310, relevance: 0.91, freshness: 0.75, source: "CRM" },
  { id: 14, label: "Digital Transformation Benchmarks — Mid-cap Pharma", category: "Industry", tokens: 560, relevance: 0.83, freshness: 0.62, source: "Docs" }
];

// Helper to compute composite score (same as Sandbox Studio Module 3)
export function computeCompositeScore(chunk) {
  const isPriorityCategory = ["Meeting", "Engagement", "People"].includes(chunk.category);
  const priorityBonus = isPriorityCategory ? 1.0 : 0.6;
  const compositeScore = (chunk.relevance * 0.5) + (chunk.freshness * 0.3) + (priorityBonus * 0.2);
  return parseFloat(compositeScore.toFixed(3));
}
