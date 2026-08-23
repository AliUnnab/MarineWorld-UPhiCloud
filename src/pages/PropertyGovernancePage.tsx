import React, { useState, useEffect } from "react";
import { SectorConfig } from "@/lib/types";
import { marineSector } from "@/lib/sectors/marine";
import { 
  getAllRevisionsForGovernance, 
  reviewProperty, 
  PropertyCreativeRevision 
} from "@/lib/services/propertyGovernanceService";
import { ShieldCheck, ArrowLeft, Building2, ExternalLink, MessageSquare, MapPin, CheckCircle, XCircle, AlertCircle, PlayCircle, PauseCircle, Eye } from "lucide-react";
import { SectorCityEntranceV2 } from "./SectorCityEntranceV2";
import { CANONICAL_CITY_REGIONS } from "@/lib/services/propertyService";

export function PropertyGovernancePage() {
  const [revisions, setRevisions] = useState<PropertyCreativeRevision[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<PropertyCreativeRevision | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const config = marineSector;

  useEffect(() => {
    // Only show submitted, in review, approved, paused, or published (which might need pausing)
    // Filter out simple drafts or rejected items that aren't actionable
    const all = getAllRevisionsForGovernance();
    const visible = all.filter(r => 
      r.status === "SUBMITTED" || 
      r.status === "IN_REVIEW" || 
      r.status === "REVISION_REQUIRED" || 
      r.status === "APPROVED" || 
      r.status === "PUBLISHED" ||
      r.status === "PAUSED"
    );
    setRevisions(visible.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
  }, []);

  const handleAction = (action: "APPROVE" | "REJECT" | "REQUEST_REVISION" | "PAUSE" | "PUBLISH") => {
    if (!selectedRevision) return;
    
    const res = reviewProperty(selectedRevision.revisionId, action, reviewNotes);
    if (res.success && res.revision) {
      // Update local state
      setRevisions(prev => prev.map(r => r.revisionId === res.revision!.revisionId ? res.revision! : r));
      setSelectedRevision(res.revision);
      setReviewNotes("");
    } else {
      alert("Error: " + res.error);
    }
  };

  if (selectedRevision) {
    const city = config.explorer.cities.find(c => c.id === selectedRevision.cityId);
    const region = CANONICAL_CITY_REGIONS.find(r => r.code === selectedRevision.regionCode) || CANONICAL_CITY_REGIONS[0];
    
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
        {/* LEFT PANEL: GOVERNANCE CONTROLS */}
        <div className="w-full md:w-[450px] bg-white border-r border-line flex flex-col h-screen overflow-y-auto z-10 shrink-0">
          <div className="p-6 border-b border-line sticky top-0 bg-white z-20">
            <button 
              onClick={() => setSelectedRevision(null)}
              className="text-[10px] font-bold text-stone uppercase tracking-widest flex items-center gap-2 hover:text-graphite transition-colors mb-4"
            >
              <ArrowLeft className="w-3 h-3" /> Back to Queue
            </button>
            <h1 className="text-xl font-bold text-graphite uppercase tracking-wide flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-royal" /> Property Review
            </h1>
          </div>

          <div className="p-6 space-y-8 flex-1">
            {/* STATUS BADGE */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-line">
              <span className="text-xs font-bold text-stone uppercase tracking-widest">Current Status</span>
              <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-widest ${
                selectedRevision.status === "SUBMITTED" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                selectedRevision.status === "IN_REVIEW" ? "bg-purple-50 text-purple-700 border border-purple-200" :
                selectedRevision.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                selectedRevision.status === "PUBLISHED" ? "bg-emerald-600 text-white border border-emerald-700" :
                selectedRevision.status === "PAUSED" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                selectedRevision.status === "REVISION_REQUIRED" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                "bg-slate-100 text-slate-600 border border-slate-200"
              }`}>
                {selectedRevision.status}
              </span>
            </div>

            {/* CONTEXT */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-stone uppercase tracking-widest border-b border-line pb-2">Property Context</h3>
              <div className="grid grid-cols-2 gap-4 text-sm font-mono bg-mist p-4 rounded-xl border border-line">
                <div>
                  <div className="text-[10px] text-stone uppercase tracking-widest">Company ID</div>
                  <div className="font-bold text-graphite truncate" title={selectedRevision.companyId}>{selectedRevision.companyId}</div>
                </div>
                <div>
                  <div className="text-[10px] text-stone uppercase tracking-widest">Slot ID</div>
                  <div className="font-bold text-graphite truncate" title={selectedRevision.slotId}>{selectedRevision.slotId}</div>
                </div>
                <div>
                  <div className="text-[10px] text-stone uppercase tracking-widest">City</div>
                  <div className="font-bold text-royal uppercase">{city?.domain}</div>
                </div>
                <div>
                  <div className="text-[10px] text-stone uppercase tracking-widest">Edition</div>
                  <div className="font-bold text-royal uppercase">{region.name}</div>
                </div>
                <div className="col-span-2 pt-2 border-t border-line/50">
                  <div className="text-[10px] text-stone uppercase tracking-widest">Tier</div>
                  <div className="font-bold text-graphite uppercase">{selectedRevision.tier}</div>
                </div>
              </div>
            </div>

            {/* CREATIVE DATA (RAW TEXT) */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-stone uppercase tracking-widest border-b border-line pb-2">Creative Payload</h3>
              <div className="space-y-3 text-sm">
                <div><span className="font-bold text-xs uppercase text-stone">Headline:</span> {selectedRevision.creative.headline}</div>
                <div><span className="font-bold text-xs uppercase text-stone">Subhead:</span> {selectedRevision.creative.subheadline}</div>
                <div><span className="font-bold text-xs uppercase text-stone">Desc:</span> <p className="mt-1 text-xs text-stone font-mono p-2 bg-mist rounded border border-line">{selectedRevision.creative.description || "None"}</p></div>
                <div><span className="font-bold text-xs uppercase text-stone">Media URL:</span> <a href={selectedRevision.creative.mediaUrl} target="_blank" className="text-royal break-all text-xs font-mono block mt-1" rel="noreferrer">{selectedRevision.creative.mediaUrl || "None"}</a></div>
                <div><span className="font-bold text-xs uppercase text-stone">CTA:</span> {selectedRevision.creative.ctaLabel} &rarr; <span className="font-mono text-xs">{selectedRevision.creative.ctaHref}</span></div>
              </div>
            </div>

            {/* REVIEW ACTION */}
            <div className="space-y-3 pt-6 border-t border-line">
              <h3 className="text-[10px] font-bold text-stone uppercase tracking-widest border-b border-line pb-2 flex items-center gap-2">
                <MessageSquare className="w-3 h-3" /> Review Action
              </h3>
              
              <textarea
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                placeholder="Enter review notes or reason for rejection/revision..."
                className="w-full h-24 p-3 text-sm border border-line rounded-xl focus:outline-none focus:border-royal resize-none"
              />

              <div className="grid grid-cols-2 gap-2">
                {/* Pending Review Actions */}
                {(selectedRevision.status === "SUBMITTED" || selectedRevision.status === "IN_REVIEW" || selectedRevision.status === "REVISION_REQUIRED") && (
                  <>
                    <button
                      onClick={() => handleAction("REQUEST_REVISION")}
                      className="p-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-amber-100 transition-colors flex items-center justify-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3" /> Request Revision
                    </button>
                    <button
                      onClick={() => handleAction("REJECT")}
                      className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-rose-100 transition-colors flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                    <button
                      onClick={() => handleAction("APPROVE")}
                      className="col-span-2 p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 mt-2"
                    >
                      <CheckCircle className="w-4 h-4" /> Approve Content
                    </button>
                  </>
                )}

                {/* Approved / Paused Actions */}
                {(selectedRevision.status === "APPROVED" || selectedRevision.status === "PAUSED") && (
                  <button
                    onClick={() => handleAction("PUBLISH")}
                    className="col-span-2 p-4 bg-royal text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <PlayCircle className="w-5 h-5" /> Publish to Public Entrance
                  </button>
                )}

                {/* Published Actions */}
                {selectedRevision.status === "PUBLISHED" && (
                  <button
                    onClick={() => handleAction("PAUSE")}
                    className="col-span-2 p-4 bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-amber-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <PauseCircle className="w-5 h-5" /> Pause Publication
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: PUBLIC PREVIEW */}
        <div className="flex-1 bg-slate-900 h-screen overflow-hidden relative hidden md:block">
           <div className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-black/50 backdrop-blur border border-white/10 rounded text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
             <Eye className="w-3 h-3 text-royal" />
             Governance Public Preview
           </div>
           
           {city && (
             <div className="w-full h-full overflow-y-auto">
               <SectorCityEntranceV2 
                 config={config} 
                 citySlug={city.slug} 
                 regionSlug={region.slug}
                 previewCreativeOverride={{
                   slotId: selectedRevision.slotId,
                   creative: selectedRevision.creative,
                   companyId: selectedRevision.companyId,
                 }}
               />
             </div>
           )}
        </div>
      </div>
    );
  }

  // QUEUE VIEW
  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-line pb-6">
          <div>
            <h1 className="text-2xl font-medium text-graphite uppercase tracking-wide flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-royal" />
              Property Governance Queue
            </h1>
            <p className="text-sm text-stone font-light mt-2">
              Review, approve, and manage canonical digital property creative for MarineWorld.City.
            </p>
          </div>
        </div>

        {revisions.length === 0 ? (
          <div className="bg-white border border-dashed border-line rounded-2xl p-12 text-center flex flex-col items-center">
            <CheckCircle className="w-12 h-12 text-emerald-400 mb-4" />
            <h3 className="text-lg font-bold text-graphite uppercase tracking-wide">Queue is Empty</h3>
            <p className="text-sm text-stone font-light mt-2">No properties are currently awaiting governance review.</p>
          </div>
        ) : (
          <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-mist border-b border-line text-[10px] font-bold text-stone uppercase tracking-widest">
                  <th className="p-4 w-1/4">Property Context</th>
                  <th className="p-4 w-1/4">Company</th>
                  <th className="p-4 w-1/4">Status</th>
                  <th className="p-4 w-1/4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm text-graphite">
                {revisions.map(rev => {
                  const city = config.explorer.cities.find(c => c.id === rev.cityId);
                  const region = CANONICAL_CITY_REGIONS.find(r => r.code === rev.regionCode) || CANONICAL_CITY_REGIONS[0];
                  
                  return (
                    <tr key={rev.revisionId} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold uppercase tracking-wide text-xs">{city?.domain} • {region.name}</div>
                        <div className="text-[10px] font-mono text-stone mt-1">{rev.tier} • {rev.slotId}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-xs uppercase">{rev.creative.headline || "Untitled"}</div>
                        <div className="text-[10px] font-mono text-stone mt-1 truncate max-w-[200px]" title={rev.companyId}>{rev.companyId}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-widest ${
                          rev.status === "SUBMITTED" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                          rev.status === "IN_REVIEW" ? "bg-purple-50 text-purple-700 border border-purple-200" :
                          rev.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          rev.status === "PUBLISHED" ? "bg-emerald-600 text-white border border-emerald-700" :
                          rev.status === "PAUSED" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          rev.status === "REVISION_REQUIRED" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                          "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {rev.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => setSelectedRevision(rev)}
                          className="px-4 py-2 bg-royal/10 text-royal hover:bg-royal hover:text-white border border-royal/20 rounded text-[10px] font-bold uppercase tracking-widest transition-colors"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
