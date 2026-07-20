import { createAdminClient, createClient } from "npm:@insforge/sdk@1.4.5";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ApiError = { code: string; message: string };
type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: ApiError };
export type ResponseInput = { connectionId: string; action: "accept" | "decline" };

type ConnectionRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined";
  responded_at: string | null;
};

export function validateResponseInput(value: unknown): ValidationResult<ResponseInput> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: { code: "INVALID_REQUEST", message: "Request body must be a JSON object." } };
  }
  const body = value as Record<string, unknown>;
  if (typeof body.connectionId !== "string" || !UUID_PATTERN.test(body.connectionId)) {
    return { ok: false, error: { code: "INVALID_REQUEST", message: "connectionId must be a valid UUID." } };
  }
  if (body.action !== "accept" && body.action !== "decline") {
    return { ok: false, error: { code: "INVALID_REQUEST", message: "action must be accept or decline." } };
  }
  return { ok: true, value: { connectionId: body.connectionId, action: body.action } };
}

export function parseAllowedOrigins(value: string | undefined): Set<string> {
  return new Set((value ?? "").split(",").map((origin) => origin.trim()).filter(Boolean));
}

function bearerToken(headers: Headers): string | null {
  const authorization = headers.get("Authorization")?.trim();
  return authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null;
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

function jsonResponse(body: unknown, status: number, origin: string | null, allowedOrigins: Set<string>): Response {
  const headers = corsHeaders(origin, allowedOrigins);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

function configuration(): ValidationResult<{ baseUrl: string; apiKey: string }> {
  const baseUrl = Deno.env.get("INSFORGE_BASE_URL")?.trim();
  const apiKey = Deno.env.get("API_KEY")?.trim();
  if (!baseUrl || !apiKey) {
    return { ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "This request cannot be updated right now." } };
  }
  return { ok: true, value: { baseUrl, apiKey } };
}

async function recordEvent(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
  status: "accepted" | "declined",
) {
  await admin.database.from("product_events").insert([{
    profile_id: profileId,
    event_name: "connection_responded",
    properties: { status },
  }]);
}

async function handleRequest(request: Request): Promise<Response> {
  const origin = request.headers.get("Origin");
  const allowedOrigins = parseAllowedOrigins(Deno.env.get("BREA_ALLOWED_ORIGINS"));
  if (origin && !allowedOrigins.has(origin)) {
    return jsonResponse({ code: "ORIGIN_NOT_ALLOWED", message: "This origin is not allowed." }, 403, origin, allowedOrigins);
  }
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin, allowedOrigins) });
  if (request.method !== "POST") {
    return jsonResponse({ code: "METHOD_NOT_ALLOWED", message: "Only POST requests are supported." }, 405, origin, allowedOrigins);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ code: "INVALID_REQUEST", message: "Request body must contain valid JSON." }, 400, origin, allowedOrigins);
  }
  const input = validateResponseInput(body);
  if (!input.ok) return jsonResponse(input.error, 400, origin, allowedOrigins);

  const config = configuration();
  if (!config.ok) return jsonResponse(config.error, 503, origin, allowedOrigins);
  const accessToken = bearerToken(request.headers);
  if (!accessToken) {
    return jsonResponse({ code: "AUTH_REQUIRED", message: "Sign in to respond to this request." }, 401, origin, allowedOrigins);
  }

  const authClient = createClient({ baseUrl: config.value.baseUrl, accessToken });
  const { data: userData, error: userError } = await authClient.auth.getCurrentUser();
  if (userError || !userData?.user) {
    return jsonResponse({ code: "INVALID_SESSION", message: "Your session has expired. Sign in again." }, 401, origin, allowedOrigins);
  }

  const admin = createAdminClient({ baseUrl: config.value.baseUrl, apiKey: config.value.apiKey });
  const { data: profileData, error: profileError } = await admin.database
    .from("profiles").select("id").eq("user_id", userData.user.id).maybeSingle();
  if (profileError || !profileData) {
    return jsonResponse({ code: "PROFILE_SETUP_REQUIRED", message: "Complete your Brea profile first." }, 409, origin, allowedOrigins);
  }
  const profileId = (profileData as { id: string }).id;

  const { data: connectionData, error: connectionError } = await admin.database
    .from("connections")
    .select("id, sender_id, recipient_id, status, responded_at")
    .eq("id", input.value.connectionId)
    .maybeSingle();
  if (connectionError) {
    return jsonResponse({ code: "INTERNAL_ERROR", message: "This request cannot be updated right now." }, 500, origin, allowedOrigins);
  }
  const connection = connectionData as unknown as ConnectionRow | null;
  if (!connection || connection.recipient_id !== profileId) {
    return jsonResponse({ code: "REQUEST_NOT_FOUND", message: "This request was not found." }, 404, origin, allowedOrigins);
  }

  const nextStatus = input.value.action === "accept" ? "accepted" : "declined";
  if (connection.status === nextStatus) {
    return jsonResponse({ id: connection.id, status: connection.status, respondedAt: connection.responded_at }, 200, origin, allowedOrigins);
  }
  if (connection.status !== "pending") {
    return jsonResponse({ code: "REQUEST_ALREADY_RESOLVED", message: "This request has already been resolved." }, 409, origin, allowedOrigins);
  }

  const respondedAt = new Date().toISOString();
  const { data: updatedData, error: updateError } = await admin.database
    .from("connections")
    .update({ status: nextStatus, responded_at: respondedAt })
    .eq("id", connection.id)
    .eq("status", "pending")
    .select("id, status, responded_at")
    .maybeSingle();
  if (updateError || !updatedData) {
    return jsonResponse({ code: "REQUEST_ALREADY_RESOLVED", message: "This request was changed elsewhere. Refresh and try again." }, 409, origin, allowedOrigins);
  }

  void recordEvent(admin, profileId, nextStatus);
  const updated = updatedData as unknown as { id: string; status: string; responded_at: string };
  return jsonResponse({ id: updated.id, status: updated.status, respondedAt: updated.responded_at }, 200, origin, allowedOrigins);
}

export async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get("Origin");
  let allowedOrigins = new Set<string>();
  try {
    allowedOrigins = parseAllowedOrigins(Deno.env.get("BREA_ALLOWED_ORIGINS"));
    return await handleRequest(request);
  } catch {
    return jsonResponse({ code: "INTERNAL_ERROR", message: "This request cannot be updated right now." }, 500, origin, allowedOrigins);
  }
}

export default handler;
