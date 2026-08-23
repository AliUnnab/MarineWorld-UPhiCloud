import type { EntityStatus } from "@/lib/types";

const STATUS_META: Record<EntityStatus, { label: string; className: string; dot: string }> = {
  LIVE: {
    label: "Live",
    className: "border-success/30 bg-success-soft text-success",
    dot: "bg-success",
  },
  COMING_SOON: {
    label: "Coming Soon",
    className: "border-warning/30 bg-warning-soft text-warning",
    dot: "bg-warning",
  },
  PRIVATE: {
    label: "Private Access",
    className: "border-line bg-mist text-stone",
    dot: "bg-stone",
  },
  ARCHIVED: {
    label: "Archived",
    className: "border-line bg-mist text-mute",
    dot: "bg-mute",
  },
};

/**
 * StatusBadge — the only entity status vocabulary is
 * LIVE / COMING_SOON / PRIVATE / ARCHIVED.
 */
export function StatusBadge({
  status,
  withDot = false,
  className = "",
}: {
  status: EntityStatus;
  withDot?: boolean;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`eyebrow inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9.5px] ${meta.className} ${className}`}
    >
      {withDot ? <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> : null}
      {meta.label}
    </span>
  );
}
