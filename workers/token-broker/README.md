# OAuth token broker

A Cloudflare Worker on **`https://token.personaljarvis.ai`** that lets the
Personal Jarvis desktop app sign in to providers whose token endpoint insists
on a client secret, without the app ever carrying that secret.

| Route | Provider | What it does |
| --- | --- | --- |
| `POST /oauth/google/token` | Google | Code exchange + refresh for the shared Google Desktop client |
| `POST /oauth/slack/token` | Slack | Code exchange + refresh for the shared Slack app |
| `GET /oauth/slack/callback` | Slack | Browser redirect target; bounces to the app's local listener |
| `POST /oauth/figma/token` | Figma | Code exchange + refresh for the shared Figma app |

## Why it exists

**Google.** The app's Google plugins (Gmail, Google Drive, Google Calendar,
YouTube Music, YouTube Studio, Google Cloud) share one Google **Desktop** OAuth
client. Google's token endpoint rejects a code exchange and a refresh for it
without `client_secret`, even with PKCE (`invalid_request: "client_secret is
missing."`).

**Slack.** A publicly distributed Slack app may only register `https` redirect
URLs, so Slack cannot send the browser straight to the app's loopback listener.
Tokens obtained through a web redirect need the client secret for exchange
and refresh.

**Figma.** Figma's token endpoint takes the client id and secret in an HTTP
Basic header for both the code exchange and the refresh, even with PKCE, and
refreshes at its own `/v1/oauth/refresh` endpoint. The Worker sends the code
exchange to `api.figma.com/v1/oauth/token` and a refresh, with only the
refresh token in the body, to `api.figma.com/v1/oauth/refresh`.

A secret shipped inside an installable app is not a secret, so the app sends
exactly two grants here and this Worker adds the secret.

## Rules

| Grant | Required fields | Redirect rule |
| --- | --- | --- |
| `authorization_code` | `code`, `code_verifier`, `redirect_uri` | Google and Figma: `http://127.0.0.1:<port>/…`, `http://localhost:<port>/…` or `http://[::1]:<port>/…`. Slack: exactly `https://token.personaljarvis.ai/oauth/slack/callback` |
| `refresh_token` | `refresh_token` | — |

The PKCE verifier is mandatory for every code exchange. `client_id` may be
sent and must then equal the shared client. Everything else is refused with an
OAuth-shaped error before the provider is called: another grant type, an extra
field, a supplied `client_secret`, a repeated parameter, a body over 8 KiB, or
a method other than POST. Accepted requests go to the provider
(`oauth2.googleapis.com/token`, `slack.com/api/oauth.v2.access`), and its
status and body come back unchanged. Slack reports errors as HTTP 200 with
`"ok": false`, and that also passes through as-is.

The request body may be `application/x-www-form-urlencoded`, which is what the
app sends, or `application/json`.

`GET /oauth/slack/callback` answers `302` to
`http://127.0.0.1:3118/oauth/callback` and copies only `code`, `state` and
`error`. Anything else in the query is dropped. The desktop app checks `state`
as it would for a direct loopback redirect.

## What it never does

- **No storage.** No D1, KV or Durable Object; nothing survives a request.
- **No logs.** No `console` calls, and `observability` is off in
  `wrangler.toml`. Requests carry authorization codes and tokens.
- **No CORS.** It answers no preflight and sets no `Access-Control-*` header,
  so a web page cannot call the token routes from a browser.
- **No secret in source.** The client ids are public and live in
  `wrangler.toml`. The secrets live only in the Worker's encrypted secret
  store. A provider whose secret is missing answers `503` and the others keep
  working.

A free Workers rate-limit binding (`PER_IP`, 30 requests a minute per address)
answers `429` beyond that. If the limiter itself fails, requests are let
through so sign-in keeps working.

## Deploy

You need `wrangler` logged in to the Cloudflare account that holds the
`personaljarvis.ai` zone. An API token in `CLOUDFLARE_API_TOKEN` also works.

```sh
cd workers/token-broker
wrangler deploy                              # code + custom domain
wrangler secret put GOOGLE_CLIENT_SECRET     # paste at the prompt
wrangler secret put SLACK_CLIENT_SECRET      # paste at the prompt
wrangler secret put FIGMA_CLIENT_SECRET      # paste at the prompt
```

The secrets come from the Google Cloud console (Clients, then the "Personal
Jarvis" Desktop client), from the Slack app's Basic Information page and from
the Figma app's OAuth credentials (shown once when the app is created). To
rotate a secret, run the same `secret put` again. No code change and no app
release are needed.

The Slack app registers `https://token.personaljarvis.ai/oauth/slack/callback`
as its redirect URL.

## Check it

```sh
node --test workers/token-broker/test/broker.test.mjs
```

Live, without any real credential:

```sh
V=vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
# A made-up code must come back as Google's invalid_grant. That proves the
# secret was attached: without it Google answers "client_secret is missing."
curl -s -X POST https://token.personaljarvis.ai/oauth/google/token \
  -d grant_type=authorization_code -d code=invalid -d code_verifier=$V \
  -d redirect_uri=http://127.0.0.1:3121

# A web redirect must be refused by the broker itself (400 invalid_request).
curl -s -X POST https://token.personaljarvis.ai/oauth/google/token \
  -d grant_type=authorization_code -d code=x -d code_verifier=$V \
  -d redirect_uri=https://example.com/cb

# Slack: a made-up code returns Slack's {"ok":false,"error":"invalid_code"}.
curl -s -X POST https://token.personaljarvis.ai/oauth/slack/token \
  -d grant_type=authorization_code -d code=invalid -d code_verifier=$V \
  -d redirect_uri=https://token.personaljarvis.ai/oauth/slack/callback

# The bounce keeps only code/state/error.
curl -s -o /dev/null -w '%{redirect_url}\n' \
  'https://token.personaljarvis.ai/oauth/slack/callback?code=a&state=b&x=c'
```

The site itself stays a static GitHub Pages build. This Worker is the only
server-side code for `personaljarvis.ai` and is deployed separately from the
site.
