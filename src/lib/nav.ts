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
 * NOT EVERY SECTION IS IN HERE, and that is deliberate. The logo strip, the
 * stargazer count and the build-in-public gallery are things the reader passes
 * THROUGH on the way down — nobody navigates to a social-proof band. A nav that
 * lists all eleven sections is a table of contents, and a table of contents in
 * a 4rem band is unreadable at any screen width. The entries below are the six
 * places a reader might actually want to be sent to.
 */

/** A nav entry that points at a section of this page. */
export interface NavLink {
  /** The `id` on the section element. The anchor and the spy both use it. */
  readonly id: string;
  /** What the nav calls it. Short enough to sit beside five others. */
  readonly label: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { id: "features", label: "Plugins" },
  { id: "skills", label: "Skills" },
  { id: "clis", label: "CLIs" },
  { id: "voice", label: "What changes" },
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
