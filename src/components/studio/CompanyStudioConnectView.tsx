import React, { useState, useEffect, useMemo } from "react";
import {
  MessageSquare,
  Search,
  Filter,
  Send,
  ExternalLink,
  Building2,
  Package,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
  ShieldCheck,
  AlertCircle,
  FileText,
  ChevronRight,
  ArrowUpRight,
  Inbox,
  RefreshCw,
  Bell,
  Check,
  Tag,
  Briefcase,
} from "lucide-react";
import type { InquiryEntity, InquiryStatus, InquiryPriority } from "@/lib/types";
import {
  getCompanyInquiries,
  addInquiryMessage,
  updateInquiryStatus,
  subscribeInquiries,
} from "@/lib/connectStore";
import {
  resolveCompanyContactRouting,
  getNotificationLogs,
  subscribeNotificationLogs,
  type CommercialNotificationLog,
} from "@/lib/services/commercialNotificationService";
import { getCompanyById } from "@/lib/services/companyService";

interface CompanyStudioConnectViewProps {
  companyId: string;
  memberRole?: string;
  userEmail?: string;
}

function renderStatusBadge(status: InquiryStatus | string) {
  switch (status) {
    case "NEW":
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10.5px] font-extrabold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
          ⚡ NEW
        </span>
      );
    case "IN_REVIEW":
    case "OPEN":
    case "IN_PROGRESS":
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10.5px] font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
          🔍 IN REVIEW
        </span>
      );
    case "WAITING_FOR_COMPANY":
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10.5px] font-extrabold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
          📥 ACTION REQUIRED
        </span>
      );
    case "WAITING_FOR_REQUESTER":
    case "RESPONDED":
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
          💬 WAITING FOR REQUESTER
        </span>
      );
    case "RESOLVED":
    case "CLOSED":
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10.5px] font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
          🔒 CLOSED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10.5px] font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
          {status}
        </span>
      );
  }
}

function renderPriorityBadge(priority?: InquiryPriority | string) {
  switch (priority) {
    case "URGENT":
      return (
        <span className="font-mono text-[10px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
          🔴 URGENT
        </span>
      );
    case "HIGH":
      return (
        <span className="font-mono text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
          🟠 HIGH
        </span>
      );
    case "NORMAL":
    default:
      return (
        <span className="font-mono text-[10px] font-medium text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
          🔵 NORMAL
        </span>
      );
  }
}

function formatDate(isoString?: string): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function CompanyStudioConnectView({
  companyId,
  memberRole = "OWNER",
  userEmail = "commercial@marineworld.city",
}: CompanyStudioConnectViewProps) {
  const [inquiries, setInquiries] = useState<InquiryEntity[]>([]);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [kindFilter, setKindFilter] = useState<string>("ALL");
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [notificationLogs, setNotificationLogs] = useState<CommercialNotificationLog[]>([]);

  const company = useMemo(() => getCompanyById(companyId), [companyId]);
  const contactRouting = useMemo(() => resolveCompanyContactRouting(companyId), [companyId]);

  const loadData = () => {
    const companyInqs = getCompanyInquiries(companyId);
    setInquiries(companyInqs);
    setNotificationLogs(getNotificationLogs());
  };

  useEffect(() => {
    loadData();
    const unsubInquiries = subscribeInquiries(loadData);
    const unsubLogs = subscribeNotificationLogs(() => setNotificationLogs(getNotificationLogs()));

    const handleCustomUpdate = () => loadData();
    window.addEventListener("marineworld_inquiry_updated", handleCustomUpdate);

    return () => {
      unsubInquiries();
      unsubLogs();
      window.removeEventListener("marineworld_inquiry_updated", handleCustomUpdate);
    };
  }, [companyId]);

  // Selected Inquiry entity
  const activeInquiry = useMemo(() => {
    if (!selectedInquiryId) return null;
    return inquiries.find((i) => i.id === selectedInquiryId) || null;
  }, [inquiries, selectedInquiryId]);

  // Open detail handler & status transition rule (NEW -> OPEN)
  const handleSelectInquiry = (inquiry: InquiryEntity) => {
    setSelectedInquiryId(inquiry.id);
    if (inquiry.status === "NEW") {
      updateInquiryStatus(inquiry.id, "OPEN");
    }
  };

  // Filtered inbox list
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const req = (inq.requesterName || "").toLowerCase();
        const org = (inq.requesterCompany || "").toLowerCase();
        const prod = (inq.productName || inq.serviceName || inq.subject || "").toLowerCase();
        const id = (inq.id || "").toLowerCase();
        const msg = (inq.message || "").toLowerCase();
        if (!req.includes(q) && !org.includes(q) && !prod.includes(q) && !id.includes(q) && !msg.includes(q)) {
          return false;
        }
      }

      if (statusFilter !== "ALL") {
        if (statusFilter === "NEW" && inq.status !== "NEW") return false;
        if (statusFilter === "IN_REVIEW" && (inq.status !== "OPEN" && inq.status !== "IN_PROGRESS")) return false;
        if (statusFilter === "WAITING_FOR_COMPANY" && inq.status !== "WAITING_FOR_COMPANY") return false;
        if (statusFilter === "WAITING_FOR_REQUESTER" && inq.status !== "WAITING_FOR_REQUESTER") return false;
        if (statusFilter === "CLOSED" && (inq.status !== "CLOSED" && inq.status !== "RESOLVED" && inq.status !== "ARCHIVED")) return false;
      }

      if (kindFilter !== "ALL") {
        if (kindFilter === "OFFICIAL_OFFER" && inq.inquiryKind !== "OFFICIAL_OFFER") return false;
        if (kindFilter === "INQUIRY" && inq.inquiryKind === "OFFICIAL_OFFER") return false;
      }

      return true;
    });
  }, [inquiries, searchQuery, statusFilter, kindFilter]);

  // Metric counts
  const counts = useMemo(() => {
    let newCount = 0;
    let waitingCompanyCount = 0;
    let waitingRequesterCount = 0;
    let closedCount = 0;

    inquiries.forEach((inq) => {
      if (inq.status === "NEW") newCount++;
      else if (inq.status === "WAITING_FOR_COMPANY") waitingCompanyCount++;
      else if (inq.status === "WAITING_FOR_REQUESTER") waitingRequesterCount++;
      else if (inq.status === "CLOSED" || inq.status === "RESOLVED" || inq.status === "ARCHIVED") closedCount++;
      else waitingCompanyCount++; // OPEN or IN_PROGRESS
    });

    return {
      total: inquiries.length,
      newCount,
      waitingCompanyCount,
      waitingRequesterCount,
      closedCount,
    };
  }, [inquiries]);

  // Reply submission
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInquiry || !replyText.trim() || isSending) return;

    setIsSending(true);
    try {
      const compName = (company as any)?.displayName || (company as any)?.legalName || (company as any)?.name || "Company";
      const repName = `${compName} Commercial Team`;
      addInquiryMessage(
        activeInquiry.id,
        "emp-cg-01",
        repName,
        "COMPANY_MEMBER",
        replyText.trim()
      );
      setReplyText("");
    } catch (err) {
      console.error("Failed to post company reply:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Close or reopen inquiry
  const handleToggleClose = () => {
    if (!activeInquiry) return;
    const newStatus: InquiryStatus = activeInquiry.status === "CLOSED" ? "OPEN" : "CLOSED";
    updateInquiryStatus(activeInquiry.id, newStatus);
  };

  // Canonical Offering URL helper
  const getOfferingUrl = (inq: InquiryEntity): string => {
    if (inq.canonicalUrl) return inq.canonicalUrl;
    const compSlug = inq.companySlug || inq.companyId;
    if (inq.productId) return `/companies/${compSlug}/products/${inq.productId}`;
    if (inq.serviceId) return `/companies/${compSlug}/services/${inq.serviceId}`;
    return `/companies/${compSlug}`;
  };

  const handleOpenOffering = (inq: InquiryEntity) => {
    const url = getOfferingUrl(inq);
    window.history.pushState({}, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const companyTitle = (company as any)?.displayName || (company as any)?.legalName || (company as any)?.name || companyId;

  return (
    <div id="section-company-studio-connect" className="space-y-6">
      {/* 1. SECTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-royal">
            <MessageSquare className="w-4 h-4" />
            <span>Commercial Operations</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-graphite tracking-tight mt-0.5">
            Connect & RFQs Workspace
          </h1>
          <p className="text-xs sm:text-sm text-stone mt-1">
            Receive, review, and manage customer inquiries, official RFQs, and commercial negotiations for{" "}
            <strong className="text-graphite">{companyTitle}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setShowLogDrawer(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-line bg-white hover:bg-slate-50 text-stone hover:text-graphite font-mono text-[11px] font-bold transition shadow-2xs"
            title="View simulated email notifications dispatched by the platform"
          >
            <Bell className="w-3.5 h-3.5 text-amber-800" />
            <span>Notification Logs ({notificationLogs.length})</span>
          </button>
        </div>
      </div>

      {/* 2. CANONICAL CONTACT ROUTING BANNER */}
      <div className="rounded-xl border border-line bg-gradient-to-r from-slate-50 via-white to-sky-50/30 p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-royal/10 text-royal border border-royal/20 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone">
              Official Commercial Routing
            </div>
            <div className="font-bold text-graphite flex items-center gap-2">
              <span>{contactRouting.recipientName}</span>
              <span className="font-mono font-normal text-slate-500">({contactRouting.email})</span>
            </div>
          </div>
        </div>

        <div className="font-mono text-[10px] text-stone bg-white border border-line px-2.5 py-1 rounded-md shrink-0 self-start sm:self-auto">
          Rule: <strong className="text-royal">{contactRouting.sourceRule}</strong>
        </div>
      </div>

      {/* 3. METRICS STRIP (4 COUNTERS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter("NEW")}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            statusFilter === "NEW" ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500" : "bg-white border-line hover:border-amber-400"
          }`}
        >
          <div className="flex items-center justify-between text-stone text-[11px] font-bold uppercase tracking-wider">
            <span>⚡ New Inquiries</span>
            {counts.newCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
          </div>
          <div className="text-2xl font-extrabold text-graphite mt-1">{counts.newCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter("WAITING_FOR_COMPANY")}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            statusFilter === "WAITING_FOR_COMPANY" ? "bg-rose-50 border-rose-300 ring-1 ring-rose-400" : "bg-white border-line hover:border-rose-300"
          }`}
        >
          <div className="text-stone text-[11px] font-bold uppercase tracking-wider">
            📥 Waiting for Company
          </div>
          <div className="text-2xl font-extrabold text-rose-800 mt-1">{counts.waitingCompanyCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter("WAITING_FOR_REQUESTER")}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            statusFilter === "WAITING_FOR_REQUESTER" ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400" : "bg-white border-line hover:border-emerald-300"
          }`}
        >
          <div className="text-stone text-[11px] font-bold uppercase tracking-wider">
            💬 Waiting for Requester
          </div>
          <div className="text-2xl font-extrabold text-emerald-800 mt-1">{counts.waitingRequesterCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter("ALL")}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            statusFilter === "ALL" ? "bg-sky-50 border-sky-300 ring-1 ring-sky-400" : "bg-white border-line hover:border-sky-300"
          }`}
        >
          <div className="text-stone text-[11px] font-bold uppercase tracking-wider">
            📊 Total Inquiries
          </div>
          <div className="text-2xl font-extrabold text-graphite mt-1">{counts.total}</div>
        </div>
      </div>

      {/* 4. FILTER & SEARCH CONTROL BAR */}
      <div className="p-4 rounded-xl border border-line bg-white shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by requester, company, offering, or reference ID..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-line bg-slate-50/50 focus:bg-white focus:outline-none focus:border-royal transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-stone hover:text-graphite text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-line bg-white text-graphite focus:outline-none focus:border-royal"
          >
            <option value="ALL">All Statuses ({counts.total})</option>
            <option value="NEW">⚡ New ({counts.newCount})</option>
            <option value="WAITING_FOR_COMPANY">📥 Waiting for Company ({counts.waitingCompanyCount})</option>
            <option value="WAITING_FOR_REQUESTER">💬 Waiting for Requester ({counts.waitingRequesterCount})</option>
            <option value="CLOSED">🔒 Closed ({counts.closedCount})</option>
          </select>

          {/* Kind Filter Dropdown */}
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-line bg-white text-graphite focus:outline-none focus:border-royal"
          >
            <option value="ALL">All Request Types</option>
            <option value="INQUIRY">Standard Inquiries / RFQs</option>
            <option value="OFFICIAL_OFFER">Official Offer Requests</option>
          </select>
        </div>
      </div>

      {/* 5. INBOX TABLE / CARD LIST */}
      {filteredInquiries.length === 0 ? (
        <div className="p-12 bg-white border border-line rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-stone flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-graphite">No Inquiries Found</h3>
          <p className="text-xs text-stone max-w-sm mx-auto">
            {searchQuery || statusFilter !== "ALL"
              ? "No commercial inquiries match your active filters. Try clearing search or status filters."
              : "When customers submit inquiries or RFQs for your products and services, they will appear in this workspace."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-line rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-line text-[10px] font-mono font-bold uppercase tracking-wider text-stone">
                <tr>
                  <th className="py-3 px-4">Ref</th>
                  <th className="py-3 px-4">Requester</th>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Offering / Subject</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredInquiries.map((inq) => {
                  const isSelected = selectedInquiryId === inq.id;
                  const offeringTitle = inq.productName || inq.serviceName || inq.subject;
                  return (
                    <tr
                      key={inq.id}
                      onClick={() => handleSelectInquiry(inq)}
                      className={`cursor-pointer transition hover:bg-slate-50/80 ${
                        isSelected ? "bg-sky-50/60 font-medium" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono text-[11px] font-bold text-royal whitespace-nowrap">
                        #{inq.id}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-graphite whitespace-nowrap">
                        {inq.requesterName}
                      </td>

                      <td className="py-3.5 px-4 text-stone whitespace-nowrap font-medium">
                        {inq.requesterCompany || "Individual Member"}
                      </td>

                      <td className="py-3.5 px-4 max-w-[220px]">
                        <div className="font-bold text-graphite truncate">{offeringTitle}</div>
                        <div className="text-[11px] text-stone truncate">{inq.subject}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {inq.inquiryKind === "OFFICIAL_OFFER" ? (
                          <span className="font-mono text-[10px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                            OFFICIAL OFFER
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                            INQUIRY / RFQ
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderStatusBadge(inq.status)}
                      </td>

                      <td className="py-3.5 px-4 text-stone text-[11px] whitespace-nowrap font-mono">
                        {formatDate(inq.updatedAt || inq.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectInquiry(inq);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-royal hover:underline"
                        >
                          <span>Review</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. OPEN INQUIRY DETAIL MODAL / DRAWER */}
      {activeInquiry && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-end p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-line rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-line bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-royal/10 text-royal">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-royal">
                      #{activeInquiry.id}
                    </span>
                    {renderStatusBadge(activeInquiry.status)}
                    {renderPriorityBadge(activeInquiry.priority)}
                  </div>
                  <h2 className="text-base font-bold text-graphite truncate max-w-md">
                    {activeInquiry.subject}
                  </h2>
                </div>
              </div>

              <button
                onClick={() => setSelectedInquiryId(null)}
                className="p-1.5 rounded-lg text-stone hover:text-graphite hover:bg-slate-200 transition font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {/* Grid: Requester Info & Offering Context */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Requester Profile Card */}
                <div className="p-4 rounded-xl border border-line bg-slate-50/50 space-y-2">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-royal" />
                    <span>Requester Profile</span>
                  </div>
                  <div className="text-sm font-extrabold text-graphite">
                    {activeInquiry.requesterName}
                  </div>
                  <div className="text-stone font-medium">
                    {activeInquiry.requesterCompany || "Individual Member"}
                  </div>
                  <div className="font-mono text-[11px] text-royal pt-1 border-t border-line/60 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    <span>{activeInquiry.requesterEmail || "Contact via Platform"}</span>
                  </div>
                </div>

                {/* Offering Context Card */}
                <div className="p-4 rounded-xl border border-line bg-slate-50/50 space-y-2">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-royal" />
                    <span>Offering Reference</span>
                  </div>
                  <div className="text-sm font-extrabold text-graphite">
                    {activeInquiry.productName || activeInquiry.serviceName || activeInquiry.subject}
                  </div>
                  <div className="text-stone font-mono text-[11px]">
                    Sector City: <strong className="text-graphite">{activeInquiry.sectorCityId || "Southampton"}</strong>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => handleOpenOffering(activeInquiry)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-royal text-white font-bold text-[11px] hover:bg-royal/90 transition"
                    >
                      <span>OPEN OFFERING</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Commercial Requirements / Specifications Panel */}
              {(activeInquiry.quantityOrScope ||
                activeInquiry.deliveryPort ||
                activeInquiry.incoterms ||
                activeInquiry.deliveryTimeline ||
                activeInquiry.engineeringRequirements ||
                activeInquiry.commercialRequirements ||
                activeInquiry.warrantyRequirements) && (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-800" />
                    <span>Commercial & Technical Specification</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 font-mono text-[11px]">
                    {activeInquiry.quantityOrScope && (
                      <div>
                        <span className="text-slate-500 block">Quantity / Scope:</span>
                        <strong className="text-graphite">{activeInquiry.quantityOrScope}</strong>
                      </div>
                    )}
                    {activeInquiry.deliveryPort && (
                      <div>
                        <span className="text-slate-500 block">Delivery Port / Hub:</span>
                        <strong className="text-graphite">{activeInquiry.deliveryPort}</strong>
                      </div>
                    )}
                    {activeInquiry.incoterms && (
                      <div>
                        <span className="text-slate-500 block">Preferred Incoterms:</span>
                        <strong className="text-graphite">{activeInquiry.incoterms}</strong>
                      </div>
                    )}
                    {activeInquiry.deliveryTimeline && (
                      <div>
                        <span className="text-slate-500 block">Timeline:</span>
                        <strong className="text-graphite">{activeInquiry.deliveryTimeline}</strong>
                      </div>
                    )}
                    {activeInquiry.engineeringRequirements && (
                      <div className="col-span-2">
                        <span className="text-slate-500 block">Engineering Specs:</span>
                        <strong className="text-graphite">{activeInquiry.engineeringRequirements}</strong>
                      </div>
                    )}
                    {activeInquiry.commercialRequirements && (
                      <div className="col-span-2">
                        <span className="text-slate-500 block">Commercial Terms:</span>
                        <strong className="text-graphite">{activeInquiry.commercialRequirements}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Original Request Message */}
              <div className="p-4 rounded-xl border border-line bg-white space-y-2">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone flex items-center justify-between">
                  <span>Original Request Message</span>
                  <span>{formatDate(activeInquiry.createdAt)}</span>
                </div>
                <p className="text-xs text-graphite whitespace-pre-wrap leading-relaxed">
                  {activeInquiry.message}
                </p>
              </div>

              {/* Conversation Thread */}
              <div className="space-y-3 pt-2">
                <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-graphite flex items-center justify-between border-b border-line pb-2">
                  <span>Conversation History ({activeInquiry.messages?.length || 0})</span>
                  <span className="text-stone text-[10px] font-normal">P2P Encrypted Loop</span>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {activeInquiry.messages && activeInquiry.messages.length > 0 ? (
                    activeInquiry.messages.map((msg) => {
                      const isCompany = msg.senderRole === "COMPANY_MEMBER";
                      return (
                        <div
                          key={msg.id}
                          className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                            isCompany
                              ? "bg-sky-50/60 border-sky-200 ml-6"
                              : "bg-slate-50 border-line mr-6"
                          }`}
                        >
                          <div className="flex items-center justify-between font-mono text-[10px]">
                            <span className="font-bold text-graphite flex items-center gap-1.5">
                              {isCompany ? (
                                <span className="px-1.5 py-0.5 rounded bg-royal text-white font-extrabold text-[9px]">
                                  COMPANY
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[9px]">
                                  REQUESTER
                                </span>
                              )}
                              <span>{msg.senderName}</span>
                            </span>
                            <span className="text-stone">{formatDate(msg.createdAt)}</span>
                          </div>
                          <p className="text-xs text-graphite whitespace-pre-wrap leading-relaxed">
                            {msg.body}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-stone font-mono text-[11px] bg-slate-50 rounded-xl">
                      No replies posted yet. Send a response below to initiate negotiation.
                    </div>
                  )}
                </div>
              </div>

              {/* Company Reply Form */}
              <form onSubmit={handleSendReply} className="space-y-3 pt-4 border-t border-line">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-graphite flex items-center justify-between">
                  <label htmlFor="replyText">Reply to {activeInquiry.requesterName}</label>
                  <span className="text-stone">Notifies customer via business email</span>
                </div>

                <textarea
                  id="replyText"
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Provide commercial terms, availability, pricing, or request clarification..."
                  className="w-full p-3 text-xs rounded-xl border border-line bg-slate-50/50 focus:bg-white focus:outline-none focus:border-royal transition"
                  required
                />

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleToggleClose}
                    className="px-3 py-2 rounded-xl border border-line bg-white hover:bg-slate-50 text-stone hover:text-graphite font-mono text-[11px] font-bold transition"
                  >
                    {activeInquiry.status === "CLOSED" ? "REOPEN INQUIRY" : "CLOSE INQUIRY"}
                  </button>

                  <button
                    type="submit"
                    disabled={isSending || !replyText.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-royal text-white font-bold text-xs hover:bg-royal/90 disabled:opacity-50 transition shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSending ? "SENDING..." : "SEND REPLY"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 7. SIMULATED EMAIL NOTIFICATION LOG DRAWER */}
      {showLogDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-end p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-line rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-800" />
                <h3 className="text-base font-bold text-graphite">Commercial Email Notifications</h3>
              </div>
              <button
                onClick={() => setShowLogDrawer(false)}
                className="text-stone hover:text-graphite font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone">
              The platform dispatches real-time email notifications whenever an inquiry or reply is generated.
            </p>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {notificationLogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone font-mono bg-slate-50 rounded-xl">
                  No notifications recorded in this session.
                </div>
              ) : (
                notificationLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-xl border border-line bg-slate-50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="font-bold text-royal">{log.type}</span>
                      <span className="text-stone">{formatDate(log.sentAt)}</span>
                    </div>
                    <div className="font-bold text-graphite">{log.subject}</div>
                    <div className="text-slate-600 font-mono text-[11px]">
                      To: <strong>{log.recipientName}</strong> ({log.recipientEmail})
                    </div>
                    <div className="text-stone italic text-[11px] bg-white p-2 rounded border border-line/60">
                      "{log.preview}"
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
