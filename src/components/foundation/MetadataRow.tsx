import type { ReactNode } from "react";

/**
 * MetadataRow — standardized label/value row for entity data.
 * Intended to render inside a <dl> element.
 */
export function MetadataRow({
  label,
  value,
  divider = false,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  divider?: boolean;
  mono?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 ${divider ? "border-b border-line" : ""}`}>
      <dt className="text-[13px] text-mute">{label}</dt>
      <dd className={`text-right text-[13px] text-graphite ${mono ? "font-mono text-[12px]" : "font-medium"}`}>{value}</dd>
    </div>
  );
}
