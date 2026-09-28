/**
 * The small live browser in the Options panel.
 *
 * In the app this is a real screenshot stream of the agent's own browser.
 * Here each agent gets a drawn page that matches what it is working on — a
 * forum thread, a dashboard, an inbox, a diff — built from boxes and lines
 * in the session greys, so it reads as a page at thumbnail size without
 * pretending to be anyone's real screen. A cursor drifts over it while the
 * agent is live.
 */

import type { Preview } from "./sessions";

function Bars({ rows, widths }: { rows: number; widths?: readonly number[] }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="bp-line" style={{ width: `${widths?.[i % widths.length] ?? 70}%` }} />
      ))}
    </>
  );
}

function Page({ kind }: { kind: Preview }) {
  switch (kind) {
    case "search":
      return (
        <div className="bp-center">
          <span className="bp-logo" />
          <span className="bp-searchbar" />
          <span className="bp-chips"><i /><i /></span>
        </div>
      );
    case "analytics":
      return (
        <div className="bp-dash">
          <div className="bp-kpis"><i /><i /><i /></div>
          <svg viewBox="0 0 200 70" preserveAspectRatio="none" className="bp-chart">
            <polyline points="0,58 20,52 40,55 60,40 80,44 100,30 120,34 140,22 160,26 180,14 200,18" />
            <polyline className="bp-chart__ghost" points="0,62 25,60 50,58 75,56 100,55 125,52 150,50 175,47 200,45" />
          </svg>
          <Bars rows={2} widths={[80, 55]} />
        </div>
      );
    case "docs":
      return (
        <div className="bp-doc">
          <span className="bp-h" />
          <Bars rows={6} widths={[92, 86, 90, 60, 88, 72]} />
        </div>
      );
    case "canvas":
      return (
        <div className="bp-frames">
          {[0, 1, 2, 3, 4].map((i) => <i key={i} data-hot={i === 2 ? "true" : undefined} />)}
        </div>
      );
    case "social":
      return (
        <div className="bp-post">
          <span className="bp-avatar" />
          <div className="bp-post__body">
            <Bars rows={3} widths={[90, 84, 50]} />
            <span className="bp-media" />
            <span className="bp-button" />
          </div>
        </div>
      );
    case "experiments":
      return (
        <div className="bp-exp">
          {[64, 38, 22].map((w, i) => (
            <div key={i} className="bp-exp__row">
              <span className="bp-line" style={{ width: "34%" }} />
              <span className="bp-meter"><i style={{ width: `${w}%` }} data-tone={i === 2 ? "down" : "up"} /></span>
            </div>
          ))}
        </div>
      );
    case "mail":
      return (
        <div className="bp-mail">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="bp-mail__row" data-unread={i < 2 ? "true" : undefined}>
              <span className="bp-dot" />
              <span className="bp-line" style={{ width: `${[40, 52, 36, 48, 30][i]}%` }} />
            </div>
          ))}
        </div>
      );
    case "pull":
      return (
        <div className="bp-diff">
          <span className="bp-h" />
          {["ctx", "ctx", "del", "add", "add", "ctx"].map((t, i) => (
            <span key={i} className="bp-diff__line" data-kind={t}><i style={{ width: `${[60, 74, 52, 66, 48, 58][i]}%` }} /></span>
          ))}
        </div>
      );
    case "forum":
      return (
        <div className="bp-forum">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bp-thread">
              <span className="bp-votes"><i /><b /></span>
              <div className="bp-thread__body"><Bars rows={2} widths={[[88, 54], [76, 40], [82, 62]][i]!} /></div>
            </div>
          ))}
        </div>
      );
  }
}

export function BrowserPreview({ kind, url, live }: { kind: Preview; url: string; live: boolean }) {
  return (
    <div className="bp" data-live={live ? "true" : undefined}>
      <div className="bp-window">
        <div className="bp-bar"><span className="bp-url">{url}</span></div>
        <div className="bp-page"><Page kind={kind} /></div>
        {live && <span className="bp-cursor" aria-hidden="true" />}
      </div>
    </div>
  );
}
