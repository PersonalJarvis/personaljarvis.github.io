/** Exact native release assets. Unknown hardware requires an explicit choice. */
export const REPO = "https://github.com/PersonalJarvis/PersonalJarvis";
export type OsId = "windows" | "macos" | "linux";
export type Architecture = "x64" | "arm64";
export const INSTALL_TARGETS = [
  { id: "windows", label: "Windows" }, { id: "macos", label: "macOS" }, { id: "linux", label: "Linux" },
] as const;
export const INSTALLERS = [
  { os: "windows", arch: "x64", label: "Windows · Intel / AMD 64-bit", asset: "PersonalJarvis-Setup-x64.exe" },
  { os: "macos", arch: "arm64", label: "macOS · Apple Silicon", asset: "PersonalJarvis-macOS-arm64.dmg" },
  { os: "macos", arch: "x64", label: "macOS · Intel", asset: "PersonalJarvis-macOS-x64.dmg" },
  { os: "linux", arch: "x64", label: "Linux · AppImage · Intel / AMD 64-bit", asset: "PersonalJarvis-Linux-x86_64.AppImage" },
] as const;
export const OS_SIGNATURES = [
  ["windows", "Windows NT|Win32|Win64"], ["macos", "Mac OS X|Macintosh"], ["linux", "Linux"],
] as const;
export const UNSUPPORTED_OS = "Android|iPhone|iPad|iPod|CrOS|Windows Phone";

export function detectOs(userAgent: string, touchPoints = 0): OsId | null {
  if (new RegExp(UNSUPPORTED_OS, "i").test(userAgent) || (/Macintosh/i.test(userAgent) && touchPoints > 1)) return null;
  return OS_SIGNATURES.find(([, signature]) => new RegExp(signature, "i").test(userAgent))?.[0] ?? null;
}
export function detectArchitecture(agent: string, hints?: { architecture?: string; bitness?: string }): Architecture | null {
  if (hints?.architecture) {
    if (hints.bitness !== "64") return null;
    if (/^(arm|arm64|aarch64)$/i.test(hints.architecture)) return "arm64";
    if (/^(x86|x64|amd64)$/i.test(hints.architecture)) return "x64";
    return null;
  }
  if (/aarch64|arm64/i.test(agent)) return "arm64";
  // Apple Silicon browsers routinely advertise Intel; never infer the CPU from that.
  if (/Macintosh|Mac OS X/i.test(agent)) return null;
  if (/x86_64|amd64|x64|Win64|WOW64/i.test(agent)) return "x64";
  return null;
}
export function installerFor(os: OsId | null, arch: Architecture | null) {
  return INSTALLERS.find((item) => item.os === os && item.arch === arch && !item.asset.endsWith(".deb")) ?? null;
}
export function downloadLabelFor(os: OsId, language = "en") {
  const name = INSTALL_TARGETS.find((item) => item.id === os)!.label;
  return `${language.startsWith("de") ? "Download für" : "Download for"} ${name}`;
}
/** Refuse old incomplete releases, external links and cross-tag asset mixtures. */
export function releaseDownloads(release: unknown): Map<string, string> {
  if (!release || typeof release !== "object") throw new Error("No qualified release available.");
  const value = release as Record<string, unknown>;
  if (value.draft !== false || value.prerelease !== false || typeof value.tag_name !== "string" || !/^v\d+\.\d+\.\d+$/.test(value.tag_name) || !Array.isArray(value.assets)) {
    throw new Error("No qualified stable release available.");
  }
  const required = [...INSTALLERS.map((item) => item.asset), "installers-SHA256SUMS.txt", "installers-SHA256SUMS.txt.cosign.sig", "release-qualification.json"];
  const downloads = new Map<string, string>();
  for (const name of required) {
    const matching = value.assets.filter((asset) => asset && asset.name === name);
    const expected = `${REPO}/releases/download/${value.tag_name}/${name}`;
    if (matching.length !== 1 || matching[0].browser_download_url !== expected || !(matching[0].size > 0)) throw new Error("The latest release is not yet complete.");
    downloads.set(name, expected);
  }
  return downloads;
}
