/**
 * The agent's own browser, as the Options panel shows it.
 *
 * In the app this is a live picture of the Chrome window the agent drives.
 * Here it is that window in miniature: Chrome's dark tab strip with the
 * window buttons, the toolbar with the omnibox, and a real website in the
 * page — a search page, GitHub, Gmail, Reddit, X — laid out at a fixed design
 * width in `em` and scaled to the panel. The agent's cursor works the page:
 * it moves to what it needs, clicks, and the page answers.
 */

import { useEffect, useState } from "react";
import type { Preview } from "./sessions";
import "./mini-browser.css";

interface Site {
  tab: string;
  url: string;
  /** Cursor stops, in % of the page area, and whether each one clicks. */
  path: readonly (readonly [number, number, boolean])[];
}

const SITES: Readonly<Record<Preview, Site>> = {
  newtab: { tab: "New Tab", url: "google.com", path: [[50, 34, true], [36, 70, false], [62, 70, true]] },
  results: { tab: "install page drop off - Google Search", url: "google.com/search?q=install+page+drop+off", path: [[34, 30, true], [30, 56, false], [30, 80, true]] },
  github: { tab: "CHANGELOG.md · PersonalJarvis", url: "github.com/PersonalJarvis/PersonalJarvis/blob/main/CHANGELOG.md", path: [[22, 14, false], [40, 56, false], [30, 80, true]] },
  stock: { tab: "Dark desk setup videos", url: "pexels.com/search/videos/dark desk setup", path: [[20, 46, false], [52, 46, true], [84, 78, false]] },
  compose: { tab: "Home / X", url: "x.com/compose/post", path: [[40, 30, false], [58, 60, false], [86, 86, true]] },
  landing: { tab: "Personal Jarvis — variant B", url: "personaljarvis.ai/?variant=b", path: [[30, 40, false], [30, 66, true], [70, 20, false]] },
  mail: { tab: "Inbox (4) - Gmail", url: "mail.google.com/mail/u/0/", path: [[60, 22, true], [60, 38, false], [60, 54, true]] },
  pull: { tab: "Add jitter to reconnect · Pull Request 412", url: "github.com/PersonalJarvis/PersonalJarvis/pull/412", path: [[30, 50, false], [70, 60, false], [82, 88, true]] },
  forum: { tab: "r/LocalLLaMA", url: "reddit.com/r/LocalLLaMA/top/?t=week", path: [[50, 26, true], [50, 52, false], [50, 78, true]] },
};

function Site({ kind, step }: { kind: Preview; step: number }) {
  switch (kind) {
    case "newtab":
      return (
        <div className="ws-newtab">
          <b className="ws-wordmark">Google</b>
          <div className="ws-searchbox">Search Google or type a URL</div>
          <div className="ws-tiles">
            {["GitHub", "Gmail", "Docs", "Calendar"].map((t) => (
              <span key={t}><i />{t}</span>
            ))}
          </div>
        </div>
      );
    case "results":
      return (
        <div className="ws-results">
          <div className="ws-results__bar"><b>Google</b><span className="ws-query">install page drop off windows</span></div>
          <div className="ws-results__tabs"><b>All</b><span>Images</span><span>Videos</span><span>News</span></div>
          {[
            ["web.dev", "Why users abandon install steps", "Long commands that wrap on small screens are copied in part and fail silently…"],
            ["stackoverflow.com", "PowerShell one-liner breaks when copied", "The line wraps and the pipe to iex is lost; wrap it in a code block with…"],
            ["nngroup.com", "Copy buttons beat selectable text", "Users trust a copy button more than a highlighted command…"],
          ].map(([site, title, text], i) => (
            <div key={title} className="ws-result" data-hot={i === step ? "true" : undefined}>
              <span className="ws-result__site">{site}</span>
              <span className="ws-result__title">{title}</span>
              <span className="ws-result__text">{text}</span>
            </div>
          ))}
        </div>
      );
    case "github":
      return (
        <div className="ws-github">
          <div className="ws-gh__repo"><span className="ws-gh__book" /> PersonalJarvis / <b>PersonalJarvis</b></div>
          <div className="ws-gh__nav"><b>Code</b><span>Issues</span><span>Pull requests</span><span>Actions</span></div>
          <div className="ws-gh__file">
            <div className="ws-gh__filehead">CHANGELOG.md</div>
            <div className="ws-gh__md">
              <b className="ws-h1">Changelog</b>
              <b className="ws-h2">1.4.0 — unreleased</b>
              <ul>
                <li>Group chats between agents</li>
                <li>A live browser for every agent</li>
                <li>Routines that run on a schedule</li>
              </ul>
            </div>
          </div>
        </div>
      );
    case "stock":
      return (
        <div className="ws-stock">
          <div className="ws-stock__search">dark desk setup</div>
          <div className="ws-stock__grid">
            {["a", "b", "c", "d", "e", "f"].map((k, i) => (
              <span key={k} className={`ws-shot ws-shot--${k}`} data-hot={i === (step === 1 ? 1 : step === 2 ? 5 : 0) ? "true" : undefined}>
                <i>▶ 0:{12 + i * 3}</i>
              </span>
            ))}
          </div>
        </div>
      );
    case "compose":
      return (
        <div className="ws-x">
          <div className="ws-x__rail"><b>𝕏</b><span /><span /><span /><span /></div>
          <div className="ws-x__main">
            <div className="ws-x__head">For you <span>Following</span></div>
            <div className="ws-x__compose">
              <span className="ws-x__avatar" />
              <div>
                <p><b>Your agents now work as a team.</b> Give Jarvis one goal — it hands out the work and only comes back when something needs you.</p>
                <div className="ws-x__media">▶ launch-clip.mp4</div>
                <div className="ws-x__bar"><span>Scheduled · Tue 16:00</span><b data-hot={step === 2 ? "true" : undefined}>Schedule</b></div>
              </div>
            </div>
          </div>
        </div>
      );
    case "landing":
      return (
        <div className="ws-landing">
          <div className="ws-landing__nav"><b>Personal Jarvis</b><span>Plugins</span><span>Agents</span><i>Download</i></div>
          <b className="ws-landing__h">A voice assistant that runs on your machine.</b>
          <span className="ws-landing__sub">Speak to your computer. It answers, types and uses your apps.</span>
          <span className="ws-landing__cmd" data-hot={step >= 1 ? "true" : undefined}>irm https://…/install.ps1 | iex <em>Copy</em></span>
          <span className="ws-landing__badge">Variant B · one install command</span>
        </div>
      );
    case "mail":
      return (
        <div className="ws-gmail">
          <div className="ws-gmail__side">
            <b className="ws-gmail__compose">✎ Compose</b>
            <span data-on="true">Inbox <em>4</em></span>
            <span>Starred</span>
            <span>Sent</span>
            <span>Drafts</span>
          </div>
          <div className="ws-gmail__list">
            {[
              ["Venue Lindenhof", "Headcount for Thursday — please reply by 12:00", true],
              ["Sam", "Storyboard feedback — frame 3 is great", true],
              ["Team", "Offsite RSVPs: 14 yes", true],
              ["Receipts", "Your order has shipped", false],
              ["Newsletter", "This week in local AI", false],
            ].map(([from, subject, unread], i) => (
              <div key={String(subject)} className="ws-gmail__row" data-unread={unread ? "true" : undefined} data-hot={i === step ? "true" : undefined}>
                <b>{from}</b><span>{subject}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "pull":
      return (
        <div className="ws-github">
          <div className="ws-gh__repo"><span className="ws-gh__book" /> PersonalJarvis / <b>PersonalJarvis</b></div>
          <b className="ws-h1">Add jitter to reconnect <span className="ws-gh__num">412</span></b>
          <span className="ws-gh__meta"><i>Open</i> wants to merge 1 commit into main</span>
          <pre className="ws-gh__diff">
            <span>{"  def reconnect(self):"}</span>
            <span data-diff="del">{"-     retry(delay=1.0)"}</span>
            <span data-diff="add">{"+     retry(delay=1.0 + random() * 0.5)"}</span>
          </pre>
          <span className="ws-gh__checks">✓ All checks have passed</span>
          <b className="ws-gh__merge" data-hot={step === 2 ? "true" : undefined}>Merge pull request</b>
        </div>
      );
    case "forum":
      return (
        <div className="ws-reddit">
          <div className="ws-reddit__head"><i /> <b>r/LocalLLaMA</b><span>Top · This week</span></div>
          {[
            ["212", "A local voice assistant that can actually use my apps?", "48 comments"],
            ["96", "Local speech-to-text latency — real numbers?", "31 comments"],
            ["74", "Agents that ask before they act", "22 comments"],
          ].map(([votes, title, meta], i) => (
            <div key={title} className="ws-post" data-hot={i === step ? "true" : undefined}>
              <span className="ws-post__votes">▲<b>{votes}</b></span>
              <span className="ws-post__body"><b>{title}</b><span>{meta} · Share</span></span>
            </div>
          ))}
        </div>
      );
  }
}

export function BrowserPreview({ kind, live }: { kind: Preview; live: boolean }) {
  const site = SITES[kind];
  const [step, setStep] = useState(0);
  const [press, setPress] = useState(false);

  useEffect(() => {
    setStep(0);
    if (!live || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0;
    const timers: number[] = [];
    const tick = window.setInterval(() => {
      i = (i + 1) % site.path.length;
      setStep(i);
      if (site.path[i]![2]) {
        timers.push(window.setTimeout(() => setPress(true), 900));
        timers.push(window.setTimeout(() => setPress(false), 1150));
      }
    }, 2400);
    return () => {
      window.clearInterval(tick);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [kind, live, site]);

  const [x, y] = site.path[step] ?? [50, 50];
  return (
    <div className="mb">
      <div className="mb-window">
        <div className="mb-tabs">
          <span className="mb-tab">
            <i className="mb-favicon" />
            <span className="mb-tab__title">{site.tab}</span>
            <span className="mb-tab__x">×</span>
          </span>
          <span className="mb-newtab">+</span>
          <span className="mb-winctl"><i>—</i><i>☐</i><i>✕</i></span>
        </div>
        <div className="mb-toolbar">
          <span className="mb-nav">←</span>
          <span className="mb-nav">→</span>
          <span className="mb-nav">↻</span>
          <span className="mb-omnibox">
            <i className="mb-siteinfo" />
            <span className="mb-omnibox__url">{site.url}</span>
            <span className="mb-star">☆</span>
          </span>
          <span className="mb-profile" />
        </div>
        <div className="mb-page">
          <Site kind={kind} step={live ? step : 0} />
          {live && (
            <span className="mb-cursor" data-press={press ? "true" : undefined} style={{ left: `${x}%`, top: `${y}%` }} aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );
}
