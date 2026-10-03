import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { AppFrame } from "./app/AppFrame";
import { AppShell, type Section } from "./app/AppShell";
import { FrontPage } from "./app/FrontPage";
import { FRONT_SCRIPT } from "./app/frontPageScript";
import { IDE_DURATIONS, IDE_STEPS, IdeMain, IdeNav } from "./app/IdeScene";
import "./demo-stage.css";

/**
 * The hero's demo stage — the app itself, cloned in DOM, playing one errand
 * from the front page into the Agentic IDE.
 *
 * The window is a clone, not a drawing: its markup is copied from the app's
 * components (src/components/demo/app/) and styled by the app's own compiled
 * stylesheet, rendered in a document of its own (AppFrame). It is laid out at
 * a real app size and scaled down like a screenshot, so the type keeps the
 * app's proportion to the window. See docs/hero.md.
 *
 * Two sidebar rows are live — "New chat" and "Agentic IDE" — and move
 * between the two scenes the way the real rows move between sections.
 */

/** The app window, in CSS px — a common laptop-sized app window. */
const WINDOW_W = 1360;
const WINDOW_H = 758;
/**
 * The air around it. The scale fits window plus air into the frame, so the
 * air decides how big the window comes out (~90% of the frame's width, as
 * the maintainer sized it on 2026-08-29).
 */
const AIR_X = 76;
const AIR_Y = 56;
const STAGE_W = WINDOW_W + AIR_X * 2;
const STAGE_H = WINDOW_H + AIR_Y * 2;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Scale factor so the fixed stage fits whatever box it is given — contain,
 * never fill-the-width, so a short frame shrinks the window rather than
 * cutting its lower half off. Measured before paint, then on every resize.
 */
function useStageScale(ref: { current: HTMLDivElement | null }): number {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width <= 0) return;
      setScale(height > 0 ? Math.min(width / STAGE_W, height / STAGE_H) : width / STAGE_W);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref]);
  return scale;
}

export default function DemoStage({ className = "" }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const scale = useStageScale(wrap);
  const reduced = usePrefersReducedMotion();

  const [section, setSection] = useState<Section>("chats");
  const [step, setStep] = useState(0);
  const [tookOver, setTookOver] = useState(false);

  const durations = section === "chats" ? FRONT_SCRIPT.map((f) => f.duration) : IDE_DURATIONS;
  const length = durations.length;

  /**
   * Autoplay. Left alone the stage plays the front page, follows the hand-off
   * into the Agentic IDE and comes back. The first press of a live row stops
   * the hand-over for good; the chosen scene keeps looping.
   */
  useEffect(() => {
    if (reduced) return;
    const id = window.setTimeout(() => {
      if (step + 1 < length) {
        setStep(step + 1);
        return;
      }
      setStep(0);
      if (!tookOver) setSection((s) => (s === "chats" ? "agentic-ide" : "chats"));
    }, durations[Math.min(step, length - 1)]);
    return () => window.clearTimeout(id);
  }, [step, length, durations, tookOver, reduced]);

  const at = reduced ? length - 1 : Math.min(step, length - 1);
  const front = FRONT_SCRIPT[section === "chats" ? at : FRONT_SCRIPT.length - 1];
  const ideStep = section === "agentic-ide" ? at : 0;
  const ideDone = section === "agentic-ide" && ideStep >= IDE_STEPS - 1;

  const pick = (next: Section) => {
    setTookOver(true);
    if (next !== section) {
      setSection(next);
      setStep(0);
    }
  };

  const handedOff = section === "agentic-ide" || front.settled >= 2;
  const working = { scout: handedOff && !ideDone, atlas: true, quill: !ideDone };

  return (
    <div className={className}>
      <div
        ref={wrap}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          aspectRatio: `${STAGE_W} / ${STAGE_H}`,
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: STAGE_W,
            height: STAGE_H,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          {/* The window: the app's own frame is its document edge, so the
              rounding and the hairline are the OS window's, drawn here. */}
          <div
            className="demo-window"
            style={{ position: "absolute", left: AIR_X, top: AIR_Y, width: WINDOW_W, height: WINDOW_H }}
          >
            <AppFrame width={WINDOW_W} height={WINDOW_H}>
              <AppShell
                section={section}
                onPick={pick}
                emptyChat={section === "chats" && front.phase === "home"}
                working={working}
                activeChat={section === "chats" && front.phase !== "home" ? "Fix the login test" : undefined}
                ideNav={<IdeNav />}
              >
                <div className="min-h-0 flex-1 jarvis-section-stage" data-testid="jarvis-section-stage">
                  {section === "chats" ? (
                    <div className="flex h-full min-h-0 flex-col" data-testid="home-view" data-surface="voice">
                      <div className="relative flex min-h-0 flex-1 flex-col" data-testid="assistant-chat">
                        <FrontPage frame={front} />
                      </div>
                    </div>
                  ) : (
                    <div className="h-full w-full" data-testid="sticky-agentic-ide">
                      <IdeMain step={ideStep} />
                    </div>
                  )}
                </div>
              </AppShell>
            </AppFrame>
          </div>
        </div>
      </div>

      <p className="sr-only">
        Interactive demo of the app. It opens on the front page in voice mode.
        The person says the login test is failing and asks for an agent to fix
        it; the assistant finds the failed run on GitHub and hands the job to
        an agent called Scout, then says so out loud. The demo then moves to
        the Agentic IDE, where three coding agents work side by side in one
        project: Scout, on Claude Code, fixes the test and opens a pull
        request; Atlas, on Codex, updates dependencies; Quill, on Gemini CLI,
        drafts the release notes. Two rows in the sidebar, New chat and
        Agentic IDE, move between the two scenes.
      </p>
    </div>
  );
}
