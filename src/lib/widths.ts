/**
 * The three width steps — the single source of truth, shared by every
 * Container variant. See docs/layout.md.
 *
 * Each step carries its own padding. Do NOT hoist `px-6` out of this map and
 * override it with `px-0` for `full`: two Tailwind utilities of equal
 * specificity resolve by their order in the generated stylesheet, not by the
 * order they appear in a class string, so the override is a coin flip.
 */
export const widths = {
  prose: "max-w-2xl px-6 md:px-8",
  content: "max-w-7xl px-6 md:px-8",
  full: "max-w-none",
} as const;

export type ContainerWidth = keyof typeof widths;
