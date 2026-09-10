/** Capture-only host: real product components, isolated synthetic state, no backend. */
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { renderCanvases } from "./fiber";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WorldStage } from "@/components/society/world/WorldStage";
import { RosterRail } from "@/components/society/roster/RosterRail";
import { AgentCardOverlay } from "@/components/society/card/AgentCardOverlay";
import { SAMPLE_ROSTER } from "@/components/society/mockRoster";
import { useConversationStore } from "@/components/society/world/conversationStore";
import { useCameraStore } from "@/components/society/world/cameraStore";
import { setRetirementPose, poseAt } from "@/components/society/world/retireStore";
import { buildIsland, groundY } from "@/components/society/world/islandLayout";
import { useAgentChatStore } from "@/store/agentChat";
import { useSocietyChatStore } from "@/components/society/chat/AgentChatPanel";
import { EMPTY_TIMELINE } from "@/components/agentchat/reduce";
import { loadLocaleChunk } from "@/i18n";
import "@/index.css";
import "./fixture.css";

const EPOCH=Date.UTC(2026,8,10,10,0,0);
window.__demoTime=0;
Date.now=()=>EPOCH+window.__demoTime*1000;

const roster = SAMPLE_ROSTER.map((agent, i) => ({...agent,
  name:["Jarvis","Scout","Archivist"][i], title:["Lead","Research & planning","Shared knowledge"][i],
  provider:"openai-codex", providerLabel:"ChatGPT / Codex", model:"gpt-5.6-sol", effort:"high",
  checkpoint:"idle", state:"idle", chatSessionId:`demo-${agent.agentId}`,
  routines:[], stats:{runs:0,totalCostUsd:0,spentTodayUsd:0,lastActiveMs:null},
}));
const client = new QueryClient({defaultOptions:{queries:{retry:false,staleTime:Infinity}}});
client.setQueryData(["society","roster"],{agents:roster,sample:false});
const realFetch=window.fetch.bind(window);
window.fetch=async(input,init)=>{
  const url=new URL(typeof input==="string"?input:input instanceof URL?input.href:input.url,location.href);
  if(!url.pathname.startsWith("/api/")) return realFetch(input,init);
  const data=url.pathname.includes("/conversations")||url.pathname==="/api/chats"?[]:url.pathname.endsWith("/sessions")?{sessions:[]}:
    url.pathname.includes("/capabilities")?{capabilities:[]}:
    url.pathname.includes("/quests")?{quests:[]}:
    url.pathname.includes("/routines")?{routines:[]}:
    url.pathname.includes("/building")?{poses:{}}:
    url.pathname.includes("/history")?{items:[],messages:[]}:
    url.pathname.includes("/browser")?{available:false,configured:false}:
    url.pathname.includes("/providers")?{providers:[]}:
    url.pathname.endsWith("/society/agents")?{agents:roster.map(a=>({agent_id:a.agentId,name:a.name,title:a.title,description:a.description,tier:a.tier,provider:a.provider,model:a.model,effort:a.effort,avatar:a.figure,state:"active",run_state:"idle",checkpoint:"idle",session_id:a.chatSessionId,grants:[],focus:[],denies:[],grant_mode:"all",permission_ceiling:"ask",stats:{}}))}:{items:[],events:[],messages:[],rooms:[]};
  return new Response(JSON.stringify(data),{status:200,headers:{"Content-Type":"application/json"}});
};
class FixtureSocket extends EventTarget {
  static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;
  readyState=1;onopen=null;onclose=null;onmessage=null;onerror=null;
  constructor(){super();queueMicrotask(()=>this.onopen?.(new Event("open")));}
  send(){} close(){this.readyState=3;}
}
window.WebSocket=FixtureSocket as unknown as typeof WebSocket;

const provider={id:"openai-codex",label:"Codex",family:"openai",runner:"codex-cli",models_source:"curated",curated_models:[{id:"gpt-5.6-sol",label:"GPT-5.6 Sol"}],effort_levels:["high"],default_effort:"high",default_model:"gpt-5.6-sol",keyless:false,cli_installed:true,permission_modes:[],default_permission_mode:"ask"};
const session={session_id:"demo-jarvis",title:"Launch briefing",provider:"openai-codex",model:"gpt-5.6-sol",effort:"high",permission_mode:"ask",surface:"jarvis",cwd:"",created_ms:0,updated_ms:0};
const noop=async()=>{};
for(const store of [useAgentChatStore,useSocietyChatStore])store.setState({
  catalog:{providers:[provider],default_cwd:"",shell:""},connections:[],sessions:[session],activeSession:session,activeSessionId:"demo-jarvis",
  timeline:EMPTY_TIMELINE,socketState:"open",busy:false,lastError:null,
  draft:{provider:"openai-codex",model:"gpt-5.6-sol",effort:"high",permissionMode:"ask",buildMode:"ask",cwd:""},
  loadCatalog:noop,loadSessions:noop,loadModels:noop,loadHealth:noop,openSession:()=>{},send:noop,cancel:noop,
} as never);

const user=(id,text)=>({type:"user",id,text,attachments:[],tsMs:0});
const reply=(id,text)=>({type:"turn",id,provider:"openai-codex",model:"gpt-5.6-sol",effort:"high",runner:"codex-cli",status:"done",blocks:[{kind:"text",id:`${id}-text`,text}],startedMs:0,durationMs:1100,usage:null,liveUsage:null,costUsd:null,error:null});
const internal=(id,sender,text)=>({type:"internal",id,tsMs:0,message:{message_id:id,sender_id:sender.agentId,sender_name:sender.name,sender_kind:sender.tier==="lead"?"jarvis":"agent",text,prompt:text,trace_id:"",status:"delivered",turn_id:"",error:""}});
const request=user("request","Scout, check the launch blockers. Ask Archivist for the release checklist.");
const response=reply("ack","On it. I'll check the open issues and get the checklist from Archivist.");
const ask=internal("handoff",roster[1],"Archivist, which release checks are still outstanding?");
const answer=internal("answer",roster[2],"The checklist is up to date. Only the welcome email needs a final review.");
const result=reply("brief","Launch briefing ready.\n\n- **Issues:** no release blockers.\n- **Checklist:** complete.\n- **Next step:** review the welcome email.\n\nI've left the findings in our shared notes.");
const direct=user("direct","Focus on the welcome email. Give me the two changes that matter most.");
const directReply=reply("direct-answer","1. Put the setup link in the first sentence.\n2. Explain that all agents share the same project notes.");
function transcript(store,items,id="demo-jarvis") {store.setState({timeline:{...EMPTY_TIMELINE,items},activeSessionId:id,activeSession:{...session,session_id:id},busy:false});}

const {map}=buildIsland();
const placements=[[-9,10],[-3,18],[3,18]];
function pose(i,mode="rest") {const[x,z]=placements[i];setRetirementPose(roster[i].agentId,{...poseAt(x,groundY(map,x,z),z,-Math.PI/2),mode});}
roster.forEach((_,i)=>pose(i));
useCameraStore.getState().focusOn(0,14,0);
const known=new Set(roster.map(a=>a.agentId));
let sequence=0;
function message(from,to,text) {
  useConversationStore.getState().noteMessage({eventId:`demo-message-${++sequence}`,seq:sequence,msgType:from===2?"ANSWER":"QUERY",fromAgent:roster[from].agentId,toAgent:roster[to].agentId,roomId:"",roomRound:0,text,textChars:text.length,truncated:false},known);
  const started=EPOCH+(from===1?7:11)*1000;
  useConversationStore.setState(state=>({talks:Object.fromEntries(Object.entries(state.talks).map(([key,talk])=>[key,{...talk,kind:"talk",startedMs:started,lineStartedMs:started,line:talk.line?{...talk.line,ms:started}:null}]))}));
  for(const [i,j,talking] of [[from,to,true],[to,from,false]] as const) {
    const [x,z]=placements[i];const[tx,tz]=placements[j];
    setRetirementPose(roster[i].agentId,{...poseAt(x,groundY(map,x,z),z,Math.atan2(tx-x,tz-z)),mode:talking?"talk":"rest"});
  }
}

function Fixture() {
  const [selected,setSelected]=useState<string|null>(null);
  useEffect(()=>{void loadLocaleChunk("society");},[]);
  useEffect(()=>{
    const setTime=(time:number)=>{
      window.__demoTime=time;
      const name=time<2?"world":time<7?"request":time<11?"messages":time<15?"answer":time<21?"direct":time<26?"result":"world";
      flushSync(()=>scene(name));
      renderCanvases(time);
      // Drei's HTML labels use their own React roots; paint again after those
      // commits, still at the exact same authored time (never a wall clock).
      queueMicrotask(()=>renderCanvases(time));
      requestAnimationFrame(()=>renderCanvases(time));
    };
    window.renderDemoAt=setTime;
    window.parent.postMessage({type:"jarvis-demo-ready"},location.origin);
    const seek=(event:MessageEvent)=>{if(event.origin===location.origin&&event.data?.type==="jarvis-demo-seek")setTime(event.data.time);};
    window.addEventListener("message",seek);
    return()=>{window.removeEventListener("message",seek);delete window.renderDemoAt;};
  },[]);
  function scene(name) {
    useConversationStore.getState().reset();roster.forEach((_,i)=>pose(i));
    if(name==="world") {setSelected(null);useCameraStore.getState().focusOn(0,14,0);}
    if(name==="request") {
      const typed={...request,text:request.text.slice(0,Math.max(0,Math.floor((window.__demoTime-2.2)*105)))};
      const items=[typed];
      if(window.__demoTime>=3.5)items.push({...response,blocks:[{...response.blocks[0],text:response.blocks[0].text.slice(0,Math.floor((window.__demoTime-3.5)*110))}]});
      transcript(useAgentChatStore,items);setSelected("jarvis");
    }
    if(name==="messages") {setSelected(null);message(1,2,"Which release checks are still outstanding?");}
    if(name==="answer") {setSelected(null);message(2,1,"Only the welcome email needs a final review.");}
    if(name==="direct") {transcript(useSocietyChatStore,[internal("lead-task",roster[0],request.text),response,direct,directReply],"demo-scout");setSelected("scout");}
    if(name==="result") {transcript(useAgentChatStore,[request,internal("scout-result",roster[1],"No release blockers. Archivist confirmed the checklist."),result]);setSelected("jarvis");}
  }
  return <QueryClientProvider client={client}>
    <div id="capture-app" className="flex h-full flex-col bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-5 text-sm font-semibold"><span>Agents</span><span className="text-xs font-normal text-muted-foreground">Personal Jarvis</span></header>
      <div className="flex min-h-0 flex-1"><div className="flex min-w-0 flex-1 flex-col"><div className="flex h-9 shrink-0 items-center gap-3 border-b border-border px-4 text-xs"><strong>Society</strong><span className="text-muted-foreground">3 agents</span></div><div className="relative min-h-0 flex-1"><WorldStage onOpenLedger={()=>{}} onSelectAgent={setSelected} topRight={<div className="rounded-md border border-border bg-popover px-3 py-2 text-xs">The island <span className="ml-4 text-muted-foreground">Ledger</span></div>}/></div></div><RosterRail agents={roster as never} loading={false} sample={false} activeAgentId={selected} onOpen={setSelected} onCreate={()=>{}}/></div>
      <AgentCardOverlay agent={roster.find(a=>a.agentId===selected) as never ?? null} roster={roster as never} sample={false} onSelectAgent={setSelected} onClose={()=>setSelected(null)}/>
    </div>
  </QueryClientProvider>;
}
createRoot(document.getElementById("root")!).render(<Fixture/>);
