import { createAdminClient, createClient } from "npm:@insforge/sdk@1.4.5";

const CLIENT_EVENT_NAMES = new Set(["sign_in_completed", "profile_completed", "profile_updated"]);

type ApiError = { code: string; message: string };
type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: ApiError };
export type EventInput = {
  eventName: string;
  properties: Record<string, string | number | boolean | null>;
};

export function validateEventInput(value: unknown): ValidationResult<EventInput> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      error: { code: "INVALID_REQUEST", message: "Request body must be a JSON object." },
    };
  }
  const body = value as Record<string, unknown>;
  if (typeof body.eventName !== "string" || !CLIENT_EVENT_NAMES.has(body.eventName)) {
    return { ok: false, error: { code: "INVALID_REQUEST", message: "eventName is not allowed." } };
  }
  if (!body.properties || typeof body.properties !== "object" || Array.isArray(body.properties)) {
    return {
      ok: false,
      error: { code: "INVALID_REQUEST", message: "properties must be a JSON object." },
    };
  }
  const properties = body.properties as Record<string, unknown>;
  if (Object.keys(properties).length > 12 || JSON.stringify(properties).length > 3000) {
    return { ok: false, error: { code: "INVALID_REQUEST", message: "properties is too large." } };
  }
  for (const property of Object.values(properties)) {
    if (property !== null && !["string", "number", "boolean"].includes(typeof property)) {
      return {
        ok: false,
        error: { code: "INVALID_REQUEST", message: "properties must contain scalar values only." },
      };
    }
  }
  return {
    ok: true,
    value: { eventName: body.eventName, properties: properties as EventInput["properties"] },
  };
}

function parseAllowedOrigins(value: string | undefined): Set<string> {
  return new Set((value ?? "").split(",").map((origin) => origin.trim()).filter(Boolean));
}

function corsHeaders(origin: string | null, allowedOrigins: Set<string>): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  });
  if (origin && allowedOrigins.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
  allowedOrigins: Set<string>,
): Response {
  const headers = corsHeaders(origin, allowedOrigins);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

async function handleRequest(request: Request): Promise<Response> {
  const origin = request.headers.get("Origin");
  const allowedOrigins = parseAllowedOrigins(Deno.env.get("BREA_ALLOWED_ORIGINS"));
  if (origin && !allowedOrigins.has(origin)) {
    return jsonResponse(
      { code: "ORIGIN_NOT_ALLOWED", message: "This origin is not allowed." },
      403,
      origin,
      allowedOrigins,
    );
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin, allowedOrigins) });
  }
  if (request.method !== "POST") {
    return jsonResponse(
      { code: "METHOD_NOT_ALLOWED", message: "Only POST requests are supported." },
      405,
      origin,
      allowedOrigins,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      { code: "INVALID_REQUEST", message: "Request body must contain valid JSON." },
      400,
      origin,
      allowedOrigins,
    );
  }
  const input = validateEventInput(body);
  if (!input.ok) return jsonResponse(input.error, 400, origin, allowedOrigins);

  const baseUrl = Deno.env.get("INSFORGE_BASE_URL")?.trim();
  const apiKey = Deno.env.get("API_KEY")?.trim();
  const accessToken = request.headers.get("Authorization")?.trim().match(/^Bearer\s+(.+)$/i)?.[1]
    ?.trim();
  if (!baseUrl || !apiKey) {
    return jsonResponse(
      { code: "SERVICE_UNAVAILABLE", message: "Analytics is unavailable." },
      503,
      origin,
      allowedOrigins,
    );
  }
  if (!accessToken) {
    return jsonResponse(
      { code: "AUTH_REQUIRED", message: "Sign in first." },
      401,
      origin,
      allowedOrigins,
    );
  }

  const authClient = createClient({ baseUrl, accessToken });
  const { data: userData, error: userError } = await authClient.auth.getCurrentUser();
  if (userError || !userData?.user) {
    return jsonResponse(
      { code: "INVALID_SESSION", message: "Your session has expired." },
      401,
      origin,
      allowedOrigins,
    );
  }

  const admin = createAdminClient({ baseUrl, apiKey });
  const { data: profileData } = await admin.database.from("profiles")
    .select("id").eq("user_id", userData.user.id).maybeSingle();
  const profileId = (profileData as { id?: string } | null)?.id ?? null;
  const { error } = await admin.database.from("product_events").insert([{
    profile_id: profileId,
    event_name: input.value.eventName,
    properties: input.value.properties,
  }]);
  if (error) {
    return jsonResponse(
      { code: "INTERNAL_ERROR", message: "Analytics is unavailable." },
      500,
      origin,
      allowedOrigins,
    );
  }
  return jsonResponse({ recorded: true }, 200, origin, allowedOrigins);
}

export async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get("Origin");
  let allowedOrigins = new Set<string>();
  try {
    allowedOrigins = parseAllowedOrigins(Deno.env.get("BREA_ALLOWED_ORIGINS"));
    return await handleRequest(request);
  } catch {
    return jsonResponse(
      { code: "INTERNAL_ERROR", message: "Analytics is unavailable." },
      500,
      origin,
      allowedOrigins,
    );
  }
}

export default handler;
