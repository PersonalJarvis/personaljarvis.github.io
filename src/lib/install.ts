/**
 * The install one-liners, verbatim from the app's README.md § Install.
 *
 * One module, because the section PRINTS them, its client script copies them,
 * and the box names the shell each one is pasted into: three literals would
 * drift the moment the installer moves, and the site would hand someone a
 * command that 404s.
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
 * Which machine the visitor is on.
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
export function detectOs(userAgent: string): OsId {
  if (/Windows|Win32|Win64/i.test(userAgent)) return "windows";
  if (/Mac OS X|Macintosh|iPhone|iPad|iPod/i.test(userAgent)) return "macos";
  if (/Linux|Android|X11|CrOS/i.test(userAgent)) return "linux";
  return DEFAULT_OS;
}

/** The line to hand over for a given machine. */
export function installCommandFor(os: OsId): string {
  return targetFor(os).command;
}

/** The full target for a given machine; falls back rather than throwing. */
export function targetFor(os: OsId): InstallTarget {
  return INSTALL_TARGETS.find((target) => target.id === os) ?? INSTALL_TARGETS[0];
}
