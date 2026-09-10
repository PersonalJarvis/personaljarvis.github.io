# Jarvis Agents — a working team

## Style Prompt
Continue the website's CLI feature run: restrained editorial copy on the left,
the actual Agents view in the same painted well on the right. A fast, silent
English walkthrough shows a request, a direct agent message, a conversation
on the island and the result. The product is the visual. Use its real React
components, figures, materials, fonts and message receipts. HyperFrames renders
the product into one looping video inside the shared feature window.

## Colors
From `src/styles/tokens.css` and the app theme: canvas #060605, app background
#0a0a09, card #191815, ink #f7f7f4, muted text #9a978c, border #322f2b.
The island keeps its original palette. No recoloring or invented accent.

## Typography
Inter for application text, Pixelify Sans for the existing island labels.
Conversation type is 26–28px on the logical 1440px canvas; rail type is 16–20px,
and island message text is 22px. The original component hierarchy remains intact.
Section copy follows the CLI section's 22/26px optical paragraph, weight 500
for the leading sentence and 400 for the continuation.

## Motion
28 seconds, with useful visible activity in each beat. Native agent gestures,
messages and in-app view changes. The outer viewport stays fixed. There is no
separate caption band. No introductory title card or separate ending. The loop returns
to the opening app state without a black frame. Autoplay muted when visible.

## What NOT to Do
- No player controls, chapter buttons, duration labels or start screen.
- No large headline above a full-width video.
- No invented UI controls or hand-drawn substitute characters.
- No private conversations, actual customer data or live agent execution.
- No recreation of the old Remotion presentation inside a different renderer.

## Window contract
The website uses the shared 1440×1340 canvas, including the same 76px
`WindowChrome` as Plugins, Skills and CLIs. The rendered video fills the
remaining 1440×1264 body. No outer pan, zoom, stretch or letterbox.
Export at 2160×1896, with full-resolution WebGL and crisp vector cursor edges.
Record cursor destinations from native DOM bounds, never hand-place a click.
Keep the press visible for 140ms before applying its recorded view change.
