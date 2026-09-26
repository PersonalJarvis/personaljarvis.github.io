import { detectArchitecture, detectOs, installerFor, releaseDownloads } from "./install";
type NavigatorHints = Navigator & {
  userAgentData?: { getHighEntropyValues(keys: string[]): Promise<{ architecture?: string; bitness?: string }> };
};
let initialized = false;
export async function initializeDownloads() {
  if (initialized) return;
  initialized = true;
  const nav = navigator as NavigatorHints;
  const os = detectOs(nav.userAgent, nav.maxTouchPoints);
  let arch = detectArchitecture(nav.userAgent);
  if (nav.userAgentData) {
    try {
      const hints = await nav.userAgentData.getHighEntropyValues(["architecture", "bitness"]);
      arch = detectArchitecture(nav.userAgent, hints);
    } catch {
      // A privacy refusal leaves the explicit architecture picker available.
      arch = null;
    }
  }
  const statuses = document.querySelectorAll<HTMLElement>("[data-download-status]");
  try {
    const response = await fetch("https://api.github.com/repos/PersonalJarvis/PersonalJarvis/releases/latest", {
      headers: { Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Release lookup unavailable.");
    const release = await response.json();
    const downloads = releaseDownloads(release);
    document.querySelectorAll<HTMLAnchorElement>("[data-installer-asset]").forEach((link) => {
      const url = downloads.get(link.dataset.installerAsset!);
      if (!url) return;
      link.href = url;
      link.removeAttribute("aria-disabled");
    });
    const target = installerFor(os, arch);
    if (target) document.querySelectorAll<HTMLAnchorElement>("[data-download-cta]").forEach((link) => { link.href = downloads.get(target.asset)!; });
    statuses.forEach((status) => { status.textContent = `${release.tag_name} · ${target ? "Ready to download." : "Choose your platform and processor below."}`; });
  } catch {
    // Never use an unchecked latest/download URL or substitute another OS.
    statuses.forEach((status) => { status.textContent = "No complete approved release could be verified. Please try again later."; });
  }
}
