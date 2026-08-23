import type { ReactElement } from "react";
import type { IconName } from "@/lib/types";

/**
 * DigiOne icon system — custom-drawn 24×24 stroke iconography.
 * Sector identity comes from iconography and terminology,
 * never from a separate color system.
 */
const ICON_PATHS: Record<IconName, ReactElement> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M16.6 16.6 21 21" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h10" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M4.5 12h15" />
      <path d="M13.5 6l6 6-6 6" />
    </>
  ),
  arrowUpRight: (
    <>
      <path d="M7 17 17 7" />
      <path d="M8.5 7H17v8.5" />
    </>
  ),
  arrowUp: (
    <>
      <path d="M12 19.5v-15" />
      <path d="M6 10.5l6-6 6 6" />
    </>
  ),
  chevronDown: <path d="M6 9.5l6 6 6-6" />,
  anchor: (
    <>
      <circle cx="12" cy="5.2" r="2.2" />
      <path d="M12 7.4V20" />
      <path d="M8.6 10.4h6.8" />
      <path d="M4.6 13.4a7.4 7.4 0 0 0 14.8 0" />
    </>
  ),
  ship: (
    <>
      <path d="M3 14.6h18l-1.7 4.9H4.7L3 14.6Z" />
      <path d="M6.8 14.6V10h4.2v4.6" />
      <path d="M13.2 14.6V7.2h4v7.4" />
    </>
  ),
  crane: (
    <>
      <path d="M7 21V3.5" />
      <path d="M7 5.5 18 8" />
      <path d="M7 3.5 18 8" />
      <path d="M18 8v5.5" />
      <path d="M16.4 13.5h3.2v3h-3.2z" />
      <path d="M4 21h6" />
    </>
  ),
  gantry: (
    <>
      <path d="M4.5 21h15" />
      <path d="M6.5 21V6.5h11V21" />
      <path d="M6.5 6.5 12 3l5.5 3.5" />
      <path d="M12 6.5v4" />
      <path d="M10.2 10.5h3.6v3.2h-3.6z" />
    </>
  ),
  exchange: (
    <>
      <path d="M4 8h13.5" />
      <path d="M14.5 5l3 3-3 3" />
      <path d="M20 16H6.5" />
      <path d="M9.5 13l-3 3 3 3" />
    </>
  ),
  route: (
    <>
      <circle cx="5.5" cy="6" r="2" />
      <circle cx="18.5" cy="18" r="2" />
      <path d="M7.5 6H14a4 4 0 0 1 4 4v6" />
    </>
  ),
  drafting: (
    <>
      <circle cx="12" cy="4.6" r="1.6" />
      <path d="M11.2 6 5.6 19.5" />
      <path d="M12.8 6l5.6 13.5" />
      <path d="M7.3 13.6a8.4 8.4 0 0 0 9.4 0" />
    </>
  ),
  sail: (
    <>
      <path d="M12 3v13.5" />
      <path d="M12 3c4.6 3.4 6.6 8.2 6.6 13.5H12" />
      <path d="M4.6 17h14.8l-1.8 3.6H6.4L4.6 17Z" />
    </>
  ),
  dock: (
    <>
      <path d="M3.5 10.5h17" />
      <path d="M6.8 10.5V20" />
      <path d="M17.2 10.5V20" />
      <path d="M12 10.5V4" />
      <path d="M12 4h4.6l-1.6 1.9L16.6 8H12" />
    </>
  ),
  helm: (
    <>
      <circle cx="12" cy="12" r="5.2" />
      <circle cx="12" cy="12" r="1.7" />
      <path d="M12 3.4v3.4M12 17.2v3.4M3.4 12h3.4M17.2 12h3.4M6 6l2.4 2.4M15.6 15.6 18 18M18 6l-2.4 2.4M8.4 15.6 6 18" />
    </>
  ),
  chip: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <rect x="10.4" y="10.4" width="3.2" height="3.2" />
      <path d="M9.5 7V4M14.5 7V4M9.5 20v-3M14.5 20v-3M7 9.5H4M7 14.5H4M20 9.5h-3M20 14.5h-3" />
    </>
  ),
  twin: (
    <>
      <rect x="4" y="4" width="11" height="11" rx="1.5" />
      <path d="M9 19.5h9A1.5 1.5 0 0 0 19.5 18V9" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5.6" rx="7" ry="2.6" />
      <path d="M5 5.6v12.8c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V5.6" />
      <path d="M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 2.8v6c0 4.6-3 7.6-7 9.2-4-1.6-7-4.6-7-9.2v-6L12 3Z" />
      <path d="M9 11.6l2.1 2.1L15.2 9.5" />
    </>
  ),
  scales: (
    <>
      <path d="M12 4v16" />
      <path d="M8.5 20h7" />
      <path d="M5.5 6.5h13" />
      <path d="M5.5 6.5 3 12a2.9 2.9 0 0 0 5 0L5.5 6.5Z" />
      <path d="M18.5 6.5 16 12a2.9 2.9 0 0 0 5 0l-2.5-5.5Z" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <path d="M7 20v-6.5" />
      <path d="M12 20V8.5" />
      <path d="M17 20v-9" />
    </>
  ),
  lifebuoy: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <circle cx="12" cy="12" r="3.6" />
      <path d="M6 6l3.4 3.4M18 6l-3.4 3.4M18 18l-3.4-3.4M6 18l3.4-3.4" />
    </>
  ),
  rig: (
    <>
      <path d="M8 21l4-14.5L16 21" />
      <path d="M9.3 16.4h5.4" />
      <path d="M10.4 12h3.2" />
      <path d="M12 6.5V4" />
      <path d="M5 21h14" />
    </>
  ),
  sonar: (
    <>
      <circle cx="12" cy="15.6" r="1.6" />
      <path d="M8.6 11.8a5 5 0 0 1 6.8 0" />
      <path d="M5.7 8.7a9.2 9.2 0 0 1 12.6 0" />
      <path d="M12 17.2V20" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5c2.9 2.3 2.9 14.7 0 17M12 3.5c-2.9 2.3-2.9 14.7 0 17" />
      <path d="M4 9.2h16M4 14.8h16" />
    </>
  ),
  network: (
    <>
      <circle cx="5.5" cy="12" r="2" />
      <circle cx="18.5" cy="5.5" r="2" />
      <circle cx="18.5" cy="18.5" r="2" />
      <path d="M7.3 11.1 16.7 6.4M7.3 12.9l9.4 4.7M18.5 7.5v9" />
    </>
  ),
  radar: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.4" />
      <path d="M12 12l5.6-5.6" />
      <circle cx="15" cy="14.6" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  doc: (
    <>
      <path d="M6.5 3.5h7.6l3.9 3.9v13.1H6.5V3.5Z" />
      <path d="M14 3.5v4h4" />
      <path d="M9.5 12h5M9.5 15.5h5" />
    </>
  ),
  connect: (
    <>
      <circle cx="6" cy="12" r="2.3" />
      <circle cx="18" cy="12" r="2.3" />
      <path d="M8.3 12h7.4" />
      <path d="M12 12v0" />
    </>
  ),
  building: (
    <>
      <path d="M5 21V4.5h9.5V21" />
      <path d="M14.5 9.5H19V21" />
      <path d="M3.5 21h17" />
      <path d="M8 8h3.5M8 11.5h3.5M8 15h3.5M16.2 13h1M16.2 16.5h1" />
    </>
  ),
  check: <path d="M5 12.5l4.4 4.4L19 7.5" />,
  scan: (
    <>
      <path d="M4 8.2V4h4.2M15.8 4H20v4.2M20 15.8V20h-4.2M8.2 20H4v-4.2" />
      <path d="M7.5 12h9" />
    </>
  ),
  lock: (
    <>
      <rect x="5.5" y="10.5" width="13" height="9.5" rx="1.5" />
      <path d="M8.5 10.5V7.6a3.5 3.5 0 0 1 7 0v2.9" />
      <circle cx="12" cy="15.2" r="1.3" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3.2 21 8l-9 4.8L3 8l9-4.8Z" />
      <path d="M3 12.6l9 4.8 9-4.8" />
      <path d="M3 16.8l9 4.8 9-4.8" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9.3" cy="7" r="1.7" fill="var(--color-canvas)" />
      <circle cx="15" cy="12" r="1.7" fill="var(--color-canvas)" />
      <circle cx="7.3" cy="17" r="1.7" fill="var(--color-canvas)" />
    </>
  ),
  spark: (
    <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3Z" />
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15 9l-1.9 5.1L8 16l1.9-5.1L15 9Z" />
    </>
  ),
  gauge: (
    <>
      <path d="M4.5 15.5a7.5 7.5 0 1 1 15 0" />
      <path d="M12 15.5l4.2-4.2" />
      <path d="M4 19.5h16" />
    </>
  ),
  sunrise: (
    <>
      <path d="M4.5 17.5h15" />
      <path d="M8 17.5a4 4 0 0 1 8 0" />
      <path d="M12 8.5V6M6.2 11.7 4.8 10.3M17.8 11.7l1.4-1.4" />
    </>
  ),
  flag: (
    <>
      <path d="M6 21V4" />
      <path d="M6 4.5h11l-2.2 3.4L17 11.5H6" />
    </>
  ),
  key: (
    <>
      <circle cx="7.6" cy="15.6" r="3.4" />
      <path d="M10.2 13 20 3.5" />
      <path d="M15.8 7.6l2.8 2.8" />
      <path d="M18.4 5.1l2 2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.4-6.5-10a6.5 6.5 0 0 1 13 0C18.5 15.6 12 21 12 21Z" />
      <circle cx="12" cy="10.8" r="2.3" />
    </>
  ),
  send: (
    <>
      <path d="M4 11.8 20 4l-5.6 16-2.9-6.4L4 11.8Z" />
      <path d="M11.5 13.6 20 4" />
    </>
  ),
  cube: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="M12 12l8-4.5M12 12 4 7.5M12 12v9" />
    </>
  ),
  box: (
    <>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </>
  ),
  briefcase: (
    <>
      <rect x="4" y="7.5" width="16" height="12" rx="1.5" />
      <path d="M9.5 7.5v-2A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5v2" />
      <path d="M4 12.5h16" />
    </>
  ),
  crew: (
    <>
      <circle cx="9" cy="8.4" r="3" />
      <path d="M3.6 19.4a5.6 5.6 0 0 1 10.8 0" />
      <circle cx="17" cy="9.6" r="2.3" />
      <path d="M15.8 14.9a4.8 4.8 0 0 1 4.7 4.5" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}

export function Icon({ name, className = "h-5 w-5", strokeWidth = 1.5 }: IconProps) {
  const iconContent = (name && ICON_PATHS[name]) ? ICON_PATHS[name] : ICON_PATHS.spark;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {iconContent}
    </svg>
  );
}

/** MarineWorld vertical identity mark ("I") — bold, simple, clean. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[8px] bg-graphite text-white ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[60%] w-[60%]">
        <path d="M12 4v16" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" />
      </svg>
    </span>
  );
}
