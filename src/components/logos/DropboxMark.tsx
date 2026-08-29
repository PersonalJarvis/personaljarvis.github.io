/**
 * DropboxMark — the Dropbox mark.
 *
 * Converted from the bundled original; source and licence are recorded in
 * docs/LOGOS.md. Every colour is stripped, so the mark inherits the
 * surrounding text colour through `currentColor` and needs no second asset
 * for dark mode.
 */
export function DropboxMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 256 218"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M63.9945638 0L0 40.7712563L63.9945638 81.5425125L128 40.7712563Z" />
      <path d="M192.000442 0L128 40.7750015L192.000442 81.5500031L256.000885 40.7750015Z" />
      <path d="M0 122.321259L63.9945638 163.092516L128 122.321259L63.9945638 81.5500031Z" />
      <path d="M192 81.5500031L128 122.324723L192 163.099442L256 122.324723Z" />
      <path d="M64 176.771256L128.005436 217.542513L192 176.771256L128.005436 136Z" />
    </svg>
  );
}
