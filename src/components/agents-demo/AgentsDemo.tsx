import { useEffect, useRef } from "react";
import { DemoStage } from "../window-demo/Stage";

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
      if (!node.getAttribute("src")) {
        node.src = "/agents-demo/agents-hyperframes.mp4";
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

  return <DemoStage canvasWidth={1600} canvasHeight={1200}
    description="Animated product demonstration: ask Jarvis to coordinate a launch check, watch Scout and Archivist exchange messages on the island, message Scout directly, and receive the team's findings in Jarvis's conversation. English example data."
    onTakeOver={() => {}}>
    <video ref={video} autoPlay muted loop playsInline preload="none" tabIndex={-1}
      poster="/agents-demo/agents-hyperframes-poster.webp" width={1600} height={1200}
      style={{ display:"block", width:"100%", height:"100%" }} aria-hidden="true" />
  </DemoStage>;
}
