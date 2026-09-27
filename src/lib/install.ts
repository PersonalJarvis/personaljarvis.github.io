/**
 * The install one-liners, verbatim from the app's README.md § Install.
 *
 * One module, because the section PRINTS them, its client script copies them,
 * the box names the shell each one is pasted into, and the download buttons are
 * named after the same three machines: four literals would drift the moment the
 * installer moves, and the site would hand someone a command that 404s — or a
 * button whose label and destination disagree.
 *
 * The README has two lines, not three — macOS and Linux run the same `curl`.
 * The site still offers three choices, because "which of these is mine" is a
 * question the visitor should never have to answer: they pick their own
 * machine and the box hands them the line for it. Two of the three happen to
 * agree, and that is a property of the installer, not something to hide.
 */

const RAW = "https://raw.githubusercontent.com/PersonalJarvis/PersonalJarvis/main";

export const REPO = "https://github.com/PersonalJarvis/PersonalJarvis";

export const INSTALL_COMMANDS = {
  /** PowerShell. */
  windows: `irm ${RAW}/install/install.ps1 | iex`,
  /** macOS and Linux. */
  unix: `curl -fsSL ${RAW}/install/install.sh | bash`,
} as const;

export type OsId = "macos" | "windows" | "linux";

export interface InstallTarget {
  id: OsId;
  /** What the tab says. */
  label: string;
  /** The shell the line is pasted into, named on the box. */
  shell: string;
  /**
   * The prompt printed in front of the line. Decoration that tells the reader
   * which shell they are looking at — never part of what gets copied.
   */
  prompt: string;
  command: string;
}

/**
 * The three targets, in the order the tabs show them. macOS first because it
 * is the shorter of the two `curl` shells to read, Windows second because its
 * line is the one that differs, Linux last.
 */
export const INSTALL_TARGETS: readonly InstallTarget[] = [
  {
    id: "macos",
    label: "macOS",
    shell: "Terminal",
    prompt: "$",
    command: INSTALL_COMMANDS.unix,
  },
  {
    id: "windows",
    label: "Windows",
    shell: "PowerShell",
    prompt: "PS>",
    command: INSTALL_COMMANDS.windows,
  },
  {
    id: "linux",
    label: "Linux",
    shell: "Shell",
    prompt: "$",
    command: INSTALL_COMMANDS.unix,
  },
];

/** The target the box opens on when nothing is known about the visitor. */
export const DEFAULT_OS: OsId = "macos";

/**
 * The user-agent signatures, IN MATCH ORDER, as regular-expression SOURCE
 * strings rather than as literals.
 *
 * Strings and not `RegExp`, because this table has to cross into a script that
 * cannot import it. The download button's label is decided before the page is
 * painted, which means an inline `<script>` in the document head — and an
 * inline script has no module graph, so the only way to hand it this knowledge
 * is to serialise it into the markup (`OsProbe.astro`, via `define:vars`). A
 * `RegExp` does not survive that trip; a string does, and `detectOs` below
 * compiles the very same strings for everyone else. One table, two readers,
 * no second copy of the rules to fall out of step.
 *
 * ORDER IS LOAD-BEARING. Android's user agent contains "Linux" and Chrome OS's
 * contains both "X11" and "CrOS", so the broad Linux signature has to be tried
 * last or it would claim machines that are not Linux.
 *
 * A single copy button that gives a Windows visitor a `curl` line is worse
 * than no button at all, and a printed command has the same problem: the
 * reader trusts what is on screen and does not check whether it is theirs.
 *
 * iOS reports "iPhone"/"iPad" and, on iPadOS, "Macintosh" — all three land on
 * macOS, which is the closest thing to true and the machine the visitor most
 * likely installs from. Android is a Linux kernel and lands on Linux for the
 * same reason. Neither can actually run the installer; both keep the box
 * honest instead of guessing something further away.
 */
export const OS_SIGNATURES: readonly (readonly [OsId, string])[] = [
  ["windows", "Windows|Win32|Win64"],
  ["macos", "Mac OS X|Macintosh|iPhone|iPad|iPod"],
  ["linux", "Linux|Android|X11|CrOS"],
];

/** Which machine the visitor is on. */
export function detectOs(userAgent: string): OsId {
  for (const [id, signature] of OS_SIGNATURES) {
    if (new RegExp(signature, "i").test(userAgent)) return id;
  }
  return DEFAULT_OS;
}

/**
 * What the download button says on a given machine.
 *
 * Built from the target's own label rather than written out three times, so a
 * machine renamed in `INSTALL_TARGETS` is renamed on the button in the same
 * edit. The button and the tab it opens then always agree — which is the whole
 * promise: "Download for Linux" has to land on the Linux line.
 */
export function downloadLabelFor(os: OsId): string {
  return `Download for ${targetFor(os).label}`;
}

/** The line to hand over for a given machine. */
export function installCommandFor(os: OsId): string {
  return targetFor(os).command;
}

/** The full target for a given machine; falls back rather than throwing. */
export function targetFor(os: OsId): InstallTarget {
  return INSTALL_TARGETS.find((target) => target.id === os) ?? INSTALL_TARGETS[0];
}
