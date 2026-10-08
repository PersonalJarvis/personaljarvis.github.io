// OAuth token broker for Personal Jarvis installs.
//
// Some providers refuse a code exchange or a refresh for the app's shared
// OAuth client unless the request carries the client secret, even with PKCE.
// That secret must never ship inside an installable app, so the app sends the
// two token grants here instead. This Worker adds the provider's client id and
// secret, forwards the request, and returns the provider's answer — status and
// body — unchanged.
//
//   POST /oauth/google/token   Google: loopback redirect_uri + PKCE required
//   POST /oauth/slack/token    Slack: redirect_uri must be this Worker's own
//                              /oauth/slack/callback, PKCE required
//   POST /oauth/figma/token    Figma: loopback redirect_uri + PKCE required;
//                              the client goes in a Basic header and a
//                              refresh is sent to Figma's /v1/oauth/refresh
//   GET  /oauth/slack/callback Slack only allows https redirect URLs for a
//                              distributed app, so its browser redirect lands
//                              here and is bounced to the desktop app's local
//                              listener with only code, state and error.
//
// What it deliberately does NOT do:
//   - store anything: no database, no KV, no tokens kept between requests;
//   - log anything: no console output, observability is off in wrangler.toml;
//   - accept browsers on the token routes: no CORS headers, POST only, tiny
//     bodies;
//   - accept arbitrary redirects: an authorization code is only exchanged
//     together with a PKCE code_verifier and the redirect_uri the provider
//     entry allows, so a code phished for another redirect cannot be redeemed.

const MAX_REQUEST_BYTES = 8 * 1024;
const MAX_UPSTREAM_BYTES = 64 * 1024;
const UPSTREAM_TIMEOUT_MS = 15_000;

// RFC 7636 section 4.1: 43-128 characters from the unreserved set.
const CODE_VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/;
// Authorization codes, states and refresh tokens are opaque printable ASCII.
const OPAQUE_TOKEN = /^[\x21-\x7e]{1,2048}$/;
// Explicit port required; the host must be a loopback literal or localhost.
const LOOPBACK_PREFIX = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\]):(\d{1,5})(?=[/?]|$)/i;

/**
 * One entry per provider. `redirect` decides which redirect_uri an
 * authorization_code grant may carry: `loopback` (the desktop app's own local
 * listener, as for Google Desktop clients) or `callback` (exactly this
 * Worker's /oauth/<provider>/callback, whose GET bounces to `localCallback`).
 */
export const PROVIDERS = {
  google: {
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientIdVar: "GOOGLE_CLIENT_ID",
    secretVar: "GOOGLE_CLIENT_SECRET",
    redirect: "loopback",
  },
  slack: {
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    clientIdVar: "SLACK_CLIENT_ID",
    secretVar: "SLACK_CLIENT_SECRET",
    redirect: "callback",
    localCallback: "http://127.0.0.1:3118/oauth/callback",
  },
  // Figma takes the client in an HTTP Basic header and refreshes at its own
  // endpoint, which expects only the refresh token in the body.
  figma: {
    tokenUrl: "https://api.figma.com/v1/oauth/token",
    refreshUrl: "https://api.figma.com/v1/oauth/refresh",
    clientIdVar: "FIGMA_CLIENT_ID",
    secretVar: "FIGMA_CLIENT_SECRET",
    redirect: "loopback",
    clientAuth: "basic",
  },
};

const ROUTE = /^\/oauth\/([a-z]+)\/(token|callback)$/;
const BOUNCED_PARAMS = ["code", "state", "error"];

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

/** The https callback this Worker serves for `name`, on the request's origin. */
export function brokerCallback(requestUrl, name) {
  return `${new URL(requestUrl).origin}/oauth/${name}/callback`;
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

/**
 * Validate the grant and build the form sent to the provider (secret
 * excluded). `allowedRedirect` is the exact https callback for `callback`
 * providers and ignored for `loopback` ones.
 */
export function buildGrant(fields, provider, clientId, allowedRedirect) {
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
    if (provider.redirect === "loopback" && !isLoopbackRedirect(redirect)) {
      throw new BrokerError(400, "invalid_request", "redirect_uri must be an http loopback address with a port");
    }
    if (provider.redirect === "callback" && redirect !== allowedRedirect) {
      throw new BrokerError(400, "invalid_request", "redirect_uri must be this broker's callback");
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

/** Bounce a provider's browser redirect to the desktop app's local listener. */
function bounce(url, provider) {
  const target = new URL(provider.localCallback);
  for (const name of BOUNCED_PARAMS) {
    const values = url.searchParams.getAll(name);
    if (values.length === 0) continue;
    if (values.length > 1 || !OPAQUE_TOKEN.test(values[0])) {
      return oauthError(400, "invalid_request", `Malformed parameter: ${name}`);
    }
    target.searchParams.set(name, values[0]);
  }
  return new Response(null, { status: 302, headers: { ...BASE_HEADERS, Location: target.href } });
}

async function exchange(request, env, name, provider) {
  if (request.method !== "POST") {
    return oauthError(405, "invalid_request", "POST only", { Allow: "POST" });
  }
  const clientId = env[provider.clientIdVar];
  const secret = env[provider.secretVar];
  if (!clientId || !secret) {
    return oauthError(503, "temporarily_unavailable", "Broker is not configured");
  }
  if (await rateLimited(request, env)) {
    return oauthError(429, "temporarily_unavailable", "Too many requests", { "Retry-After": "60" });
  }
  const form = buildGrant(
    await readFields(request),
    provider,
    clientId,
    brokerCallback(request.url, name),
  );
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const isRefresh = form.get("grant_type") === "refresh_token";
  const targetUrl = isRefresh && provider.refreshUrl ? provider.refreshUrl : provider.tokenUrl;
  if (isRefresh && provider.refreshUrl) form.delete("grant_type");
  if (provider.clientAuth === "basic") {
    // RFC 6749 section 2.3.1: both parts form-encoded before base64.
    const pair = `${encodeURIComponent(clientId)}:${encodeURIComponent(secret)}`;
    headers.Authorization = `Basic ${btoa(pair)}`;
  } else {
    form.set("client_id", clientId);
    form.set("client_secret", secret);
  }

  let upstream;
  try {
    upstream = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: form.toString(),
      redirect: "manual",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return oauthError(502, "temporarily_unavailable", "The provider's token endpoint is unreachable");
  }
  let text;
  try {
    text = await readBounded(upstream.body, MAX_UPSTREAM_BYTES, () => new Error("upstream too large"));
  } catch {
    return oauthError(502, "temporarily_unavailable", "The provider's answer could not be read");
  }
  return new Response(text, {
    status: upstream.status,
    headers: {
      ...BASE_HEADERS,
      "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
    },
  });
}

async function route(request, env) {
  const url = new URL(request.url);
  const match = ROUTE.exec(url.pathname);
  const provider = match && Object.hasOwn(PROVIDERS, match[1]) ? PROVIDERS[match[1]] : null;
  if (!provider) return oauthError(404, "not_found", "Not found");
  if (match[2] === "token") return exchange(request, env, match[1], provider);
  if (provider.redirect !== "callback") return oauthError(404, "not_found", "Not found");
  if (request.method !== "GET" && request.method !== "HEAD") {
    return oauthError(405, "invalid_request", "GET only", { Allow: "GET" });
  }
  return bounce(url, provider);
}

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (error) {
      if (error instanceof BrokerError) {
        return oauthError(error.status, error.error, error.message, error.headers);
      }
      return oauthError(500, "server_error", "Broker error");
    }
  },
};
