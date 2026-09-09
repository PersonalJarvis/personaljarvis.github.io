# Jarvis Agents website demo

A 42-second silent English product demo. The website player and the exported
film use the same `src/components/agents-demo/AgentsFilm.tsx` composition.
The script and chapter boundaries live in `story.ts`. Animation derives only
from the Remotion frame; the website owns playback and visibility handling.

## Story

1. 0–7 s: the existing island and agent roster.
2. 7–15 s: open Jarvis's agent card and request a launch briefing.
3. 15–30 s: Jarvis delegates to the issue-review and email agents; both reply.
4. 30–38 s: their findings become a briefing for human review.
5. 38–42 s: return to the island.

The conversation is scripted, not a recording of a completed live task. It
does not send messages, query accounts, change settings, or create routines.
The UI reflects the app observed on 2026-09-09: agent roster, agent-card header,
chat toolbar, internal-message receipts, composer, browser panel, chat history
and routines. Personal conversations are not included. A neutral model label
replaces the configured provider. Demo roles and copy are English.

The island is original application footage, not a rebuilt 3D world. Figures
move as recorded; the scripted collaboration is shown in the chat. The scene
does not simulate new paths or conversations on the island itself. The film
omits the outer app navigation, as it focuses on the Agents view.

## Assets

`public/agents-demo/island-motion.mp4` is a cropped 11.733-second recording of
the running app's island. Its world art, lighting and figures are unchanged.
The source viewport was 2560 pixels wide; the island crop was x=246, y=84,
width=2014, height=1164. Captured JPEG frames were assembled using their
timestamps, cropped and encoded to H.264 at 30 fps, CRF 18, with faststart.
The clip loops every 352 frames in the composition.

`avatar-0.png` through `avatar-4.png` are the app's own rendered avatar images,
read from the visible roster. The Inter variable font is copied from the app's
Fontsource installation; its SIL Open Font License is included alongside it.

## Preview and export

```sh
npm run dev
npm run video:agents:studio
npx remotion still video/agents/index.tsx JarvisAgents .video-output/check.png --frame=1035
npm run video:agents:render
```

The site remains on its one configured development address. Remotion Studio
is an editing tool, not a second website instance. The render command produces
the 3840×2160 master in `.video-output/jarvis-agents-4k.mp4`. That output and
temporary capture files are ignored by Git. The website uses the lazy-loaded
Remotion player and small source clip rather than downloading the 4K master.

Playback starts explicitly, pauses when the demo leaves the viewport or the
tab is hidden, and never resumes over a reader's manual pause. Reduced-motion
users get a static opening frame and can explicitly choose to play. Chapter
buttons seek and pause, allowing inspection. A prose transcript is available
without the player.
