/**
 * The site nav's links — the one list, in page order.
 *
 * It lives here rather than in the component for the same reason the widths do:
 * the nav is not the only thing that has to agree with it. The scroll-spy reads
 * the same ids to decide which link is current, and a second hand-written copy
 * of the list is a copy that goes stale the moment a section is renamed,
 * reordered or removed — silently, because a link to an id that no longer
 * exists still renders and simply does nothing.
 *
 * ORDER IS LOAD-BEARING, not cosmetic. The spy resolves the current section by
 * walking this list and taking the LAST entry whose section has crossed under
 * the nav, so the entries have to be in the order the sections appear in
 * `src/pages/index.astro`. A misordered entry does not break the jump; it
 * lights the wrong link on the way past, which is harder to notice and harder
 * to attribute.
 *
 * NOT EVERY SECTION IS IN HERE. The hero is the top of the page and the
 * wordmark already goes there; the logo strip is a band the reader passes
 * THROUGH rather than one they navigate to; the install steps have the whole
 * Download button to themselves; and the legal foot is the end of the page,
 * which is one End key away. Everything a reader might want to be sent to IS
 * here, in page order.
 *
 * THAT WAS NOT TRUE UNTIL 2026-08-29. Three sections were added to the page
 * over the course of one afternoon — the stargazer globe, the open-source walk
 * and the legal foot — and the nav, whose list is this file, kept the shape it
 * had before any of them existed. Only `open-source` was added with it; the
 * globe and the build-in-public gallery, which had been on the page since the
 * morning, were left off on the theory that nobody navigates to social proof.
 * The maintainer's answer, on seeing the shipped nav, was that the sections
 * belong in it. WHEN A SECTION IS ADDED TO `index.astro`, IT IS ADDED HERE IN
 * THE SAME CHANGE unless one of the four reasons above applies to it.
 */

/** A nav entry that points at a section of this page. */
export interface NavLink {
  /** The `id` on the section element. The anchor and the spy both use it. */
  readonly id: string;
  /**
   * What the nav calls it. Short enough to sit beside six others AND the Docs
   * link at 768px, which is the narrowest screen that still shows the row —
   * see the width note under the list.
   */
  readonly label: string;
}

/**
 * IN PAGE ORDER, and every label is carrying its section's own words: "Stars"
 * is what the globe section counts, "Built in public" is the first line of its
 * headline. A nav label invented for the nav is a label the section never
 * confirms when the reader lands on it.
 *
 * THE ROW IS WIDTH-CONSTRAINED AND THIS LIST IS WHY. Seven section links, the
 * Docs link, the wordmark and the Download button share one `content` row, and
 * the row has no way to say it is full — flex simply pushes the wordmark and
 * the button towards each other until something wraps or overflows. The links'
 * gap steps down between 768px and 1200px to buy the room the two additions
 * cost (see `.site-nav__links` in layout.css). ADDING A NINTH ENTRY MEANS
 * MEASURING AGAIN at 768px, not just typing a line here.
 */
export const NAV_LINKS: readonly NavLink[] = [
  { id: "features", label: "Plugins" },
  { id: "skills", label: "Skills" },
  { id: "clis", label: "CLIs" },
  { id: "voice", label: "What changes" },
  { id: "stargazers", label: "Stars" },
  { id: "built-in-public", label: "Built in public" },
  { id: "open-source", label: "Open source" },
];

/**
 * The top of the page, as an anchor. The hero carries this id so the wordmark
 * has somewhere to send the reader — a bare `#` scrolls to the top too, but it
 * also writes a lone hash into the address bar and takes the page out of the
 * spy's own model of where it is.
 */
export const TOP_ID = "top";

/** The section the download button sends the reader to. */
export const INSTALL_ID = "install";

/**
 * The documentation, which is NOT a section of this page.
 *
 * Until now five places on the site linked to `#docs`, and no element on the
 * page has ever carried that id — every one of them was a link that scrolled
 * nowhere. The docs live in the repository, so that is where the link goes.
 * When this site grows a `/docs` route, this constant is the only line that
 * has to change.
 */
export const DOCS_URL = "https://github.com/PersonalJarvis/PersonalJarvis/tree/main/docs";
