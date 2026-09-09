/** Scripted example, independent of the visitor's accounts and the live app. */
export const FPS = 30;
export const DURATION = 42 * FPS;
export const CHAPTERS = [
  { frame: 0, label: "Meet the team", detail: "Your agents, together in one place." },
  { frame: 7 * FPS, label: "Give Jarvis a goal", detail: "One request. The right specialists." },
  { frame: 15 * FPS, label: "Watch them collaborate", detail: "Handoffs and replies stay in the conversation." },
  { frame: 30 * FPS, label: "Get the complete picture", detail: "Their findings, brought back to you." },
] as const;

export const AGENTS = [
  { name: "Jarvis", role: "Lead", avatar: 0 },
  { name: "Gmail-Agent", role: "Gmail Management", avatar: 1 },
  { name: "GoogleDriveManager", role: "Google Drive Management", avatar: 2 },
  { name: "LinearDailyAgent", role: "Daily issue review", avatar: 3 },
  { name: "Nala", role: "Marketing & Growth", avatar: 4 },
] as const;

export const MESSAGES = [
  { at: 9, kind: "user", text: "Get me ready for the launch. Check the open issues and customer emails, then put together a short briefing." },
  { at: 12, kind: "reply", text: "I'll bring in the team. LinearDailyAgent will check the blockers; Gmail-Agent will review customer messages." },
  { at: 15, kind: "internal", from: 0, to: 3, text: "Which launch issues still need attention? Share the blockers and owners." },
  { at: 18, kind: "internal", from: 0, to: 1, text: "Check the launch feedback. Send the customer questions we should address." },
  { at: 22, kind: "internal", from: 3, to: 0, text: "Two issues remain: onboarding copy and the welcome email. Both have owners; neither blocks the release." },
  { at: 26, kind: "internal", from: 1, to: 0, text: "Customers are asking about setup and shared memory. I've grouped the questions for the briefing." },
  { at: 30, kind: "reply", text: "Here's your launch briefing." },
] as const;

export function chapterAt(frame: number) {
  return CHAPTERS.findLastIndex((chapter) => frame >= chapter.frame);
}
