// Ranking-eval set for people-search (#69). Run with a real gateway key:
//
//   OPENROUTER_API_KEY=... deno task eval
//
// Ranks a fixed fixture set with both the semantic path and the legacy keyword
// path, reports Recall@3 and MRR for each, and exits non-zero when the semantic
// ranker drops below baseline. Network + spend, so it is a manual gate, not CI.
import {
  compareRankedProfiles,
  cosineSimilarity,
  embedTexts,
  profileEmbeddingText,
  type ProfileRow,
  rankProfile,
  rankProfileSemantic,
  SEMANTIC_MIN_SCORE,
} from "../functions/people-search.ts";

const RECALL_AT = 3;
const MIN_RECALL = 0.6;
const MIN_MRR = 0.75;

function fixture(
  id: string,
  headline: string,
  skills: string[],
  interests: string[],
  bio: string,
): ProfileRow {
  return {
    id,
    name: id,
    avatar_url: null,
    headline,
    bio,
    skills,
    interests,
    availability: "Free on weekends",
    latitude: 25.03,
    longitude: 121.54,
  };
}

const PROFILES: ProfileRow[] = [
  fixture("ava", "Product manager at a payments startup", ["product strategy", "payments"], [
    "hiking",
    "camping",
  ], "Building consumer fintech by day, chasing mountain trails by weekend."),
  fixture(
    "ben",
    "Backend engineer at a retail bank",
    ["java", "databases"],
    ["board games"],
    "Keeps core banking systems running and hosts a weekly strategy-game night.",
  ),
  fixture(
    "cara",
    "Yoga instructor",
    ["yoga", "breathwork"],
    ["meditation", "wellness"],
    "Teaches morning vinyasa and runs mindfulness retreats.",
  ),
  fixture(
    "dan",
    "Chef at a bistro",
    ["cooking", "menu design"],
    ["wine tasting", "restaurants"],
    "Always hunting for the city's best hole-in-the-wall eats.",
  ),
  fixture("elle", "Partner at an early-stage venture fund", ["investing", "due diligence"], [
    "tennis",
    "sailing",
  ], "Backs pre-seed founders and spends summers on the water."),
  fixture("finn", "Freelance photographer", ["photography", "photo editing"], [
    "street photography",
    "travel",
  ], "Documents cities on film and sells prints."),
  fixture(
    "gina",
    "Pediatric nurse",
    ["patient care"],
    ["marathon running", "trail running"],
    "Training for her fourth marathon this fall.",
  ),
  fixture("hugo", "Data scientist at a crypto exchange", ["python", "machine learning"], [
    "surfing",
    "free diving",
  ], "Models markets on weekdays and lives in the ocean on weekends."),
  fixture(
    "iris",
    "Product designer",
    ["figma", "illustration"],
    ["ceramics", "museums"],
    "Sketches, throws pots, and haunts gallery openings.",
  ),
  fixture("jack", "Account executive at a SaaS company", ["enterprise sales"], [
    "golf",
    "whiskey",
  ], "Closes deals and collects single malts."),
  fixture(
    "kate",
    "High school teacher",
    ["curriculum design"],
    ["book club", "hiking"],
    "Leads a monthly book club and weekend hill walks.",
  ),
  fixture(
    "leo",
    "Session musician",
    ["guitar", "songwriting"],
    ["indie concerts", "vinyl"],
    "Plays in two bands and never misses a local show.",
  ),
];

const QUERIES: { query: string; relevant: string[] }[] = [
  { query: "someone outdoorsy in fintech", relevant: ["ava", "hugo"] },
  { query: "a foodie to explore restaurants with", relevant: ["dan"] },
  { query: "someone into wellness and mindfulness", relevant: ["cara"] },
  { query: "a creative artistic type", relevant: ["iris", "finn", "leo"] },
  { query: "someone who loves running", relevant: ["gina"] },
  { query: "works in venture capital or investing", relevant: ["elle"] },
  { query: "a musician to jam with", relevant: ["leo"] },
  { query: "someone in tech who likes the ocean", relevant: ["hugo"] },
];

type Metrics = { recall: number; mrr: number };

function score(rankedIdsPerQuery: string[][]): Metrics {
  let recallTotal = 0;
  let mrrTotal = 0;
  QUERIES.forEach(({ relevant }, index) => {
    const rankedIds = rankedIdsPerQuery[index];
    const topK = rankedIds.slice(0, RECALL_AT);
    recallTotal += topK.filter((id) => relevant.includes(id)).length / relevant.length;
    const firstRelevant = rankedIds.findIndex((id) => relevant.includes(id));
    mrrTotal += firstRelevant === -1 ? 0 : 1 / (firstRelevant + 1);
  });
  return { recall: recallTotal / QUERIES.length, mrr: mrrTotal / QUERIES.length };
}

const apiKey = Deno.env.get("OPENROUTER_API_KEY")?.trim();
if (!apiKey) {
  console.error("Set OPENROUTER_API_KEY to run the ranking eval.");
  Deno.exit(2);
}

const profileVectors = await embedTexts(apiKey, PROFILES.map(profileEmbeddingText));
const queryVectors = await embedTexts(apiKey, QUERIES.map(({ query }) => query));

// Collected across all query/profile pairs so a new model's similarity spread is
// visible when calibrating SEMANTIC_MIN_SCORE.
const relevantSimilarities: number[] = [];
const irrelevantSimilarities: number[] = [];

const semanticRankings = QUERIES.map(({ query, relevant }, queryIndex) =>
  PROFILES.flatMap((profile, profileIndex) => {
    const similarity = cosineSimilarity(queryVectors[queryIndex], profileVectors[profileIndex]);
    (relevant.includes(profile.id) ? relevantSimilarities : irrelevantSimilarities)
      .push(similarity);
    const match = rankProfileSemantic(profile, query, 0, similarity);
    return match ? [match] : [];
  }).sort(compareRankedProfiles).map((match) => match.profile.id)
);
const keywordRankings = QUERIES.map(({ query }) =>
  PROFILES.flatMap((profile) => {
    const match = rankProfile(profile, query, 0);
    return match ? [match] : [];
  }).sort(compareRankedProfiles).map((match) => match.profile.id)
);

QUERIES.forEach(({ query, relevant }, index) => {
  console.log(`"${query}"`);
  console.log(`  relevant: ${relevant.join(", ")}`);
  console.log(`  semantic: ${semanticRankings[index].slice(0, RECALL_AT).join(", ") || "(none)"}`);
  console.log(`  keyword:  ${keywordRankings[index].slice(0, RECALL_AT).join(", ") || "(none)"}`);
});

const semantic = score(semanticRankings);
const keyword = score(keywordRankings);
console.log(
  `\nRecall@${RECALL_AT}  semantic ${semantic.recall.toFixed(2)} | keyword ${
    keyword.recall.toFixed(2)
  }`,
);
console.log(`MRR       semantic ${semantic.mrr.toFixed(2)} | keyword ${keyword.mrr.toFixed(2)}`);

const range = (values: number[]) =>
  `${Math.min(...values).toFixed(3)}..${Math.max(...values).toFixed(3)}`;
console.log(
  `similarity ranges: relevant ${range(relevantSimilarities)} | irrelevant ${
    range(irrelevantSimilarities)
  } | threshold ${SEMANTIC_MIN_SCORE}`,
);
if (Math.min(...relevantSimilarities) < SEMANTIC_MIN_SCORE) {
  console.warn("WARN: some relevant pairs score below SEMANTIC_MIN_SCORE — threshold too high.");
}

if (semantic.recall < MIN_RECALL || semantic.mrr < MIN_MRR) {
  console.error(
    `\nFAIL: below baseline (Recall@${RECALL_AT} >= ${MIN_RECALL}, MRR >= ${MIN_MRR}).`,
  );
  Deno.exit(1);
}
console.log("\nPASS");
