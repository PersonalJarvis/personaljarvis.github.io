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

The browser-preview component is frozen in `capture/reference/AgentBrowserPreview.tsx`
from app commit `23b402b8a4369e40712ace7fae64756f2b8a10a3`. This preserves the
approved demo's idle browser appearance while unrelated browser work continues
in the app checkout. The capture build substitutes that original source only.

The app is rendered inside a fixed composition at its responsive desktop
layout. The website uses the same 1440×1340 canvas and shared 76px title bar
as Plugins, Skills and CLIs. The movie occupies the 1440×1264 body, without
an additional caption band or moving crop. The English example conversations
explain the workflow within the app itself.

The master has 2160×1896 samples for that logical body. HyperFrames renders
a 1080px square composition at DPR 2; FFmpeg removes only its bottom padding.
The app iframe stays at 1440×1264 with a constant 0.75 transform. Its WebGL
canvas uses DPR 2, full internal resolution and no bloom. Conversation text
uses 36px type and auxiliary labels use at least 24px on the logical canvas.
This leaves roughly 13px conversation text in a 530px feature card. The original
application components and example conversations remain in place.

The normal 1080×948 web rendition is prefiltered from the master-sized render
with Lanczos, rather than relying on the browser's fast video downscaler to
shrink four source pixels into one display pixel. Cards needing more than
1200 physical pixels switch to the 2160px rendition while retaining playback time.

Before rendering, `capture/actions.ts` records nine clicks on the actual app
controls, checks their hit targets and validates both real Send handlers.
This one event log drives cursor coordinates, click rings and view changes.
The pointer tip is the target coordinate. A press stays visible for 140ms
before the resulting view replaces it; the pointer holds during that press.
Drafts are typed into the real contenteditable composer and complete before Send.
The specialist draft occupies a full-width row above the model, microphone and
Send controls, so the entire instruction fits before it is submitted.
Calibration uses the renderer's original browser frame clock, while authored
motion uses virtual time. Twelve setup frames settle the camera and labels before
timeline registration. A single render worker avoids repeating setup midway through
the film; the final export must contain no timeline-readiness warnings.

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

FFmpeg must be available on PATH. The render script checks the composition,
renders it and crops the padding without resampling. It writes
`public/agents-demo/agents-feature-v6-readable.mp4` (1080×948, 30 fps),
`public/agents-demo/agents-feature-v6-readable-2x.mp4` (2160×1896), and
`public/agents-demo/agents-feature-v6-readable-poster.webp`.
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
