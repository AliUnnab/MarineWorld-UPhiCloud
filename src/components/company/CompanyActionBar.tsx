import type { CompanyProfile, BusinessTwinState } from "@/lib/types";
import { DigiButton, DigiContainer } from "@/components/digione/primitives";
import { SaveEntityButton } from "@/components/foundation/SaveEntityButton";
import { AddToCollectionButton } from "@/components/foundation/AddToCollectionButton";

export function CompanyActionBar({
  company,
  activeModule,
  onSelectModule,
}: {
  company: CompanyProfile;
  activeModule: string;
  onSelectModule: (moduleSlug: string) => void;
}) {
  const twinState: BusinessTwinState =
    company.businessTwinStatus ?? (company.aiStatus === "twin" ? "AVAILABLE" : "COMING_SOON");

  return (
    <div className="border-b border-line bg-white py-3">
      <DigiContainer>
        <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-[11px]">
          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <DigiButton
              size="sm"
              variant={activeModule === "connect" ? "primary" : "secondary"}
              onClick={() => onSelectModule("connect")}
              icon="connect"
            >
              CONNECT
            </DigiButton>

            <DigiButton
              size="sm"
              variant={activeModule === "metrics" ? "primary" : "secondary"}
              onClick={() => onSelectModule("metrics")}
              icon="chart"
            >
              METRICS
            </DigiButton>

            <DigiButton
              size="sm"
              variant={
                activeModule === "business-twin" || activeModule === "chat"
                  ? "primary"
                  : "secondary"
              }
              onClick={() => onSelectModule(twinState === "AVAILABLE" ? "chat" : "business-twin")}
              icon="spark"
            >
              BUSINESS TWIN
            </DigiButton>

            <SaveEntityButton
              type="company"
              id={company.id}
              businessId={company.businessId}
            />

            <AddToCollectionButton
              type="company"
              id={company.id}
              companyId={company.id}
              businessId={company.businessId}
              entityName={company.name}
            />
          </div>

          {/* Twin Status Indicator */}
          <div className="flex items-center gap-3 text-[11px] text-stone">
            <span className="text-mute uppercase tracking-[0.12em]">TWIN STATE:</span>
            {twinState === "AVAILABLE" ? (
              <span className="inline-flex items-center gap-1.5 font-bold text-royal">
                <span className="h-2 w-2 rounded-full bg-royal" />
                AVAILABLE & GROUNDED
              </span>
            ) : twinState === "COMING_SOON" ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-amber-800">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                COMING SOON
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-mute">
                <span className="h-2 w-2 rounded-full bg-line" />
                NOT CONFIGURED
              </span>
            )}
          </div>
        </div>
      </DigiContainer>
    </div>
  );
}
