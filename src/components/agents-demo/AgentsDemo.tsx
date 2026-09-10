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
    let resumeAt: number | null = null;
    const restorePosition = () => {
      if (disposed || resumeAt === null) return;
      node.currentTime = Math.min(resumeAt, Math.max(0, node.duration - 0.01));
      resumeAt = null;
    };
    const sync = () => {
      if (disposed) return;
      if (!visible || document.hidden || motion.matches) {
        node.pause();
        return;
      }
      // Select against the displayed card, not its 1440px design canvas.
      // Prefiltered video avoids aliased text when Chrome shrinks a large frame.
      const physicalWidth = node.getBoundingClientRect().width * window.devicePixelRatio;
      const source = `/agents-demo/agents-feature-v6-readable${physicalWidth > 1200 ? "-2x" : ""}.mp4`;
      if (node.getAttribute("src") !== source) {
        resumeAt = node.currentTime;
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
    const resize = new ResizeObserver(sync);
    resize.observe(node.closest("[data-demo-window]") ?? node);
    window.addEventListener("resize", sync);
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    node.addEventListener("canplay", sync);
    node.addEventListener("loadedmetadata", restorePosition);
    return () => {
      disposed = true;
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener("resize", sync);
      motion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      node.removeEventListener("canplay", sync);
      node.removeEventListener("loadedmetadata", restorePosition);
      node.pause();
    };
  }, []);

  return <DemoStage backdrop="agents" canvasWidth={CANVAS_WIDTH} canvasHeight={FEATURE_CANVAS_HEIGHT}
    description="Animated product demonstration: ask Jarvis to coordinate a launch check, watch Scout and Archivist exchange messages on the island, message Scout directly, and receive the team's findings in Jarvis's conversation. English example data."
    onTakeOver={() => {}}>
    <WindowChrome />
    <video ref={video} autoPlay muted loop playsInline preload="none" tabIndex={-1}
      poster="/agents-demo/agents-feature-v6-readable-poster.webp" width={CANVAS_WIDTH} height={FEATURE_CANVAS_HEIGHT - WINDOW_CHROME_HEIGHT}
      style={{ display:"block", width:"100%", height:FEATURE_CANVAS_HEIGHT - WINDOW_CHROME_HEIGHT }} aria-hidden="true" />
  </DemoStage>;
}
