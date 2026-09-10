import { dirname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
const root = dirname(fileURLToPath(import.meta.url));
const website = resolve(root, "../../..");
const app = resolve(website, "../jarvis/ui/web/frontend");
const output = resolve(root,"../app");
// Preserve the approved browser-preview appearance while the app evolves.
const browserPreviewReference = await readFile(resolve(root,"reference/AgentBrowserPreview.tsx"), "utf8");
if (!output.startsWith(resolve(root,"..") + sep)) throw new Error("Capture output must stay inside the video project");
const { build } = await import(pathToFileURL(resolve(app, "node_modules/vite/dist/node/index.js")).href);
process.chdir(app);
await build({
  root, configFile: false, base: "./", publicDir: false,
  assetsInclude: ["**/*.glb"], esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": resolve(app,"src"), "@demo/fiber":resolve(app,"node_modules/@react-three/fiber/dist/react-three-fiber.esm.js"), "@react-three/fiber":resolve(root,"fiber.tsx"), react:resolve(app,"node_modules/react"), "react-dom":resolve(app,"node_modules/react-dom"), "@tanstack/react-query":resolve(app,"node_modules/@tanstack/react-query") } },
  plugins:[{name:"capture-seek-adapters",enforce:"pre",transform(code,id){
    if(id.endsWith("/AgentBrowserPreview.tsx"))return browserPreviewReference;
    if(id.endsWith("/RosterRail.tsx"))return code.replace('onClick={() => onOpen(agent.agentId)}','data-demo-target={`agent-${agent.agentId}`} onClick={() => onOpen(agent.agentId)}');
    if(id.endsWith("/AgentChatPanel.tsx"))return code
      .replace('const fieldRef = useRef<ComposerChipFieldHandle>(null);','const fieldRef = useRef<ComposerChipFieldHandle>(null); useEffect(() => { window.__demoComposer = { hydrate: (text) => fieldRef.current?.hydrate(text, []) }; return () => { delete window.__demoComposer; }; }, []);')
      .replace('ref={composerRef}', 'data-demo-composer={surface} ref={composerRef}');
    if(id.endsWith("/AgentCardOverlay.tsx"))return code.replace("<Dialog.Portal>",'<Dialog.Portal container={document.getElementById("root")}>');
    if(id.endsWith("/FigureRig.tsx"))return code.replace("figure.mixer.update(Math.min(dt, 0.1))","figure.mixer.setTime(window.__demoTime ?? 0)");
    if(id.endsWith("/Minimap.tsx"))return code
      .replaceAll("frame = requestAnimationFrame(draw);", "")
      .replace("if (now - last < REDRAW_MS) return;", "")
      .replace("return () => cancelAnimationFrame(frame);", 'const repaint = () => draw((window.__demoTime ?? 0) * 1000); window.addEventListener("jarvis-demo-draw", repaint); repaint(); return () => window.removeEventListener("jarvis-demo-draw", repaint);');
  }}],
  css: { postcss: app },
  build: { outDir:output, emptyOutDir:true, sourcemap:false, reportCompressedSize:false, chunkSizeWarningLimit:5000 },
});
