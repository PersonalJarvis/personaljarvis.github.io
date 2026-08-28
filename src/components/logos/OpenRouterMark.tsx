/**
 * OpenRouterMark — the OpenRouter mark.
 *
 * Converted from the bundled original; source and licence are recorded in
 * docs/LOGOS.md. Every colour is stripped, so the mark inherits the
 * surrounding text colour through `currentColor` and follows light and dark
 * mode by itself.
 *
 * Sizing is the caller's job. LogoStrip.astro sets a height per mark, because
 * a sparse mark and a dense one do not read as the same size at equal height.
 */
export function OpenRouterMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18.654 3.87a5.087 5.087 0 110 10.174L23.7 19.09c.64.641.187 1.737-.72 1.737H8.48a8.479 8.479 0 010-16.958h10.175zM8.479 7.26a5.087 5.087 0 100 10.176 5.087 5.087 0 000-10.175z" />
    </svg>
  );
}
