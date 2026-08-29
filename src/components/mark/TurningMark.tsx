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
 *
 * ## The reader can take hold of it
 *
 * Holding the left button and dragging turns the mark by hand, and letting go
 * throws it: the hand's last speed becomes the mark's, and an exponential
 * glide carries that back into the idle drift. That is why the turn is state
 * here rather than a function of elapsed time — a clock-driven angle cannot be
 * interrupted, because the next frame simply overwrites whatever the hand did.
 *
 * It is a toy, and it is meant to be: nothing on the page depends on which way
 * the mark is facing.
 */

import { useEffect, useRef } from "react";
import {
  Box3,
  Camera,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
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
 * Six was tried and rejected: at a one-pixel cell the raster crawls rather than
 * turns, and the mark reads as restless (maintainer, 2026-08-29). Fourteen is
 * the settled figure, and it is within a second of the reference's own — its
 * bundle computes `-(2*PI) / (1000 * secondsPerRevolution)` with
 * `secondsPerRevolution` defaulting to 15 and no call site overriding it.
 */
const TURN_SECONDS = 14;

/**
 * How much room the frame keeps around the mark, as a share of its own size.
 * Small on purpose: the frame is sized to the section's column, so every
 * percent here is a percent off a graphic that is already width-limited.
 */
const FRAME_MARGIN = 1.04;

/** The pose a still frame settles on: turned just enough to show the depth. */
const RESTING_ANGLE = -0.32;

/**
 * The idle turn as an angular speed, because the mark is no longer driven by
 * the clock alone. Same fourteen seconds, expressed the way a loop that also
 * has to accept a hand on the mark needs it.
 */
const AUTO_SPEED = (2 * Math.PI) / TURN_SECONDS;

/**
 * Dragging across the full width of the frame turns the mark exactly once.
 *
 * Derived from the frame rather than fixed as radians-per-pixel: a constant
 * that feels right in this column feels stiff in a narrower one and twitchy in
 * a wider one, and this frame is sized from the section's grid.
 */
const TURNS_PER_FRAME_WIDTH = 1;

/**
 * The fastest a flick may leave the hand, in radians per second — about two
 * revolutions. Past that the raster stops resolving the form between frames
 * and the mark reads as strobing dots rather than as something spinning.
 */
const MAX_FLING = 4 * Math.PI;

/**
 * Time constant for the return to the idle turn, in seconds. A release hands
 * its speed to an exponential glide instead of snapping back, so a flick
 * coasts, slows and rejoins the drift with no visible seam. Just under a
 * second is long enough to read as momentum and short enough that the mark is
 * never off doing its own thing.
 */
const SETTLE_SECONDS = 0.9;

/**
 * A frame longer than this was a backgrounded tab, not a slow one. Integrating
 * it would jump the mark through an arbitrary angle on the way back, so it is
 * clamped to a plausible frame and the lost time is simply lost.
 */
const MAX_FRAME_SECONDS = 0.05;

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
      pivot.add(mesh);
      meshes.push(mesh);
    });
    accent.forEach((geometry) => {
      const mesh = new Mesh(geometry, accentMaterial);
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

    /**
     * What the frame has to clear, measured rather than guessed.
     *
     * The turn sweeps the mark through every angle about Y, so its widest
     * moment is not its width — it is its RADIUS about the turn axis,
     * `max sqrt(x² + z²)` over every vertex. Anything narrower clips an arm at
     * some angle; anything wider is empty margin, and margin is expensive here
     * because the graphic is already limited by the column it sits in.
     *
     * A hand-picked half-frustum used to stand in for this. It was 0.62 for a
     * form whose real radius is a good deal less, so the mark rendered smaller
     * than its box allowed at every angle of the turn.
     */
    let radius = 0;
    let halfHeight = 0;
    meshes.forEach((mesh) => {
      const position = mesh.geometry.getAttribute("position");
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i) + mesh.position.x;
        const y = position.getY(i) + mesh.position.y;
        const z = position.getZ(i) + mesh.position.z;
        radius = Math.max(radius, Math.hypot(x, z));
        halfHeight = Math.max(halfHeight, Math.abs(y));
      }
    });
    radius = (radius / size.y) * FRAME_MARGIN;
    halfHeight = (halfHeight / size.y) * FRAME_MARGIN;

    // Orthographic, as the recipe asks. A perspective camera would taper the
    // mark and stop it reading as one flat brand shape. The frustum itself is
    // set in `resize`, from the frame's real aspect — the frame is no longer
    // square, and a square frustum in a tall box wastes the height.
    const camera = new OrthographicCamera(-radius, radius, halfHeight, -halfHeight, 0.1, 20);
    camera.position.set(0, 0, 6);

    /**
     * The key. A spot, close, because distance falloff is what lays the
     * gradient across the face — the recipe forbids a directional key for
     * exactly that reason.
     *
     * Weaker than it was. It used to be the only thing lighting the mark, so
     * it had to be strong enough to carry a face on its own, and the front
     * then clipped to flat white over half its area while everything the spot
     * missed fell to nothing. The floor below does that job now, so the key
     * only has to model.
     *
     * IT CASTS NO SHADOW, and that is the point. A shadow map was what put the
     * hard edges in the turn the maintainer flagged (2026-08-29): a shadow is
     * binary occlusion of one light, so an arm's shadow landed on ground the
     * other lights barely reached and came back as a dark bar with a stepped
     * edge — the exact failure the old comment here promised it had avoided. A
     * dither has no greys to hide such an edge in; the threshold turns every
     * jag into a visible run of dots. The relief comes from the falloff and the
     * normals instead, which is what the recipe says carries it anyway, and the
     * scene now costs one render pass per frame rather than two.
     */
    const key = new SpotLight(0xffffff, 5.2, 0, Math.PI / 3.4, 1, 2);
    key.position.set(-1.05, 0.95, 1.35);
    scene.add(key);
    scene.add(key.target);

    /**
     * The floor under the whole thing, and the fix for the turn.
     *
     * A hemisphere light shades by the normal's tilt alone, so EVERY face
     * keeps some light no matter which way the turn has swung it. That is what
     * the mark was missing: with one key and one fill, both in front and to
     * one side, the extruded flank went black the moment it came round, and
     * the arm's cast shadow landed on unlit ground as a solid bar with hard
     * edges. In a dither, "black" is not dark — it is NO DOTS, a hole in the
     * middle of the mark. This keeps the darkest visible face at a readable
     * density and turns that bar into a soft grey.
     *
     * It is not an environment map: no texture, no image-based lighting, just
     * two colours and the normal. The recipe's ban stands.
     */
    scene.add(new HemisphereLight(0xffffff, 0x7d7d7d, 0.66));

    // A little directional interest from the opposite side, so the flank the
    // key never reaches is not lit by the hemisphere alone and flat.
    const fill = new DirectionalLight(0xffffff, 0.3);
    fill.position.set(2.4, -0.7, 1.1);
    scene.add(fill);

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

    /**
     * Whether anything has changed since the last render.
     *
     * The loop used to redraw unconditionally, which was fine while the mark
     * could only ever be turning. It can now be still — under reduced motion,
     * and for as long as a hand holds it in one place — and a still mark has
     * no reason to cost a render pass a frame.
     */
    let dirty = true;

    /**
     * The canvas takes the frame's real shape, and the camera is fitted to it.
     *
     * It used to be squared off to the shorter side and paired with a fixed
     * square frustum, which cost twice: the taller half of a non-square frame
     * was thrown away, and the mark then sat inside a frustum wider than it
     * ever needs. Now the scale is whichever of the two axes runs out first —
     * `pixels per world unit` — and the frustum is the canvas measured in those
     * units. The mark is drawn at the largest size its box allows, whatever the
     * box's aspect, and it stays centred because the frustum is symmetric.
     */
    const resize = () => {
      const rect = host.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      if (w === width && h === height) return;
      width = w;
      height = h;

      const perUnit = Math.min(width / (2 * radius), height / (2 * halfHeight));
      camera.left = -width / (2 * perUnit);
      camera.right = width / (2 * perUnit);
      camera.top = height / (2 * perUnit);
      camera.bottom = -height / (2 * perUnit);
      camera.updateProjectionMatrix();

      renderer.setSize(width, height, false);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      target.setSize(width * ratio, height * ratio);
      dirty = true;
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

    /**
     * Reduced motion takes away the UNPROMPTED turn, not the mark's ability to
     * move. A drag is the reader asking for it, so the mark still turns under
     * the hand and still coasts to a stop afterwards; what it never does is
     * start on its own. Read per frame rather than captured once, so a reader
     * who changes the setting is obeyed without a reload.
     */
    const idleSpeed = () => (motion.matches ? 0 : AUTO_SPEED);

    /**
     * The turn, as state rather than as a function of the clock.
     *
     * It used to be `elapsed / TURN_SECONDS`, which cannot be interrupted: a
     * hand on the mark would have been overwritten by the clock on the very
     * next frame. An angle and a speed, integrated per frame, is the smallest
     * model that lets a drag take over and then hand back.
     */
    let angle = motion.matches ? RESTING_ANGLE : 0;
    let speed = idleSpeed();

    let dragging = false;
    let dragPointer = -1;
    let dragX = 0;
    let dragAt = 0;
    let dragSpeed = 0;

    const onPointerDown = (event: PointerEvent) => {
      // Left button only. A right-click is the context menu and a middle click
      // starts an autoscroll; grabbing the mark on either would take a gesture
      // the browser has already promised to something else.
      if (dragging || event.button !== 0 || width === 0) return;

      dragging = true;
      dragPointer = event.pointerId;
      dragX = event.clientX;
      dragAt = performance.now();
      dragSpeed = 0;

      // Capture, so a hand that runs off the canvas mid-turn keeps turning it
      // and the release still arrives here rather than at whatever element the
      // cursor happens to be over by then.
      host.setPointerCapture(dragPointer);
      host.style.cursor = "grabbing";
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== dragPointer) return;

      const now = performance.now();
      // Floored: two samples inside the same millisecond would otherwise
      // divide by zero and hand the fling an infinite speed.
      const dt = Math.max((now - dragAt) / 1000, 0.001);
      const delta =
        ((event.clientX - dragX) * TURNS_PER_FRAME_WIDTH * 2 * Math.PI) / width;

      angle += delta;
      dirty = true;

      // Smoothed rather than the last raw sample: a pointer that stalls for
      // one frame before the release would otherwise throw a hand that was
      // plainly still moving at a speed of nothing.
      dragSpeed = dragSpeed * 0.7 + (delta / dt) * 0.3;

      dragX = event.clientX;
      dragAt = now;
    };

    const endDrag = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== dragPointer) return;

      dragging = false;
      if (host.hasPointerCapture(dragPointer)) {
        host.releasePointerCapture(dragPointer);
      }
      dragPointer = -1;
      host.style.cursor = "grab";

      // A hand that came to rest before letting go releases a still mark. Only
      // a release that was still moving throws one, and only up to a speed the
      // raster can still resolve.
      const moving = performance.now() - dragAt < 120;
      speed = moving ? Math.max(-MAX_FLING, Math.min(MAX_FLING, dragSpeed)) : 0;
    };

    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerup", endDrag);
    host.addEventListener("pointercancel", endDrag);

    let running = true;
    let raf = 0;
    let last = performance.now();

    const draw = () => {
      if (!running) return;
      raf = requestAnimationFrame(draw);

      const now = performance.now();
      const dt = Math.min((now - last) / 1000, MAX_FRAME_SECONDS);
      last = now;

      if (!onScreen || width === 0) return;

      if (!dragging) {
        // Frame-rate independent, which `speed += (target - speed) * k` is
        // not: that settles more than twice as fast on a 144Hz panel as on a
        // 60Hz one, so the coast after a flick would be a different gesture on
        // a different screen.
        speed += (idleSpeed() - speed) * (1 - Math.exp(-dt / SETTLE_SECONDS));

        // Below this the glide is asymptote, not movement. Stopping here is
        // what lets a reduced-motion page and a held mark cost nothing.
        if (Math.abs(speed) > 1e-4) {
          angle += speed * dt;
          dirty = true;
        }
      }

      if (!dirty) return;
      dirty = false;
      pivot.rotation.y = angle;

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
      // The clock kept running while the context was gone. Rebasing it here
      // keeps the first frame back a frame rather than the whole outage.
      last = performance.now();
      dirty = true;
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
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerup", endDrag);
      host.removeEventListener("pointercancel", endDrag);
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
   *
   * Three of these styles are the grab rather than the layout:
   *
   *  - `cursor: grab` is the only affordance the mark has. Nothing about a
   *    turning graphic says it can be taken hold of, and a toy nobody notices
   *    is not a toy. The effect swaps it for `grabbing` while a hand is down.
   *  - `touch-action: pan-y` hands vertical gestures back to the page and
   *    keeps horizontal ones. Without it a touch that lands on the mark can
   *    never scroll past it, and this section is a pinned one.
   *  - `user-select: none`, because a drag that starts on the mark otherwise
   *    sweeps a selection across the install steps beside it.
   *
   * It stays `aria-hidden`, and deliberately takes no `tabindex`. The turn is
   * decoration and the drag is a toy: there is no content behind either, so
   * there is nothing for assistive technology to miss — whereas a focusable
   * element inside an `aria-hidden` subtree is a real defect, a stop on the
   * tab order that a screen reader cannot then describe.
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
        cursor: "grab",
        touchAction: "pan-y",
        userSelect: "none",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}
