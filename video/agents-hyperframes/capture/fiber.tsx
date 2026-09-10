/** Rendering adapter only: keep the shipped scene, advance it from film time. */
import React from "react";
import { Canvas as NativeCanvas } from "@demo/fiber";
export * from "@demo/fiber";
const canvases=new Set<any>();
export function Canvas(props:any){return <NativeCanvas {...props} dpr={2} frameloop="never" onCreated={(state:any)=>{
  state.clock.getElapsedTime=()=>window.__demoTime??0;
  canvases.add(state);
  props.onCreated?.(state);
}}/>;}
export function renderCanvases(time:number){
  for(const state of canvases){
    state.clock.elapsedTime=time-1/30;
    state.advance(time,true);
    // Settle DOM labels after the original camera and walker frame callbacks.
    state.clock.elapsedTime=time-1/30;
    state.advance(time,true);
  }
  window.dispatchEvent(new Event("jarvis-demo-draw"));
}
