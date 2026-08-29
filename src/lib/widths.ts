/**
 * The three width steps — the single source of truth, shared by every
 * Container variant. See docs/layout.md.
 *
 * These are plain classes, not Tailwind max-w utilities, because the widths are
 * a formula rather than a constant: `max(floor, share-of-viewport)`, so the
 * column keeps the same *proportion* of a wide screen instead of shrinking into
 * a ribbon. The formula lives in src/styles/layout.css.
 */
export const widths = {
  prose: "container-prose",
  content: "container-content",
  full: "container-full",
} as const;

export type ContainerWidth = keyof typeof widths;
