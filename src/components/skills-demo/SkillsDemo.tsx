/**
 * The skills demo container — time, pointers and nothing else.
 *
 * SkillsView stays pure. The shared stage owns the scaling, the frame, the
 * reduced-motion query and the take-over.
 *
 * After take-over the window becomes a small working toy: rows open, the back
 * link returns, the switches switch and the pills filter. That is the whole
 * reason a visitor would click it — the section's claim is that a skill is a
 * file you can read and turn off, and the demo has to let them try that on the
 * one skill written here rather than shipped.
 */

import { useCallback, useMemo, useState } from "react";

import {
  DemoStage,
  useFrameScript,
  usePrefersReducedMotion,
} from "@/components/window-demo/Stage";
import { DEMO_DESCRIPTION, FRAMES, SHELF_SKILLS, type DemoSkill } from "./frames";
import { CANVAS_HEIGHT, CANVAS_WIDTH, SkillsView } from "./SkillsView";
import "./skills-demo.css";

const DURATIONS = FRAMES.map((f) => f.duration);

/** Every skill the demo can open, by name — the shelf plus the two that only
 *  appear under a search. */
const BY_NAME = new Map<string, DemoSkill>(
  FRAMES.flatMap((f) => f.skills).map((s) => [s.name, s]),
);

export function SkillsDemo() {
  const reducedMotion = usePrefersReducedMotion();
  const { index, tookOver, takeOver } = useFrameScript(DURATIONS, reducedMotion);

  /** Rows the visitor has switched since taking over. Empty while the script
   *  drives, so the demo shows the install as it really is: all 31 on. */
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [ownFilter, setOwnFilter] = useState<"all" | "mine">("all");
  const [ownOpen, setOwnOpen] = useState<string | null>(null);

  const scripted = FRAMES[index];

  /** After take-over the visitor drives: a row opens, the back link returns to
   *  the list, and the pills decide what the list holds. */
  const frame = useMemo(() => {
    if (!tookOver) return scripted;
    if (ownOpen) {
      return { ...FRAMES[2], openName: ownOpen, layout: "triggers" as const };
    }
    return {
      ...FRAMES[0],
      filter: ownFilter,
      skills:
        ownFilter === "mine"
          ? SHELF_SKILLS.filter((s) => s.author === "You")
          : SHELF_SKILLS,
      matches: ownFilter === "mine" ? 1 : undefined,
      openName: undefined,
    };
  }, [tookOver, scripted, ownFilter, ownOpen]);

  const openSkill = frame.openName ? BY_NAME.get(frame.openName) : undefined;

  const toggle = useCallback(
    (name: string) => {
      takeOver();
      setOverrides((current) => {
        const base = BY_NAME.get(name);
        const now = current[name] ?? base?.on ?? true;
        return { ...current, [name]: !now };
      });
    },
    [takeOver],
  );

  const chooseFilter = useCallback(
    (next: "all" | "mine") => {
      takeOver();
      setOwnOpen(null);
      setOwnFilter(next);
    },
    [takeOver],
  );

  const open = useCallback(
    (name: string) => {
      takeOver();
      setOwnOpen(name);
    },
    [takeOver],
  );

  const back = useCallback(() => {
    takeOver();
    setOwnOpen(null);
  }, [takeOver]);

  const fadeKey = `${frame.layout}|${frame.openName ?? ""}|${frame.query}|${frame.skills
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
        openSkill={openSkill}
        overrides={overrides}
        onToggle={toggle}
        onFilter={chooseFilter}
        onOpen={open}
        onBack={back}
        animate={!reducedMotion}
        fadeKey={fadeKey}
      />
    </DemoStage>
  );
}

export default SkillsDemo;
