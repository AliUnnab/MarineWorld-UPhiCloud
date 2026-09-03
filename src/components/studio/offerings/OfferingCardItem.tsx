import React, { useState } from "react";
import {
  Package,
  Wrench,
  Cpu,
  Edit2,
  Trash2,
  Eye,
  FileText,
  Layers,
  CheckCircle2,
  AlertCircle,
  Archive,
  ArrowUpRight,
  ShieldCheck,
  Image as ImageIcon,
  Copy,
  Check,
  Globe,
  AlertTriangle,
} from "lucide-react";
import type { CompanyOffering } from "@/lib/types";
import { computeOfferingGroundingStatus } from "@/lib/services/offeringAIService";
import { getOfferingCanonicalUrl } from "@/lib/services/offeringEntityService";
import { OfferingKnowledgeCoverageBadge } from "@/components/studio/knowledge/KnowledgeCoverageBadge";
import { getOfferingDocumentConflicts, type DocumentConflictResolution } from "@/lib/services/knowledgeConflictService";
import { DocumentConflictModal } from "@/components/studio/knowledge/DocumentConflictModal";

interface OfferingCardItemProps {
  offering: CompanyOffering;
  onEdit: (offering: CompanyOffering) => void;
  onViewLive: (offering: CompanyOffering) => void;
  onStatusChange: (offeringId: string, newStatus: "ACTIVE" | "DRAFT" | "ARCHIVED") => void;
  onDelete: (offeringId: string) => void;
}

export const OfferingCardItem: React.FC<OfferingCardItemProps> = ({
  offering,
  onEdit,
  onViewLive,
  onStatusChange,
  onDelete,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeConflict, setActiveConflict] = useState<DocumentConflictResolution | null>(null);
  const isProduct = offering.type === "product";
  const isService = offering.type === "service";
  const TypeIcon = isProduct ? Package : isService ? Wrench : Layers;
  
  const groundingStatus = offering.groundingStatus || computeOfferingGroundingStatus(offering);

  // Accurate, deduplicated Specifications count
  const specsCount = React.useMemo(() => {
    const rawSpecs = offering.specifications || (offering as any).specs;
    if (!rawSpecs) return 0;
    if (Array.isArray(rawSpecs)) {
      return rawSpecs.filter((s: any) => (s?.key || s?.name) && String(s?.value ?? "").trim().length > 0).length;
    }
    if (typeof rawSpecs === "object") {
      return Object.entries(rawSpecs).filter(([k, v]) => k.trim().length > 0 && String(v ?? "").trim().length > 0).length;
    }
    return 0;
  }, [offering.specifications, (offering as any).specs]);

  // Accurate, deduplicated Sources count (Grounding documents, attached PDF blueprints & datasheets)
  const sourcesCount = React.useMemo(() => {
    const sourcesSet = new Set<string>();
    if (Array.isArray(offering.groundingSources)) {
      offering.groundingSources.forEach((s) => {
        const id = s.id || s.filename || s.title || s.url;
        if (id) sourcesSet.add(id);
      });
    }
    if (Array.isArray((offering as any).sources)) {
      (offering as any).sources.forEach((s: any) => {
        const id = s.id || s.filename || s.title || s.url || String(s);
        if (id) sourcesSet.add(id);
      });
    }
    if (Array.isArray((offering as any).documents)) {
      (offering as any).documents.forEach((d: any) => {
        const id = d.id || d.filename || d.title || d.url || String(d);
        if (id) sourcesSet.add(id);
      });
    }
    // Technical drawings and PDF blueprints in mediaReferences
    if (Array.isArray(offering.mediaReferences)) {
      offering.mediaReferences.forEach((m: any) => {
        if (m.type === "drawing" || m.type === "technical_drawing" || m.url?.toLowerCase().includes(".pdf")) {
          const id = m.id || m.filename || m.title || m.url;
          if (id) sourcesSet.add(id);
        }
      });
    }
    return sourcesSet.size;
  }, [offering.groundingSources, (offering as any).sources, (offering as any).documents, offering.mediaReferences]);

  // Accurate, deduplicated Media count (Photos, Videos, Image Gallery)
  const mediaCount = React.useMemo(() => {
    const mediaSet = new Set<string>();
    const allMediaItems = [
      ...(offering.mediaReferences || []),
      ...(offering.media || []),
      ...(Array.isArray((offering as any).gallery) ? (offering as any).gallery : []),
      ...(Array.isArray((offering as any).images) ? (offering as any).images : []),
    ];

    allMediaItems.forEach((m: any) => {
      if (!m) return;
      const urlStr = (typeof m === "string" ? m : m.url || "").toLowerCase();
      const isPdf = urlStr.includes(".pdf");
      const isDrawing = !isPdf && (m.type === "drawing" || m.type === "technical_drawing");
      // Visual photo/video media items
      if (!isPdf && !isDrawing) {
        const key = typeof m === "string" ? m : m.url || m.id || m.title;
        if (key && key.trim().length > 0) {
          mediaSet.add(key.trim());
        }
      }
    });

    // If no media array entries but single coverImage / primaryImage is defined (and not a PDF)
    const singleImg = (offering as any).coverImage || (offering as any).primaryImage || (offering as any).imageUrl;
    if (mediaSet.size === 0 && singleImg && !singleImg.toLowerCase().includes(".pdf")) {
      return 1;
    }

    return mediaSet.size;
  }, [
    offering.mediaReferences,
    offering.media,
    (offering as any).gallery,
    (offering as any).images,
    (offering as any).coverImage,
    (offering as any).primaryImage,
    (offering as any).imageUrl,
  ]);

  const conflicts = getOfferingDocumentConflicts(offering.companyId, offering.id);
  const openConflicts = conflicts.filter((c) => c.status === "OPEN");

  const status = (offering.status as string)?.toUpperCase() || "ACTIVE";
  const isArchived = status === "ARCHIVED";
  const isDraft = status === "DRAFT";
  const isActive = status === "ACTIVE" || status === "AVAILABLE" || status === "PUBLISHED";

  const canonicalUrl = getOfferingCanonicalUrl(offering);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(canonicalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getGroundingBadge = () => {
    switch (groundingStatus) {
      case "AI READY":
        return {
          label: "AI READY",
          color: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: Cpu,
        };
      case "GROUNDED":
        return {
          label: "GROUNDED",
          color: "bg-blue-50 text-blue-800 border-blue-200",
          icon: ShieldCheck,
        };
      case "GROUNDING REQUIRED":
        return {
          label: "GROUNDING REQUIRED",
          color: "bg-amber-50 text-amber-800 border-amber-200",
          icon: AlertCircle,
        };
      default:
        return {
          label: "NOT GROUNDED",
          color: "bg-slate-100 text-slate-700 border-slate-200",
          icon: FileText,
        };
    }
  };

  const badge = getGroundingBadge();
  const BadgeIcon = badge.icon;

  return (
    <article
      id={`studio-offering-card-${offering.id}`}
      className={`group rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden bg-white shadow-xs hover:shadow-sm ${
        isArchived
          ? "border-dashed border-slate-300 opacity-75 bg-slate-50/50"
          : "border-line hover:border-slate-300"
      }`}
    >
      <div className="p-6 space-y-4">
        {/* Top bar: Type + ID & Status pill */}
        <div className="flex items-start justify-between gap-3 border-b border-line/60 pb-3.5">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-stone uppercase tracking-wider">
              <TypeIcon className="w-3.5 h-3.5 text-royal shrink-0" />
              <span>{isProduct ? "COMMERCIAL PRODUCT" : isService ? "OPERATIONAL SERVICE" : "CAPABILITY"}</span>
            </div>
            <div className="font-mono text-[10.5px] text-slate-400 truncate">
              CODE: {offering.code || offering.sku || `REF-${offering.id.slice(-6).toUpperCase()}`}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-800 shadow-2xs">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                ACTIVE
              </span>
            )}
            {isDraft && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-mono font-bold text-amber-800 shadow-2xs">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                DRAFT
              </span>
            )}
            {isArchived && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-300 px-2.5 py-0.5 text-[10px] font-mono font-bold text-slate-600 shadow-2xs">
                <Archive className="w-3 h-3" />
                ARCHIVED
              </span>
            )}
          </div>
        </div>

        {/* Title & Category */}
        <div className="space-y-2">
          <h3
            onClick={() => onEdit(offering)}
            className="text-base font-extrabold text-graphite tracking-tight leading-snug group-hover:text-royal transition-colors cursor-pointer"
          >
            {offering.name}
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-royal/10 text-royal px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider">
              {offering.category}
            </span>

            {/* AI Grounding Status badge */}
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-bold border uppercase tracking-wider ${badge.color}`}
            >
              <BadgeIcon className="w-3 h-3" />
              <span>{badge.label}</span>
            </span>
          </div>

          {/* Canonical URL chip */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-canvas border border-line/60 font-mono text-[10px] text-slate-500">
            <div className="flex items-center gap-1.5 truncate">
              <Globe className="w-3 h-3 text-royal shrink-0" />
              <span className="truncate text-graphite font-medium">{canonicalUrl}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-1 hover:bg-white rounded text-stone hover:text-royal transition cursor-pointer shrink-0"
              title="Copy Canonical Entity URL"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          <p className="text-xs text-stone line-clamp-2 leading-relaxed">
            {offering.shortDescription || "No short description provided."}
          </p>

          {/* Compact Deterministic Knowledge Coverage & AI Readiness */}
          <div className="pt-1 border-t border-line/60">
            <OfferingKnowledgeCoverageBadge offering={offering} />
          </div>

          {/* Open Conflict Alert if present */}
          {openConflicts.length > 0 && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
              <div className="flex items-center gap-1.5 font-bold font-mono">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{openConflicts.length} SOURCE CONFLICT</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveConflict(openConflicts[0])}
                className="px-2 py-0.5 rounded bg-white border border-amber-300 font-bold text-[10px] text-amber-900 hover:bg-amber-100 transition"
              >
                Resolve
              </button>
            </div>
          )}
        </div>

        {/* Verification & Metrics Ribbon */}
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-line bg-slate-50/70 p-2.5 font-mono text-[10.5px]">
          <div className="flex flex-col items-center justify-center p-1 rounded-lg bg-white border border-line/60">
            <div className="flex items-center gap-1 text-graphite font-bold">
              <FileText className="w-3 h-3 text-royal" />
              <span>{sourcesCount}</span>
            </div>
            <span className="text-[9px] text-stone uppercase tracking-wider mt-0.5">Sources</span>
          </div>

          <div className="flex flex-col items-center justify-center p-1 rounded-lg bg-white border border-line/60">
            <div className="flex items-center gap-1 text-graphite font-bold">
              <Layers className="w-3 h-3 text-emerald-600" />
              <span>{specsCount}</span>
            </div>
            <span className="text-[9px] text-stone uppercase tracking-wider mt-0.5">Specs</span>
          </div>

          <div className="flex flex-col items-center justify-center p-1 rounded-lg bg-white border border-line/60">
            <div className="flex items-center gap-1 text-graphite font-bold">
              <ImageIcon className="w-3 h-3 text-amber-600" />
              <span>{mediaCount}</span>
            </div>
            <span className="text-[9px] text-stone uppercase tracking-wider mt-0.5">Media</span>
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="border-t border-line bg-slate-50/80 p-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            id={`btn-edit-offering-${offering.id}`}
            onClick={() => onEdit(offering)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold text-graphite hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-2xs cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>EDIT</span>
          </button>

          <button
            type="button"
            id={`btn-view-live-offering-${offering.id}`}
            onClick={() => onViewLive(offering)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-royal/30 bg-royal/10 px-3 py-1.5 text-xs font-bold text-royal hover:bg-royal hover:text-white transition-all shadow-2xs cursor-pointer"
            title="Preview Live Public Offering with AI Advisor"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>VIEW LIVE</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* Quick status dropdown / toggle */}
          {isActive ? (
            <button
              type="button"
              onClick={() => onStatusChange(offering.id, "ARCHIVED")}
              className="p-1.5 rounded-lg border border-line bg-white text-stone hover:text-amber-700 hover:bg-amber-50 hover:border-amber-200 transition shadow-2xs"
              title="Archive Offering (Frees up 1 active slot)"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onStatusChange(offering.id, "ACTIVE")}
              className="p-1.5 rounded-lg border border-line bg-white text-stone hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 transition shadow-2xs"
              title="Activate Offering"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            id={`btn-delete-offering-${offering.id}`}
            onClick={() => onDelete(offering.id)}
            className="p-1.5 rounded-lg border border-line bg-white text-stone hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200 transition shadow-2xs"
            title="Delete Offering"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {activeConflict && (
        <DocumentConflictModal
          conflict={activeConflict}
          isOpen={Boolean(activeConflict)}
          onClose={() => setActiveConflict(null)}
          onResolved={() => {
            setActiveConflict(null);
          }}
        />
      )}
    </article>
  );
};
