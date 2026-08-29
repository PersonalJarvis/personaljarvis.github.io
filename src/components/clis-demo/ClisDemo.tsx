/**
 * The CLIs demo container.
 *
 * The one thing it owns beyond the shared machinery is the typewriter on the
 * composer frame: the instruction appears a character at a time, because the
 * point of that beat is that a person typed a sentence, not that a form was
 * filled in.
 */

import { useEffect, useState } from "react";

import {
  DemoStage,
  useFrameScript,
  usePrefersReducedMotion,
} from "@/components/window-demo/Stage";
import { DEMO_DESCRIPTION, FRAMES, RUN } from "./frames";
import { CANVAS_HEIGHT, CANVAS_WIDTH, ClisView } from "./ClisView";
import "./clis-demo.css";

const DURATIONS = FRAMES.map((f) => f.duration);
const TYPE_MS = 34;

export function ClisDemo() {
  const reducedMotion = usePrefersReducedMotion();
  const { index, takeOver } = useFrameScript(DURATIONS, reducedMotion);
  const frame = FRAMES[index];

  const [typed, setTyped] = useState(0);

  useEffect(() => {
    if (frame.layout !== "compose") return;
    if (reducedMotion) {
      setTyped(RUN.instruction.length);
      return;
    }
    setTyped(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(i);
      if (i >= RUN.instruction.length) window.clearInterval(id);
    }, TYPE_MS);
    return () => window.clearInterval(id);
  }, [frame.layout, index, reducedMotion]);

  return (
    <DemoStage
      canvasWidth={CANVAS_WIDTH}
      canvasHeight={CANVAS_HEIGHT}
      description={DEMO_DESCRIPTION}
      onTakeOver={takeOver}
    >
      <ClisView
        frame={{ ...frame, typed }}
        animate={!reducedMotion}
        fadeKey={frame.layout}
      />
    </DemoStage>
  );
}

export default ClisDemo;
