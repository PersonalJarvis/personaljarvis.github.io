/**
 * AntigravityMark — the Antigravity mark.
 *
 * Converted from the bundled original; source and licence are recorded in
 * docs/LOGOS.md. Every colour is stripped, so the mark inherits the
 * surrounding text colour through `currentColor` and follows light and dark
 * mode by itself.
 *
 * Sizing is the caller's job. LogoStrip.astro sets a height per mark, because
 * a sparse mark and a dense one do not read as the same size at equal height.
 */
export function AntigravityMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M21.751 22.607c1.34 1.005 3.35.335 1.508-1.508C17.73 15.74 18.904 1 12.037 1 5.17 1 6.342 15.74.815 21.1c-2.01 2.009.167 2.511 1.507 1.506 5.192-3.517 4.857-9.714 9.715-9.714 4.857 0 4.522 6.197 9.714 9.715z" />
    </svg>
  );
}
