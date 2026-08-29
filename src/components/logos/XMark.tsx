/**
 * XMark — the X mark (the network formerly called Twitter).
 *
 * Source and licence are recorded in docs/LOGOS.md. Every colour is stripped,
 * so the mark inherits the surrounding text colour through `currentColor` and
 * needs no second asset for dark mode.
 *
 * NOT `XaiMark`. That file is xAI's mark — a different company, a different
 * glyph, and a name one letter away from this one. Reaching for `XaiMark`
 * because the import list is alphabetical and it comes first would put a
 * model vendor's logo on a link to a personal profile, which is the kind of
 * mistake nobody catches in review because both marks are a small black
 * shape. This is the one to use for anything pointing at x.com.
 *
 * Not part of `marks.ts` either, for the same reason YouTube is not: that list
 * is the connection strip — the services Jarvis itself talks to — and X is a
 * place the project posts, not a service the app integrates with.
 *
 * The two subpaths are the source's own. The counter of the glyph is cut by
 * the second subpath winding against the first, so this needs the default
 * nonzero fill rule; setting `fillRule="evenodd"` fills the counter solid and
 * turns the mark into a blob.
 */
export function XMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" />
    </svg>
  );
}
