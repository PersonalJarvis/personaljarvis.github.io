/**
 * ElevenLabsMark — the ElevenLabs mark.
 *
 * Converted from the bundled original; source and licence are recorded in
 * docs/LOGOS.md. Every colour is stripped, so the mark inherits the
 * surrounding text colour through `currentColor` and needs no second asset
 * for dark mode.
 */
export function ElevenLabsMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 0h5v24H5V0zM14 0h5v24h-5V0z" />
    </svg>
  );
}
