import type { ReactNode } from "react";
import type { IconName } from "@/lib/types";
import { Icon } from "@/components/digione/icons";
import { DigiButton } from "@/components/digione/primitives";

export type EmptyStateAction =
  | ReactNode
  | { label: string; href?: string; onClick?: () => void };

/**
 * EmptyState — honest "no data yet" representation.
 * Used wherever registry data does not yet exist.
 */
export function EmptyState({
  icon = "database",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: EmptyStateAction;
}) {
  const renderAction = () => {
    if (!action) return null;
    if (typeof action === "object" && action !== null && "label" in action && !("$$typeof" in action)) {
      const actObj = action as { label: string; href?: string; onClick?: () => void };
      if (actObj.href) {
        return (
          <DigiButton href={actObj.href} icon="arrowRight">
            {actObj.label}
          </DigiButton>
        );
      }
      return (
        <DigiButton onClick={actObj.onClick} icon="arrowRight">
          {actObj.label}
        </DigiButton>
      );
    }
    return action as ReactNode;
  };

  return (
    <div className="flex flex-col items-center justify-center rounded-card-lg border border-dashed border-line bg-white px-6 py-16 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-icon border border-linesoft bg-linesoft text-mute">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <h3 className="mt-5 text-[16px] font-semibold tracking-[-0.02em] text-graphite">{title}</h3>
      {description ? <p className="mt-2 max-w-[420px] text-[13.5px] leading-relaxed text-stone">{description}</p> : null}
      {action ? <div className="mt-6">{renderAction()}</div> : null}
    </div>
  );
}

