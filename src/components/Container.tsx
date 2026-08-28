import type { ReactNode } from "react";

/**
 * The only place a content width is decided.
 *
 * Three steps, no fourth — see docs/layout.md:
 *   prose    672px  headlines, body copy, CTAs, forms
 *   content  1280px images, screenshots, cards, grids, demos
 *   full     100%   background colours, gradients, dividers — never text
 *
 * Each step carries its own padding. Do NOT hoist `px-6` out of the map and
 * override it with `px-0` for `full`: two Tailwind utilities of equal
 * specificity resolve by their order in the generated stylesheet, not by the
 * order they appear in the class string, so the override is a coin flip.
 */
const widths = {
  prose: "max-w-2xl px-6 md:px-8",
  content: "max-w-7xl px-6 md:px-8",
  full: "max-w-none",
} as const;

export type ContainerWidth = keyof typeof widths;

export function Container({
  width = "content",
  className = "",
  children,
}: {
  width?: ContainerWidth;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`mx-auto w-full ${widths[width]} ${className}`.trim()}>
      {children}
    </div>
  );
}
