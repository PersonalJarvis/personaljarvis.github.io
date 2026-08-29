/**
 * The Jarvis mark, extruded and turning, rastered live.
 *
 * docs/DITHER-RELIEF.md keeps these assets as finished PNGs and allows real
 * time in exactly one case: when the form has to move. It does here, so the
 * dither runs as a screen-space pass over a real scene rather than being
 * frozen into a file. Everything else in that recipe still holds — the
 * orthographic camera, one key light with a weak fill, no environment map,
 * no colour in the raster.
 *
 * Two things carry the relief, and neither is the raster:
 *
 *  1. The key is a SPOT, not a directional light. A directional light sends
 *     parallel rays, so the front face comes back one flat tone and the raster
 *     reads as constant density — the failure the recipe calls "the template
 *     was flat". A spot placed close by falls off with distance, which is what
 *     lays a gradient across the face. The recipe's own Blender step gets the
 *     same effect from an area light held close.
 *
 *  2. The lights stay fixed while the mark turns under them, so the shading
 *     sweeps across the form instead of travelling with it.
 *
 * The viewpoint is a dead-on orthographic elevation — no tilt, no perspective
 * — matching the reference the maintainer chose the effect from.
 */

import { useEffect, useRef } from "react";
import {
  AmbientLight,
  Box3,
  Camera,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  PCFSoftShadowMap,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  SpotLight,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";

import {
  DITHER_FRAGMENT,
  DITHER_VERTEX,
  MATRIX_SIZE,
  thresholdTexture,
} from "./dither";
import { buildMark } from "./gigi";

/** The site's ink, as sRGB components. */
const INK = new Color(247 / 255, 247 / 255, 244 / 255);

/** One cell of the matrix covers this many CSS pixels. */
const CELL_CSS_PX = 1;

/**
 * Seconds per revolution.
 *
 * The reference (meuze.ai) turns its mark once every 15 seconds — read off its
 * own bundle, where the rate is `-(2*PI) / (1000 * secondsPerRevolution)` with
 * `secondsPerRevolution` defaulting to 15 and no call site overriding it. That
 * is not what makes it LOOK brisk: its raster is 7 CSS pixels per cell, so a
 * degree of turn moves whole blocks of dots and the eye reads motion instantly.
 * Ours is a one-pixel cell, a much finer grain, and the same 15 seconds barely
 * registers as movement at all.
 *
 * So the maintainer's instruction — "make it turn fast, like theirs" — is a
 * request about the perceived speed, and matching their number would have
 * changed nothing (we were already at 14). Six seconds is what reads as the
 * reference does at this grain. Still a turn rather than a spin: a full
 * revolution takes long enough to follow the face going away and coming back.
 */
const TURN_SECONDS = 6;

/** The pose a still frame settles on: turned just enough to show the depth. */
const RESTING_ANGLE = -0.32;

interface Props {
  className?: string;
}

export function TurningMark({ className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false });
    } catch {
      // No context: the graphic is decorative, so its absence is the fallback.
      return;
    }

    // A whole number of device pixels per matrix cell. A fractional ratio
    // would put cell boundaries between pixels and the grid would shimmer as
    // the mark turns.
    const ratio = Math.max(1, Math.round(window.devicePixelRatio || 1));
    renderer.setPixelRatio(ratio);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    renderer.outputColorSpace = SRGBColorSpace;

    const scene = new Scene();
    const pivot = new Group();
    scene.add(pivot);

    const paperMaterial = new MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0,
    });
    // Not quite black: a hair of value keeps it lit by the same maths as the
    // body, and it still falls under every threshold in the matrix, so it
    // rasters to no dots at all. Black on this page is simply absent ink.
    const accentMaterial = new MeshStandardMaterial({
      color: 0x050505,
      roughness: 0.55,
      metalness: 0,
    });

    const { paper, accent, bodyIndex } = buildMark();
    const meshes: Mesh[] = [];

    paper.forEach((geometry) => {
      const mesh = new Mesh(geometry, paperMaterial);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      pivot.add(mesh);
      meshes.push(mesh);
    });
    accent.forEach((geometry) => {
      const mesh = new Mesh(geometry, accentMaterial);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      pivot.add(mesh);
      meshes.push(mesh);
    });

    // Normalise on the BODY, not on everything: the arms stick out, and sizing
    // on them would shrink the mark every time an arm is redrawn.
    const box = new Box3().setFromObject(meshes[bodyIndex]);
    const size = new Vector3();
    const centre = new Vector3();
    box.getSize(size);
    box.getCenter(centre);
    meshes.forEach((mesh) => mesh.position.sub(centre));
    pivot.scale.setScalar(1 / size.y);

    // Orthographic, as the recipe asks. A perspective camera would taper the
    // mark and stop it reading as one flat brand shape. The half-frustum
    // clears the widest moment of the turn, when the body's depth adds to its
    // half-width.
    const camera = new OrthographicCamera(-0.62, 0.62, 0.62, -0.62, 0.1, 20);
    camera.position.set(0, 0, 6);

    const key = new SpotLight(0xffffff, 8, 0, Math.PI / 3.4, 1, 2);
    key.position.set(-1.05, 0.95, 1.35);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.3;
    key.shadow.camera.far = 6;
    key.shadow.bias = -0.0016;
    // Soft enough that an arm lays a contact shadow rather than a hard bar. A
    // dither has no greys to hide a stair-stepped shadow edge in: the
    // threshold turns every jag into a visible run of dots.
    key.shadow.radius = 5;
    scene.add(key);
    scene.add(key.target);

    const fill = new DirectionalLight(0xffffff, 0.62);
    fill.position.set(2.4, -0.7, 1.1);
    scene.add(fill);

    scene.add(new AmbientLight(0xffffff, 0.1));

    const target = new WebGLRenderTarget(1, 1, {
      samples: 4,
      colorSpace: SRGBColorSpace,
    });
    const matrix = thresholdTexture();

    const passMaterial = new ShaderMaterial({
      vertexShader: DITHER_VERTEX,
      fragmentShader: DITHER_FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uScene: { value: target.texture },
        uMatrix: { value: matrix },
        uMatrixSize: { value: MATRIX_SIZE },
        uCell: { value: CELL_CSS_PX * ratio },
        uInk: { value: new Vector3(INK.r, INK.g, INK.b) },
      },
    });
    const passGeometry = new PlaneGeometry(2, 2);
    const passScene = new Scene();
    passScene.add(new Mesh(passGeometry, passMaterial));
    const passCamera = new Camera();

    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const next = Math.max(1, Math.round(Math.min(rect.width, rect.height)));
      if (next === width) return;
      width = next;
      height = next;
      renderer.setSize(width, height, false);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      target.setSize(width * ratio, height * ratio);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Off-screen means no work. A turning mark two sections above the fold has
    // no reason to hold a GPU.
    let onScreen = true;
    const visibility = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
      },
      { rootMargin: "200px" },
    );
    visibility.observe(host);

    let running = true;
    let raf = 0;
    const started = performance.now();

    const draw = () => {
      if (!running) return;
      raf = requestAnimationFrame(draw);
      if (!onScreen || width === 0) return;

      pivot.rotation.y = motion.matches
        ? RESTING_ANGLE
        : ((performance.now() - started) / (TURN_SECONDS * 1000)) * Math.PI * 2;

      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(scene, camera);

      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(passScene, passCamera);
    };

    // A lost context is not an error to report; it is a state to survive.
    const onLost = (event: Event) => {
      event.preventDefault();
      running = false;
      cancelAnimationFrame(raf);
    };
    const onRestored = () => {
      running = true;
      draw();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    draw();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      observer.disconnect();
      visibility.disconnect();

      [...paper, ...accent, passGeometry].forEach((g) => g.dispose());
      paperMaterial.dispose();
      accentMaterial.dispose();
      passMaterial.dispose();
      matrix.dispose();
      target.dispose();
      renderer.dispose();
    };
  }, []);

  /**
   * The host fills whatever box it is given and centres the canvas in it.
   * That belongs here rather than in a class the caller has to remember: the
   * canvas is sized from this element's rect, so an element with no height
   * silently renders a one-pixel mark.
   */
  return (
    <div
      ref={hostRef}
      className={className}
      aria-hidden="true"
      style={{
        display: "grid",
        placeItems: "center",
        width: "100%",
        height: "100%",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}
