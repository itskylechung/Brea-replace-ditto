import { createClient, type InsForgeClient } from "@insforge/sdk";

// When no explicit URLs are configured, the client targets the page's own
// origin: vercel.json rewrites (/api/*, /fn/*) and the Vite dev proxy forward
// to InsForge server-side. Same-origin requests keep the HttpOnly refresh
// cookie first-party; a direct cross-origin backend URL makes it a third-party
// cookie, which Safari/ITP and incognito windows block — sessions then die on
// every reload (issue #24).
const sameOrigin = typeof window === "undefined" ? "" : window.location.origin;

const baseUrl = import.meta.env.VITE_INSFORGE_URL?.trim() || sameOrigin;
const functionsUrl =
  import.meta.env.VITE_INSFORGE_FUNCTIONS_URL?.trim() ||
  (sameOrigin && `${sameOrigin}/fn`);
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY?.trim();

export const hasInsforgeConfig = Boolean(baseUrl && functionsUrl && anonKey);

let client: InsForgeClient | null = null;

export function getInsforgeClient(): InsForgeClient {
  if (!baseUrl || !functionsUrl || !anonKey) {
    throw new Error(
      "The preview backend is not connected yet. Add the InsForge anon key, then try again.",
    );
  }

  client ??= createClient({
    baseUrl,
    functionsUrl,
    anonKey,
    timeout: 15_000,
    retryCount: 1,
  });

  return client;
}
