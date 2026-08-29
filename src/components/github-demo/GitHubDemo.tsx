/**
 * The repository walkthrough's container.
 *
 * It owns nothing but the script: which beat is on screen, and the well the
 * window sits in. Everything about scaling, clipping and handing the demo over
 * at the first touch comes from the shared stage, and everything drawn comes
 * from `GitHubView`.
 *
 * `wellShape` is the one thing it asks the stage for that the feature demos do
 * not. Theirs is a 7/6 box beside a column of copy; this one spans the whole
 * content column under a centred headline, so the well takes the window's own
 * proportion and the backdrop stays a frame rather than becoming a field.
 */

import {
  DemoStage,
  useFrameScript,
  usePrefersReducedMotion,
} from "@/components/window-demo/Stage";
import { DEMO_DESCRIPTION, FRAMES } from "./frames";
import { CANVAS_HEIGHT, CANVAS_WIDTH, GitHubView } from "./GitHubView";
import "./github-demo.css";

const DURATIONS = FRAMES.map((f) => f.duration);

export function GitHubDemo() {
  const reducedMotion = usePrefersReducedMotion();
  const { index, takeOver } = useFrameScript(DURATIONS, reducedMotion);

  return (
    <DemoStage
      canvasWidth={CANVAS_WIDTH}
      canvasHeight={CANVAS_HEIGHT}
      description={DEMO_DESCRIPTION}
      onTakeOver={takeOver}
      /* The well fills the box the section gives it, and the section is what
         decides that box's shape — it has a screen's worth of height to divide
         between a headline and this, and only it knows how much is left. There
         is no breakpoint here because there is no second layout: this demo is
         full column width on a phone and on a 5K monitor alike. */
      wellShape="h-full"
    >
      <GitHubView frame={FRAMES[index]} animate={!reducedMotion} />
    </DemoStage>
  );
}

export default GitHubDemo;
