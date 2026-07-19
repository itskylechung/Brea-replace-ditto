import { createClient, type InsForgeClient } from "@insforge/sdk";

const baseUrl = import.meta.env.VITE_INSFORGE_URL?.trim();
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY?.trim();

export const hasInsforgeConfig = Boolean(baseUrl && anonKey);

let client: InsForgeClient | null = null;

export function getInsforgeClient(): InsForgeClient {
  if (!baseUrl || !anonKey) {
    throw new Error(
      "The preview backend is not connected yet. Add the InsForge URL and anon key, then try again.",
    );
  }

  client ??= createClient({
    baseUrl,
    anonKey,
    timeout: 15_000,
    retryCount: 1,
  });

  return client;
}
