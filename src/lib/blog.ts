/**
 * The blog's posts — the one list, newest first.
 *
 * The index page, every post's own header and the footer link all read from
 * here, so a post's title, date and picture are typed once. A post is an
 * `.astro` page under `src/pages/blog/` whose route matches its `href`; this
 * list is what tells the index it exists.
 *
 * Media for a post lives under `public/blog/<slug>/`. Videos are self-hosted
 * on purpose: an embedded player from a third party contacts that party on
 * page load, and the footer promises that this site contacts YouTube only when
 * a reader presses play. A local `<video>` keeps that promise without a facade.
 */

/** Where the blog's index lives. */
export const BLOG_HREF = "/blog";

export interface BlogPost {
  /** The route segment and the folder under `public/blog/`. */
  slug: string;
  /** The post's route. */
  href: string;
  title: string;
  /** One or two sentences: the index teaser and the meta description. */
  description: string;
  /** The day it went out, as an ISO date (YYYY-MM-DD). */
  published: string;
  /** A 16:9 still for the index card. */
  image: string;
  /** What the still shows, for readers who cannot see it. */
  imageAlt: string;
  /** A 1200px JPEG for link previews on social sites. */
  socialImage: string;
}

export const BLOG_POSTS: readonly BlogPost[] = [
  {
    slug: "jarvis-verse",
    href: `${BLOG_HREF}/jarvis-verse`,
    title: "Jarvis Verse: your agents now have a world to live in",
    description:
      "Personal Jarvis 2.4 puts every agent at a desk in a walkable 3D office, and every coding agent one floor up with its terminal live on its monitor.",
    published: "2026-09-30",
    image: "/blog/jarvis-verse/poster.webp",
    imageAlt:
      "The Jarvis Verse title over a 3D office floor where small toy-style agents sit at desks in their departments.",
    socialImage: "/blog/jarvis-verse/og.jpg",
  },
];

/** One post, by slug. Throws at build time, so a typo never ships a blank header. */
export function blogPost(slug: string): BlogPost {
  const post = BLOG_POSTS.find((entry) => entry.slug === slug);
  if (!post) throw new Error(`no blog post with slug ${slug}`);
  return post;
}

/**
 * "30 September 2026". Formatted in UTC so the day never shifts with the time
 * zone of the machine that builds the site.
 */
export function formatPostDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
