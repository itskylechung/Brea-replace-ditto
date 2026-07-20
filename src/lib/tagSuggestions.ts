// Curated professional skills offered as suggestion chips (~45 canonical entries).
export const SKILL_SUGGESTIONS: readonly string[] = [
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "Python",
  "Go",
  "Rust",
  "Java",
  "Swift",
  "Kotlin",
  "SQL",
  "PostgreSQL",
  "GraphQL",
  "AWS",
  "Docker",
  "Kubernetes",
  "Terraform",
  "Machine Learning",
  "Data Science",
  "Data Engineering",
  "AI Agents",
  "Prompt Engineering",
  "Product Management",
  "Product Strategy",
  "Project Management",
  "Agile Coaching",
  "UX Design",
  "UI Design",
  "Design Systems",
  "User Research",
  "Brand Design",
  "Growth Marketing",
  "Content Marketing",
  "SEO",
  "Sales",
  "Business Development",
  "Partnerships",
  "Fundraising",
  "Venture Capital",
  "Recruiting",
  "Operations",
  "Customer Success",
  "Finance",
  "Legal",
  "Technical Writing",
  "Public Speaking",
];

// Curated interests offered as suggestion chips (~40 canonical entries).
export const INTEREST_SUGGESTIONS: readonly string[] = [
  "Climate Tech",
  "Fintech",
  "Health Tech",
  "Ed Tech",
  "AI",
  "Web3",
  "Robotics",
  "Hardware",
  "Open Source",
  "Startups",
  "Bootstrapping",
  "Remote Work",
  "Coffee",
  "Cycling",
  "Running",
  "Hiking",
  "Climbing",
  "Yoga",
  "Tennis",
  "Basketball",
  "Bouldering",
  "Board Games",
  "Chess",
  "Photography",
  "Film",
  "Music",
  "Jazz",
  "Vinyl",
  "Cooking",
  "Baking",
  "Wine",
  "Craft Beer",
  "Travel",
  "Languages",
  "Reading",
  "Writing",
  "Volunteering",
  "Mentoring",
  "Parenting",
  "Urban Gardening",
  "Sailing",
];

// Lowercase alias -> canonical tag. Keys must be lowercase so lookups are case-insensitive.
const SYNONYMS: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  node: "Node.js",
  nodejs: "Node.js",
  "node.js": "Node.js",
  py: "Python",
  reactjs: "React",
  "react.js": "React",
  golang: "Go",
  postgres: "PostgreSQL",
  k8s: "Kubernetes",
  ml: "Machine Learning",
  ux: "UX Design",
  ui: "UI Design",
  pm: "Product Management",
  "biz dev": "Business Development",
  bd: "Business Development",
  vc: "Venture Capital",
};

const ALL_SUGGESTIONS: readonly string[] = [...SKILL_SUGGESTIONS, ...INTEREST_SUGGESTIONS];

/**
 * Normalize free-text tag input: trim, collapse internal whitespace, then resolve to a
 * canonical tag. Resolution order: known synonym alias, else a case-insensitive match against
 * either suggestion pool (returning the pool's canonical casing), else the cleaned raw string.
 */
export function normalizeTag(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";

  const lower = cleaned.toLowerCase();

  const synonym = SYNONYMS[lower];
  if (synonym) return synonym;

  const pooled = ALL_SUGGESTIONS.find((entry) => entry.toLowerCase() === lower);
  if (pooled) return pooled;

  return cleaned;
}

/**
 * Suggest up to six tags for a query: case-insensitive `includes` matches from the given pool,
 * plus the canonical targets of any synonym keys that start with the query. Tags already in
 * `selected` are excluded (case-insensitive) and results are de-duplicated (case-insensitive).
 */
export function suggestTags(
  query: string,
  pool: readonly string[],
  selected: readonly string[],
): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const excluded = new Set(selected.map((tag) => tag.toLowerCase()));
  const seen = new Set<string>();
  const results: string[] = [];

  const consider = (tag: string) => {
    const key = tag.toLowerCase();
    if (excluded.has(key) || seen.has(key)) return;
    seen.add(key);
    results.push(tag);
  };

  for (const entry of pool) {
    if (entry.toLowerCase().includes(q)) consider(entry);
  }

  for (const [alias, canonical] of Object.entries(SYNONYMS)) {
    if (alias.startsWith(q)) consider(canonical);
  }

  return results.slice(0, 6);
}
