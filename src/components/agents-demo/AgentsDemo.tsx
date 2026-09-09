import { Player, type PlayerRef } from "@remotion/player";
import { useEffect, useRef, useState } from "react";
import { AgentsFilm } from "./AgentsFilm";
import { CHAPTERS, DURATION, FPS } from "./story";

export default function AgentsDemo() {
  const player = useRef<PlayerRef>(null);
  const host = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { setReduced(query.matches); if (query.matches) player.current?.pause(); };
    update(); query.addEventListener("change",update);
    return () => query.removeEventListener("change",update);
  }, []);
  useEffect(() => {
    const node=host.current;
    if(!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if(!entry?.isIntersecting) player.current?.pause();
    }, { threshold:0.15 });
    observer.observe(node);
    const onHidden=()=>{if(document.hidden) player.current?.pause();};
    document.addEventListener("visibilitychange",onHidden);
    return ()=>{observer.disconnect();document.removeEventListener("visibilitychange",onHidden);};
  }, []);
  useEffect(() => {
    const current=player.current;
    if(!current) return;
    const onPlay=()=>setPlaying(true);
    const onPause=()=>setPlaying(false);
    current.addEventListener("play",onPlay); current.addEventListener("pause",onPause); current.addEventListener("ended",onPause);
    return ()=>{current.removeEventListener("play",onPlay);current.removeEventListener("pause",onPause);current.removeEventListener("ended",onPause);};
  }, []);
  return <div ref={host} className="agents-demo">
    <Player ref={player} component={AgentsFilm} durationInFrames={DURATION} compositionWidth={1440} compositionHeight={810} fps={FPS}
      style={{width:"100%",aspectRatio:"16 / 9"}} controls loop={false} autoPlay={false} initiallyMuted
      clickToPlay={!reduced} spaceKeyToPlayOrPause showVolumeControls={false}
      aria-label="Jarvis Agents: a scripted English product demo" />
    <div className="agents-demo-controls"><button type="button" onClick={()=>{
      if(playing) player.current?.pause(); else {if((player.current?.getCurrentFrame()??0)>=DURATION-1)player.current?.seekTo(0);player.current?.play();}
    }}>{playing ? "Pause demo" : "Play demo"}<span aria-hidden="true">{playing ? "Ⅱ" : "▷"}</span></button>
      <span>42 seconds · English</span>
      <button type="button" onClick={()=>player.current?.requestFullscreen()}>Full screen <span aria-hidden="true">↗</span></button>
    </div>
    <div className="agents-chapters" role="group" aria-label="Demo chapters">{CHAPTERS.map((chapter,i)=><button key={chapter.frame} type="button" onClick={()=>{player.current?.seekTo(chapter.frame);player.current?.pause();}}><span>0{i+1}</span>{chapter.label}</button>)}</div>
  </div>;
}
