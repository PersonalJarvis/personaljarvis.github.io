import { Composition, registerRoot } from "remotion";
import { AgentsFilm } from "../../src/components/agents-demo/AgentsFilm";
import { DURATION, FPS } from "../../src/components/agents-demo/story";
import "../../src/styles/tokens.css";

registerRoot(() => <Composition id="JarvisAgents" component={AgentsFilm} width={1440} height={810} fps={FPS} durationInFrames={DURATION} />);
