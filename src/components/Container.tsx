import type { ReactNode } from "react";
import { widths, type ContainerWidth } from "@/lib/widths";

/**
 * The only place a content width is decided, React side. Widths live in
 * src/lib/widths.ts so this and Container.astro cannot drift apart.
 *
 * See docs/layout.md for which step goes where.
 */
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
