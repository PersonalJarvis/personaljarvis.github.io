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

/*
 * ---------------------------------------------------------------------------
 * The native installers — what the download buttons at the top hand over.
 * ---------------------------------------------------------------------------
 *
 * The one-liners above stay the install path for people who live in a
 * terminal. The buttons at the top of the page are for everyone else: one
 * click, one file, no shell. Since 2026-10-01 they link straight to the
 * installer for the visitor's machine instead of scrolling to the command.
 *
 * THE FILE NAMES ARE A CONTRACT WITH THE APP REPOSITORY, not a convention.
 * `.github/workflows/desktop-installers.yml` publishes exactly these names on
 * every release, without a version in them, and the in-app updater picks the
 * same names (`jarvis/core/installer_update.py`). That is what makes
 * `releases/latest/download/<name>` a stable address that always serves the
 * newest build. `scripts/test-download-live.mjs` reads the app's updater
 * source and fails the moment the two lists disagree.
 */

export const RELEASES = `${REPO}/releases/latest`;
const LATEST_DOWNLOAD = `${REPO}/releases/latest/download`;

/**
 * One entry per published installer, plus `other` for every machine that has
 * none: phones, tablets, Chromebooks, ARM Linux. A desktop installer offered
 * to an iPhone is a broken promise, so `other` sends the visitor to the
 * release page, which lists every package and the source.
 */
export type DownloadId = "macos-arm64" | "macos-x64" | "windows" | "linux" | "other";

export interface DownloadTarget {
  id: DownloadId;
  /** The machine the button names: "Download for <label>". */
  label: string;
  /** The published asset, or null for `other`. */
  asset: string | null;
  /** Where the button goes. */
  href: string;
  /** One short line under the hero buttons saying what the file is. */
  note: string;
}

export const INSTALLER_ASSETS = {
  "macos-arm64": "PersonalJarvis-macOS-arm64.dmg",
  "macos-x64": "PersonalJarvis-macOS-x64.dmg",
  windows: "PersonalJarvis-Setup-x64.exe",
  linux: "PersonalJarvis-Linux-x86_64.AppImage",
} as const satisfies Record<Exclude<DownloadId, "other">, string>;

/** The checksum list the release carries next to the installers. */
export const INSTALLER_CHECKSUMS = "installers-SHA256SUMS.txt";

export function installerUrl(asset: string): string {
  return `${LATEST_DOWNLOAD}/${asset}`;
}

export const DOWNLOAD_TARGETS: readonly DownloadTarget[] = [
  {
    id: "macos-arm64",
    label: "macOS",
    asset: INSTALLER_ASSETS["macos-arm64"],
    href: installerUrl(INSTALLER_ASSETS["macos-arm64"]),
    note: "Disk image for Apple silicon Macs, macOS 12 or newer",
  },
  {
    id: "macos-x64",
    label: "macOS",
    asset: INSTALLER_ASSETS["macos-x64"],
    href: installerUrl(INSTALLER_ASSETS["macos-x64"]),
    note: "Disk image for Intel Macs, macOS 12 or newer",
  },
  {
    id: "windows",
    label: "Windows",
    asset: INSTALLER_ASSETS.windows,
    href: installerUrl(INSTALLER_ASSETS.windows),
    note: "Installer for Windows 10 and 11, no admin rights needed",
  },
  {
    id: "linux",
    label: "Linux",
    asset: INSTALLER_ASSETS.linux,
    href: installerUrl(INSTALLER_ASSETS.linux),
    note: "AppImage for x86_64 Linux",
  },
  {
    id: "other",
    label: "",
    asset: null,
    href: RELEASES,
    note: "Every package for Windows, macOS and Linux is on the release page",
  },
];

/** What the page shows before it knows the machine, and with scripting off. */
export const DEFAULT_DOWNLOAD: DownloadId = "other";

/**
 * The user-agent signatures for the download, IN MATCH ORDER, as regular
 * expression source strings — the same trick as `OS_SIGNATURES`, and for the
 * same reason: `OsProbe.astro` serialises this table into the head.
 *
 * ORDER IS LOAD-BEARING:
 * - Phones, tablets and Chromebooks go first. Android and Chrome OS carry
 *   "Linux" and "X11"; iOS carries "Mac OS X". None of them runs an installer.
 * - ARM Linux comes before Linux: there is no AppImage for it.
 * - Every Mac starts on Apple silicon. Safari and Firefox on an M-series Mac
 *   still say "Intel Mac OS X", so the user agent cannot tell the two apart.
 *   Apple silicon is what every Mac sold since 2020 has; Chromium refines the
 *   guess afterwards (`refineMacArchitecture`), and the hero names the other
 *   build under the button for everyone else.
 * - Windows on ARM gets the x64 installer, which runs there under emulation.
 */
export const DOWNLOAD_SIGNATURES: readonly (readonly [DownloadId, string])[] = [
  ["other", "iPhone|iPad|iPod|Android|CrOS"],
  ["windows", "Windows|Win32|Win64"],
  ["other", "Linux (aarch64|arm)"],
  ["macos-arm64", "Mac OS X|Macintosh"],
  ["linux", "Linux|X11"],
];

/**
 * Which installer fits the visitor.
 *
 * `touchPoints` is `navigator.maxTouchPoints`: iPadOS asks for the desktop
 * site and reports itself as a Mac, and a touch screen is the only thing that
 * gives it away — no Mac has one.
 */
export function detectDownload(userAgent: string, touchPoints = 0): DownloadId {
  for (const [id, signature] of DOWNLOAD_SIGNATURES) {
    if (new RegExp(signature, "i").test(userAgent)) {
      return id === "macos-arm64" && touchPoints > 1 ? "other" : id;
    }
  }
  return DEFAULT_DOWNLOAD;
}

/**
 * Chromium tells a script the CPU architecture, asynchronously. An Intel Mac
 * reports "x86"; everything else keeps the first guess. Other browsers have no
 * such API and keep the guess too.
 */
export function refineMacArchitecture(current: DownloadId, architecture: string | undefined): DownloadId {
  if (current !== "macos-arm64" && current !== "macos-x64") return current;
  if (architecture === "x86") return "macos-x64";
  if (architecture === "arm") return "macos-arm64";
  return current;
}

export function downloadTargetFor(id: DownloadId): DownloadTarget {
  return DOWNLOAD_TARGETS.find((target) => target.id === id) ?? DOWNLOAD_TARGETS[DOWNLOAD_TARGETS.length - 1];
}

/** What a download button says; `other` names no machine it cannot serve. */
export function installerLabelFor(id: DownloadId): string {
  const target = downloadTargetFor(id);
  return target.label ? `Download for ${target.label}` : "Download";
}
