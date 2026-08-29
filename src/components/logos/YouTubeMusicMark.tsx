/**
 * YouTubeMusicMark — the YouTube Music mark.
 *
 * Converted from the bundled original; source and licence are recorded in
 * docs/LOGOS.md. Every colour is stripped, so the mark inherits the
 * surrounding text colour through `currentColor` and needs no second asset
 * for dark mode.
 *
 * Conversion note: knockout.
 */
export function YouTubeMusicMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 192 192"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path fillRule="evenodd" clipRule="evenodd" d="M8.0 96.0A88.0 88.0 0 1 0 184.0 96.0A88.0 88.0 0 1 0 8.0 96.0Z M96 50.32c25.19 0 45.68 20.49 45.68 45.68S121.19 141.68 96 141.68 50.32 121.19 50.32 96 70.81 50.32 96 50.32m0-6.4c-28.76 0-52.08 23.32-52.08 52.08 0 28.76 23.32 52.08 52.08 52.08s52.08-23.32 52.08-52.08c0-28.76-23.32-52.08-52.08-52.08z m79 122 45-26-45-26z M0 0h192v192H0z" />
    </svg>
  );
}
