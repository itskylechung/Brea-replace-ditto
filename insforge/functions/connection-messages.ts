import { createAdminClient, createClient } from "npm:@insforge/sdk@1.4.5";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_LENGTH = 2000;
// ponytail: fixed window, no cursor — clients refetch the latest page while
// polling. Add an `after` cursor when conversations outgrow 200 messages.
const LIST_LIMIT = 200;

type ApiError = { code: string; message: string };
type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: ApiError };

export type MessagesInput =
  | { action: "list"; connectionId: string }
  | { action: "send"; connectionId: string; body: string };

export type ConnectionRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined";
};

export type MessageRow = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export function validateMessagesInput(value: unknown): ValidationResult<MessagesInput> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      error: { code: "INVALID_REQUEST", message: "Request body must be a JSON object." },
    };
  }
  const body = value as Record<string, unknown>;
  if (typeof body.connectionId !== "string" || !UUID_PATTERN.test(body.connectionId)) {
    return {
      ok: false,
      error: { code: "INVALID_REQUEST", message: "connectionId must be a valid UUID." },
    };
  }
  if (body.action === "list") {
    return { ok: true, value: { action: "list", connectionId: body.connectionId } };
  }
  if (body.action === "send") {
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (text.length === 0) {
      return {
        ok: false,
        error: { code: "INVALID_REQUEST", message: "A message cannot be empty." },
      };
    }
    if (text.length > MAX_BODY_LENGTH) {
      return {
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          message: `A message cannot be longer than ${MAX_BODY_LENGTH} characters.`,
        },
      };
    }
    return { ok: true, value: { action: "send", connectionId: body.connectionId, body: text } };
  }
  return {
    ok: false,
    error: { code: "INVALID_REQUEST", message: "action must be list or send." },
  };
}

// A conversation exists only for a caller who is a participant of an accepted,
// unblocked connection. Everything else is the same 404 — never reveal whether
// the connection exists, was declined, or involves a block.
export function conversationAccess(
  connection: ConnectionRow | null,
  profileId: string,
  isBlocked: boolean,
): { ok: true; connection: ConnectionRow } | { ok: false; error: ApiError; status: number } {
  const notFound = {
    ok: false as const,
    status: 404,
    error: { code: "CONVERSATION_NOT_FOUND", message: "This conversation is not available." },
  };
  if (!connection) return notFound;
  if (connection.sender_id !== profileId && connection.recipient_id !== profileId) return notFound;
  if (connection.status !== "accepted") return notFound;
  if (isBlocked) return notFound;
  return { ok: true, connection };
}

export function messageItem(row: MessageRow): {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
} {
  return { id: row.id, senderId: row.sender_id, body: row.body, createdAt: row.created_at };
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
      error: { code: "SERVICE_UNAVAILABLE", message: "Messaging is temporarily unavailable." },
    };
  }
  return { ok: true, value: { baseUrl, apiKey } };
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
  const input = validateMessagesInput(body);
  if (!input.ok) return errorResponse(input.error, 400, origin, allowedOrigins);

  const config = configuration();
  if (!config.ok) return errorResponse(config.error, 503, origin, allowedOrigins);
  const accessToken = bearerToken(request.headers);
  if (!accessToken) {
    return errorResponse(
      { code: "AUTH_REQUIRED", message: "Sign in to view your messages." },
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
  const { data: profileData, error: profileError } = await admin.database
    .from("profiles").select("id").eq("user_id", userData.user.id).maybeSingle();
  if (profileError || !profileData) {
    return errorResponse(
      { code: "PROFILE_SETUP_REQUIRED", message: "Complete your Brea profile first." },
      409,
      origin,
      allowedOrigins,
    );
  }
  const profileId = (profileData as { id: string }).id;

  const { data: connectionData, error: connectionError } = await admin.database
    .from("connections")
    .select("id, sender_id, recipient_id, status")
    .eq("id", input.value.connectionId)
    .maybeSingle();
  if (connectionError) {
    return errorResponse(
      { code: "INTERNAL_ERROR", message: "Messaging is temporarily unavailable." },
      500,
      origin,
      allowedOrigins,
    );
  }
  const connection = connectionData as unknown as ConnectionRow | null;

  // A block in either direction closes the conversation. Both participant ids
  // appear in both filters; the table's distinct-pair constraint means only
  // cross rows can match.
  let isBlocked = false;
  if (connection) {
    const participants = [connection.sender_id, connection.recipient_id];
    const { data: blockData, error: blockError } = await admin.database
      .from("profile_blocks")
      .select("id")
      .in("blocker_profile_id", participants)
      .in("blocked_profile_id", participants)
      .limit(1);
    if (blockError) {
      return errorResponse(
        { code: "INTERNAL_ERROR", message: "Messaging is temporarily unavailable." },
        500,
        origin,
        allowedOrigins,
      );
    }
    isBlocked = ((blockData ?? []) as unknown[]).length > 0;
  }

  const access = conversationAccess(connection, profileId, isBlocked);
  if (!access.ok) return errorResponse(access.error, access.status, origin, allowedOrigins);

  if (input.value.action === "send") {
    const { data: insertedData, error: insertError } = await admin.database
      .from("messages")
      .insert([{
        connection_id: access.connection.id,
        sender_id: profileId,
        body: input.value.body,
      }])
      .select("id, sender_id, body, created_at")
      .single();
    if (insertError || !insertedData) {
      return errorResponse(
        { code: "INTERNAL_ERROR", message: "Your message could not be sent. Please try again." },
        500,
        origin,
        allowedOrigins,
      );
    }
    return jsonResponse(
      messageItem(insertedData as unknown as MessageRow),
      200,
      origin,
      allowedOrigins,
    );
  }

  const { data: messagesData, error: messagesError } = await admin.database
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("connection_id", access.connection.id)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);
  if (messagesError) {
    return errorResponse(
      { code: "INTERNAL_ERROR", message: "Messaging is temporarily unavailable." },
      500,
      origin,
      allowedOrigins,
    );
  }
  const rows = ((messagesData ?? []) as unknown as MessageRow[]).reverse();
  return jsonResponse({ messages: rows.map(messageItem) }, 200, origin, allowedOrigins);
}

export async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get("Origin");
  let allowedOrigins = new Set<string>();
  try {
    allowedOrigins = parseAllowedOrigins(Deno.env.get("BREA_ALLOWED_ORIGINS"));
    return await handleRequest(request);
  } catch {
    return errorResponse(
      { code: "INTERNAL_ERROR", message: "Messaging is temporarily unavailable." },
      500,
      origin,
      allowedOrigins,
    );
  }
}

export default handler;
