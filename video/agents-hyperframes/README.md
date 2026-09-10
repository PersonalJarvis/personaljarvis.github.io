# Jarvis Agents — seamless website demonstration

The 28-second English, silent film appears immediately after CLIs. It uses
the existing feature section layout and shared painted `DemoStage` well.
The page loads only a native muted looping video and a small visibility
controller. HyperFrames and the application renderer stay off the website.

## Product fidelity

`capture/entry.tsx` imports the actual app's `WorldStage`, `RosterRail`,
`AgentCardOverlay`, chat stores, conversation renderer and sample figures.
The live app's source and assets are read from the sibling app checkout;
no production files or user settings are modified. The fixture uses synthetic
English messages and in-memory state. Its API and socket adapters never
contact a backend, execute an agent, or send a real message.

The app is rendered inside a fixed composition at its responsive desktop
layout. The website uses the same 1440×1340 canvas and shared 76px title bar
as Plugins, Skills and CLIs. The movie occupies the 1440×1264 body, without
an additional caption band or moving crop. The English example conversations
explain the workflow within the app itself.

The capture build redirects portals into the fixture and binds Three.js's
clock and figure animation mixers to film time. Native CSS transition clocks
are disabled in the fixture; the film timeline owns presentation timing.
Character staging uses the existing pose API without invoking retirement
actions. The island, buildings, characters and materials are not redesigned.

## Rebuild

With the app checkout beside this website and its frontend dependencies installed:

```sh
npm --prefix video/agents-hyperframes ci
node video/agents-hyperframes/capture/build.mjs
npm run video:agents:check
npm run video:agents:render
```

The final render is `public/agents-demo/agents-feature-v3.mp4` (1440×1264,
30 fps). Extract a representative frame as
`public/agents-demo/agents-feature-v3-poster.webp` after visual verification.
`npm run video:agents:studio` opens the editing environment; it is separate
from the website's single development server at port 4399.

Generated app bundles, editor caches and local inspection artifacts are
ignored. Production ships the MP4 and poster. The previous Remotion player,
composition, chapter controls and source footage have been removed.

## Playback

The movie starts automatically, muted and inline, when it enters the viewport.
It pauses offscreen and in a hidden tab, then resumes when visible. There is
no click-to-play gate, player toolbar or chapter UI. Reduced-motion visitors
see the poster. A screen-reader description states the demonstrated flow.

## Verification

HyperFrames `check` covers composition structure, runtime, layout, motion and
caption contrast. Inspect snapshots of the request, both message directions,
the specialist chat and the result before accepting a new render. Check the
exported movie as well as the source preview. The native Three.js dependency
currently emits its existing Clock deprecation warning; this is not a render
failure.

On the site, verify section/nav order, autoplay without gestures, absence of
controls, offscreen pause/resume, the reduced-motion poster, and mobile width.
The website follows its existing dark brand palette under either OS theme.
