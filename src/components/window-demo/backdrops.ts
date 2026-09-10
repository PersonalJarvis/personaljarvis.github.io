import plugins from "@/assets/demo-backgrounds/plugins.webp";
import skills from "@/assets/demo-backgrounds/skills.webp";
import clis from "@/assets/demo-backgrounds/clis.webp";
import agents from "@/assets/demo-backgrounds/agents.webp";
import openSource from "@/assets/demo-backgrounds/open-source.webp";

/** Distinct paintings; all window geometry still belongs to DemoStage. */
export const DEMO_BACKDROPS = { plugins, skills, clis, agents, "open-source": openSource };
export type DemoBackdrop = keyof typeof DEMO_BACKDROPS;
