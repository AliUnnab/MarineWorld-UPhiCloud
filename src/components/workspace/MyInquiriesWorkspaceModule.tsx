import React, { useState, useEffect, useMemo } from "react";
import {
  MessageSquare,
  Building2,
  Package,
  Layers,
  Search,
  ExternalLink,
  ChevronRight,
  Send,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  ArrowUpRight,
  ArrowLeft,
  Filter,
  Inbox,
  User,
  BadgeAlert,
} from "lucide-react";
import type { InquiryEntity, InquiryStatus, InquiryMessage } from "@/lib/types";
import {
  getUserInquiries,
  addInquiryMessage,
  updateInquiryStatus,
  subscribeInquiries,
} from "@/lib/connectStore";
import { getCurrentAuthSession } from "@/lib/services/securityService";

interface MyInquiriesWorkspaceModuleProps {
  onNavigate?: (path: string) => void;
  onOpenOfferingDetail?: (companySlug: string, offeringId: string, type: "product" | "service") => void;
}

type FilterTab = "ALL" | "ACTIVE" | "WAITING_FOR_ME" | "CLOSED";

/**
 * Maps raw InquiryStatus to clean user-facing group
 */
function getStatusGroup(status: string): "ACTIVE" | "WAITING_FOR_COMPANY" | "WAITING_FOR_ME" | "CLOSED" {
  if (status === "WAITING_FOR_REQUESTER") return "WAITING_FOR_ME";
  if (status === "WAITING_FOR_COMPANY") return "WAITING_FOR_COMPANY";
  if (status === "RESOLVED" || status === "CLOSED" || status === "ARCHIVED") return "CLOSED";
  return "ACTIVE"; // NEW, OPEN, IN_PROGRESS
}

function getStatusBadge(status: string) {
  const group = getStatusGroup(status);
  switch (group) {
    case "WAITING_FOR_ME":
      return {
        label: "WAITING FOR ME",
        bg: "bg-amber-50 text-amber-900 border-amber-200",
      };
    case "WAITING_FOR_COMPANY":
      return {
        label: "WAITING FOR COMPANY",
        bg: "bg-royal/5 text-royal-dark border-royal/20",
      };
    case "CLOSED":
      return {
        label: status === "RESOLVED" ? "RESOLVED" : "CLOSED",
        bg: "bg-slate-100 text-slate-700 border-slate-200",
      };
    case "ACTIVE":
    default:
      return {
        label: status === "IN_PROGRESS" ? "IN PROGRESS" : status === "OPEN" ? "OPEN" : "ACTIVE",
        bg: "bg-royal/5 text-royal border-royal/20",
      };
  }
}

function formatTimestamp(isoString?: string): string {
  if (!isoString) return "Recently";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Recently";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Recently";
  }
}

export function MyInquiriesWorkspaceModule({
  onNavigate,
  onOpenOfferingDetail,
}: MyInquiriesWorkspaceModuleProps) {
  const [authSession, setAuthSession] = useState(() => getCurrentAuthSession());
  const [inquiries, setInquiries] = useState<InquiryEntity[]>([]);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [viewedInquiryIds, setViewedInquiryIds] = useState<Set<string>>(new Set());

  const currentUserId = authSession.uid || "usr-owner-001";
  const currentUserName = authSession.displayName || authSession.email?.split("@")[0] || "Buyer Representative";

  const loadInquiries = () => {
    const userInqs = getUserInquiries(currentUserId);
    setInquiries(userInqs);
  };

  useEffect(() => {
    loadInquiries();
    const unsub = subscribeInquiries(() => {
      loadInquiries();
    });
    return () => unsub();
  }, [currentUserId]);

  // Selected Inquiry Entity
  const selectedInquiry = useMemo(() => {
    if (!selectedInquiryId) return null;
    return inquiries.find((i) => i.id === selectedInquiryId) || null;
  }, [inquiries, selectedInquiryId]);

  // Mark as viewed when opened
  const handleOpenDetail = (inquiry: InquiryEntity) => {
    setSelectedInquiryId(inquiry.id);
    setViewedInquiryIds((prev) => new Set(prev).add(inquiry.id));
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    let active = 0;
    let waitingForCompany = 0;
    let waitingForMe = 0;
    let closed = 0;

    inquiries.forEach((inq) => {
      const group = getStatusGroup(inq.status);
      if (group === "ACTIVE") active++;
      else if (group === "WAITING_FOR_COMPANY") waitingForCompany++;
      else if (group === "WAITING_FOR_ME") waitingForMe++;
      else if (group === "CLOSED") closed++;
    });

    return { active, waitingForCompany, waitingForMe, closed, total: inquiries.length };
  }, [inquiries]);

  // Filtered List
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      // Status filter
      const group = getStatusGroup(inq.status);
      if (filterTab === "ACTIVE" && group !== "ACTIVE" && group !== "WAITING_FOR_COMPANY" && group !== "WAITING_FOR_ME") {
        return false;
      }
      if (filterTab === "WAITING_FOR_ME" && group !== "WAITING_FOR_ME") {
        return false;
      }
      if (filterTab === "CLOSED" && group !== "CLOSED") {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const comp = (inq.companyName || "").toLowerCase();
        const prod = (inq.productName || inq.serviceName || inq.offeringReference || "").toLowerCase();
        const subj = (inq.subject || "").toLowerCase();
        const id = (inq.id || "").toLowerCase();
        return comp.includes(q) || prod.includes(q) || subj.includes(q) || id.includes(q);
      }

      return true;
    });
  }, [inquiries, filterTab, searchQuery]);

  // Handle Customer Reply
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquiry || !replyText.trim() || isSendingReply) return;

    setIsSendingReply(true);
    try {
      addInquiryMessage(
        selectedInquiry.id,
        currentUserId,
        currentUserName,
        "REQUESTER",
        replyText.trim()
      );
      setReplyText("");
    } catch (err) {
      console.error("Failed to send reply:", err);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Keyboard Escape listener to safely exit the room
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedInquiryId) {
        setSelectedInquiryId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedInquiryId]);

  // Helper to derive offering target URL
  const getOfferingUrl = (inq: InquiryEntity): string => {
    if (inq.canonicalUrl) return inq.canonicalUrl;
    const compSlug = inq.companySlug || inq.companyId;
    if (inq.productId) return `/companies/${compSlug}/products/${inq.productId}`;
    if (inq.serviceId) return `/companies/${compSlug}/services/${inq.serviceId}`;
    return `/companies/${compSlug}`;
  };

  const handleNavigateToOffering = (inq: InquiryEntity) => {
    const compSlug = inq.companySlug || inq.companyId;
    const targetOfferingId = inq.productId || inq.serviceId;
    const type = inq.serviceId ? "service" : "product";
    
    // Dismiss room overlay before navigating
    setSelectedInquiryId(null);

    if (onOpenOfferingDetail && targetOfferingId) {
      onOpenOfferingDetail(compSlug, targetOfferingId, type);
    } else if (onNavigate) {
      const url = targetOfferingId
        ? `/companies/${compSlug}/${type === "service" ? "services" : "products"}/${targetOfferingId}`
        : `/companies/${compSlug}`;
      onNavigate(url);
    } else {
      const url = targetOfferingId
        ? `/companies/${compSlug}/${type === "service" ? "services" : "products"}/${targetOfferingId}`
        : `/companies/${compSlug}`;
      window.history.pushState({}, "", url);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const handleNavigateToCompany = (inq: InquiryEntity) => {
    const compSlug = inq.companySlug || inq.companyId;
    setSelectedInquiryId(null);
    const url = `/companies/${compSlug}`;
    if (onNavigate) {
      onNavigate(url);
    } else {
      window.history.pushState({}, "", url);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  return (
    <div id="section-my-inquiries-module" className="space-y-6">
      {/* 1. MODULE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-graphite tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-royal shrink-0" />
            <span>My Inquiries</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone mt-1">
            Track your commercial inquiries, company replies, and offer requests in one place.
          </p>
        </div>

        <button
          type="button"
          id="btn-workspace-explore-offerings"
          onClick={() => {
            if (onNavigate) onNavigate("/explore");
            else {
              window.history.pushState({}, "", "/explore");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-line bg-white hover:bg-slate-50 text-graphite font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-2xs self-start sm:self-auto"
        >
          <Search className="w-3.5 h-3.5 text-royal" />
          <span>Explore Maritime Catalog</span>
        </button>
      </div>

      {/* 2. SUMMARY STRIP (4 Compact Metrics) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          id="metric-inquiries-active"
          onClick={() => setFilterTab("ACTIVE")}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            filterTab === "ACTIVE"
              ? "bg-royal/5 border-royal shadow-xs"
              : "bg-white border-line hover:border-slate-300"
          }`}
        >
          <div className="text-[11px] font-mono font-bold text-stone uppercase tracking-wider">Active</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-graphite mt-1">{metrics.active}</div>
          <div className="text-[10px] text-stone mt-0.5">Open & in-progress inquiries</div>
        </div>

        <div
          id="metric-inquiries-waiting-company"
          onClick={() => setFilterTab("ACTIVE")}
          className="p-4 rounded-xl bg-white border border-line hover:border-slate-300 transition cursor-pointer"
        >
          <div className="text-[11px] font-mono font-bold text-stone uppercase tracking-wider">Waiting for Company</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-royal mt-1">{metrics.waitingForCompany}</div>
          <div className="text-[10px] text-stone mt-0.5">Under review by commercial desk</div>
        </div>

        <div
          id="metric-inquiries-waiting-me"
          onClick={() => setFilterTab("WAITING_FOR_ME")}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            filterTab === "WAITING_FOR_ME"
              ? "bg-amber-50/80 border-amber-400 shadow-xs"
              : "bg-white border-line hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-amber-900 uppercase tracking-wider">Waiting for Me</span>
            {metrics.waitingForMe > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-950 mt-1">{metrics.waitingForMe}</div>
          <div className="text-[10px] text-amber-800 mt-0.5">Replies requiring your follow-up</div>
        </div>

        <div
          id="metric-inquiries-closed"
          onClick={() => setFilterTab("CLOSED")}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            filterTab === "CLOSED"
              ? "bg-slate-100 border-slate-400 shadow-xs"
              : "bg-white border-line hover:border-slate-300"
          }`}
        >
          <div className="text-[11px] font-mono font-bold text-stone uppercase tracking-wider">Closed</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-700 mt-1">{metrics.closed}</div>
          <div className="text-[10px] text-stone mt-0.5">Resolved or completed deals</div>
        </div>
      </div>

      {/* 3. CONTROLS: FILTER TABS & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-line">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {(
            [
              { id: "ALL", label: `All (${inquiries.length})` },
              { id: "ACTIVE", label: `Active (${metrics.active + metrics.waitingForCompany})` },
              { id: "WAITING_FOR_ME", label: `Waiting for Me (${metrics.waitingForMe})` },
              { id: "CLOSED", label: `Closed (${metrics.closed})` },
            ] as const
          ).map((tab) => {
            const isActive = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`btn-filter-inquiries-${tab.id.toLowerCase()}`}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-stone hover:text-graphite hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone" />
          <input
            id="input-search-my-inquiries"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company or offering..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-line rounded-lg text-xs font-medium text-graphite placeholder:text-stone focus:bg-white focus:outline-none focus:border-royal transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone hover:text-graphite"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. INQUIRY LIST OR EMPTY STATE */}
      {inquiries.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-dashed border-line rounded-2xl p-10 text-center space-y-4 max-w-xl mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-royal/10 border border-royal/20 text-royal flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-graphite">No commercial inquiries yet</h3>
            <p className="text-xs text-stone max-w-md mx-auto leading-relaxed">
              When you contact a verified company about a product or service, your inquiry and all future replies will appear here.
            </p>
          </div>
          <button
            type="button"
            id="btn-empty-explore-companies"
            onClick={() => {
              if (onNavigate) onNavigate("/companies");
              else {
                window.history.pushState({}, "", "/companies");
                window.dispatchEvent(new PopStateEvent("popstate"));
              }
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-royal hover:bg-royal-dark text-white font-bold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            <span>EXPLORE COMPANIES</span>
          </button>
        </div>
      ) : filteredInquiries.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-8 text-center text-xs text-stone space-y-2">
          <p className="font-semibold text-graphite">No inquiries match the active filter or search.</p>
          <button
            type="button"
            onClick={() => {
              setFilterTab("ALL");
              setSearchQuery("");
            }}
            className="text-royal font-bold hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : (
        /* Inquiries List View */
        <div className="space-y-3" id="list-my-inquiries">
          {filteredInquiries.map((inq) => {
            const statusBadge = getStatusBadge(inq.status);
            const isOfferRequest = inq.inquiryKind === "OFFICIAL_OFFER" || inq.id.startsWith("req-offer");
            const isService = !!inq.serviceId || inq.source === "SERVICE";
            const offeringName = inq.productName || inq.serviceName || inq.offeringReference || "Commercial Offering";
            const latestMsg = inq.messages && inq.messages.length > 0 ? inq.messages[inq.messages.length - 1] : null;
            const hasUnreadCompanyReply =
              latestMsg?.senderRole === "COMPANY_MEMBER" && !viewedInquiryIds.has(inq.id);

            return (
              <div
                key={inq.id}
                id={`card-inquiry-${inq.id}`}
                onClick={() => handleOpenDetail(inq)}
                className="bg-white border border-line hover:border-royal/50 hover:shadow-sm rounded-xl p-4 sm:p-5 transition cursor-pointer space-y-3 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  {/* Company & Offering Identity */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-mono text-[11px] font-bold text-stone">COMPANY:</span>
                      <strong className="font-bold text-graphite hover:text-royal transition">
                        {inq.companyName || inq.companySlug || "Verified Maritime Supplier"}
                      </strong>

                      <span className="text-slate-300 hidden sm:inline">•</span>

                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 border border-line text-slate-700 uppercase">
                        {isService ? (
                          <>
                            <Layers className="w-3 h-3 text-royal" /> Service
                          </>
                        ) : (
                          <>
                            <Package className="w-3 h-3 text-royal" /> Product
                          </>
                        )}
                      </span>

                      {isOfferRequest && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-royal/5 text-royal border border-royal/20 uppercase">
                          <FileText className="w-3 h-3 text-royal" /> OFFICIAL OFFER REQUESTED
                        </span>
                      )}

                      {hasUnreadCompanyReply && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse uppercase">
                          <MessageSquare className="w-3 h-3 text-emerald-600" /> NEW REPLY
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-stone">OFFERING:</span>
                      <h3 className="font-extrabold text-sm text-graphite group-hover:text-royal transition truncate">
                        {offeringName}
                      </h3>
                    </div>
                  </div>

                  {/* Status & Reference Header Right */}
                  <div className="flex items-center gap-2.5 sm:self-start shrink-0">
                    <span className={`px-2.5 py-1 rounded font-mono text-[10.5px] font-bold border ${statusBadge.bg}`}>
                      {statusBadge.label}
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Reference, Last Activity, Open Action */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line/60 text-xs text-stone">
                  <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      <span className="text-mute">REF:</span>
                      <span className="font-bold text-graphite bg-slate-50 px-1.5 py-0.5 rounded border border-line">
                        {inq.id.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-stone" />
                      <span>Activity: {formatTimestamp(inq.updatedAt || inq.createdAt)}</span>
                    </div>

                    {inq.messages && (
                      <div className="flex items-center gap-1 text-[11px] font-mono">
                        <MessageSquare className="w-3 h-3 text-stone" />
                        <span>{inq.messages.length} msg{inq.messages.length === 1 ? "" : "s"}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      id={`btn-view-offering-${inq.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigateToOffering(inq);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-line bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition shadow-2xs cursor-pointer"
                      title="View product/service"
                    >
                      <ExternalLink className="w-3 h-3 text-royal" />
                      <span className="hidden sm:inline">Offering</span>
                    </button>

                    <button
                      type="button"
                      id={`btn-view-company-${inq.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigateToCompany(inq);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-line bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition shadow-2xs cursor-pointer"
                      title="View company profile"
                    >
                      <Building2 className="w-3 h-3 text-slate-500" />
                      <span className="hidden sm:inline">Company</span>
                    </button>

                    <button
                      type="button"
                      id={`btn-open-inquiry-${inq.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetail(inq);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-royal hover:bg-royal-dark text-white font-bold text-xs uppercase tracking-wider transition shadow-2xs cursor-pointer"
                    >
                      <span>ROOM</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. INQUIRY DETAIL MODAL / DRAWER (Controlled Commercial Thread) */}
      {selectedInquiry && (
        <div
          id="inquiry-detail-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedInquiryId(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs font-sans animate-in fade-in duration-200"
        >
          <div
            className="relative w-full max-w-3xl bg-white rounded-card-md sm:rounded-card-lg border border-line shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Top Workspace Return Bar */}
            <div className="bg-slate-900 text-white px-5 py-2.5 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                id="btn-return-workspace-top"
                onClick={() => setSelectedInquiryId(null)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white hover:text-royal-light transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>← Return to My Workspace Inquiries</span>
              </button>

              <span className="text-[11px] font-mono text-slate-400">
                Esc to close
              </span>
            </div>

            {/* Context Header */}
            <div className="bg-canvas border-b border-line px-5 py-4 flex flex-col gap-3 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-royal bg-white px-2 py-0.5 rounded border border-line">
                    REF: {selectedInquiry.id.toUpperCase()}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded font-mono text-[11px] font-bold border ${
                      getStatusBadge(selectedInquiry.status).bg
                    }`}
                  >
                    {getStatusBadge(selectedInquiry.status).label}
                  </span>
                  {selectedInquiry.inquiryKind === "OFFICIAL_OFFER" && (
                    <span className="px-2 py-0.5 rounded bg-royal/5 text-royal border border-royal/20 font-mono text-[10.5px] font-bold uppercase">
                      OFFICIAL OFFER REQUEST
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-close-inquiry-detail"
                    onClick={() => setSelectedInquiryId(null)}
                    className="p-1.5 text-stone hover:text-graphite hover:bg-white rounded-md transition cursor-pointer"
                    title="Close room (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Company & Offering Binding */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="space-y-0.5">
                  <div className="text-xs text-stone flex items-center gap-1.5 flex-wrap">
                    <span>Company:</span>
                    <button
                      type="button"
                      onClick={() => handleNavigateToCompany(selectedInquiry)}
                      className="text-graphite font-bold hover:text-royal hover:underline transition cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>{selectedInquiry.companyName || selectedInquiry.companySlug}</span>
                      <ExternalLink className="w-3 h-3 text-royal" />
                    </button>
                    {selectedInquiry.sectorCityId && (
                      <span className="text-stone font-mono">• {selectedInquiry.sectorCityId.toUpperCase()}</span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg font-extrabold text-graphite tracking-tight">
                    {selectedInquiry.productName || selectedInquiry.serviceName || selectedInquiry.offeringReference || "Commercial Offering"}
                  </h2>
                </div>

                {/* Actions to open canonical offering or company */}
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
                  <button
                    type="button"
                    id="btn-view-company-profile-room"
                    onClick={() => handleNavigateToCompany(selectedInquiry)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-white hover:bg-slate-50 text-graphite text-xs font-bold transition shadow-2xs uppercase tracking-wider cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>VIEW COMPANY</span>
                  </button>

                  <button
                    type="button"
                    id="btn-open-canonical-offering"
                    onClick={() => handleNavigateToOffering(selectedInquiry)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-royal/30 bg-royal hover:bg-royal-dark text-white text-xs font-bold transition shadow-2xs uppercase tracking-wider cursor-pointer"
                  >
                    <span>OPEN OFFERING</span>
                    <ExternalLink className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>

              {/* Canonical URL Reference */}
              <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-stone pt-2 border-t border-line/60">
                <div className="truncate">
                  <span className="text-mute">Canonical URI: </span>
                  <span className="text-royal underline cursor-pointer" onClick={() => handleNavigateToOffering(selectedInquiry)}>
                    {getOfferingUrl(selectedInquiry)}
                  </span>
                </div>
                <div className="shrink-0 text-mute">
                  Created: {formatTimestamp(selectedInquiry.createdAt)}
                </div>
              </div>
            </div>

            {/* Scrollable Body: Official Offer Specs & Conversation Thread */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* If Official Offer Request, display commercial parameters */}
              {(selectedInquiry.inquiryKind === "OFFICIAL_OFFER" || selectedInquiry.incoterms || selectedInquiry.deliveryPort) && (
                <div className="p-4 rounded-xl bg-royal/5/70 border border-royal/20 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-royal-dark uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-royal" />
                    <span>Official Commercial Terms Package</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {selectedInquiry.incoterms && (
                      <div className="p-2 bg-white rounded-lg border border-royal/10">
                        <span className="text-stone font-mono text-[10px] block uppercase">Incoterms</span>
                        <strong className="text-slate-900 font-bold">{selectedInquiry.incoterms}</strong>
                      </div>
                    )}
                    {selectedInquiry.deliveryPort && (
                      <div className="p-2 bg-white rounded-lg border border-royal/10">
                        <span className="text-stone font-mono text-[10px] block uppercase">Delivery Port / Hub</span>
                        <strong className="text-slate-900 font-bold">{selectedInquiry.deliveryPort}</strong>
                      </div>
                    )}
                    {selectedInquiry.quantityOrScope && (
                      <div className="p-2 bg-white rounded-lg border border-royal/10">
                        <span className="text-stone font-mono text-[10px] block uppercase">Quantity / Scope</span>
                        <strong className="text-slate-900 font-bold">{selectedInquiry.quantityOrScope}</strong>
                      </div>
                    )}
                    {selectedInquiry.deliveryTimeline && (
                      <div className="p-2 bg-white rounded-lg border border-royal/10">
                        <span className="text-stone font-mono text-[10px] block uppercase">Target Lead Time</span>
                        <strong className="text-slate-900 font-bold">{selectedInquiry.deliveryTimeline}</strong>
                      </div>
                    )}
                  </div>
                  {selectedInquiry.engineeringRequirements && (
                    <div className="p-2.5 bg-white rounded-lg border border-royal/10 text-xs">
                      <span className="text-stone font-mono text-[10px] block uppercase">Engineering & Class Specs</span>
                      <p className="text-slate-800 font-medium mt-0.5">{selectedInquiry.engineeringRequirements}</p>
                    </div>
                  )}
                </div>
              )}

              {/* CONVERSATION THREAD */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-stone uppercase tracking-wider pb-1 border-b border-line">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-royal" />
                    <span>Communication Thread ({selectedInquiry.messages?.length || 1})</span>
                  </span>
                  <span className="font-mono text-[10.5px]">P2P Commercial Thread</span>
                </div>

                <div className="space-y-3">
                  {selectedInquiry.messages && selectedInquiry.messages.length > 0 ? (
                    selectedInquiry.messages.map((msg, index) => {
                      const isCompany = msg.senderRole === "COMPANY_MEMBER";
                      return (
                        <div
                          key={msg.id || index}
                          id={`msg-thread-item-${msg.id || index}`}
                          className={`p-4 rounded-xl border text-xs space-y-2 transition ${
                            isCompany
                              ? "bg-slate-50/90 border-slate-300 ml-2 sm:ml-6"
                              : "bg-white border-line mr-2 sm:mr-6"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                  isCompany
                                    ? "bg-royal text-white"
                                    : "bg-slate-200 text-slate-800"
                                }`}
                              >
                                {isCompany ? "CO" : "YOU"}
                              </div>
                              <div>
                                <span className="font-bold text-graphite">{msg.senderName}</span>
                                <span className="text-[10px] font-mono text-stone ml-2 px-1.5 py-0.5 rounded bg-white border border-line">
                                  {isCompany ? "COMPANY REPRESENTATIVE" : "YOU (REQUESTER)"}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10.5px] text-stone font-mono">
                              {formatTimestamp(msg.createdAt)}
                            </span>
                          </div>

                          <div className="text-graphite font-sans leading-relaxed whitespace-pre-wrap pl-8">
                            {msg.body}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    /* Fallback to primary inquiry message */
                    <div className="p-4 rounded-xl bg-white border border-line text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-graphite">{selectedInquiry.requesterName} (YOU)</span>
                        <span className="text-[10.5px] text-stone font-mono">{formatTimestamp(selectedInquiry.createdAt)}</span>
                      </div>
                      <p className="text-slate-800 leading-relaxed">{selectedInquiry.message}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Response Footer */}
            <div className="bg-canvas border-t border-line p-4 shrink-0">
              {selectedInquiry.status === "CLOSED" || selectedInquiry.status === "ARCHIVED" ? (
                <div className="p-3 bg-slate-100 rounded-xl border border-line text-center text-xs text-stone">
                  This commercial inquiry is marked as <strong>{selectedInquiry.status}</strong>. To reopen or start a new inquiry, visit the offering page.
                </div>
              ) : (
                <form onSubmit={handleSendReply} className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-stone">
                    <span className="font-semibold text-graphite">Reply to company...</span>
                    <span className="text-[11px] font-mono">Status will update to WAITING FOR COMPANY</span>
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      id="input-inquiry-reply"
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your follow-up, technical clarification, or commercial terms response..."
                      className="flex-1 px-3 py-2 bg-white border border-line rounded-xl text-xs font-medium text-graphite placeholder:text-stone focus:outline-none focus:border-royal transition resize-none"
                    />
                    <button
                      type="submit"
                      id="btn-send-inquiry-reply"
                      disabled={!replyText.trim() || isSendingReply}
                      className="px-4 py-2 bg-royal hover:bg-royal-dark disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSendingReply ? "SENDING..." : "SEND REPLY"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
