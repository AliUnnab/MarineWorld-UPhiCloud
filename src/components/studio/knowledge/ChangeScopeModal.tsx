import React, { useState } from "react";
import {
  X,
  Layers,
  Building2,
  Package,
  Wrench,
  Anchor,
  CheckCircle2,
  Cpu,
} from "lucide-react";
import type { DocumentEntity, CompanyOffering } from "@/lib/types";
import { changeSourceScope } from "@/lib/services/knowledgeLifecycleService";

interface ChangeScopeModalProps {
  document: DocumentEntity | null;
  isOpen: boolean;
  onClose: () => void;
  offerings: CompanyOffering[];
  onScopeUpdated: (updatedDoc: DocumentEntity, message: string) => void;
}

export const ChangeScopeModal: React.FC<ChangeScopeModalProps> = ({
  document,
  isOpen,
  onClose,
  offerings,
  onScopeUpdated,
}) => {
  if (!isOpen || !document) return null;

  const currentOfferingId = document.productId || document.serviceId;
  const currentFacilityId = (document.metadata?.facilityId as string) || "";
  const initialScopeType: "COMPANY" | "OFFERING" | "FACILITY" = currentOfferingId
    ? "OFFERING"
    : currentFacilityId
    ? "FACILITY"
    : "COMPANY";

  const [selectedScope, setSelectedScope] = useState<"COMPANY" | "OFFERING" | "FACILITY">(initialScopeType);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>(
    currentOfferingId || (offerings.length > 0 ? offerings[0].id : "")
  );
  const [selectedFacilityName, setSelectedFacilityName] = useState<string>(
    (document.metadata?.facilityName as string) || "Rotterdam Marine Deepwater Yard"
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    const result = changeSourceScope({
      companyId: document.companyId,
      docId: document.id,
      scopeType: selectedScope,
      offeringId: selectedScope === "OFFERING" ? selectedOfferingId : undefined,
      facilityId: selectedScope === "FACILITY" ? `fac-${document.companyId}-01` : undefined,
      facilityName: selectedScope === "FACILITY" ? selectedFacilityName : undefined,
      actorId: "Company Operator",
    });

    setIsSaving(false);
    if (result.success && result.document) {
      const scopeName =
        selectedScope === "COMPANY"
          ? "Company AI"
          : selectedScope === "OFFERING"
          ? `Offering AI (${offerings.find((o) => o.id === selectedOfferingId)?.name || selectedOfferingId})`
          : `Facility AI (${selectedFacilityName})`;

      onScopeUpdated(
        result.document,
        `AI Scope updated: Source is now grounded exclusively in ${scopeName}.`
      );
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-graphite/60 backdrop-blur-xs animate-fade-in"
      id={`modal-change-scope-${document.id}`}
    >
      <div className="bg-white border border-line rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-canvas shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-indigo-700 uppercase tracking-wider block">
                AI GROUNDING ISOLATION
              </span>
              <h3 className="text-sm font-bold text-graphite">CHANGE AI SCOPE</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-stone hover:text-graphite transition p-1.5 rounded-lg hover:bg-mist"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          <div>
            <div className="text-[11px] font-mono text-stone uppercase font-bold">Target Document</div>
            <div className="font-bold text-graphite text-xs font-mono mt-0.5">{document.title}</div>
          </div>

          <div className="space-y-3">
            <div className="text-[11px] font-mono text-stone uppercase font-bold">
              Select AI Grounding Boundary
            </div>

            {/* Scope 1: Company AI */}
            <div
              onClick={() => setSelectedScope("COMPANY")}
              className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition ${
                selectedScope === "COMPANY"
                  ? "bg-royal/5 border-royal shadow-2xs"
                  : "bg-canvas border-line hover:bg-mist"
              }`}
            >
              <Building2 className={`w-4 h-4 mt-0.5 ${selectedScope === "COMPANY" ? "text-royal" : "text-stone"}`} />
              <div className="space-y-0.5">
                <div className="font-bold text-graphite text-xs">Company AI (Company-Wide Knowledge)</div>
                <p className="text-stone text-[11px]">
                  Grounds high-level company profile, certifications, general capabilities, and compliance policies.
                </p>
              </div>
            </div>

            {/* Scope 2: Offering AI */}
            <div
              onClick={() => setSelectedScope("OFFERING")}
              className={`p-3.5 rounded-xl border cursor-pointer space-y-2.5 transition ${
                selectedScope === "OFFERING"
                  ? "bg-royal/5 border-royal shadow-2xs"
                  : "bg-canvas border-line hover:bg-mist"
              }`}
            >
              <div className="flex items-start gap-3">
                <Package className={`w-4 h-4 mt-0.5 ${selectedScope === "OFFERING" ? "text-royal" : "text-stone"}`} />
                <div className="space-y-0.5">
                  <div className="font-bold text-graphite text-xs">Offering AI (Product or Service)</div>
                  <p className="text-stone text-[11px]">
                    Grounds a specific commercial product or engineering service. Isolated strictly to queries regarding this offering.
                  </p>
                </div>
              </div>

              {selectedScope === "OFFERING" && (
                <div className="pt-1 pl-7 animate-fade-in space-y-1">
                  <label className="text-[10.5px] font-mono text-stone uppercase font-semibold block">
                    Choose Offering
                  </label>
                  <select
                    id="select-scope-offering"
                    value={selectedOfferingId}
                    onChange={(e) => setSelectedOfferingId(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-line bg-white text-xs font-medium text-graphite focus:border-royal focus:outline-none"
                  >
                    {offerings.map((off) => (
                      <option key={off.id} value={off.id}>
                        {off.type === "product" ? "Product:" : "Service:"} {off.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Scope 3: Facility AI */}
            <div
              onClick={() => setSelectedScope("FACILITY")}
              className={`p-3.5 rounded-xl border cursor-pointer space-y-2.5 transition ${
                selectedScope === "FACILITY"
                  ? "bg-royal/5 border-royal shadow-2xs"
                  : "bg-canvas border-line hover:bg-mist"
              }`}
            >
              <div className="flex items-start gap-3">
                <Anchor className={`w-4 h-4 mt-0.5 ${selectedScope === "FACILITY" ? "text-royal" : "text-stone"}`} />
                <div className="space-y-0.5">
                  <div className="font-bold text-graphite text-xs">Facility AI (Shipyard or Physical Yard)</div>
                  <p className="text-stone text-[11px]">
                    Grounds physical drydocks, fabrication berths, crane capacities, and site access protocols.
                  </p>
                </div>
              </div>

              {selectedScope === "FACILITY" && (
                <div className="pt-1 pl-7 animate-fade-in space-y-1">
                  <label className="text-[10.5px] font-mono text-stone uppercase font-semibold block">
                    Facility Name
                  </label>
                  <input
                    type="text"
                    id="input-scope-facility"
                    value={selectedFacilityName}
                    onChange={(e) => setSelectedFacilityName(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-line bg-white text-xs font-medium text-graphite focus:border-royal focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-line bg-canvas flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-line hover:bg-mist text-graphite text-xs font-bold transition shadow-2xs"
          >
            Cancel
          </button>

          <button
            type="button"
            id="btn-confirm-scope-change"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-royal hover:bg-royal/90 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Apply Scope</span>
          </button>
        </div>
      </div>
    </div>
  );
};
