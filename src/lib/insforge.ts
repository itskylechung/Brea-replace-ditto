import { createClient, type InsForgeClient } from "@insforge/sdk";

const baseUrl = import.meta.env.VITE_INSFORGE_URL?.trim();
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY?.trim();
const configuredFunctionsUrl = import.meta.env.VITE_INSFORGE_FUNCTIONS_URL?.trim();

export const hasInsforgeConfig = Boolean(baseUrl && anonKey);

let client: InsForgeClient | null = null;

function functionsUrlFor(apiBaseUrl: string): string | undefined {
  if (configuredFunctionsUrl) return configuredFunctionsUrl;
  try {
    const apiUrl = new URL(apiBaseUrl);
    const appKey = apiUrl.hostname.split(".")[0];
    return appKey ? `https://${appKey}.function2.insforge.app` : undefined;
  } catch {
    return undefined;
  }
}

export function getInsforgeClient(): InsForgeClient {
  if (!baseUrl || !anonKey) {
    throw new Error(
      "The preview backend is not connected yet. Add the InsForge URL and anon key, then try again.",
    );
  }

  client ??= createClient({
    baseUrl,
    anonKey,
    functionsUrl: functionsUrlFor(baseUrl),
    timeout: 15_000,
    retryCount: 1,
  });

  return client;
}
