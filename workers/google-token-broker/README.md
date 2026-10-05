# Google token broker

A Cloudflare Worker at **`https://token.personaljarvis.ai/oauth/google/token`**
that lets the Personal Jarvis desktop app sign in to Google without carrying
the Google client secret.

## Why it exists

The app's Google plugins (Gmail, Google Drive, Google Calendar, YouTube Music,
YouTube Studio, Google Cloud) use one shared Google **Desktop** OAuth client.
Google's token endpoint rejects a code exchange and a refresh for that client
without `client_secret`, even when PKCE is used (`invalid_request: "client_secret
is missing."`). A secret shipped inside an installable app is not a secret, so
the app sends exactly two grants here and this Worker adds the secret:

| Grant | Required fields | Rule |
| --- | --- | --- |
| `authorization_code` | `code`, `code_verifier`, `redirect_uri` | `redirect_uri` must be `http://127.0.0.1:<port>/…`, `http://localhost:<port>/…` or `http://[::1]:<port>/…`; the PKCE verifier is mandatory |
| `refresh_token` | `refresh_token` | — |

`client_id` may be sent and must then equal the shared client. Anything else —
another grant type, an extra field, a supplied `client_secret`, a repeated
parameter, a body over 8 KiB, a method other than POST — is refused with an
OAuth-shaped error before Google is called. Accepted requests go to
`https://oauth2.googleapis.com/token` and Google's status and JSON come back
unchanged.

Body: `application/x-www-form-urlencoded` (what the app sends) or
`application/json`.

## What it never does

- **No storage.** No D1, KV or Durable Object; nothing survives a request.
- **No logs.** No `console` calls, and `observability` is off in
  `wrangler.toml`. Bodies carry authorization codes and tokens.
- **No CORS.** It answers no preflight and sets no `Access-Control-*` header,
  so a web page cannot use it from a browser.
- **No secret in source.** The client id is public and lives in
  `wrangler.toml`; the secret lives only in the Worker's encrypted secret
  store.

A free Workers rate-limit binding (`PER_IP`, 30 requests a minute per address)
answers `429` beyond that. A limiter outage fails open so sign-in keeps working.

## Deploy

Needs `wrangler` logged in to the Cloudflare account that holds the
`personaljarvis.ai` zone (an API token in `CLOUDFLARE_API_TOKEN` works).

```sh
cd workers/google-token-broker
wrangler deploy                              # code + custom domain
wrangler secret put GOOGLE_CLIENT_SECRET     # paste the secret at the prompt
```

The secret comes from the Google Cloud console (Clients → the "Personal Jarvis"
Desktop client). Rotating it is the same `secret put`; no code change and no
app release.

## Check it

```sh
node --test workers/google-token-broker/test/broker.test.mjs
```

Live, without any real credential:

```sh
# A made-up code must come back as Google's invalid_grant. That proves the
# secret was attached: without it Google answers "client_secret is missing."
curl -s -X POST https://token.personaljarvis.ai/oauth/google/token \
  -d grant_type=authorization_code -d code=invalid \
  -d code_verifier=vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv \
  -d redirect_uri=http://127.0.0.1:3121

# A web redirect must be refused by the broker itself (400 invalid_request).
curl -s -X POST https://token.personaljarvis.ai/oauth/google/token \
  -d grant_type=authorization_code -d code=x \
  -d code_verifier=vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv \
  -d redirect_uri=https://example.com/cb
```

The site itself stays a static GitHub Pages build; this Worker is the only
server-side code for `personaljarvis.ai` and is deployed separately from it.
