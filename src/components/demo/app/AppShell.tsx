/**
 * The app's window: the sidebar, the caption strip and the content sheet.
 *
 * Markup and class names are copied from the app at HEAD — App.tsx (the
 * shell), components/layout/Sidebar.tsx (NavRow, the header, the footer),
 * SidebarSearchBar.tsx, SidebarAgents.tsx, home/RecentChats.tsx,
 * home/ChatKindMark.tsx, layout/TopBar.tsx, SectionNavButtons.tsx and
 * ThemeToggle.tsx. The app's own stylesheet (app.css) styles them, so they
 * render as the app renders them. Only the data is the demo's: a placeholder
 * user, three placeholder agents, placeholder chats.
 *
 * Keep the class strings verbatim when the app changes; then run
 * scripts/sync-app-ui.mjs so the new classes are in app.css.
 */
import type { ReactNode } from "react";

import { AgentsIcon, ArtifactsIcon, CodeIcon, ExtensionsIcon, MarketplaceIcon, SpeechIcon } from "./sectionIcons";
import {
  AppWindow,
  ArrowLeft,
  ArrowRight,
  AudioLines,
  ChevronDown,
  Download,
  PanelLeftClose,
  PanelRightOpen,
  Plus,
  RotateCw,
  Search,
  Sun,
} from "./lucide";

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** `SIDEBAR_DEFAULT_WIDTH` in the app's Sidebar.tsx. */
export const SIDEBAR_WIDTH = 240;

export type Section = "chats" | "agentic-ide";

// ---------------------------------------------------------------------------
// Caption strip (TopBar.tsx)
// ---------------------------------------------------------------------------

const NAV_BUTTON =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground " +
  "transition-colors hover:bg-secondary hover:text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
  "disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground";

function TopBar({ section }: { section: Section }) {
  return (
    <div data-testid="window-caption" className="fixed inset-x-0 top-0 z-[120] flex h-8 items-stretch bg-transparent">
      <div className="flex shrink-0 items-center" data-testid="section-nav-buttons" role="group">
        <button type="button" tabIndex={-1} className={NAV_BUTTON}>
          <PanelLeftClose className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" tabIndex={-1} className={NAV_BUTTON}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" tabIndex={-1} disabled className={NAV_BUTTON}>
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="pywebview-drag-region min-w-0 flex-1" />
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          tabIndex={-1}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          <Sun aria-hidden className="h-4 w-4" />
        </button>
        <button type="button" tabIndex={-1} className={NAV_BUTTON}>
          <AppWindow aria-hidden className="h-4 w-4" />
        </button>
        <button type="button" tabIndex={-1} className={NAV_BUTTON}>
          <RotateCw aria-hidden className="h-4 w-4" />
        </button>
        {section === "agentic-ide" && (
          <button
            type="button"
            tabIndex={-1}
            data-testid="ide-side-panel-toggle"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PanelRightOpen aria-hidden className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar (Sidebar.tsx and the pieces it renders)
// ---------------------------------------------------------------------------

const ROW_CLASS =
  "flex min-h-8 w-full items-center gap-3 rounded-lg px-3 text-base text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type IconComponent = (props: { className?: string; strokeWidth?: number; "aria-hidden"?: boolean }) => ReactNode;

/** `NavRow` in Sidebar.tsx. */
function NavRow({
  icon: Icon,
  label,
  active = false,
  beta,
  onClick,
}: {
  icon: IconComponent;
  label: string;
  active?: boolean;
  beta?: string;
  onClick?: () => void;
}) {
  return (
    <li>
      <div>
        <button
          type="button"
          tabIndex={-1}
          onClick={onClick}
          className={cn(
            "group relative flex h-8 w-full items-center gap-3 rounded-lg px-3 text-base transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            active ? "jarvis-nav-active bg-secondary text-foreground-strong" : "text-foreground hover:bg-secondary",
          )}
        >
          <Icon
            aria-hidden
            strokeWidth={1.75}
            className={cn(
              "h-[18px] w-[18px] shrink-0 transition-colors",
              active ? "text-foreground-strong" : "text-foreground",
            )}
          />
          <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <span className="truncate">{label}</span>
            {beta && (
              <span className="shrink-0 rounded-sm border border-border bg-secondary px-1 text-xs font-medium text-muted-foreground">
                {beta}
              </span>
            )}
          </span>
        </button>
      </div>
    </li>
  );
}

/**
 * The agents' marks — `AgentSymbol` in the app's society/AgentSymbol.tsx: a
 * coloured body with two slanted eyes. The colours are three of the app's
 * companion defaults.
 */
function AgentSymbol({ shape, color, size = 20 }: { shape: "triangle" | "circle" | "drop"; color: string; size?: number }) {
  const eyeY = shape === "triangle" ? 23 : shape === "drop" ? 25 : 17.2;
  return (
    <svg
      aria-hidden
      focusable="false"
      width={size}
      height={size}
      style={{ width: size, height: size, flexShrink: 0 }}
      viewBox="0 0 40 44"
      className="society-agent-symbol block"
    >
      <g className="agent-symbol-character">
        <g data-agent-body>
          {shape === "triangle" ? (
            <path d="M20 5.5 L36 33.5 L4 33.5 Z" fill={color} stroke={color} strokeWidth={5} strokeLinejoin="round" />
          ) : shape === "drop" ? (
            <path d="M20 3 C20 3 6 20 6 27 a14 13.5 0 0 0 28 0 C34 20 20 3 20 3 Z" fill={color} />
          ) : (
            <circle cx={20} cy={20} fill={color} r={16.2} />
          )}
        </g>
        <g className="agent-symbol-gaze">
          <g data-agent-eyes fill="#101014" transform={`translate(2 -0.6) rotate(-14 20 ${eyeY})`}>
            <g className="agent-symbol-lids">
              <ellipse cx={15.4} cy={eyeY} rx={1.45} ry={3.1} />
              <ellipse cx={24.6} cy={eyeY} rx={1.45} ry={3.1} />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

export const DEMO_AGENTS = [
  { id: "scout", name: "Scout", shape: "triangle" as const, color: "#8b5cf6" },
  { id: "atlas", name: "Atlas", shape: "circle" as const, color: "#60a5fa" },
  { id: "quill", name: "Quill", shape: "drop" as const, color: "#a3c76d" },
];

const RECENT_CHATS: { kind: "chat" | "voice"; title: string; untitled?: boolean }[] = [
  { kind: "voice", title: "Fix the login test" },
  { kind: "chat", title: "Release notes for week 40" },
  { kind: "voice", title: "Voice chat · 08:12", untitled: true },
  { kind: "chat", title: "Kessler invoice reminder" },
  { kind: "voice", title: "Standup moved to three" },
  { kind: "chat", title: "Trip to Lisbon, hotels" },
];

/** `SidebarAgents.tsx`. `working` lights the agent's pulse dot. */
function SidebarAgents({ working }: { working: Record<string, boolean> }) {
  return (
    <section className="mt-5 px-2" aria-label="Agents" data-testid="sidebar-agents">
      <h2 className="px-3 pb-1.5 text-sm text-muted-foreground">Agents</h2>
      <ul className="space-y-px">
        {DEMO_AGENTS.map((agent) => (
          <li key={agent.id}>
            <button
              type="button"
              tabIndex={-1}
              data-testid="sidebar-agent-row"
              className="flex h-8 w-full items-center gap-3 rounded-lg px-3 text-left text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground hover:bg-secondary"
            >
              <span className="-ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                <span aria-hidden className="relative inline-flex shrink-0 items-center justify-center select-none" style={{ width: 20, height: 20 }}>
                  <AgentSymbol shape={agent.shape} color={agent.color} size={20} />
                </span>
              </span>
              <span className="min-w-0 flex-1 truncate">{agent.name}</span>
              {working[agent.id] && (
                <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent animate-jarvis-pulse" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** `RecentChats.tsx` with `ChatKindMark.tsx`. */
function RecentChats({ activeTitle }: { activeTitle?: string }) {
  return (
    <section className="mt-5 px-2 pb-3" aria-label="Recent chats">
      <div data-testid="recent-chats" className="pb-1 pt-0.5">
        <h2 className="px-3 pb-1.5 text-sm text-muted-foreground">Recent</h2>
        <ul className="space-y-0.5">
          {RECENT_CHATS.map((row) => {
            const active = row.title === activeTitle;
            return (
              <li key={row.title} className="group relative">
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="recent-chat-row"
                  data-kind={row.kind}
                  className={cn(
                    "flex h-8 w-full items-center gap-2.5 rounded-lg px-3 text-left transition-colors group-hover:pr-16 group-focus-within:pr-16",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "jarvis-nav-active bg-secondary text-foreground-strong" : "text-foreground hover:bg-secondary",
                  )}
                >
                  <span
                    aria-hidden
                    data-kind-mark={row.kind}
                    className={cn(
                      "flex h-3.5 w-3.5 shrink-0 items-center justify-center",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {row.kind === "voice" ? (
                      <AudioLines className="h-3.5 w-3.5" strokeWidth={1.75} />
                    ) : (
                      <span className="h-[7px] w-[7px] rounded-full border-[1.5px] border-current" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-base leading-5",
                      row.untitled && !active && "text-muted-foreground",
                    )}
                  >
                    {row.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export const USER_NAME = "Alex";

function Sidebar({
  section,
  onPick,
  emptyChat,
  working,
  activeChat,
  ideNav,
}: {
  section: Section;
  onPick: (next: Section) => void;
  emptyChat: boolean;
  working: Record<string, boolean>;
  activeChat?: string;
  ideNav: ReactNode;
}) {
  const onIde = section === "agentic-ide";
  return (
    <aside
      style={{ width: SIDEBAR_WIDTH }}
      data-testid="sidebar"
      data-railed="false"
      className="jarvis-nav-surface relative isolate z-20 flex h-full shrink-0 flex-col pt-8"
    >
      <div className="flex h-10 items-center px-4">
        <div className="flex items-center w-full gap-2">
          <div role="search" className="flex min-w-0 flex-1">
            <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-input px-2.5 text-sm">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="h-full min-w-0 flex-1 bg-transparent leading-8 text-muted-foreground">Search</span>
              <span role="img" className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              <span className="hidden shrink-0 items-center gap-0.5 sm:inline-flex" aria-hidden>
                {["Ctrl", "Space"].map((cap) => (
                  <kbd key={cap} className="rounded border border-border bg-background px-1 font-sans text-[10px] leading-4 text-muted-foreground">
                    {cap}
                  </kbd>
                ))}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-jarvis">
        {onIde ? (
          ideNav
        ) : (
          <>
            <nav aria-label="Sections" className="space-y-px px-2 py-2">
              <ul className="space-y-px">
                <li>
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="sidebar-new-chat"
                    onClick={() => onPick("chats")}
                    className={cn(ROW_CLASS, emptyChat && "bg-secondary text-foreground-strong")}
                  >
                    <Plus aria-hidden strokeWidth={1.75} className="h-[18px] w-[18px] shrink-0" />
                    <span>New chat</span>
                  </button>
                </li>
                <NavRow icon={AgentsIcon as IconComponent} label="Agents" />
                <NavRow icon={SpeechIcon as IconComponent} label="Jarvis Voice" />
              </ul>
              <ul className="space-y-px">
                <NavRow icon={ArtifactsIcon as IconComponent} label="Artifacts" />
                <NavRow icon={CodeIcon as IconComponent} label="Agentic IDE" beta="Beta" onClick={() => onPick("agentic-ide")} />
                <NavRow icon={ExtensionsIcon as IconComponent} label="Plugins / Skills / MCP" />
              </ul>
              <button type="button" tabIndex={-1} className={cn(ROW_CLASS, "text-muted-foreground")}>
                <ChevronDown aria-hidden strokeWidth={1.75} className="h-[18px] w-[18px] shrink-0 transition-transform" />
                <span>More</span>
              </button>
            </nav>
            <SidebarAgents working={working} />
            <RecentChats activeTitle={activeChat} />
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          <button type="button" tabIndex={-1} data-testid="sidebar-profile-toggle" className={cn(ROW_CLASS, "min-w-0 flex-1")}>
            <span className="relative shrink-0">
              <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-medium uppercase text-muted-foreground">
                {USER_NAME.charAt(0)}
              </span>
            </span>
            <span data-testid="sidebar-profile-name" className="min-w-0 flex-1 truncate text-left">
              {USER_NAME}
            </span>
          </button>
          <button
            type="button"
            tabIndex={-1}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Download aria-hidden strokeWidth={1.75} className="h-4 w-4" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MarketplaceIcon aria-hidden strokeWidth={1.75} className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// The shell (App.tsx)
// ---------------------------------------------------------------------------

export function AppShell({
  section,
  onPick,
  emptyChat,
  working,
  activeChat,
  ideNav,
  children,
}: {
  section: Section;
  onPick: (next: Section) => void;
  emptyChat: boolean;
  working: Record<string, boolean>;
  activeChat?: string;
  ideNav: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="jarvis-nav-surface relative isolate flex h-screen w-screen overflow-hidden text-foreground">
      <Sidebar
        section={section}
        onPick={onPick}
        emptyChat={emptyChat}
        working={working}
        activeChat={activeChat}
        ideNav={ideNav}
      />
      <main className="relative flex min-w-0 flex-1 flex-col">
        <div className="h-8 shrink-0" data-testid="caption-rule" />
        <div className="jarvis-sheet flex min-h-0 min-w-0 flex-1 flex-col">
          <TopBar section={section} />
          {children}
        </div>
      </main>
    </div>
  );
}
