import { createAdminClient, createClient } from "npm:@insforge/sdk@1.4.5";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESOLUTIONS = new Set(["resolved", "dismissed"]);
const QUEUE_LIMIT = 200;

type ApiError = { code: string; message: string };
type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: ApiError };
export type ModerationInput =
  | { action: "queue" }
  | {
    action: "resolve";
    reportId: string;
    resolution: "resolved" | "dismissed";
    hideProfile: boolean;
  };

export function validateModerationInput(value: unknown): ValidationResult<ModerationInput> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      error: { code: "INVALID_REQUEST", message: "Request body must be a JSON object." },
    };
  }
  const body = value as Record<string, unknown>;
  if (body.action === "queue") return { ok: true, value: { action: "queue" } };
  if (body.action !== "resolve") {
    return {
      ok: false,
      error: { code: "INVALID_REQUEST", message: "action must be 'queue' or 'resolve'." },
    };
  }
  if (typeof body.reportId !== "string" || !UUID_PATTERN.test(body.reportId)) {
    return {
      ok: false,
      error: { code: "INVALID_REQUEST", message: "reportId must be a valid UUID." },
    };
  }
  if (typeof body.resolution !== "string" || !RESOLUTIONS.has(body.resolution)) {
    return {
      ok: false,
      error: { code: "INVALID_REQUEST", message: "resolution must be 'resolved' or 'dismissed'." },
    };
  }
  return {
    ok: true,
    value: {
      action: "resolve",
      reportId: body.reportId,
      resolution: body.resolution as "resolved" | "dismissed",
      hideProfile: body.hideProfile === true,
    },
  };
}

export function parseAllowedOrigins(value: string | undefined): Set<string> {
  return new Set((value ?? "").split(",").map((origin) => origin.trim()).filter(Boolean));
}

// ponytail: env-var email allowlist is the whole admin auth posture until
// OPS-02 (#26) lands a real role model; swap this for a role check then.
export function parseAdminEmails(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean),
  );
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
        message: "The moderation console is temporarily unavailable.",
      },
    };
  }
  return { ok: true, value: { baseUrl, apiKey } };
}

type ProfileSummary = {
  id: string;
  name: string;
  headline: string | null;
  is_discoverable: boolean;
};

function profileSummary(profiles: Map<string, ProfileSummary>, id: string | null) {
  if (!id) return null;
  const profile = profiles.get(id);
  if (!profile) return null;
  return {
    id: profile.id,
    name: profile.name,
    headline: profile.headline,
    isDiscoverable: profile.is_discoverable,
  };
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
  const input = validateModerationInput(body);
  if (!input.ok) return errorResponse(input.error, 400, origin, allowedOrigins);

  const config = configuration();
  if (!config.ok) return errorResponse(config.error, 503, origin, allowedOrigins);
  const accessToken = bearerToken(request.headers);
  if (!accessToken) {
    return errorResponse(
      { code: "AUTH_REQUIRED", message: "Sign in to use the moderation console." },
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

  const adminEmails = parseAdminEmails(Deno.env.get("BREA_ADMIN_EMAILS"));
  const adminEmail = userData.user.email?.trim().toLowerCase() ?? "";
  if (!adminEmail || !adminEmails.has(adminEmail)) {
    return errorResponse(
      { code: "FORBIDDEN", message: "This account is not a moderator." },
      403,
      origin,
      allowedOrigins,
    );
  }

  const admin = createAdminClient({ baseUrl: config.value.baseUrl, apiKey: config.value.apiKey });

  if (input.value.action === "resolve") {
    const { data: updated, error: updateError } = await admin.database
      .from("profile_reports")
      .update({
        status: input.value.resolution,
        resolved_at: new Date().toISOString(),
        resolved_by: adminEmail,
      })
      .eq("id", input.value.reportId)
      .eq("status", "open")
      .select("id, reported_profile_id");
    if (updateError) {
      return errorResponse(
        { code: "INTERNAL_ERROR", message: "The report could not be updated." },
        500,
        origin,
        allowedOrigins,
      );
    }
    const row = (updated as { id: string; reported_profile_id: string }[] | null)?.[0];
    if (!row) {
      return errorResponse(
        { code: "REPORT_NOT_FOUND", message: "That report is missing or already handled." },
        404,
        origin,
        allowedOrigins,
      );
    }
    if (input.value.hideProfile) {
      const { error: hideError } = await admin.database
        .from("profiles")
        .update({ is_discoverable: false })
        .eq("id", row.reported_profile_id);
      if (hideError) {
        return errorResponse(
          {
            code: "INTERNAL_ERROR",
            message: "The report was updated but the profile was not hidden.",
          },
          500,
          origin,
          allowedOrigins,
        );
      }
    }
    return jsonResponse(
      { reportId: row.id, status: input.value.resolution, hidden: input.value.hideProfile },
      200,
      origin,
      allowedOrigins,
    );
  }

  const [reportsResult, blocksResult] = await Promise.all([
    admin.database.from("profile_reports")
      .select("id, reporter_profile_id, reported_profile_id, reason, details, status, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(QUEUE_LIMIT),
    admin.database.from("profile_blocks")
      .select("id, blocker_profile_id, blocked_profile_id, created_at")
      .order("created_at", { ascending: false })
      .limit(QUEUE_LIMIT),
  ]);
  if (reportsResult.error || blocksResult.error) {
    return errorResponse(
      { code: "INTERNAL_ERROR", message: "The moderation queue could not be loaded." },
      500,
      origin,
      allowedOrigins,
    );
  }
  type ReportRow = {
    id: string;
    reporter_profile_id: string | null;
    reported_profile_id: string;
    reason: string;
    details: string | null;
    status: string;
    created_at: string;
  };
  type BlockRow = {
    id: string;
    blocker_profile_id: string;
    blocked_profile_id: string;
    created_at: string;
  };
  const reports = (reportsResult.data ?? []) as ReportRow[];
  const blocks = (blocksResult.data ?? []) as BlockRow[];

  const profileIds = [
    ...new Set(
      [
        ...reports.flatMap((row) => [row.reporter_profile_id, row.reported_profile_id]),
        ...blocks.flatMap((row) => [row.blocker_profile_id, row.blocked_profile_id]),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];
  const profiles = new Map<string, ProfileSummary>();
  if (profileIds.length > 0) {
    const { data: profileData, error: profileError } = await admin.database
      .from("profiles")
      .select("id, name, headline, is_discoverable")
      .in("id", profileIds);
    if (profileError) {
      return errorResponse(
        { code: "INTERNAL_ERROR", message: "The moderation queue could not be loaded." },
        500,
        origin,
        allowedOrigins,
      );
    }
    for (const profile of (profileData ?? []) as ProfileSummary[]) {
      profiles.set(profile.id, profile);
    }
  }

  return jsonResponse(
    {
      reports: reports.map((row) => ({
        id: row.id,
        reason: row.reason,
        details: row.details,
        status: row.status,
        createdAt: row.created_at,
        reporter: profileSummary(profiles, row.reporter_profile_id),
        reported: profileSummary(profiles, row.reported_profile_id),
      })),
      blocks: blocks.map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        blocker: profileSummary(profiles, row.blocker_profile_id),
        blocked: profileSummary(profiles, row.blocked_profile_id),
      })),
    },
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
      { code: "INTERNAL_ERROR", message: "The moderation console is temporarily unavailable." },
      500,
      origin,
      allowedOrigins,
    );
  }
}

export default handler;
