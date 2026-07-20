import { createAdminClient, createClient } from "npm:@insforge/sdk@1.4.5";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REPORT_REASONS = new Set(["spam", "harassment", "misleading", "unsafe", "other"]);

type ApiError = { code: string; message: string };
type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: ApiError };
export type SafetyInput =
  | { action: "block"; profileId: string }
  | { action: "report"; profileId: string; reason: string; details: string | null };

export function validateSafetyInput(value: unknown): ValidationResult<SafetyInput> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      error: { code: "INVALID_REQUEST", message: "Request body must be a JSON object." },
    };
  }
  const body = value as Record<string, unknown>;
  if (typeof body.profileId !== "string" || !UUID_PATTERN.test(body.profileId)) {
    return {
      ok: false,
      error: { code: "INVALID_REQUEST", message: "profileId must be a valid UUID." },
    };
  }
  if (body.action === "block") {
    return { ok: true, value: { action: "block", profileId: body.profileId } };
  }
  if (
    body.action !== "report" || typeof body.reason !== "string" || !REPORT_REASONS.has(body.reason)
  ) {
    return {
      ok: false,
      error: {
        code: "INVALID_REQUEST",
        message: "Choose a valid safety action and report reason.",
      },
    };
  }
  const details = typeof body.details === "string" ? body.details.trim() : "";
  if (details.length > 500) {
    return {
      ok: false,
      error: {
        code: "INVALID_REQUEST",
        message: "Report details must be 500 characters or fewer.",
      },
    };
  }
  return {
    ok: true,
    value: {
      action: "report",
      profileId: body.profileId,
      reason: body.reason,
      details: details || null,
    },
  };
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

// Mirror the coded `code` into the SDK-standard `error` key so @insforge/sdk's
// parseResponse surfaces the real code/message instead of a generic fallback.
function errorResponse(
  error: ApiError,
  status: number,
  origin: string | null,
  allowedOrigins: Set<string>,
): Response {
  return jsonResponse({ ...error, error: error.code }, status, origin, allowedOrigins);
}

function configuration(): ValidationResult<{ baseUrl: string; apiKey: string }> {
  const baseUrl = Deno.env.get("INSFORGE_BASE_URL")?.trim();
  const apiKey = Deno.env.get("API_KEY")?.trim();
  if (!baseUrl || !apiKey) {
    return {
      ok: false,
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "This safety action is temporarily unavailable.",
      },
    };
  }
  return { ok: true, value: { baseUrl, apiKey } };
}

function isUniqueViolation(error: unknown): boolean {
  return !!error && typeof error === "object" && (error as { code?: unknown }).code === "23505";
}

async function handleRequest(request: Request): Promise<Response> {
  const origin = request.headers.get("Origin");
  const allowedOrigins = parseAllowedOrigins(Deno.env.get("BREA_ALLOWED_ORIGINS"));
  if (origin && !allowedOrigins.has(origin)) {
    return errorResponse(
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
    return errorResponse(
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
    return errorResponse(
      { code: "INVALID_REQUEST", message: "Request body must contain valid JSON." },
      400,
      origin,
      allowedOrigins,
    );
  }
  const input = validateSafetyInput(body);
  if (!input.ok) return errorResponse(input.error, 400, origin, allowedOrigins);

  const config = configuration();
  if (!config.ok) return errorResponse(config.error, 503, origin, allowedOrigins);
  const accessToken = bearerToken(request.headers);
  if (!accessToken) {
    return errorResponse(
      { code: "AUTH_REQUIRED", message: "Sign in to use safety controls." },
      401,
      origin,
      allowedOrigins,
    );
  }

  const authClient = createClient({ baseUrl: config.value.baseUrl, accessToken });
  const { data: userData, error: userError } = await authClient.auth.getCurrentUser();
  if (userError || !userData?.user) {
    return errorResponse(
      { code: "INVALID_SESSION", message: "Your session has expired. Sign in again." },
      401,
      origin,
      allowedOrigins,
    );
  }

  const admin = createAdminClient({ baseUrl: config.value.baseUrl, apiKey: config.value.apiKey });
  const { data: currentData, error: currentError } = await admin.database
    .from("profiles").select("id").eq("user_id", userData.user.id).maybeSingle();
  if (currentError || !currentData) {
    return errorResponse(
      { code: "PROFILE_SETUP_REQUIRED", message: "Complete your Brea profile first." },
      409,
      origin,
      allowedOrigins,
    );
  }
  const currentProfileId = (currentData as { id: string }).id;
  if (currentProfileId === input.value.profileId) {
    return errorResponse(
      { code: "INVALID_TARGET", message: "You cannot take this action on your own profile." },
      400,
      origin,
      allowedOrigins,
    );
  }

  const { data: targetData, error: targetError } = await admin.database
    .from("profiles").select("id").eq("id", input.value.profileId).maybeSingle();
  if (targetError || !targetData) {
    return errorResponse(
      { code: "PROFILE_NOT_FOUND", message: "That profile was not found." },
      404,
      origin,
      allowedOrigins,
    );
  }

  if (input.value.action === "report") {
    const { error: reportError } = await admin.database.from("profile_reports").insert([{
      reporter_profile_id: currentProfileId,
      reported_profile_id: input.value.profileId,
      reason: input.value.reason,
      details: input.value.details,
    }]);
    if (reportError) {
      return errorResponse(
        { code: "INTERNAL_ERROR", message: "Your report could not be submitted." },
        500,
        origin,
        allowedOrigins,
      );
    }
    await admin.database.from("product_events").insert([{
      profile_id: currentProfileId,
      event_name: "profile_reported",
      properties: { reason: input.value.reason },
    }]);
    return jsonResponse(
      { action: "report", profileId: input.value.profileId, submitted: true },
      200,
      origin,
      allowedOrigins,
    );
  }

  const { error: blockError } = await admin.database.from("profile_blocks").insert([{
    blocker_profile_id: currentProfileId,
    blocked_profile_id: input.value.profileId,
  }]);
  if (blockError && !isUniqueViolation(blockError)) {
    return errorResponse(
      { code: "INTERNAL_ERROR", message: "That profile could not be hidden." },
      500,
      origin,
      allowedOrigins,
    );
  }

  const respondedAt = new Date().toISOString();
  await Promise.all([
    admin.database.from("connections")
      .update({ status: "declined", responded_at: respondedAt })
      .eq("sender_id", currentProfileId)
      .eq("recipient_id", input.value.profileId)
      .in("status", ["pending", "accepted"]),
    admin.database.from("connections")
      .update({ status: "declined", responded_at: respondedAt })
      .eq("sender_id", input.value.profileId)
      .eq("recipient_id", currentProfileId)
      .in("status", ["pending", "accepted"]),
  ]);
  await admin.database.from("product_events").insert([{
    profile_id: currentProfileId,
    event_name: "profile_hidden",
    properties: {},
  }]);

  return jsonResponse(
    { action: "block", profileId: input.value.profileId, hidden: true },
    200,
    origin,
    allowedOrigins,
  );
}

export async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get("Origin");
  let allowedOrigins = new Set<string>();
  try {
    allowedOrigins = parseAllowedOrigins(Deno.env.get("BREA_ALLOWED_ORIGINS"));
    return await handleRequest(request);
  } catch {
    return errorResponse(
      { code: "INTERNAL_ERROR", message: "This safety action is temporarily unavailable." },
      500,
      origin,
      allowedOrigins,
    );
  }
}

export default handler;
