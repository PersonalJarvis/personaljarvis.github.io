/** The same event list drives real UI clicks, cursor movement and validation. */
export const DEMO_COPY = {
  request: "Scout, check the launch blockers. Ask Archivist for the release checklist.",
  direct: "Focus on the welcome email. Give me the two changes that matter most.",
};
export const DEMO_ACTIONS = [
  { at: 2, target: "agent-jarvis", after: "Jarvis" },
  { at: 2.3, target: "composer", after: "Jarvis" },
  { at: 3.6, target: "send", after: "Jarvis", text: DEMO_COPY.request },
  { at: 7, target: "close", after: null },
  { at: 15, target: "agent-scout", after: "Scout" },
  { at: 15.3, target: "composer", after: "Scout" },
  { at: 17, target: "send", after: "Scout", text: DEMO_COPY.direct },
  { at: 21, target: "agent-jarvis", after: "Jarvis" },
  { at: 26, target: "close", after: null },
] as const;

export function actionTarget(id: string): HTMLElement {
  const scope = document.querySelector('[role="dialog"][data-state="open"]') ?? document;
  const selector = id === "close" ? 'button[aria-label="Close"]' : id === "send" ? 'button[aria-label="Send"]'
    : id === "composer" ? '[data-testid="composer-chip-field"]' : `[data-demo-target="${id}"]`;
  const element = scope.querySelector<HTMLElement>(selector);
  if (!element || (element as HTMLButtonElement).disabled) throw new Error(`Demo action target unavailable: ${id}`);
  return element;
}

export function targetPoint(element: HTMLElement) {
  const box = element.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) throw new Error("Demo action target has no visible bounds");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2,
    bounds: { x: box.x, y: box.y, width: box.width, height: box.height } };
}

export function hitTarget(element: HTMLElement, point: { x: number; y: number }) {
  const hit = document.elementFromPoint(point.x, point.y);
  if (hit !== element && (!hit || !element.contains(hit))) {
    throw new Error(`Cursor misses its real target: ${JSON.stringify({target: element.outerHTML.slice(0,350), point, hit:hit?.outerHTML.slice(0,350),viewport:[innerWidth,innerHeight]})}`);
  }
}
