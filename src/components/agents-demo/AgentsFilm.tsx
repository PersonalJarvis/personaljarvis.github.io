import { useEffect, useState } from "react";
import { AbsoluteFill, Img, Loop, OffthreadVideo, cancelRender, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from "remotion";
import { AGENTS, CHAPTERS, FPS, MESSAGES, chapterAt } from "./story";
import "./agents-film.css";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const media = (name: string) => staticFile(`agents-demo/${name}`);

function Avatar({ index }: { index: number }) {
  return <Img alt="" className="af-avatar" src={media(`avatar-${index}.png`)} />;
}

function Roster({ active, working }: { active: boolean; working: boolean }) {
  return <aside className="af-roster">
    <div className="af-roster-title"><strong>Agents</strong><span className="af-small-button">＋ New</span></div>
    <div className="af-search">⌕ <span>Search agents</span></div>
    {AGENTS.map((agent, i) => <div key={agent.name} className="af-agent" data-selected={active && i === 0}>
      <Avatar index={i} /><div className="af-agent-name"><strong>{agent.name} {i === 0 && <small>Lead</small>}</strong><span>{agent.role}</span></div>
      <i className="af-dot" data-working={working && [0, 1, 3].includes(i)} />
    </div>)}
  </aside>;
}

function Chat({ seconds }: { seconds: number }) {
  const scroll = interpolate(seconds, [20, 23, 28, 32], [0, 88, 225, 350], clamp);
  const typed = "Get me ready for the launch. Check the open issues and customer emails, then put together a short briefing.";
  return <div className="af-chat">
    <div className="af-toolbar"><span className="af-chip">✧ Model <span>Default</span></span><span className="af-effort"><b>Auto</b> Low Medium High Xhigh</span><span className="af-chat-tabs">♩ Voice <b>▣ Chat</b></span><span>↶</span></div>
    <div className="af-messages-viewport"><div className="af-messages" style={{ transform: `translateY(${-scroll}px)` }}>
      <div className="af-date">Today</div>
      {MESSAGES.filter(m => seconds >= m.at).map((message) => {
        const local = seconds - message.at;
        return <div key={message.at} className={`af-message af-message--${message.kind}`} style={{ opacity: interpolate(local,[0,.25],[0,1],clamp), transform: `translateY(${interpolate(local,[0,.35],[8,0],clamp)}px)` }}>
          {message.kind === "internal" && <div className="af-delivery"><Avatar index={message.from} /><strong>{AGENTS[message.from].name}</strong><span>→</span><Avatar index={message.to} /><strong>{AGENTS[message.to].name}</strong><span className="af-tag">Internal message</span><span className="af-delivered">● Delivered</span></div>}
          <p>{message.text.slice(0, Math.floor(local * 95) + 1)}</p>
          {message.at === 30 && seconds >= 31 && <div className="af-briefing">
            <div><span>01</span><p><strong>Release readiness</strong><br/>Two follow-ups, both assigned. No release blockers.</p></div>
            <div><span>02</span><p><strong>What customers need</strong><br/>A clearer setup guide and an explanation of shared memory.</p></div>
            <div><span>03</span><p><strong>Next step</strong><br/>Update the guide, then review the welcome email before launch.</p></div>
            <footer>Prepared from the team's findings · Ready for your review</footer>
          </div>}
        </div>;
      })}
    </div></div>
    <div className="af-composer"><span>＋</span><span>{seconds >= 7.8 && seconds < 9 ? typed.slice(0, Math.floor((seconds - 7.8) * 100)) : "Message Jarvis"}</span><span>♩</span><span className="af-send">↗</span></div>
  </div>;
}

function Options({ seconds }: { seconds: number }) {
  return <aside className="af-options"><div className="af-roster-title"><strong>Options</strong><span>···</span></div>
    <div className="af-browser"><span>⌘</span><p>Browser not set up on this machine.</p></div><p className="af-screen-label">Screen of Jarvis</p><p className="af-setup">Set up</p>
    <div className="af-option-title">Chats <span>1</span><b>＋</b></div><div className="af-history">▣ Launch briefing <span>Now</span></div>
    <div className="af-option-title">Voice <span>0</span></div><p className="af-option-muted">No conversations yet.</p>
    <div className="af-option-title">Routines <b>＋</b></div><p className="af-option-muted">No routines yet.</p>
    {seconds >= 30 && <div className="af-outcome"><i className="af-dot" data-working /> Team replies received</div>}
  </aside>;
}

/** Original island footage; reconstructed app chrome and scripted English messages. */
export function AgentsFilm() {
  const [fontHandle] = useState(() => delayRender("Load the original app font"));
  useEffect(() => {
    const font = new FontFace("Agents Inter", `url(${media("inter-latin.woff2")})`, { weight: "100 900" });
    font.load().then((loaded) => { document.fonts.add(loaded); continueRender(fontHandle); }).catch(cancelRender);
    return () => { continueRender(fontHandle); document.fonts.delete(font); };
  }, [fontHandle]);
  const frame = useCurrentFrame();
  const seconds = frame / FPS;
  const cardOpacity = interpolate(seconds, [6.7,7.2,37.4,38], [0,1,1,0], clamp);
  const chapter = CHAPTERS[Math.max(0,chapterAt(frame))];
  const working = seconds >= 12 && seconds < 31;
  return <AbsoluteFill className="agents-film" aria-hidden="true" style={{fontFamily:'"Agents Inter", var(--font-sans)'}}>
    <div className="af-window">
      <div className="af-window-chrome"><span>● ● ●</span><span>Personal Jarvis</span><span /></div>
      <div className="af-app-header"><strong>Agents</strong><span>☼ <span className="af-restart">⟳ Restart</span></span></div>
      <div className="af-society"><strong>Society</strong><span>{working ? "3 active" : "0 active"}</span></div>
      <div className="af-world-layout">
        <div className="af-island">
          <Loop durationInFrames={352} layout="none"><OffthreadVideo src={media("island-motion.mp4")} muted style={{ width:"100%",height:"100%",objectFit:"cover" }} /></Loop>
          <div className="af-world-status"><strong>5 agents</strong><span>{working ? "3 active" : "0 active"}</span></div>
          {seconds < 6.7 && <div className="af-world-intro" style={{opacity:interpolate(seconds,[.4,.9,5.8,6.5],[0,1,1,0],clamp)}}><Avatar index={0}/><div><strong>A team behind every request.</strong><span>Meet Jarvis and your specialist agents.</span></div></div>}
        </div>
        <Roster active={false} working={working} />
      </div>
      {cardOpacity > 0 && <div className="af-card-backdrop" style={{opacity:cardOpacity}}><div className="af-card" style={{transform:`scale(${interpolate(cardOpacity,[0,1],[.985,1],clamp)})`}}>
        <header className="af-card-header"><Avatar index={0}/><div><strong>Jarvis</strong><span>Lead</span></div><span className="af-idle">{working ? "Working" : "Idle"}</span><span>×</span></header>
        <div className="af-card-body"><Roster active working={working}/><Chat seconds={seconds}/><Options seconds={seconds}/></div>
      </div></div>}
      {seconds >= 38 && <div className="af-world-outro" style={{opacity:interpolate(seconds,[38,38.4],[0,1],clamp)}}><Avatar index={0}/><div><strong>Your team. One conversation.</strong><span>The details stay with the agents. You keep the overview.</span></div></div>}
    </div>
    <div className="af-caption"><div><span className="af-chapter-no">0{Math.max(0,chapterAt(frame))+1} / 04</span><strong>{chapter.label}</strong></div><p>{chapter.detail}</p><span className="af-demo-label">SCRIPTED PRODUCT DEMO</span></div>
  </AbsoluteFill>;
}
