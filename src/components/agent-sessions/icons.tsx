/**
 * The handful of line icons the app's Agents view uses, drawn the way its
 * icon set draws them: 24-unit box, 2px round strokes, currentColor.
 */

import type { ReactNode } from "react";

function Icon({ size = 14, children }: { size?: number; children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="as-icon"
    >
      {children}
    </svg>
  );
}

type P = { size?: number };

export const PanelLeft = ({ size }: P) => (
  <Icon size={size}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /><path d="m16 15-3-3 3-3" /></Icon>
);
export const ArrowLeft = ({ size }: P) => <Icon size={size}><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></Icon>;
export const ArrowRight = ({ size }: P) => <Icon size={size}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></Icon>;
export const Sun = ({ size }: P) => (
  <Icon size={size}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" /></Icon>
);
export const Refresh = ({ size }: P) => (
  <Icon size={size}><path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.9 1 6.7 2.7L21 8" /><path d="M21 3v5h-5" /></Icon>
);
export const Users = ({ size }: P) => (
  <Icon size={size}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></Icon>
);
export const Plus = ({ size }: P) => <Icon size={size}><path d="M5 12h14" /><path d="M12 5v14" /></Icon>;
export const Search = ({ size }: P) => <Icon size={size}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></Icon>;
export const Mic = ({ size }: P) => (
  <Icon size={size}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><path d="M12 19v3" /></Icon>
);
export const Chat = ({ size }: P) => <Icon size={size}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Icon>;
export const Send = ({ size }: P) => (
  <Icon size={size}><path d="M14.5 21.7a.5.5 0 0 0 .9 0L22 2.6a.5.5 0 0 0-.6-.6L2.3 8.6a.5.5 0 0 0 0 .9l7.9 3.2a2 2 0 0 1 1.1 1.1z" /><path d="m21.9 2.1-10.9 11" /></Icon>
);
export const Check = ({ size }: P) => <Icon size={size}><path d="M20 6 9 17l-5-5" /></Icon>;
export const ChevronRight = ({ size }: P) => <Icon size={size}><path d="m9 18 6-6-6-6" /></Icon>;
export const ChevronDown = ({ size }: P) => <Icon size={size}><path d="m6 9 6 6 6-6" /></Icon>;
export const FileText = ({ size }: P) => (
  <Icon size={size}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M16 13H8M16 17H8M10 9H8" /></Icon>
);
export const ArrowDownLeft = ({ size }: P) => <Icon size={size}><path d="M17 7 7 17" /><path d="M17 17H7V7" /></Icon>;
export const ArrowUpRight = ({ size }: P) => <Icon size={size}><path d="M7 7h10v10" /><path d="M7 17 17 7" /></Icon>;
export const More = ({ size }: P) => <Icon size={size}><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></Icon>;
export const Expand = ({ size }: P) => <Icon size={size}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></Icon>;
export const Sparkle = ({ size }: P) => (
  <Icon size={size}><path d="M9.9 15.5A2 2 0 0 0 8.5 14.1L2.4 12.5a.5.5 0 0 1 0-1L8.5 9.9A2 2 0 0 0 9.9 8.5l1.6-6.1a.5.5 0 0 1 1 0l1.6 6.1a2 2 0 0 0 1.4 1.4l6.1 1.6a.5.5 0 0 1 0 1l-6.1 1.6a2 2 0 0 0-1.4 1.4l-1.6 6.1a.5.5 0 0 1-1 0z" /></Icon>
);
export const Wrench = ({ size }: P) => (
  <Icon size={size}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" /></Icon>
);
export const Clock = ({ size }: P) => <Icon size={size}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></Icon>;
export const Alert = ({ size }: P) => (
  <Icon size={size}><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></Icon>
);
export const Layers = ({ size }: P) => (
  <Icon size={size}><path d="m12.8 2.2 8.6 3.9a1 1 0 0 1 0 1.8l-8.6 3.9a2 2 0 0 1-1.7 0L2.6 7.9a1 1 0 0 1 0-1.8l8.6-3.9a2 2 0 0 1 1.6 0Z" /><path d="m22 12-9.2 4.2a2 2 0 0 1-1.6 0L2 12" /><path d="m22 17-9.2 4.2a2 2 0 0 1-1.6 0L2 17" /></Icon>
);
