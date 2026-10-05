// Google OAuth token broker for Personal Jarvis desktop installs.
//
// Google's token endpoint refuses a code exchange or a refresh for the shared
// "Personal Jarvis" Desktop client unless the request carries the client
// secret, even with PKCE. That secret must never ship inside the app, so the
// app sends the two token grants here instead. This Worker adds the client id
// and secret, forwards the request to Google, and returns Google's answer —
// status and JSON body — unchanged.
//
// What it deliberately does NOT do:
//   - store anything: no database, no KV, no tokens kept between requests;
//   - log anything: no console output, observability is off in wrangler.toml;
//   - accept browsers: no CORS headers, POST only, tiny bodies;
//   - accept arbitrary redirects: an authorization code is only exchanged for a
//     loopback redirect_uri (the desktop app's own local callback) and only
//     together with a PKCE code_verifier, so a code phished for a web redirect
//     cannot be redeemed here.

export const ROUTE = "/oauth/google/token";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

const MAX_REQUEST_BYTES = 8 * 1024;
const MAX_UPSTREAM_BYTES = 64 * 1024;
const UPSTREAM_TIMEOUT_MS = 15_000;

// RFC 7636 section 4.1: 43-128 characters from the unreserved set.
const CODE_VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/;
// Authorization codes and refresh tokens are opaque printable ASCII.
const OPAQUE_TOKEN = /^[\x21-\x7e]{1,2048}$/;
// Explicit port required; the host must be a loopback literal or localhost.
const LOOPBACK_PREFIX = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\]):(\d{1,5})(?=[/?]|$)/i;

const ALLOWED_FIELDS = {
  authorization_code: new Set(["grant_type", "code", "code_verifier", "redirect_uri", "client_id"]),
  refresh_token: new Set(["grant_type", "refresh_token", "client_id"]),
};

const BASE_HEADERS = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'",
};

class BrokerError extends Error {
  constructor(status, error, description, headers = {}) {
    super(description);
    this.status = status;
    this.error = error;
    this.headers = headers;
  }
}

function oauthError(status, error, description, headers = {}) {
  return new Response(JSON.stringify({ error, error_description: description }), {
    status,
    headers: { ...BASE_HEADERS, ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}

/** True when `value` is an http loopback redirect with an explicit port. */
export function isLoopbackRedirect(value) {
  if (typeof value !== "string" || value.length > 512) return false;
  const prefix = LOOPBACK_PREFIX.exec(value);
  if (!prefix) return false;
  const port = Number(prefix[2]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return false;
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" || url.username || url.password || url.hash) return false;
  return ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
}

async function readBounded(stream, limit, onOverflow) {
  if (!stream) return "";
  const reader = stream.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw onOverflow();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

const tooLarge = () => new BrokerError(413, "invalid_request", "Request body too large");

async function readFields(request) {
  if (Number(request.headers.get("content-length") || 0) > MAX_REQUEST_BYTES) throw tooLarge();
  const raw = await readBounded(request.body, MAX_REQUEST_BYTES, tooLarge);
  const type = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const fields = new Map();
  if (type === "application/x-www-form-urlencoded") {
    for (const [name, value] of new URLSearchParams(raw)) {
      // RFC 6749 section 3.2: request parameters must not repeat.
      if (fields.has(name)) throw new BrokerError(400, "invalid_request", `Repeated parameter: ${name}`);
      fields.set(name, value);
    }
    return fields;
  }
  if (type === "application/json") {
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new BrokerError(400, "invalid_request", "Body is not valid JSON");
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new BrokerError(400, "invalid_request", "Body must be a JSON object");
    }
    for (const [name, value] of Object.entries(body)) {
      if (typeof value !== "string") {
        throw new BrokerError(400, "invalid_request", `Parameter must be a string: ${name}`);
      }
      fields.set(name, value);
    }
    return fields;
  }
  throw new BrokerError(
    400,
    "invalid_request",
    "Use application/x-www-form-urlencoded or application/json",
  );
}

/** Validate the grant and build the form sent to Google (secret excluded). */
export function buildGrant(fields, clientId) {
  const grantType = fields.get("grant_type");
  const allowed = ALLOWED_FIELDS[grantType];
  if (!allowed) {
    throw new BrokerError(
      400,
      "unsupported_grant_type",
      "Only authorization_code and refresh_token are brokered",
    );
  }
  for (const name of fields.keys()) {
    if (!allowed.has(name)) throw new BrokerError(400, "invalid_request", `Unexpected parameter: ${name}`);
  }
  const requested = fields.get("client_id");
  if (requested !== undefined && requested !== clientId) {
    throw new BrokerError(400, "invalid_client", "This broker serves a different OAuth client");
  }
  const form = new URLSearchParams({ grant_type: grantType });
  if (grantType === "authorization_code") {
    const code = fields.get("code");
    const verifier = fields.get("code_verifier");
    const redirect = fields.get("redirect_uri");
    if (!OPAQUE_TOKEN.test(code ?? "")) throw new BrokerError(400, "invalid_request", "Missing or malformed code");
    if (!CODE_VERIFIER.test(verifier ?? "")) {
      throw new BrokerError(400, "invalid_request", "A PKCE code_verifier is required");
    }
    if (!isLoopbackRedirect(redirect)) {
      throw new BrokerError(400, "invalid_request", "redirect_uri must be an http loopback address with a port");
    }
    form.set("code", code);
    form.set("code_verifier", verifier);
    form.set("redirect_uri", redirect);
  } else {
    const refresh = fields.get("refresh_token");
    if (!OPAQUE_TOKEN.test(refresh ?? "")) {
      throw new BrokerError(400, "invalid_request", "Missing or malformed refresh_token");
    }
    form.set("refresh_token", refresh);
  }
  return form;
}

async function rateLimited(request, env) {
  if (!env.PER_IP || typeof env.PER_IP.limit !== "function") return false;
  const key = request.headers.get("CF-Connecting-IP") || "unknown";
  try {
    const { success } = await env.PER_IP.limit({ key });
    return !success;
  } catch {
    // A limiter outage must not take sign-in down with it.
    return false;
  }
}

async function broker(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== ROUTE) return oauthError(404, "not_found", "Not found");
  if (request.method !== "POST") {
    return oauthError(405, "invalid_request", "POST only", { Allow: "POST" });
  }
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return oauthError(503, "temporarily_unavailable", "Broker is not configured");
  }
  if (await rateLimited(request, env)) {
    return oauthError(429, "temporarily_unavailable", "Too many requests", { "Retry-After": "60" });
  }
  const form = buildGrant(await readFields(request), env.GOOGLE_CLIENT_ID);
  form.set("client_id", env.GOOGLE_CLIENT_ID);
  form.set("client_secret", env.GOOGLE_CLIENT_SECRET);

  let upstream;
  try {
    upstream = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
      redirect: "manual",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return oauthError(502, "temporarily_unavailable", "Google's token endpoint is unreachable");
  }
  let text;
  try {
    text = await readBounded(upstream.body, MAX_UPSTREAM_BYTES, () => new Error("upstream too large"));
  } catch {
    return oauthError(502, "temporarily_unavailable", "Google's answer could not be read");
  }
  return new Response(text, {
    status: upstream.status,
    headers: {
      ...BASE_HEADERS,
      "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
    },
  });
}

export default {
  async fetch(request, env) {
    try {
      return await broker(request, env);
    } catch (error) {
      if (error instanceof BrokerError) {
        return oauthError(error.status, error.error, error.message, error.headers);
      }
      return oauthError(500, "server_error", "Broker error");
    }
  },
};
