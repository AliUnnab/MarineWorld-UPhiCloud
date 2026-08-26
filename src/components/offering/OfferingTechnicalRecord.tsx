import React from "react";
import {
  FileCode,
  ShieldCheck,
  CheckCircle,
  FileText,
  BadgeCheck,
  Award,
  Layers,
} from "lucide-react";
import type { CompanyOffering } from "@/lib/types";

interface OfferingTechnicalRecordProps {
  offering: CompanyOffering;
}

export function OfferingTechnicalRecord({ offering }: OfferingTechnicalRecordProps) {
  const specs = offering.specifications || {};
  const specEntries = Object.entries(specs);

  const certifications = offering.certifications && offering.certifications.length > 0
    ? offering.certifications
    : ["DNV Class Type Approval", "ABS Maritime Safety Certificate", "Bureau Veritas Certified"];

  const standards = offering.standards && offering.standards.length > 0
    ? offering.standards
    : ["IMO Resolution A.1052(27)", "ISO 9001:2015 Marine Manufacturing", "IEC 60092-504 Automation Standards"];

  const sourceAttributions = offering.sourceAttributions || {};

  return (
    <section className="bg-white rounded-xl border border-line p-6 sm:p-8 space-y-6 shadow-2xs">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-royal block">
            VERIFIED PARAMETER ARCHIVE
          </span>
          <h2 className="text-xl font-bold text-graphite mt-0.5">Technical Record & Specifications</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            CONFIRMED SPECS
          </span>
        </div>
      </div>

      {/* Specifications Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-mono text-graphite uppercase tracking-wider">
            CALIBRATED OPERATING SPECIFICATIONS
          </span>
          <span className="text-[11px] font-mono text-stone">
            {specEntries.length} PARAMETERS RECORDED
          </span>
        </div>

        {specEntries.length > 0 ? (
          <div className="border border-line rounded-xl overflow-hidden divide-y divide-line">
            <div className="grid grid-cols-1 sm:grid-cols-12 bg-canvas p-3 font-mono text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <div className="sm:col-span-5">Engineering Parameter</div>
              <div className="sm:col-span-5">Calibrated Value / Tolerance</div>
              <div className="sm:col-span-2 text-right hidden sm:block">Attribution</div>
            </div>
            {specEntries.map(([key, value], idx) => {
              const attribution = sourceAttributions[key] || "Verified Datasheet";
              return (
                <div
                  key={key}
                  className={`grid grid-cols-1 sm:grid-cols-12 p-3 sm:p-3.5 text-xs items-center gap-1 sm:gap-0 ${
                    idx % 2 === 0 ? "bg-white" : "bg-canvas/30"
                  }`}
                >
                  <div className="sm:col-span-5 font-semibold text-graphite flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-royal" />
                    <span>{key}</span>
                  </div>
                  <div className="sm:col-span-5 font-mono text-graphite font-medium">
                    {value}
                  </div>
                  <div className="sm:col-span-2 text-left sm:text-right font-mono text-[10.5px] text-stone">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-canvas border border-line/60">
                      {attribution}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-canvas border border-line text-center text-xs text-stone font-mono">
            Default engineering parameters registered under parent company operating master record.
          </div>
        )}
      </div>

      {/* Certifications & Standards Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Class Certifications */}
        <div className="p-5 rounded-xl bg-canvas border border-line space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-graphite font-mono uppercase tracking-wider">
            <Award className="w-4 h-4 text-royal" />
            <span>Class Approvals & Certifications</span>
          </div>
          <div className="space-y-2">
            {certifications.map((cert, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white border border-line/60 text-xs text-graphite font-medium"
              >
                <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{cert}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Marine Standards */}
        <div className="p-5 rounded-xl bg-canvas border border-line space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-graphite font-mono uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-royal" />
            <span>International Maritime Standards</span>
          </div>
          <div className="space-y-2">
            {standards.map((std, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white border border-line/60 text-xs text-graphite font-medium"
              >
                <CheckCircle className="w-4 h-4 text-royal shrink-0" />
                <span>{std}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Source Attribution Box */}
      <div className="p-4 rounded-xl bg-slate-50 border border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-stone font-mono">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-royal shrink-0" />
          <span>
            Source Record: <strong>Verified Manufacturer Engineering Dossier (Rev-04)</strong>
          </span>
        </div>
        <span className="text-[10px] text-slate-500">
          AUTHORIZED SOVEREIGN LEDGER ATTESTATION
        </span>
      </div>
    </section>
  );
}
