/**
 * Real user-agent strings, one per machine a visitor arrives on, with the
 * installer each must be offered. Shared by the unit test (`detectDownload`)
 * and the dist test (the inline head probe as it ships), so both readers of
 * the rules are held to the same table.
 *
 * `touch` is `navigator.maxTouchPoints`. `install` is the tab the command box
 * must open on (`detectOs`).
 */
export const USER_AGENTS = [
  // Windows
  { name: "Windows 11, Chrome", touch: 0, download: "windows", install: "windows",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36" },
  { name: "Windows 11, Edge", touch: 0, download: "windows", install: "windows",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0" },
  { name: "Windows 10, Firefox", touch: 0, download: "windows", install: "windows",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0" },
  { name: "Windows touch laptop, Edge", touch: 10, download: "windows", install: "windows",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0" },
  { name: "Windows on ARM, Edge (x64 installer runs emulated)", touch: 10, download: "windows", install: "windows",
    ua: "Mozilla/5.0 (Windows NT 10.0; ARM64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0" },
  // macOS
  { name: "macOS, Safari", touch: 0, download: "macos-arm64", install: "macos",
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15" },
  { name: "macOS, Chrome", touch: 0, download: "macos-arm64", install: "macos",
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36" },
  { name: "macOS, Firefox", touch: 0, download: "macos-arm64", install: "macos",
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:143.0) Gecko/20100101 Firefox/143.0" },
  // Linux desktop
  { name: "Ubuntu, Firefox", touch: 0, download: "linux", install: "linux",
    ua: "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0" },
  { name: "Linux, Chrome", touch: 0, download: "linux", install: "linux",
    ua: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36" },
  { name: "Fedora, Firefox", touch: 0, download: "linux", install: "linux",
    ua: "Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0" },
  // No installer for these: the release page
  { name: "Linux on ARM (Raspberry Pi), Firefox", touch: 0, download: "other", install: "linux",
    ua: "Mozilla/5.0 (X11; Linux aarch64; rv:143.0) Gecko/20100101 Firefox/143.0" },
  { name: "Linux armv7l, Chromium", touch: 0, download: "other", install: "linux",
    ua: "Mozilla/5.0 (X11; Linux armv7l) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36" },
  { name: "iPhone, Safari", touch: 5, download: "other", install: "macos",
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1" },
  { name: "iPad (desktop-class UA), Safari", touch: 5, download: "other", install: "macos",
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15" },
  { name: "Android phone, Chrome", touch: 5, download: "other", install: "linux",
    ua: "Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36" },
  { name: "Chromebook", touch: 0, download: "other", install: "linux",
    ua: "Mozilla/5.0 (X11; CrOS x86_64 16328.65.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36" },
  { name: "Empty user agent", touch: 0, download: "other", install: "macos", ua: "" },
  { name: "Unknown client", touch: 0, download: "other", install: "macos", ua: "curl/8.9.1" },
];
