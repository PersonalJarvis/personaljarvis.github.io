// Run with: node --test workers/google-token-broker/test/
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import worker, { GOOGLE_TOKEN_URL, ROUTE, isLoopbackRedirect } from "../src/index.mjs";

const ENDPOINT = `https://token.example.test${ROUTE}`;
const CLIENT_ID = "123-test.apps.googleusercontent.com";
const SECRET = "test-secret-value";
const VERIFIER = "v".repeat(43);
const env = () => ({ GOOGLE_CLIENT_ID: CLIENT_ID, GOOGLE_CLIENT_SECRET: SECRET });

let calls;
let answer;
const realFetch = globalThis.fetch;

beforeEach(() => {
  calls = [];
  answer = () =>
    new Response(JSON.stringify({ error: "invalid_grant", error_description: "Bad Request" }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init, form: new URLSearchParams(init.body) });
    return answer();
  };
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

function post(body, { type = "application/x-www-form-urlencoded", url = ENDPOINT, headers = {} } = {}) {
  const payload = type === "application/json" ? JSON.stringify(body) : new URLSearchParams(body).toString();
  return new Request(url, { method: "POST", headers: { "Content-Type": type, ...headers }, body: payload });
}

const codeGrant = (overrides = {}) => ({
  grant_type: "authorization_code",
  code: "4/0AbCdEf-test",
  code_verifier: VERIFIER,
  redirect_uri: "http://127.0.0.1:3121",
  ...overrides,
});

test("code exchange injects the client and returns Google's answer unchanged", async () => {
  const response = await worker.fetch(post(codeGrant()), env());
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid_grant", error_description: "Bad Request" });
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, GOOGLE_TOKEN_URL);
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(Object.fromEntries(calls[0].form), {
    grant_type: "authorization_code",
    code: "4/0AbCdEf-test",
    code_verifier: VERIFIER,
    redirect_uri: "http://127.0.0.1:3121",
    client_id: CLIENT_ID,
    client_secret: SECRET,
  });
});

test("a successful refresh passes Google's status and body through", async () => {
  answer = () =>
    new Response('{"access_token":"ya29.x","expires_in":3599}', {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  const response = await worker.fetch(
    post({ grant_type: "refresh_token", refresh_token: "1//refresh-test" }, { type: "application/json" }),
    env(),
  );
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '{"access_token":"ya29.x","expires_in":3599}');
  assert.deepEqual(Object.fromEntries(calls[0].form), {
    grant_type: "refresh_token",
    refresh_token: "1//refresh-test",
    client_id: CLIENT_ID,
    client_secret: SECRET,
  });
});

test("a matching client_id from the app is accepted, a different one is not", async () => {
  assert.equal((await worker.fetch(post(codeGrant({ client_id: CLIENT_ID })), env())).status, 400);
  assert.equal(calls.length, 1);
  const response = await worker.fetch(post(codeGrant({ client_id: "other" })), env());
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "invalid_client");
  assert.equal(calls.length, 1);
});

for (const redirect of [
  "https://evil.example/callback",
  "http://evil.example:3121/",
  "https://127.0.0.1:3121/",
  "http://127.0.0.1/",
  "http://127.0.0.1:0/",
  "http://127.0.0.1:70000/",
  "http://user:pw@127.0.0.1:3121/",
  "http://127.0.0.1.evil.example:3121/",
  "http://127.0.0.1:3121@evil.example/",
  "http://127.0.0.1:3121/#frag",
  "",
]) {
  test(`non-loopback redirect is refused before Google is called: ${redirect || "(empty)"}`, async () => {
    const response = await worker.fetch(post(codeGrant({ redirect_uri: redirect })), env());
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, "invalid_request");
    assert.equal(calls.length, 0);
  });
}

test("loopback forms the desktop app uses are accepted", () => {
  for (const ok of [
    "http://127.0.0.1:3120",
    "http://127.0.0.1:43891/oauth/callback",
    "http://localhost:3121/",
    "http://[::1]:3122/cb",
  ]) {
    assert.equal(isLoopbackRedirect(ok), true, ok);
  }
});

test("authorization_code without a PKCE verifier is refused", async () => {
  const grant = codeGrant();
  delete grant.code_verifier;
  assert.equal((await worker.fetch(post(grant), env())).status, 400);
  assert.equal((await worker.fetch(post(codeGrant({ code_verifier: "short" })), env())).status, 400);
  assert.equal(calls.length, 0);
});

test("other grants, extra fields and a supplied secret are refused", async () => {
  const cases = [
    { grant_type: "client_credentials" },
    { grant_type: "password", username: "a", password: "b" },
    codeGrant({ client_secret: "x" }),
    codeGrant({ scope: "openid" }),
    { grant_type: "refresh_token" },
    {},
  ];
  for (const body of cases) {
    const response = await worker.fetch(post(body), env());
    assert.equal(response.status, 400, JSON.stringify(body));
  }
  assert.equal(calls.length, 0);
});

test("repeated form parameters are refused", async () => {
  const body = `${new URLSearchParams(codeGrant())}&code=second`;
  const request = new Request(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  assert.equal((await worker.fetch(request, env())).status, 400);
  assert.equal(calls.length, 0);
});

test("unsupported content types and non-string JSON values are refused", async () => {
  const text = new Request(ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain" }, body: "x" });
  assert.equal((await worker.fetch(text, env())).status, 400);
  const nested = post({ grant_type: "refresh_token", refresh_token: ["a"] }, { type: "application/json" });
  assert.equal((await worker.fetch(nested, env())).status, 400);
  assert.equal(calls.length, 0);
});

test("oversized bodies are refused", async () => {
  const response = await worker.fetch(post(codeGrant({ code: "x".repeat(9000) })), env());
  assert.equal(response.status, 413);
  assert.equal(calls.length, 0);
});

test("only POST on the one route", async () => {
  const get = await worker.fetch(new Request(ENDPOINT), env());
  assert.equal(get.status, 405);
  assert.equal(get.headers.get("Allow"), "POST");
  const other = await worker.fetch(post(codeGrant(), { url: "https://token.example.test/" }), env());
  assert.equal(other.status, 404);
  assert.equal(calls.length, 0);
});

test("a missing secret reports the broker as unconfigured", async () => {
  const response = await worker.fetch(post(codeGrant()), { GOOGLE_CLIENT_ID: CLIENT_ID });
  assert.equal(response.status, 503);
  assert.equal(calls.length, 0);
});

test("an unreachable Google maps to 502", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("network down");
  };
  const response = await worker.fetch(post(codeGrant()), env());
  assert.equal(response.status, 502);
  assert.equal((await response.json()).error, "temporarily_unavailable");
});

test("the per-address rate limit answers 429 without calling Google", async () => {
  const seen = [];
  const limited = {
    ...env(),
    PER_IP: {
      limit: async ({ key }) => {
        seen.push(key);
        return { success: false };
      },
    },
  };
  const response = await worker.fetch(post(codeGrant(), { headers: { "CF-Connecting-IP": "203.0.113.9" } }), limited);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.deepEqual(seen, ["203.0.113.9"]);
  assert.equal(calls.length, 0);
});

test("error answers never echo the secret", async () => {
  const response = await worker.fetch(post(codeGrant({ redirect_uri: "https://evil.example/" })), env());
  assert.equal((await response.text()).includes(SECRET), false);
});
