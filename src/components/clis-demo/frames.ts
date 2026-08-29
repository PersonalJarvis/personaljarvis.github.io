/**
 * The CLIs demo script.
 *
 * Read out of the app and then checked a second time against the source. Four
 * things the adversarial pass threw out, all of them plausible:
 *
 *  - A hand-picked row order. The API sorts by (category, display_name), so
 *    GitHub CLI is roughly the eleventh row, not the first.
 *  - The risk badge "monitor" beside `gh pr list --state open`. `monitor` is
 *    the CLI's DEFAULT tier; the gate resolves per command, and gh's whitelist
 *    contains `gh pr list*`, so this exact command comes back `safe`. Pairing
 *    it with "monitor" would misstate the product's own safety gate — and it
 *    is the more interesting claim anyway: a read command is auto-downgraded.
 *  - A green safe badge. Nothing in the app's risk styles is green; safe is the
 *    quietest grey of the four.
 *  - "Target:" as a label on the CLI picker. No such string exists.
 *
 * Everything below — binary, commands, auth mode, tier, blocked and allowed
 * patterns, the example call — is verbatim from jarvis/clis/catalog/seed_catalog.json.
 * The connection statuses are this machine's runtime state, not catalog facts.
 */

export type CliStatus = "connected" | "disconnected" | "not installed";

export interface DemoCli {
  id: string;
  name: string;
  category: string;
  status: CliStatus;
}

/** Five of the twenty-two, in the order the app sorts them: by category, then
 *  display name. */
export const CATALOG: DemoCli[] = [
  { id: "wrangler", name: "Cloudflare Wrangler", category: "cloud", status: "not installed" },
  { id: "gcloud", name: "Google Cloud CLI", category: "cloud", status: "connected" },
  { id: "docker", name: "Docker CLI", category: "container", status: "connected" },
  { id: "gh", name: "GitHub CLI", category: "git", status: "connected" },
  { id: "glab", name: "GitLab CLI", category: "git", status: "disconnected" },
];

/** The one entry the demo opens, verbatim from the seed catalog. */
export const DETAIL = {
  name: "GitHub CLI",
  description: "GitHub Repos, PRs, Issues, Actions, Releases.",
  binary: "gh",
  commands: [
    { label: "Check", value: "gh --version" },
    { label: "Login", value: "gh auth login" },
    { label: "Status", value: "gh auth status" },
  ],
  authMode: "oauth_cli",
  defaultTier: "monitor",
  /** The catalog's blacklist. Four patterns; the demo shows all four. */
  blocked: [
    "gh repo delete *",
    "gh release delete *",
    "gh secret delete *",
    "gh secret set *",
  ],
  /** The catalog's whitelist has twelve; these are the four the story needs. */
  allowed: ["gh auth status*", "gh repo view*", "gh pr list*", "gh issue list*"],
};

/** The instruction the demo types, and what the app does with it. Both the
 *  instruction and the command are the catalog's own example call. */
export const RUN = {
  instruction: "Show my open pull requests",
  tool: "cli_gh",
  /** The RESOLVED tier, not the default: `gh pr list*` is on gh's whitelist,
   *  and a whitelist hit resolves to `safe`. */
  tier: "safe",
  exitCode: 0,
  command: "gh pr list --state open",
  duration: "412 ms",
};

export type Layout = "catalog" | "detail" | "gate" | "compose" | "result";

export interface Frame {
  duration: number;
  layout: Layout;
  hoverId?: string;
  /** How much of the instruction has been typed, for the composer frame. */
  typed?: number;
  caption: string;
}

export const CATALOG_TOTAL = 22;
export const CONNECTED_TOTAL = 3;
export const INSTALLED_TOTAL = 4;

export const FRAMES: Frame[] = [
  {
    duration: 4200,
    layout: "catalog",
    caption:
      "A list of command-line tools Jarvis can drive: twenty-two in the catalog, three connected here.",
  },
  {
    duration: 4200,
    layout: "detail",
    hoverId: "gh",
    caption:
      "Opening the GitHub CLI shows the binary it runs and the exact commands it uses to check it and sign in.",
  },
  {
    duration: 5000,
    layout: "gate",
    hoverId: "gh",
    caption:
      "Each tool carries its own blocked and allowed command patterns, so deleting a repository is refused before it is ever run.",
  },
  {
    duration: 3400,
    layout: "compose",
    caption:
      "In the test hub you ask in plain language: show my open pull requests.",
  },
  {
    duration: 5400,
    layout: "result",
    caption:
      "The answer comes with its evidence: which tool was picked, which risk tier the gate resolved, the exit code and the exact command that ran.",
  },
];

export const DEMO_DESCRIPTION = [
  "A demo of the app's CLIs section.",
  ...FRAMES.map((f) => f.caption),
].join(" ");
