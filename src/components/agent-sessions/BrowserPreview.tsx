/**
 * The agent's own browser, as the Options panel shows it.
 *
 * In the app this is a live picture of the Chrome window the agent drives.
 * Here it is a real miniature browser: tab strip, address bar and a page with
 * real text, laid out at a fixed design width in `em` and scaled to whatever
 * width the panel gives it (the font size is a share of the container). The
 * agent's cursor works the page — it moves to the element it needs, clicks,
 * and the page answers — so it reads as browser use, not as a picture.
 */

import { useEffect, useState } from "react";
import type { Preview } from "./sessions";
import "./mini-browser.css";

interface Page {
  tab: string;
  url: string;
  /** Cursor stops, in % of the page area, and whether each one clicks. */
  path: readonly (readonly [number, number, boolean])[];
}

const PAGES: Readonly<Record<Preview, Page>> = {
  search: { tab: "v1.4 launch checklist - Search", url: "search.example/?q=launch+checklist", path: [[30, 14, true], [42, 40, false], [38, 62, true]] },
  analytics: { tab: "Weekly report · Analytics", url: "analytics.example/report/28d", path: [[70, 12, true], [58, 52, false], [26, 84, true]] },
  docs: { tab: "CHANGELOG.md", url: "github.com/PersonalJarvis/PersonalJarvis/CHANGELOG.md", path: [[22, 18, false], [46, 46, false], [30, 72, true]] },
  canvas: { tab: "launch-clip-storyboard.html", url: "localhost:47821/artifacts/storyboard", path: [[50, 40, true], [82, 40, false], [18, 40, true]] },
  social: { tab: "Compose post", url: "x.com/compose/post", path: [[40, 28, false], [60, 52, false], [86, 86, true]] },
  experiments: { tab: "Experiments", url: "experiments.example/weekly", path: [[80, 30, false], [80, 54, true], [40, 78, false]] },
  mail: { tab: "Inbox (4)", url: "mail.google.com/mail/u/0/#inbox", path: [[40, 22, true], [40, 38, false], [40, 54, true]] },
  pull: { tab: "Add jitter to reconnect · PR 412", url: "github.com/PersonalJarvis/PersonalJarvis/pull/412", path: [[30, 50, false], [70, 60, false], [84, 88, true]] },
  forum: { tab: "r/LocalLLaMA", url: "reddit.com/r/LocalLLaMA/top/?t=week", path: [[48, 24, true], [48, 50, false], [48, 76, true]] },
};

function PageBody({ kind, step }: { kind: Preview; step: number }) {
  switch (kind) {
    case "search":
      return (
        <div className="mb-search">
          <div className="mb-field">v1.4 launch checklist<i /></div>
          {[
            ["Product launch checklist: 21 steps", "blog.example › launch-checklist", "Plan the announcement, schedule posts, measure the first week…"],
            ["How to write release notes people read", "docs.example › release-notes", "Lead with what changed for the user, not the commit log…"],
            ["Launch day: what to measure", "analytics.example › guides", "Baseline your traffic the week before so you can tell…"],
          ].map(([title, url, text], i) => (
            <div key={title} className="mb-result" data-hot={step === 2 && i === 1 ? "true" : undefined}>
              <span className="mb-result__url">{url}</span>
              <span className="mb-result__title">{title}</span>
              <span className="mb-result__text">{text}</span>
            </div>
          ))}
        </div>
      );
    case "analytics":
      return (
        <div className="mb-analytics">
          <div className="mb-kpis">
            {[["Visitors / day", "1,284"], ["Download rate", "6.8 %"], ["Docs → install", "22 %"]].map(([k, v]) => (
              <div key={k}><span>{k}</span><b>{v}</b></div>
            ))}
          </div>
          <svg viewBox="0 0 300 80" preserveAspectRatio="none" className="mb-chart">
            <polyline className="mb-chart__ghost" points="0,70 50,66 100,62 150,60 200,56 250,52 300,50" />
            <polyline points="0,64 25,58 50,60 75,46 100,50 125,36 150,40 175,28 200,32 225,20 250,24 275,14 300,18" />
          </svg>
          <div className="mb-legend"><span>Last 28 days</span><span>v1.3 launch week</span></div>
        </div>
      );
    case "docs":
      return (
        <div className="mb-docs">
          <b className="mb-h1">Changelog</b>
          <b className="mb-h2">1.4.0 — unreleased</b>
          <ul>
            <li>Group chats between agents</li>
            <li>A live browser for every agent</li>
            <li>Routines that run on a schedule</li>
            <li>Approvals wait for the person, always</li>
          </ul>
          <b className="mb-h2">1.3.2</b>
          <ul><li>Faster cold start on Windows</li></ul>
        </div>
      );
    case "canvas":
      return (
        <div className="mb-canvas">
          {["Goal", "Split", "Group chat", "Approve", "Done", "End card"].map((f, i) => (
            <div key={f} data-hot={i === (step % 3 === 2 ? 0 : 2) ? "true" : undefined}><i /><span>{i + 1}. {f}</span></div>
          ))}
        </div>
      );
    case "social":
      return (
        <div className="mb-social">
          <span className="mb-social__avatar" />
          <div className="mb-social__body">
            <p><b>Your agents now work as a team.</b> Give Jarvis one goal — it hands out the work and only comes back when something needs you.</p>
            <div className="mb-social__media">▶ launch-clip.mp4 · 0:30</div>
            <div className="mb-social__bar"><span>Scheduled · Tue 16:00</span><b data-hot={step === 2 ? "true" : undefined}>Schedule</b></div>
          </div>
        </div>
      );
    case "experiments":
      return (
        <table className="mb-table">
          <thead><tr><th>Test</th><th>Result</th><th>Call</th></tr></thead>
          <tbody>
            <tr><td>Shorter hero headline</td><td className="mb-up">+11 %</td><td>Keep</td></tr>
            <tr data-hot={step >= 1 ? "true" : undefined}><td>Install button in nav</td><td className="mb-down">−4 %</td><td>{step >= 1 ? "Reverted" : "Revert"}</td></tr>
            <tr><td>Video above the fold</td><td>+2 %</td><td>—</td></tr>
          </tbody>
        </table>
      );
    case "mail":
      return (
        <div className="mb-mail">
          {[
            ["Venue Lindenhof", "Headcount for Thursday by 12:00", true],
            ["Sam (design)", "Storyboard feedback", true],
            ["Newsletter", "Your weekly digest", false],
            ["Receipts", "Your order has shipped", false],
            ["Team", "Offsite RSVPs — 14 yes", false],
          ].map(([from, subject, unread], i) => (
            <div key={String(subject)} className="mb-mail__row" data-unread={unread ? "true" : undefined} data-hot={i === (step === 0 ? 0 : step === 1 ? 1 : 0) ? "true" : undefined}>
              <b>{from}</b><span>{subject}</span>
            </div>
          ))}
        </div>
      );
    case "pull":
      return (
        <div className="mb-pull">
          <b className="mb-h1">Add jitter to reconnect</b>
          <span className="mb-pull__meta"><i>Open</i> wants to merge 1 commit into main</span>
          <pre>
            <span>{"  def reconnect(self):"}</span>
            <span data-diff="del">{"-     retry(delay=1.0)"}</span>
            <span data-diff="add">{"+     retry(delay=1.0 + random() * 0.5)"}</span>
          </pre>
          <span className="mb-pull__checks">✓ All checks have passed · 1,184 tests</span>
          <b className="mb-merge" data-hot={step === 2 ? "true" : undefined}>Merge pull request</b>
        </div>
      );
    case "forum":
      return (
        <div className="mb-forum">
          {[
            ["212", "A local voice assistant that can actually use my apps?", "48 comments"],
            ["96", "Local speech-to-text latency — real numbers?", "31 comments"],
            ["74", "Agents that ask before they act", "22 comments"],
          ].map(([votes, title, meta], i) => (
            <div key={title} className="mb-thread" data-hot={i === step ? "true" : undefined}>
              <span className="mb-votes">▲<b>{votes}</b></span>
              <span className="mb-thread__body"><b>{title}</b><span>r/LocalLLaMA · {meta}</span></span>
            </div>
          ))}
        </div>
      );
  }
}

export function BrowserPreview({ kind, live }: { kind: Preview; url?: string; live: boolean }) {
  const page = PAGES[kind];
  const [step, setStep] = useState(0);
  const [press, setPress] = useState(false);

  useEffect(() => {
    setStep(0);
    if (!live) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    let i = 0;
    const timers: number[] = [];
    const tick = window.setInterval(() => {
      i = (i + 1) % page.path.length;
      setStep(i);
      if (page.path[i]![2]) {
        timers.push(window.setTimeout(() => setPress(true), 900));
        timers.push(window.setTimeout(() => setPress(false), 1150));
      }
    }, 2400);
    return () => {
      window.clearInterval(tick);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [kind, live, page]);

  const [x, y] = page.path[step] ?? [50, 50];
  return (
    <div className="mb" data-live={live ? "true" : undefined}>
      <div className="mb-window">
        <div className="mb-tabs">
          <span className="mb-dots"><i /><i /><i /></span>
          <span className="mb-tab"><i className="mb-favicon" />{page.tab}</span>
        </div>
        <div className="mb-address">
          <span className="mb-nav">‹ › ↻</span>
          <span className="mb-url"><i className="mb-lock" />{page.url}</span>
        </div>
        <div className="mb-page">
          <PageBody kind={kind} step={live ? step : 0} />
          {live && (
            <span className="mb-cursor" data-press={press ? "true" : undefined} style={{ left: `${x}%`, top: `${y}%` }} aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );
}
