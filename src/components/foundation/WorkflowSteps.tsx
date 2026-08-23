import { useState } from "react";
import type { WorkflowStep } from "@/lib/types";
import { Icon } from "@/components/digione/icons";
import { DigiIconContainer } from "@/components/digione/primitives";

/**
 * WorkflowSteps — reusable interactive stage rail + detail.
 * Represents industry discovery → identity → connection →
 * interaction → request → collaboration.
 */
export function WorkflowSteps({ steps }: { steps: WorkflowStep[] }) {
  const [active, setActive] = useState(0);
  const step = steps[active] ?? steps[0];

  if (!step) return null;

  return (
    <div>
      {/* Stage rail */}
      <div className="relative">
        <div aria-hidden="true" className="absolute left-0 right-0 top-[46px] hidden border-t border-dashed border-line md:block" />
        <div className="relative grid gap-3 sm:grid-cols-3 md:grid-cols-6">
          {steps.map((s, i) => {
            const isActive = i === active;
            return (
              <button
                key={s.id}
                type="button"
                aria-current={isActive ? "step" : undefined}
                onClick={() => setActive(i)}
                className={`flex items-center gap-3.5 rounded-card-md border p-4 text-left transition-all duration-400 ease-digi md:flex-col md:items-start md:gap-4 md:p-5 ${
                  isActive
                    ? "border-royal/50 bg-soft/60 shadow-[0_12px_32px_rgba(58,79,224,0.10)]"
                    : "border-line bg-white hover:border-mute/50 hover:-translate-y-0.5"
                }`}
              >
                <div className="flex w-full items-center justify-between md:block">
                  <DigiIconContainer icon={s.icon} mode={isActive ? "royal" : "subtle"} size={38} />
                  <span className={`font-mono text-[10px] tracking-[0.14em] md:mt-3 md:block ${isActive ? "text-royal" : "text-mute"}`}>
                    {s.index}
                  </span>
                </div>
                <span className={`text-[13.5px] font-semibold tracking-[-0.01em] ${isActive ? "text-graphite" : "text-stone"}`}>
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage detail */}
      <div className="mt-6 rounded-card-md border border-line bg-white p-6 md:p-8" aria-live="polite">
        <div className="grid items-center gap-8 md:grid-cols-12">
          <div className="md:col-span-8">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-royal">
              Step {step.index} — {step.title}
            </p>
            <p className="text-lead mt-3 text-stone">{step.description}</p>
            <p className="mt-5 inline-flex items-center gap-2.5 rounded-full bg-mist px-4 py-2.5 text-[12.5px] text-graphite">
              <Icon name="spark" className="h-3.5 w-3.5 text-royal" />
              <span className="text-mute">e.g.</span> {step.example}
            </p>
          </div>
          <div className="md:col-span-4 md:border-l md:border-linesoft md:pl-8">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {steps.map((s, i) => (
                <span key={s.id} className={`h-1 flex-1 rounded-full transition-colors duration-400 ${i <= active ? "bg-royal" : "bg-line"}`} />
              ))}
            </div>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-mute">
              {String(active + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")} — Operational flow
            </p>
            <button
              type="button"
              onClick={() => setActive((active + 1) % steps.length)}
              className="group mt-5 inline-flex min-h-11 items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-graphite transition-colors duration-300 hover:text-royal"
            >
              Next stage
              <Icon name="arrowRight" className="h-4 w-4 text-royal transition-transform duration-300 ease-digi group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
