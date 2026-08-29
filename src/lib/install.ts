/**
 * The install one-liners, verbatim from the app's README.md § Install.
 *
 * One module, because the section prints them and its client script copies
 * them: two literals would drift the moment the installer moves, and the site
 * would hand someone a command that 404s.
 */

const RAW = "https://raw.githubusercontent.com/PersonalJarvis/PersonalJarvis/main";

export const REPO = "https://github.com/PersonalJarvis/PersonalJarvis";

export const INSTALL_COMMANDS = {
  /** PowerShell. */
  windows: `irm ${RAW}/install/install.ps1 | iex`,
  /** macOS and Linux. */
  unix: `curl -fsSL ${RAW}/install/install.sh | bash`,
} as const;

/**
 * Which line to hand over. A single copy button that gives a Windows visitor
 * a `curl` line is worse than no button at all.
 */
export function installCommandFor(userAgent: string): string {
  return /Windows|Win32|Win64/i.test(userAgent)
    ? INSTALL_COMMANDS.windows
    : INSTALL_COMMANDS.unix;
}

export function isWindows(userAgent: string): boolean {
  return /Windows|Win32|Win64/i.test(userAgent);
}
