import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Key,
} from "react";
import { Icon } from "./icons";
import type { IconName } from "@/lib/types";

/* ============================================================
   DigiOne Design System v2.4.0 — primitive components.
   Sector components compose these; visual values come from
   tokens defined in index.css (@theme), never inline hex.
   ============================================================ */

export function DigiContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`digi-container ${className}`}>{children}</div>;
}

export function DigiSection({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className={`scroll-mt-24 py-20 md:py-28 ${className}`}
    >
      {children}
    </section>
  );
}

type HeaderTone = "light" | "dark";

export function DigiSectionHeader({
  id,
  index,
  eyebrow,
  title,
  lead,
  tone = "light",
  right,
}: {
  id?: string;
  index?: string;
  eyebrow: string;
  title: string;
  lead?: string;
  tone?: HeaderTone;
  right?: ReactNode;
}) {
  const dark = tone === "dark";
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-8">
      <div className="max-w-[760px]">
        <div className="flex items-center gap-4">
          <DigiBadge variant={dark ? "dark" : "soft"} dot>
            {eyebrow}
          </DigiBadge>
          {index ? (
            <span className={`font-sans text-[11px] font-semibold uppercase tracking-wider ${dark ? "text-white/40" : "text-mute"}`}>
              {index}
            </span>
          ) : null}
        </div>
        <h2 id={id} className={`text-h2 mt-6 ${dark ? "text-white" : "text-graphite"}`}>
          {title}
        </h2>
        {lead ? (
          <p className={`text-lead mt-5 max-w-[640px] ${dark ? "text-white/60" : "text-stone"}`}>
            {lead}
          </p>
        ) : null}
      </div>
      {right ? <div className="max-w-[340px]">{right}</div> : null}
    </div>
  );
}

/* ---- Buttons ---- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "dark" | "darkOutline";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-royal text-white hover:bg-royal/88 active:bg-royal/80",
  secondary: "bg-white text-graphite border border-line hover:border-mute/60 hover:bg-mist",
  ghost: "bg-transparent text-graphite hover:bg-linesoft",
  dark: "bg-white text-graphite hover:bg-white/88",
  darkOutline: "bg-transparent text-white border border-white/25 hover:bg-white/10 hover:border-white/40",
};

interface DigiButtonProps {
  id?: string;
  variant?: ButtonVariant;
  size?: "md" | "sm" | "lg";
  href?: string;
  onClick?: () => void;
  icon?: IconName;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}

export function DigiButton({
  id,
  variant = "primary",
  size = "md",
  href,
  onClick,
  icon,
  type = "button",
  disabled = false,
  className = "",
  children,
  ariaLabel,
}: DigiButtonProps) {
  const classes = [
    "group/btn inline-flex min-h-11 items-center justify-center gap-2.5 rounded-full font-semibold uppercase",
    size === "lg"
      ? "px-8 min-h-12 text-[13.5px] tracking-[0.08em]"
      : size === "md"
      ? "px-7 text-[12.5px] tracking-[0.08em]"
      : "px-5 text-[11.5px] tracking-[0.1em]",
    "transition-all duration-300 ease-digi",
    BUTTON_VARIANTS[variant],
    disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
    className,
  ].join(" ");

  const inner = (
    <>
      <span>{children}</span>
      {icon ? (
        <Icon
          name={icon}
          className="h-4 w-4 transition-transform duration-300 ease-digi group-hover/btn:translate-x-0.5"
        />
      ) : null}
    </>
  );

  if (href) {
    return (
      <a id={id} href={href} className={classes} aria-label={ariaLabel} onClick={disabled ? undefined : onClick}>
        {inner}
      </a>
    );
  }
  return (
    <button id={id} type={type} disabled={disabled} className={classes} onClick={onClick} aria-label={ariaLabel}>
      {inner}
    </button>
  );
}

/* ---- Badges ---- */

type BadgeVariant = "soft" | "neutral" | "outline" | "dark";

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  soft: "bg-soft text-royal",
  neutral: "bg-mist text-stone",
  outline: "border border-line bg-white text-mute",
  dark: "border border-white/15 bg-white/8 text-white/75",
};

export function DigiBadge({
  variant = "soft",
  dot = false,
  dotClass = "bg-electric",
  children,
  className = "",
}: {
  variant?: BadgeVariant;
  dot?: boolean;
  dotClass?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`eyebrow inline-flex items-center gap-2 rounded-full px-3.5 py-2 ${BADGE_VARIANTS[variant]} ${className}`}
    >
      {dot ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className={`absolute inline-flex h-full w-full rounded-full ${dotClass} breathe`} />
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotClass}`} />
        </span>
      ) : null}
      {children}
    </span>
  );
}

/* ---- Cards ---- */

export function DigiCard({
  children,
  className = "",
  radius = "lg",
}: {
  children: ReactNode;
  className?: string;
  radius?: "lg" | "md" | "sm";
}) {
  const radiusClass =
    radius === "lg" ? "rounded-card-lg" : radius === "md" ? "rounded-card-md" : "rounded-card-sm";
  return <div className={`border border-line bg-white ${radiusClass} ${className}`}>{children}</div>;
}

/* ---- Standardized 40px icon container ---- */

type IconMode = "solid" | "subtle" | "royal" | "dark" | "white";

const ICON_MODES: Record<IconMode, string> = {
  solid: "border-graphite bg-graphite text-white",
  subtle: "border-linesoft bg-linesoft text-graphite",
  royal: "border-royal/12 bg-soft text-royal",
  dark: "border-white/12 bg-white/8 text-electric",
  white: "border-line bg-white text-graphite",
};

export function DigiIconContainer({
  icon,
  mode = "solid",
  size = 40,
  className = "",
}: {
  icon: IconName;
  mode?: IconMode;
  size?: number;
  className?: string;
}) {
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: "var(--radius-icon)",
    borderWidth: "1.3px",
  };
  return (
    <span className={`inline-flex shrink-0 items-center justify-center border ${ICON_MODES[mode]} ${className}`} style={style}>
      <Icon name={icon} className="h-[48%] w-[48%]" strokeWidth={1.6} />
    </span>
  );
}

export function DigiDivider({ className = "" }: { className?: string }) {
  return <hr className={`border-t border-line ${className}`} />;
}

/* ---- Interactive Row ---- */

export function InteractiveRow({
  icon,
  title,
  subtitle,
  meta,
  badge,
  onClick,
  href,
  className = "",
}: {
  key?: Key;
  icon?: IconName;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  badge?: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const content = (
    <div
      onClick={onClick}
      className={`group flex items-center justify-between gap-4 rounded-card-sm border border-line bg-white p-4 transition-all duration-200 hover:border-royal/30 hover:bg-mist/40 hover:shadow-xs cursor-pointer ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {icon && <DigiIconContainer icon={icon} mode="white" size={36} />}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-[13.5px] text-graphite truncate group-hover:text-royal transition-colors">
              {title}
            </h4>
            {badge}
          </div>
          {subtitle && <p className="text-[12px] text-stone truncate mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {meta && <div className="shrink-0 text-right">{meta}</div>}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }
  return content;
}

/* ---- Scroll reveal (fadeUp, respects prefers-reduced-motion) ---- */

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  key?: string | number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/* ---- Demonstration activity ticker ---- */

export function DigiTicker({ items, label }: { items: string[]; label: string }) {
  const doubled = [...items, ...items];
  return (
    <div className="flex items-stretch overflow-hidden border-y border-line bg-white">
      <div className="flex shrink-0 items-center gap-2.5 border-r border-line px-4 py-3.5 md:px-6">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute h-full w-full rounded-full bg-royal breathe" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-royal" />
        </span>
        <span className="eyebrow text-mute">{label}</span>
      </div>
      <div
        className="ticker relative flex-1 overflow-hidden"
        aria-label={`${label} — demonstration content`}
      >
        <div className="ticker-track items-center py-3.5">
          {doubled.map((item, i) => (
            <span key={i} className="flex items-center whitespace-nowrap">
              <span className="px-5 font-sans text-[12px] font-medium tracking-wide text-stone">{item}</span>
              <span className="text-mute/60" aria-hidden="true">
                ·
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
