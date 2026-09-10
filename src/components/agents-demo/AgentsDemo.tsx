import { useEffect, useRef } from "react";
import { DemoStage } from "../window-demo/Stage";
import { CANVAS_WIDTH, FEATURE_CANVAS_HEIGHT, WINDOW_CHROME_HEIGHT, WindowChrome } from "../window-demo/chrome";

/** The HyperFrames render is native media; no video runtime ships to visitors. */
export default function AgentsDemo() {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const node = video.current;
    if (!node) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let disposed = false;
    const sync = () => {
      if (disposed) return;
      if (!visible || document.hidden || motion.matches) {
        node.pause();
        return;
      }
      const source = "/agents-demo/agents-feature-v4-sharp.mp4";
      if (node.getAttribute("src") !== source) {
        node.src = source;
        node.load();
      }
      node.muted = true;
      void node.play().catch(() => {
        // A browser may refuse background autoplay. The poster stays visible;
        // canplay or the next visibility change retries without a play screen.
      });
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      sync();
    }, { threshold: 0.1 });
    observer.observe(node);
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    node.addEventListener("canplay", sync);
    return () => {
      disposed = true;
      observer.disconnect();
      motion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      node.removeEventListener("canplay", sync);
      node.pause();
    };
  }, []);

  return <DemoStage backdrop="agents" canvasWidth={CANVAS_WIDTH} canvasHeight={FEATURE_CANVAS_HEIGHT}
    description="Animated product demonstration: ask Jarvis to coordinate a launch check, watch Scout and Archivist exchange messages on the island, message Scout directly, and receive the team's findings in Jarvis's conversation. English example data."
    onTakeOver={() => {}}>
    <WindowChrome />
    <video ref={video} autoPlay muted loop playsInline preload="none" tabIndex={-1}
      poster="/agents-demo/agents-feature-v4-sharp-poster.webp" width={CANVAS_WIDTH} height={FEATURE_CANVAS_HEIGHT - WINDOW_CHROME_HEIGHT}
      style={{ display:"block", width:"100%", height:FEATURE_CANVAS_HEIGHT - WINDOW_CHROME_HEIGHT }} aria-hidden="true" />
  </DemoStage>;
}
