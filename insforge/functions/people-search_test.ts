import {
  bearerToken,
  buildConnectionStatuses,
  collectBlockedProfileIds,
  compareRankedProfiles,
  cosineSimilarity,
  handler,
  haversineKm,
  normalizeQuery,
  profileEmbeddingText,
  type ProfileRow,
  rankProfile,
  rankProfileSemantic,
  SEMANTIC_MIN_SCORE,
  validateSearchInput,
} from "./people-search.ts";

function assert(condition: unknown, message = "Assertion failed"): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`Expected ${expectedJson}, received ${actualJson}`);
  }
}

function profile(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: "00000000-0000-4000-8000-000000000101",
    name: "Maya Chen",
    avatar_url: null,
    headline: "Product designer",
    bio: "Designs mobile products",
    skills: ["product design", "prototyping"],
    interests: ["hiking", "coffee"],
    availability: "Free on weekends",
    latitude: 25.0268,
    longitude: 121.5434,
    ...overrides,
  };
}

Deno.test("bearerToken accepts a Bearer token and rejects other authorization schemes", () => {
  assertEquals(bearerToken(new Headers({ Authorization: "Bearer signed-token" })), "signed-token");
  assertEquals(bearerToken(new Headers({ Authorization: "Basic credentials" })), null);
  assertEquals(bearerToken(new Headers()), null);
});

Deno.test("normalizeQuery strips punctuation, accents, duplicate terms, and stopwords", () => {
  assertEquals(
    normalizeQuery("A café person who is looking for HIKING, hiking!"),
    ["cafe", "hiking"],
  );
});

Deno.test("haversineKm uses the mean Earth radius and is symmetric", () => {
  const taipeiToDaan = haversineKm(25.0478, 121.5170, 25.0268, 121.5434);
  const daanToTaipei = haversineKm(25.0268, 121.5434, 25.0478, 121.5170);

  assert(Math.abs(taipeiToDaan - 3.55) < 0.1, `Unexpected distance: ${taipeiToDaan}`);
  assert(Math.abs(taipeiToDaan - daanToTaipei) < 1e-12);
});

Deno.test("rankProfile applies field weights and exact phrase bonus", () => {
  const exact = rankProfile(
    profile({ headline: "Creative maker", bio: null }),
    "product design",
    3,
  );
  const tokenOnly = rankProfile(
    profile({
      headline: "Creative maker",
      bio: null,
      skills: ["product methods", "design critique"],
    }),
    "product design",
    3,
  );

  assert(exact);
  assert(tokenOnly);
  assertEquals(exact.score, tokenOnly.score + 8);
  assertEquals(exact.matchReason, "Matches skills: product and design.");
});

Deno.test("rankProfile uses the strongest matching field for its reason", () => {
  const ranked = rankProfile(
    profile({
      headline: "Coffee meetup host",
      skills: ["TypeScript"],
      interests: ["coffee", "cycling"],
      bio: "Always ready for coffee",
    }),
    "TypeScript coffee",
    2,
  );

  assert(ranked);
  assertEquals(ranked.matchReason, "Matches skill: typescript.");
});

Deno.test("rankProfile excludes candidates with no positive match", () => {
  assertEquals(rankProfile(profile(), "ceramics", 1), null);
});

Deno.test("cosineSimilarity handles identical, orthogonal, empty, and mismatched vectors", () => {
  assert(Math.abs(cosineSimilarity([1, 2, 3], [1, 2, 3]) - 1) < 1e-12);
  assertEquals(cosineSimilarity([1, 0], [0, 1]), 0);
  assertEquals(cosineSimilarity([], []), 0);
  assertEquals(cosineSimilarity([1, 2], [1, 2, 3]), 0);
  assertEquals(cosineSimilarity([0, 0], [1, 2]), 0);
});

Deno.test("profileEmbeddingText joins searchable fields and drops empty ones", () => {
  assertEquals(
    profileEmbeddingText(profile({ availability: null, bio: null })),
    "Product designer\nproduct design, prototyping\nhiking, coffee",
  );
});

Deno.test("rankProfileSemantic applies the similarity threshold and keyword-based reasons", () => {
  assertEquals(rankProfileSemantic(profile(), "hiking", 2, SEMANTIC_MIN_SCORE - 0.01), null);
  assertEquals(rankProfileSemantic(profile(), "hiking", 2, Number.NaN), null);
  assert(rankProfileSemantic(profile(), "hiking", 2, SEMANTIC_MIN_SCORE));

  const keywordBacked = rankProfileSemantic(profile(), "hiking", 2, 0.9);
  assert(keywordBacked);
  assertEquals(keywordBacked.score, 0.9);
  assertEquals(keywordBacked.matchReason, "Matches interest: hiking.");

  const semanticOnly = rankProfileSemantic(profile(), "outdoorsy adventures", 2, 0.5);
  assert(semanticOnly);
  assertEquals(semanticOnly.matchReason, "Close match for your search.");
});

Deno.test("compareRankedProfiles sorts by relevance, distance, name, then id", () => {
  const base = rankProfile(profile(), "hiking", 4);
  const closer = rankProfile(profile({ id: "00000000-0000-4000-8000-000000000102" }), "hiking", 2);
  assert(base);
  assert(closer);

  assert(compareRankedProfiles(closer, base) < 0);

  const alphabetic = rankProfile(
    profile({ id: "00000000-0000-4000-8000-000000000103", name: "Aiko" }),
    "hiking",
    2,
  );
  assert(alphabetic);
  assert(compareRankedProfiles(alphabetic, closer) < 0);
});

Deno.test("validateSearchInput trims valid input and enforces all bounds", () => {
  assertEquals(validateSearchInput({ query: "  hiking  ", radiusKm: 10, limit: 12 }), {
    ok: true,
    value: { query: "hiking", radiusKm: 10, limit: 12 },
  });

  assert(!validateSearchInput({ query: "x", radiusKm: 10, limit: 12 }).ok);
  assert(!validateSearchInput({ query: "hiking", radiusKm: 0, limit: 12 }).ok);
  assert(!validateSearchInput({ query: "hiking", radiusKm: 10, limit: 1.5 }).ok);
  assert(!validateSearchInput({ query: "hiking", radiusKm: 10, limit: 21 }).ok);
});

Deno.test("handler applies exact-origin CORS to OPTIONS", async () => {
  const previous = Deno.env.get("BREA_ALLOWED_ORIGINS");
  Deno.env.set("BREA_ALLOWED_ORIGINS", "https://brea.example");

  try {
    const response = await handler(
      new Request("https://function.example", {
        method: "OPTIONS",
        headers: { Origin: "https://brea.example" },
      }),
    );

    assertEquals(response.status, 204);
    assertEquals(response.headers.get("Access-Control-Allow-Origin"), "https://brea.example");
    assertEquals(response.headers.get("Vary"), "Origin");
  } finally {
    if (previous === undefined) Deno.env.delete("BREA_ALLOWED_ORIGINS");
    else Deno.env.set("BREA_ALLOWED_ORIGINS", previous);
  }
});

Deno.test("handler returns structured invalid-request errors with CORS", async () => {
  const previous = Deno.env.get("BREA_ALLOWED_ORIGINS");
  Deno.env.set("BREA_ALLOWED_ORIGINS", "https://brea.example");

  try {
    const response = await handler(
      new Request("https://function.example", {
        method: "POST",
        headers: { Origin: "https://brea.example", "Content-Type": "application/json" },
        body: "not-json",
      }),
    );

    assertEquals(response.status, 400);
    assertEquals(await response.json(), {
      code: "INVALID_REQUEST",
      message: "Request body must contain valid JSON.",
      error: "INVALID_REQUEST",
    });
    assertEquals(response.headers.get("Access-Control-Allow-Origin"), "https://brea.example");
    assertEquals(response.headers.get("Vary"), "Origin");
  } finally {
    if (previous === undefined) Deno.env.delete("BREA_ALLOWED_ORIGINS");
    else Deno.env.set("BREA_ALLOWED_ORIGINS", previous);
  }
});

Deno.test("collectBlockedProfileIds excludes profiles blocked by and blocking the searcher", () => {
  const blocked = collectBlockedProfileIds(
    // Profiles the searcher has blocked.
    [{ blocked_profile_id: "blocked-by-me-1" }, { blocked_profile_id: "blocked-by-me-2" }],
    // Profiles that have blocked the searcher.
    [{ blocker_profile_id: "blocking-me" }],
  );

  assert(blocked.has("blocked-by-me-1"));
  assert(blocked.has("blocked-by-me-2"));
  assert(blocked.has("blocking-me"));
  assertEquals(blocked.size, 3);

  // The handler drops any candidate whose id is in the blocked set (either direction).
  const candidates = [
    { id: "blocked-by-me-1" },
    { id: "blocking-me" },
    { id: "reachable" },
  ];
  const visible = candidates.filter((candidate) => !blocked.has(candidate.id)).map((c) => c.id);
  assertEquals(visible, ["reachable"]);
});

Deno.test("buildConnectionStatuses maps outgoing, incoming, and accepted relationships", () => {
  const statuses = buildConnectionStatuses(
    [
      { recipient_id: "outgoing-pending", status: "pending" },
      { recipient_id: "outgoing-accepted", status: "accepted" },
      { recipient_id: "outgoing-declined", status: "declined" },
    ],
    [
      { sender_id: "incoming-pending", status: "pending" },
      { sender_id: "incoming-accepted", status: "accepted" },
    ],
  );

  assertEquals(statuses.get("outgoing-pending"), "outgoing_pending");
  assertEquals(statuses.get("incoming-pending"), "incoming_pending");
  assertEquals(statuses.get("outgoing-accepted"), "accepted");
  assertEquals(statuses.get("incoming-accepted"), "accepted");
  // Declined rows are not surfaced...
  assertEquals(statuses.get("outgoing-declined"), undefined);
  // ...and the handler renders an absent entry as "none".
  assertEquals(statuses.get("stranger") ?? "none", "none");
});

Deno.test("buildConnectionStatuses keeps an accepted status ahead of an incoming pending row", () => {
  const statuses = buildConnectionStatuses(
    [{ recipient_id: "friend", status: "accepted" }],
    [{ sender_id: "friend", status: "pending" }],
  );
  assertEquals(statuses.get("friend"), "accepted");
});
