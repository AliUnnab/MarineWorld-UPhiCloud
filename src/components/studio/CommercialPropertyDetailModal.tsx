import React, { useState, useEffect } from "react";
import {
  CommercialDigitalProperty,
  createReservationIntent,
  recordCommercialAudit,
  CommercialReservationIntent,
  getPropertyAgreementHistory,
  CommercialAgreement,
} from "@/lib/services/commercialPropertyService";
import { SectorConfig } from "@/lib/types";
import { CANONICAL_CITY_REGIONS, DigitalPropertySlot } from "@/lib/services/propertyService";
import { SectorCityEntranceV2 } from "@/pages/SectorCityEntranceV2";
import {
  X,
  Building2,
  ShieldCheck,
  Calendar,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Layers,
  MapPin,
  Clock,
  AlertCircle,
  FileCheck,
  History,
} from "lucide-react";

interface CommercialPropertyDetailModalProps {
  property: CommercialDigitalProperty;
  config: SectorConfig;
  companyId: string;
  canModify: boolean;
  onClose: () => void;
  onReservationCreated: (intent: CommercialReservationIntent) => void;
  onLaunchEditor?: (slot: DigitalPropertySlot, cityId: string, regionCode: string) => void;
}

export function CommercialPropertyDetailModal({
  property,
  config,
  companyId,
  canModify,
  onClose,
  onReservationCreated,
  onLaunchEditor,
}: CommercialPropertyDetailModalProps) {
  const [selectedTermMonths, setSelectedTermMonths] = useState<number>(
    property.termOptions[0]?.termMonths || 12
  );
  const [autoRenew, setAutoRenew] = useState<boolean>(true);
  const [reservationNotes, setReservationNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successIntent, setSuccessIntent] = useState<CommercialReservationIntent | null>(null);
  const [activeTab, setActiveTab] = useState<"SPECIFICATIONS" | "HISTORY" | "LIVE_CONTEXT">("SPECIFICATIONS");

  const city = config.explorer.cities.find((c) => c.id === property.cityId) || config.explorer.cities[0];
  const region =
    CANONICAL_CITY_REGIONS.find((r) => r.code === property.regionCode) || CANONICAL_CITY_REGIONS[0];

  const selectedTermOption =
    property.termOptions.find((t) => t.termMonths === selectedTermMonths) || property.termOptions[0];

  const isCurrentTenant =
    property.tenantCompanyId === companyId || property.tenantCompanyId?.toLowerCase() === companyId.toLowerCase();
  const isOccupiedByOther =
    property.availabilityStatus !== "AVAILABLE" && !isCurrentTenant;

  const historyAgreements = getPropertyAgreementHistory(property.canonicalPropertyKey);

  useEffect(() => {
    // Record commercial audit for property viewing
    recordCommercialAudit(
      "STUDIO_USER",
      companyId,
      property.canonicalPropertyKey,
      "VIEW",
      undefined,
      { slotId: property.slotId, cityId: property.cityId, regionCode: property.regionCode }
    );
  }, [property, companyId]);

  const handleReserve = () => {
    if (!canModify) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = createReservationIntent({
        companyId,
        cityId: property.cityId,
        regionCode: property.regionCode,
        slotId: property.slotId,
        termMonths: selectedTermMonths,
        autoRenew,
        notes: reservationNotes,
      });

      if (res.success && res.intent) {
        setSuccessIntent(res.intent);
        onReservationCreated(res.intent);
      } else {
        setError(res.error || "Failed to submit reservation intent.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl flex flex-col">
        {/* MODAL HEADER */}
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {property.canonicalPropertyKey}
                </span>
                <span
                  className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded uppercase ${
                    property.availabilityStatus === "AVAILABLE"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : property.availabilityStatus === "ACTIVE"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : property.availabilityStatus === "HELD"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : property.availabilityStatus === "RESERVED"
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {property.availabilityStatus}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                {property.propertyName}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2">
          <button
            onClick={() => setActiveTab("SPECIFICATIONS")}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === "SPECIFICATIONS"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Property Specifications & Terms
          </button>
          <button
            onClick={() => setActiveTab("HISTORY")}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "HISTORY"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historical Occupancy ({historyAgreements.length})
          </button>
          <button
            onClick={() => setActiveTab("LIVE_CONTEXT")}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === "LIVE_CONTEXT"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Live Sector City View
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 flex-1 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === "SPECIFICATIONS" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: REAL ESTATE SPECS */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Frontage Description
                  </h4>
                  <p className="text-sm text-slate-700 font-light leading-relaxed">
                    {property.frontageDescription}
                  </p>
                </div>

                {/* REAL ESTATE METADATA GRID */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] block font-semibold">Sector City</span>
                    <span className="font-bold text-slate-900 uppercase">{city.domain}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] block font-semibold">Geographic Edition</span>
                    <span className="font-bold text-slate-900">{region.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] block font-semibold">Tier Classification</span>
                    <span className="font-bold text-blue-700">{property.tier}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] block font-semibold">Current Tenant</span>
                    <span className="font-medium text-slate-800 truncate block">
                      {property.tenantCompanyName || (property.availabilityStatus === "AVAILABLE" ? "None (Available)" : "Pending Review")}
                    </span>
                  </div>
                </div>

                {/* LOCATION SPECIFICATION */}
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                  <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{property.locationSpecification}</span>
                </div>

                {/* ENTITLEMENTS & FEATURES */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Entitlements & Included Frontage Features
                  </h4>
                  <ul className="space-y-2">
                    {property.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* RIGHT COLUMN: COMMERCIAL COMMITMENT & RESERVATION */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                      Commercial Terms
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                      ANNUAL COMMITMENT
                    </span>
                  </div>

                  <div>
                    <div className="text-2xl font-black text-white flex items-baseline gap-1">
                      ${selectedTermOption.price.toLocaleString()}
                      <span className="text-xs font-normal text-slate-400">
                        USD / {selectedTermOption.billingPeriod.toLowerCase()}
                      </span>
                    </div>
                    {selectedTermOption.discountPct && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                        {selectedTermOption.discountPct}% Multi-Year Term Savings Included
                      </span>
                    )}
                  </div>

                  {/* TERM SELECTOR */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Select Commitment Term
                    </label>
                    <div className="space-y-2">
                      {property.termOptions.map((opt) => (
                        <button
                          key={opt.termMonths}
                          type="button"
                          onClick={() => setSelectedTermMonths(opt.termMonths)}
                          className={`w-full p-2.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between ${
                            selectedTermMonths === opt.termMonths
                              ? "bg-blue-600 border-blue-500 text-white shadow-md"
                              : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          <div>
                            <div className="font-bold">{opt.label}</div>
                            <div className="text-[10px] opacity-80">
                              ${opt.price.toLocaleString()} USD / yr
                            </div>
                          </div>
                          {selectedTermMonths === opt.termMonths && (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* AUTO-RENEW TOGGLE */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                    <span className="text-slate-300">Auto-Renew at Term Expiration</span>
                    <button
                      type="button"
                      onClick={() => setAutoRenew(!autoRenew)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${
                        autoRenew ? "bg-blue-600" : "bg-slate-700"
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 ${
                          autoRenew ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* RESERVATION NOTES (OPTIONAL) */}
                  {property.availabilityStatus === "AVAILABLE" && (
                    <div className="space-y-1 pt-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Commercial Notes / Requirements (Optional)
                      </label>
                      <textarea
                        value={reservationNotes}
                        onChange={(e) => setReservationNotes(e.target.value)}
                        placeholder="e.g. Specific launch target date, showcase focus..."
                        className="w-full p-2.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>
                  )}

                  {/* ACTION CONTROLS */}
                  {successIntent ? (
                    <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Reservation Intent Recorded</span>
                      </div>
                      <p className="text-[11px] font-light">
                        Intent ID: <span className="font-mono">{successIntent.intentId}</span>. The MarineWorld Commercial Operations desk will review and issue a formal Commercial Offer.
                      </p>
                      {onLaunchEditor && (
                        <button
                          onClick={() => {
                            const dummySlot: DigitalPropertySlot = {
                              slotId: property.slotId,
                              slotCode: property.canonicalPropertyKey,
                              tier: property.tier as any,
                              tierName: property.tierName,
                              state: "RESERVED",
                              locationName: property.propertyName,
                            };
                            onLaunchEditor(dummySlot, property.cityId, property.regionCode);
                          }}
                          className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                        >
                          LAUNCH DIGITAL PROPERTY BUILDER &rarr;
                        </button>
                      )}
                    </div>
                  ) : isCurrentTenant ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-950/80 border border-blue-500/40 rounded-xl text-blue-200 text-xs flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <span>Your company is the active commercial tenant for this property.</span>
                      </div>
                      {onLaunchEditor && (
                        <button
                          onClick={() => {
                            const dummySlot: DigitalPropertySlot = {
                              slotId: property.slotId,
                              slotCode: property.canonicalPropertyKey,
                              tier: property.tier as any,
                              tierName: property.tierName,
                              state: "PUBLISHED",
                              locationName: property.propertyName,
                            };
                            onLaunchEditor(dummySlot, property.cityId, property.regionCode);
                          }}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-lg"
                        >
                          EDIT PROPERTY CREATIVE &rarr;
                        </button>
                      )}
                    </div>
                  ) : isOccupiedByOther ? (
                    <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-300 text-xs">
                      This property is currently {property.availabilityStatus.toLowerCase()} by{" "}
                      <span className="font-semibold text-white">{property.tenantCompanyName}</span>.
                    </div>
                  ) : (
                    <button
                      disabled={isSubmitting || !canModify}
                      onClick={handleReserve}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        "RECORDING INTENT..."
                      ) : (
                        <>
                          RESERVE COMMERCIAL PROPERTY <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                  <p className="text-[10px] text-slate-500 text-center font-light">
                    No consumer checkout or payment is processed at this stage. Commercial intent is reviewed by sector governance.
                  </p>
                </div>
              </div>
            </div>
          ) : activeTab === "HISTORY" ? (
            /* Historical Occupancy Tab */
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase">
                  Historical Commercial Occupancy Chain
                </h4>
                <p className="text-xs text-slate-500 font-light">
                  Historical record of all commercial deals and agreements for address {property.canonicalPropertyKey}.
                </p>
              </div>

              {historyAgreements.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 text-xs">
                  No historical commercial occupancy records found for this slot.
                </div>
              ) : (
                <div className="space-y-3">
                  {historyAgreements.map((ag) => (
                    <div
                      key={ag.agreementId}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{ag.companyName}</span>
                          <span className="text-[10px] font-mono text-slate-400">({ag.companyId})</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            ag.contractStatus === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : ag.contractStatus === "EXPIRED"
                              ? "bg-slate-100 text-slate-600 border border-slate-200"
                              : ag.contractStatus === "PAYMENT_CONFIRMED"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {ag.contractStatus}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Term Period</span>
                          <span>
                            {new Date(ag.startDate).getFullYear()} – {new Date(ag.endDate).getFullYear()} ({ag.termMonths}M)
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Annual Rate</span>
                          <span>${ag.annualRate.toLocaleString()} {ag.currency}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Billing Rail</span>
                          <span className="font-semibold">{ag.billingMethod === "GOOGLE_CLOUD_MARKETPLACE" ? "GCP Marketplace" : "Stripe"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Agreement Ref</span>
                          <span className="font-mono text-[10px]">{ag.agreementId}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Live Sector City Entrance View */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 uppercase">
                    Live Sector City Entrance Preview
                  </h4>
                  <p className="text-xs text-slate-500 font-light">
                    Visualizing digital real estate placement in {city.domain.toUpperCase()} ({region.name})
                  </p>
                </div>
                <a
                  href={`/cities/${city.slug}/${region.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline uppercase"
                >
                  OPEN PUBLIC CITY <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div
                className="bg-slate-100 p-2 md:p-6 rounded-2xl border border-slate-200 overflow-hidden relative shadow-inner"
                style={{ height: "650px" }}
              >
                <div className="w-full h-full overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200">
                  <SectorCityEntranceV2
                    config={config}
                    citySlug={city.slug}
                    regionSlug={region.slug}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
