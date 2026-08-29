/**
 * The skills demo container — time, pointers and nothing else.
 *
 * SkillsView stays pure. The shared stage owns the scaling, the frame, the
 * reduced-motion query and the take-over. See docs/feature-section.md.
 */

import { useCallback, useMemo, useState } from "react";

import {
  DemoStage,
  useFrameScript,
  usePrefersReducedMotion,
} from "@/components/window-demo/Stage";
import { DEMO_DESCRIPTION, FRAMES } from "./frames";
import { CANVAS_HEIGHT, CANVAS_WIDTH, SkillsView } from "./SkillsView";
import "./skills-demo.css";

const DURATIONS = FRAMES.map((f) => f.duration);

export function SkillsDemo() {
  const reducedMotion = usePrefersReducedMotion();
  const { index, tookOver, takeOver } = useFrameScript(DURATIONS, reducedMotion);

  /** Rows the visitor has switched since taking over. Empty while the script
   *  drives, so the demo shows the install as it really is: all 31 on. */
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [ownFilter, setOwnFilter] = useState<"all" | "mine">("all");

  const scripted = FRAMES[index];

  /** After take-over the window drops to the list and the pills drive it. A
   *  frozen detail page with no way back would be a dead end. */
  const frame = useMemo(() => {
    if (!tookOver) return scripted;
    const shelf = FRAMES[0].skills;
    return {
      ...FRAMES[0],
      filter: ownFilter,
      skills:
        ownFilter === "mine"
          ? shelf.filter((s) => s.author === "You")
          : shelf,
      matches: ownFilter === "mine" ? 1 : undefined,
      hoverName: undefined,
    };
  }, [tookOver, scripted, ownFilter]);

  const toggle = useCallback(
    (name: string) => {
      takeOver();
      setOverrides((current) => {
        const base = FRAMES[0].skills.find((s) => s.name === name);
        const now = current[name] ?? base?.on ?? true;
        return { ...current, [name]: !now };
      });
    },
    [takeOver],
  );

  const chooseFilter = useCallback(
    (next: "all" | "mine") => {
      takeOver();
      setOwnFilter(next);
    },
    [takeOver],
  );

  const fadeKey = `${frame.layout}|${frame.query}|${frame.skills
    .map((s) => s.name)
    .join(",")}`;

  return (
    <DemoStage
      canvasWidth={CANVAS_WIDTH}
      canvasHeight={CANVAS_HEIGHT}
      description={DEMO_DESCRIPTION}
      onTakeOver={takeOver}
    >
      <SkillsView
        frame={frame}
        overrides={overrides}
        onToggle={toggle}
        onFilter={chooseFilter}
        animate={!reducedMotion}
        fadeKey={fadeKey}
      />
    </DemoStage>
  );
}

export default SkillsDemo;
