/**
 * The CLIs demo container.
 *
 * The one thing it owns beyond the shared machinery is the composer beat: the
 * instruction appears a character at a time, because the point of that beat is
 * that a person typed a sentence, not that a form was filled in. The typing
 * itself is `useTypewriter`, shared with the two search boxes.
 */

import {
  DemoStage,
  useFrameScript,
  usePrefersReducedMotion,
  useTypewriter,
} from "@/components/window-demo/Stage";
import { DEMO_DESCRIPTION, FRAMES, RUN } from "./frames";
import { CANVAS_HEIGHT, CANVAS_WIDTH, ClisView } from "./ClisView";
import "./clis-demo.css";

const DURATIONS = FRAMES.map((f) => f.duration);

export function ClisDemo() {
  const reducedMotion = usePrefersReducedMotion();
  const { index, takeOver } = useFrameScript(DURATIONS, reducedMotion);
  const frame = FRAMES[index];

  const typed = useTypewriter(
    RUN.instruction,
    frame.layout === "compose",
    reducedMotion,
  );

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
