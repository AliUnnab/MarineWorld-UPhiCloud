import React, { useState, useEffect, useMemo } from "react";
import {
  History,
  ShieldCheck,
  Building2,
  Compass,
  MapPin,
  Package,
  Share2,
  FileText,
  Bot,
  Globe,
  Radio,
  Landmark,
  MessageSquare,
  Users,
  Receipt,
  Search,
  Filter,
  Clock,
  User,
  X,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Info,
  Calendar,
  SlidersHorizontal,
  ArrowUpDown,
  Lock,
  AlertCircle,
} from "lucide-react";
import type {
  AuditEvent,
  AuditModuleType,
  CanonicalAuditActionType,
  CompanyMemberRole,
  StudioNavigationModule,
} from "@/lib/types";
import {
  getCompanyAuditTrail,
  getCompanyAuditTrailSync,
} from "@/lib/services/auditService";
import { getPersistenceMode } from "@/lib/repositories/persistenceMode";
import { getCompanyById } from "@/lib/services/companyService";

interface CompanyStudioAuditViewProps {
  companyId: string;
  memberRole?: CompanyMemberRole | string;
  userEmail?: string;
  onNavigateToModule?: (module: StudioNavigationModule) => void;
}

type ViewMode = "ACTIVITY" | "AUDIT";
type TimeFilterOption = "ALL" | "TODAY" | "7DAYS" | "30DAYS" | "CUSTOM";
type SortOrder = "NEWEST" | "OLDEST";

// Module icon selector
function getModuleIcon(module: AuditModuleType | string, className = "w-4 h-4") {
  switch (module) {
    case "IDENTITY":
      return <Building2 className={className} />;
    case "POSITIONING":
      return <Compass className={className} />;
    case "PRESENCE":
      return <MapPin className={className} />;
    case "OFFERINGS":
      return <Package className={className} />;
    case "KNOWLEDGE":
      return <Share2 className={className} />;
    case "AI":
      return <Bot className={className} />;
    case "DIGITAL_PRESENCE":
      return <Globe className={className} />;
    case "PUBLISH":
      return <Radio className={className} />;
    case "DIGITAL_PROPERTIES":
      return <Landmark className={className} />;
    case "CONNECT_RFQ":
      return <MessageSquare className={className} />;
    case "TEAM_ACCESS":
    case "TEAM":
      return <Users className={className} />;
    case "BILLING":
      return <Receipt className={className} />;
    default:
      return <ShieldCheck className={className} />;
  }
}

// Category & module target mapping
function getModuleCategoryAndTarget(module: AuditModuleType | string): {
  categoryLabel: string;
  targetModule?: StudioNavigationModule;
} {
  switch (module) {
    case "IDENTITY":
      return { categoryLabel: "Identity & Verification", targetModule: "IDENTITY" };
    case "POSITIONING":
      return { categoryLabel: "Positioning & Taxonomy", targetModule: "POSITIONING" };
    case "PRESENCE":
      return { categoryLabel: "Global Presence", targetModule: "PRESENCE" };
    case "OFFERINGS":
      return { categoryLabel: "Offerings & Catalog", targetModule: "OFFERINGS" };
    case "KNOWLEDGE":
      return { categoryLabel: "Knowledge Space", targetModule: "KNOWLEDGE" };
    case "AI":
      return { categoryLabel: "Company AI", targetModule: "AI" };
    case "DIGITAL_PRESENCE":
      return { categoryLabel: "Digital Presence", targetModule: "DIGITAL_PRESENCE" };
    case "PUBLISH":
      return { categoryLabel: "Go-Live & Publish", targetModule: "PUBLISH" };
    case "DIGITAL_PROPERTIES":
      return { categoryLabel: "Digital Properties", targetModule: "PROPERTIES" };
    case "CONNECT_RFQ":
      return { categoryLabel: "Connect & RFQs", targetModule: "CONNECTIONS" };
    case "TEAM_ACCESS":
    case "TEAM":
      return { categoryLabel: "Team & Governance", targetModule: "TEAM" };
    case "BILLING":
      return { categoryLabel: "Billing & Contracts", targetModule: "BILLING" };
    default:
      return { categoryLabel: "Governance & Security", targetModule: "GOVERNANCE" };
  }
}

// Format human business sentence from AuditEvent
function formatHumanActivity(event: AuditEvent): {
  actorName: string;
  actionSentence: string;
  badgeLabel: string;
  entityName: string;
} {
  const actorName = event.actorDisplayName || event.actorUserId || "Authorized Member";
  const actionType = event.actionType as CanonicalAuditActionType | string;
  const entityId = event.entityId || "";
  const entityType = event.entityType || "Item";

  let badgeLabel = actionType.replace(/_/g, " ");
  let actionSentence = "updated company records";
  let entityName = entityId ? `${entityType} (${entityId})` : entityType;

  // Check state metadata for entity display names if available
  if (event.newState && typeof event.newState === "object") {
    if (event.newState.title) entityName = event.newState.title;
    else if (event.newState.name) entityName = event.newState.name;
    else if (event.newState.displayName) entityName = event.newState.displayName;
    else if (event.newState.code) entityName = event.newState.code;
  } else if (event.previousState && typeof event.previousState === "object") {
    if (event.previousState.title) entityName = event.previousState.title;
    else if (event.previousState.name) entityName = event.previousState.name;
  }

  switch (actionType) {
    case "IDENTITY_UPDATED":
      badgeLabel = "Identity Updated";
      actionSentence = "updated verified company identity credentials";
      break;
    case "POSITIONING_UPDATED":
      badgeLabel = "Positioning Updated";
      actionSentence = "updated company positioning and sector city classification";
      break;
    case "FACILITY_CREATED":
      badgeLabel = "Facility Created";
      actionSentence = `added a new physical facility node (${entityName})`;
      break;
    case "FACILITY_UPDATED":
      badgeLabel = "Facility Updated";
      actionSentence = `updated physical facility details for ${entityName}`;
      break;
    case "FACILITY_DELETED":
      badgeLabel = "Facility Removed";
      actionSentence = `removed physical facility node ${entityName}`;
      break;
    case "PRODUCT_CREATED":
    case "SERVICE_CREATED":
    case "OFFERING_CREATED":
      badgeLabel = "Offering Created";
      actionSentence = `created new commercial offering '${entityName}'`;
      break;
    case "PRODUCT_UPDATED":
    case "SERVICE_UPDATED":
    case "OFFERING_UPDATED":
      badgeLabel = "Offering Updated";
      actionSentence = `updated details for commercial offering '${entityName}'`;
      break;
    case "OFFERING_PUBLISHED":
      badgeLabel = "Offering Published";
      actionSentence = `published '${entityName}' to MarineWorld marketplace`;
      break;
    case "OFFERING_ARCHIVED":
      badgeLabel = "Offering Archived";
      actionSentence = `archived commercial offering '${entityName}'`;
      break;
    case "OFFERING_RESTORED":
      badgeLabel = "Offering Restored";
      actionSentence = `restored commercial offering '${entityName}'`;
      break;
    case "PRODUCT_DELETED":
    case "SERVICE_DELETED":
    case "OFFERING_DELETED":
      badgeLabel = "Offering Deleted";
      actionSentence = `deleted commercial offering '${entityName}'`;
      break;
    case "DOCUMENT_CREATED":
      badgeLabel = "Document Added";
      actionSentence = `uploaded document '${entityName}' to Knowledge Space`;
      break;
    case "DOCUMENT_UPDATED":
      badgeLabel = "Document Updated";
      actionSentence = `updated document '${entityName}' in Knowledge Space`;
      break;
    case "DOCUMENT_PUBLISHED":
      badgeLabel = "Document Published";
      actionSentence = `published document '${entityName}'`;
      break;
    case "DOCUMENT_ARCHIVED":
      badgeLabel = "Document Archived";
      actionSentence = `archived document '${entityName}'`;
      break;
    case "DOCUMENT_DELETED":
      badgeLabel = "Document Removed";
      actionSentence = `removed document '${entityName}' from Knowledge Space`;
      break;
    case "DOCUMENT_GROUNDED":
      badgeLabel = "AI Knowledge Grounded";
      actionSentence = `grounded document '${entityName}' for Company AI`;
      break;
    case "DOCUMENT_UNGROUNDED":
      badgeLabel = "AI Grounding Removed";
      actionSentence = `ungrounded document '${entityName}' from Company AI`;
      break;
    case "EXTERNAL_SOURCE_CONNECTED":
      badgeLabel = "Source Connected";
      actionSentence = `connected external data source ${entityName}`;
      break;
    case "EXTERNAL_SOURCE_DISCONNECTED":
      badgeLabel = "Source Disconnected";
      actionSentence = `disconnected external data source ${entityName}`;
      break;
    case "AI_ENABLED":
      badgeLabel = "Company AI Enabled";
      actionSentence = "enabled Company AI Advisor for organization";
      break;
    case "AI_DISABLED":
      badgeLabel = "Company AI Disabled";
      actionSentence = "disabled Company AI Advisor";
      break;
    case "AI_CONFIGURATION_UPDATED":
      badgeLabel = "AI Config Updated";
      actionSentence = "updated Company AI configuration and parameters";
      break;
    case "AI_GROUNDING_UPDATED":
      badgeLabel = "AI Grounding Synced";
      actionSentence = "updated Company AI grounding knowledge base";
      break;
    case "AI_ADVISOR_CONFIGURED":
      badgeLabel = "AI Advisor Configured";
      actionSentence = `configured offering AI advisor for ${entityName}`;
      break;
    case "DIGITAL_PRESENCE_UPDATED":
      badgeLabel = "Digital Presence Updated";
      actionSentence = "updated digital presence and SEO web configuration";
      break;
    case "SEO_INDEXING_UPDATED":
      badgeLabel = "SEO Settings Updated";
      actionSentence = "updated search engine indexing settings";
      break;
    case "DOMAIN_CONNECTED":
      badgeLabel = "Domain Connected";
      actionSentence = `connected custom domain ${entityName}`;
      break;
    case "COMPANY_PUBLISHED":
      badgeLabel = "Company Published";
      actionSentence = "published company profile to MarineWorld ecosystem";
      break;
    case "COMPANY_UNPUBLISHED":
      badgeLabel = "Company Unpublished";
      actionSentence = "unpublished company profile from MarineWorld";
      break;
    case "COMPANY_SUSPENDED":
      badgeLabel = "Company Suspended";
      actionSentence = "suspended public company presence";
      break;
    case "COMPANY_REINSTATED":
      badgeLabel = "Company Reinstated";
      actionSentence = "reinstated public company presence";
      break;
    case "PROPERTY_RESERVED":
      badgeLabel = "Property Reserved";
      actionSentence = `reserved Sector City digital property slot ${entityName}`;
      break;
    case "PROPERTY_RESERVATION_RELEASED":
      badgeLabel = "Property Released";
      actionSentence = `released digital property reservation ${entityName}`;
      break;
    case "PROPERTY_OFFER_REQUESTED":
      badgeLabel = "Property Offer Requested";
      actionSentence = `submitted offer request for digital property ${entityName}`;
      break;
    case "PROPERTY_OFFER_ACCEPTED":
      badgeLabel = "Property Offer Accepted";
      actionSentence = `accepted commercial offer for digital property ${entityName}`;
      break;
    case "PROPERTY_LEASE_ACTIVATED":
      badgeLabel = "Property Activated";
      actionSentence = `activated digital property lease for ${entityName}`;
      break;
    case "PROPERTY_LEASE_PAID":
      badgeLabel = "Property Payment Confirmed";
      actionSentence = `confirmed lease payment for digital property ${entityName}`;
      break;
    case "INQUIRY_CREATED":
    case "INQUIRY_RECEIVED":
      badgeLabel = "Commercial Inquiry Received";
      actionSentence = `received commercial inquiry / RFQ for ${entityName}`;
      break;
    case "OFFICIAL_OFFER_REQUESTED":
      badgeLabel = "Official Offer Requested";
      actionSentence = `requested official commercial offer for ${entityName}`;
      break;
    case "INQUIRY_MESSAGE_SENT":
      badgeLabel = "Inquiry Response Sent";
      actionSentence = `sent response message for commercial inquiry ${entityName}`;
      break;
    case "INQUIRY_STATUS_CHANGED":
      badgeLabel = "Inquiry Status Changed";
      actionSentence = `updated commercial inquiry status for ${entityName}`;
      break;
    case "MEMBER_INVITED":
      badgeLabel = "Team Member Invited";
      actionSentence = `invited ${event.metadata?.invitedEmail || "new member"} to the team`;
      break;
    case "MEMBER_ROLE_CHANGED":
      badgeLabel = "Member Access Changed";
      actionSentence = `updated team access role for ${event.metadata?.targetUser || entityName}`;
      break;
    case "MEMBER_SUSPENDED":
      badgeLabel = "Member Access Suspended";
      actionSentence = `suspended team access for ${entityName}`;
      break;
    case "MEMBER_REMOVED":
    case "MEMBER_REVOKED":
      badgeLabel = "Member Removed";
      actionSentence = `removed team member ${entityName} from organization`;
      break;
    case "ROLE_GRANTED":
      badgeLabel = "Role Granted";
      actionSentence = `granted institutional role to ${entityName}`;
      break;
    case "BILLING_METHOD_UPDATED":
      badgeLabel = "Payment Method Updated";
      actionSentence = "updated commercial payment method details";
      break;
    case "BILLING_PAYMENT_CONFIRMED":
      badgeLabel = "Payment Confirmed";
      actionSentence = "confirmed subscription / agreement payment";
      break;
    case "BILLING_INVOICE_GENERATED":
      badgeLabel = "Invoice Generated";
      actionSentence = `generated commercial invoice ${entityName}`;
      break;
    case "BILLING_SUBSCRIPTION_RENEWED":
      badgeLabel = "Subscription Renewed";
      actionSentence = "renewed company software subscription";
      break;
    case "TRUST_CHALLENGE_ISSUED":
      badgeLabel = "Trust Challenge Issued";
      actionSentence = "issued security verification challenge";
      break;
    case "TRUST_CHALLENGE_SOLVED":
      badgeLabel = "Trust Challenge Completed";
      actionSentence = "completed security verification challenge";
      break;
    default:
      if (actionType.endsWith("_UPDATED")) {
        const noun = actionType.replace("_UPDATED", "").replace(/_/g, " ").toLowerCase();
        badgeLabel = `${noun.toUpperCase()} UPDATED`;
        actionSentence = `updated ${noun} details`;
      } else if (actionType.endsWith("_CREATED")) {
        const noun = actionType.replace("_CREATED", "").replace(/_/g, " ").toLowerCase();
        badgeLabel = `${noun.toUpperCase()} CREATED`;
        actionSentence = `created new ${noun}`;
      } else {
        badgeLabel = actionType.replace(/_/g, " ");
        actionSentence = `performed ${actionType.replace(/_/g, " ").toLowerCase()}`;
      }
      break;
  }

  return { actorName, actionSentence, badgeLabel, entityName };
}

// Relative time formatting
function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 45) return "just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} h ago`;

    const isToday = date.toDateString() === now.toDateString();
    const hoursStr = date.getHours().toString().padStart(2, "0");
    const minsStr = date.getMinutes().toString().padStart(2, "0");

    if (isToday) return `Today · ${hoursStr}:${minsStr}`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday · ${hoursStr}:${minsStr}`;
    }

    if (diffDays < 7) return `${diffDays} days ago`;

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} · ${hoursStr}:${minsStr}`;
  } catch {
    return isoString;
  }
}

// Full date formatting for event drawer
function formatFullDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const mins = date.getMinutes().toString().padStart(2, "0");
    const secs = date.getSeconds().toString().padStart(2, "0");

    return `${day} ${month} ${year} at ${hours}:${mins}:${secs} UTC`;
  } catch {
    return isoString;
  }
}

// Avatar initials calculation
function getInitials(name: string): string {
  if (!name) return "AM";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Color palette generator for user avatars
function getAvatarBgColor(userId: string): string {
  const bgClasses = [
    "bg-sky-100 text-sky-800 border-sky-300",
    "bg-indigo-100 text-indigo-800 border-indigo-300",
    "bg-emerald-100 text-emerald-800 border-emerald-300",
    "bg-amber-100 text-amber-800 border-amber-300",
    "bg-teal-100 text-teal-800 border-teal-300",
    "bg-purple-100 text-purple-800 border-purple-300",
    "bg-blue-100 text-blue-800 border-blue-300",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % bgClasses.length;
  return bgClasses[index];
}

export const CompanyStudioAuditView: React.FC<CompanyStudioAuditViewProps> = ({
  companyId,
  memberRole = "MEMBER",
  userEmail,
  onNavigateToModule,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("ACTIVITY");
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters & State
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [timeFilter, setTimeFilter] = useState<TimeFilterOption>("ALL");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [actorFilter, setActorFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("NEWEST");
  const [visibleCount, setVisibleCount] = useState<number>(50);

  // Drawer modal selection
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  // Persistence check
  const isFirestoreActive = getPersistenceMode() === "FIRESTORE";

  // Resolve company entity for name
  const company = useMemo(() => getCompanyById(companyId), [companyId]);
  const companyDisplayName = company?.displayName || companyId;

  // Fetch audit events on mount and on refresh
  useEffect(() => {
    let isMounted = true;

    async function loadTrail() {
      setLoading(true);
      setLoadError(null);
      try {
        const list = await getCompanyAuditTrail(companyId);
        if (isMounted) {
          setEvents(list);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setEvents([]);
          setLoading(false);
          setLoadError("Activity history is temporarily unavailable.");
        }
      }
    }

    loadTrail();

    // Periodic sync poll for live activity updates from canonical Firestore ledger
    const interval = setInterval(() => {
      async function pollLatest() {
        try {
          const latest = await getCompanyAuditTrail(companyId);
          if (isMounted && latest) {
            setEvents((prev) => {
              if (latest.length !== prev.length || latest[0]?.eventId !== prev[0]?.eventId) {
                return [...latest];
              }
              return prev;
            });
            setLoadError(null);
          }
        } catch {
          // ignore background poll error
        }
      }
      pollLatest();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [companyId]);

  // Extract unique actors for actor filter dropdown
  const uniqueActors = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email?: string }>();
    events.forEach((ev) => {
      if (ev.actorUserId && !map.has(ev.actorUserId)) {
        map.set(ev.actorUserId, {
          id: ev.actorUserId,
          name: ev.actorDisplayName || ev.actorUserId,
          email: ev.actorBusinessEmail,
        });
      }
    });
    return Array.from(map.values());
  }, [events]);

  // Compute top metrics derived strictly from canonical ledger
  const metrics = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const weekAgoMs = now.getTime() - 7 * 86400 * 1000;

    let todayCount = 0;
    let weekCount = 0;

    events.forEach((ev) => {
      try {
        const dt = new Date(ev.timestamp);
        if (dt.toDateString() === todayStr) todayCount++;
        if (dt.getTime() >= weekAgoMs) weekCount++;
      } catch {
        // ignore date parse failure
      }
    });

    return {
      todayCount,
      weekCount,
      totalCount: events.length,
    };
  }, [events]);

  // Filtered and sorted event list
  const filteredEvents = useMemo(() => {
    let result = [...events];

    // Module Filter
    if (selectedModule !== "ALL") {
      result = result.filter(
        (ev) =>
          ev.module === selectedModule ||
          (selectedModule === "PROPERTIES" && ev.module === "DIGITAL_PROPERTIES") ||
          (selectedModule === "CONNECTIONS" && ev.module === "CONNECT_RFQ") ||
          (selectedModule === "TEAM" && ev.module === "TEAM_ACCESS")
      );
    }

    // Time Filter
    if (timeFilter !== "ALL") {
      const now = new Date();
      if (timeFilter === "TODAY") {
        const todayStr = now.toDateString();
        result = result.filter((ev) => {
          try {
            return new Date(ev.timestamp).toDateString() === todayStr;
          } catch {
            return false;
          }
        });
      } else if (timeFilter === "7DAYS") {
        const limitMs = now.getTime() - 7 * 86400 * 1000;
        result = result.filter((ev) => {
          try {
            return new Date(ev.timestamp).getTime() >= limitMs;
          } catch {
            return false;
          }
        });
      } else if (timeFilter === "30DAYS") {
        const limitMs = now.getTime() - 30 * 86400 * 1000;
        result = result.filter((ev) => {
          try {
            return new Date(ev.timestamp).getTime() >= limitMs;
          } catch {
            return false;
          }
        });
      } else if (timeFilter === "CUSTOM") {
        if (customStartDate) {
          const startMs = new Date(customStartDate).getTime();
          result = result.filter((ev) => {
            try {
              return new Date(ev.timestamp).getTime() >= startMs;
            } catch {
              return false;
            }
          });
        }
        if (customEndDate) {
          const endMs = new Date(customEndDate).getTime() + 86400 * 1000;
          result = result.filter((ev) => {
            try {
              return new Date(ev.timestamp).getTime() <= endMs;
            } catch {
              return false;
            }
          });
        }
      }
    }

    // Actor Filter
    if (actorFilter !== "ALL") {
      result = result.filter((ev) => ev.actorUserId === actorFilter);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((ev) => {
        const formatted = formatHumanActivity(ev);
        return (
          formatted.actorName.toLowerCase().includes(q) ||
          formatted.actionSentence.toLowerCase().includes(q) ||
          formatted.badgeLabel.toLowerCase().includes(q) ||
          formatted.entityName.toLowerCase().includes(q) ||
          ev.eventId.toLowerCase().includes(q) ||
          ev.entityId.toLowerCase().includes(q) ||
          (ev.actorBusinessEmail && ev.actorBusinessEmail.toLowerCase().includes(q))
        );
      });
    }

    // Sorting
    result.sort((a, b) => {
      const tA = new Date(a.timestamp).getTime();
      const tB = new Date(b.timestamp).getTime();
      return sortOrder === "NEWEST" ? tB - tA : tA - tB;
    });

    return result;
  }, [events, selectedModule, timeFilter, customStartDate, customEndDate, actorFilter, searchQuery, sortOrder]);

  const visibleEvents = useMemo(() => {
    return filteredEvents.slice(0, visibleCount);
  }, [filteredEvents, visibleCount]);

  // Helper to clear all active filters
  const resetFilters = () => {
    setSelectedModule("ALL");
    setTimeFilter("ALL");
    setCustomStartDate("");
    setCustomEndDate("");
    setActorFilter("ALL");
    setSearchQuery("");
    setSortOrder("NEWEST");
  };

  const hasActiveFilters =
    selectedModule !== "ALL" ||
    timeFilter !== "ALL" ||
    customStartDate !== "" ||
    customEndDate !== "" ||
    actorFilter !== "ALL" ||
    searchQuery.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* 1. Header & Institutional Title Bar */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-graphite tracking-tight">AUDIT & ACTIVITY</h2>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-mist border border-line text-slate">
              {companyDisplayName}
            </span>
          </div>
          <p className="text-xs text-stone mt-1">
            Company activity & governance history
          </p>
        </div>

        {/* Audit Trust Indicator Badge */}
        <div className="flex items-center gap-2">
          {!loadError ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Activity history connected</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Activity history temporarily unavailable</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Top Summary Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-line rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone">
              TODAY
            </div>
            <div className="text-2xl font-extrabold text-graphite mt-0.5">
              {metrics.todayCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-line rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone">
              THIS WEEK
            </div>
            <div className="text-2xl font-extrabold text-graphite mt-0.5">
              {metrics.weekCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-line rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone">
              TOTAL RECORDS
            </div>
            <div className="text-2xl font-extrabold text-graphite mt-0.5">
              {metrics.totalCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Primary Top Navigation Switcher (ACTIVITY vs AUDIT) */}
      <div className="bg-white border border-line rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2 bg-mist p-1 rounded-xl border border-line">
            <button
              onClick={() => setViewMode("ACTIVITY")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                viewMode === "ACTIVITY"
                  ? "bg-white text-royal shadow-xs border border-line"
                  : "text-stone hover:text-graphite"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>ACTIVITY</span>
            </button>
            <button
              onClick={() => setViewMode("AUDIT")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                viewMode === "AUDIT"
                  ? "bg-white text-royal shadow-xs border border-line"
                  : "text-stone hover:text-graphite"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>AUDIT</span>
            </button>
          </div>

          <div className="text-xs text-stone">
            Showing <span className="font-semibold text-graphite">{filteredEvents.length}</span> recorded events
          </div>
        </div>

        {/* 4. Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-stone" />
            <input
              type="text"
              placeholder="Search by person, action, offering or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-mist/50 border border-line rounded-xl focus:outline-none focus:ring-1 focus:ring-royal focus:bg-white transition-all text-graphite"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-stone hover:text-graphite"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Module Selector */}
          <div>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-mist/50 border border-line rounded-xl focus:outline-none focus:ring-1 focus:ring-royal text-graphite"
            >
              <option value="ALL">All Modules</option>
              <option value="IDENTITY">Identity</option>
              <option value="POSITIONING">Positioning</option>
              <option value="PRESENCE">Presence</option>
              <option value="OFFERINGS">Offerings</option>
              <option value="KNOWLEDGE">Knowledge</option>
              <option value="AI">AI</option>
              <option value="DIGITAL_PRESENCE">Digital Presence</option>
              <option value="PUBLISH">Publish</option>
              <option value="PROPERTIES">Digital Properties</option>
              <option value="CONNECTIONS">Connect / RFQs</option>
              <option value="TEAM">Team & Access</option>
              <option value="BILLING">Billing</option>
            </select>
          </div>

          {/* Time Filter */}
          <div>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilterOption)}
              className="w-full px-3 py-2 text-xs bg-mist/50 border border-line rounded-xl focus:outline-none focus:ring-1 focus:ring-royal text-graphite"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="7DAYS">Last 7 Days</option>
              <option value="30DAYS">Last 30 Days</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Range Pickers */}
          {timeFilter === "CUSTOM" && (
            <div className="lg:col-span-2 flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-1/2 px-2.5 py-1.5 text-xs bg-white border border-line rounded-xl text-graphite focus:outline-none focus:ring-1 focus:ring-royal"
                title="Start Date"
              />
              <span className="text-xs text-stone font-medium">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-1/2 px-2.5 py-1.5 text-xs bg-white border border-line rounded-xl text-graphite focus:outline-none focus:ring-1 focus:ring-royal"
                title="End Date"
              />
            </div>
          )}

          {/* Actor Selector */}
          <div>
            <select
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-mist/50 border border-line rounded-xl focus:outline-none focus:ring-1 focus:ring-royal text-graphite"
            >
              <option value="ALL">All People</option>
              {uniqueActors.map((act) => (
                <option key={act.id} value={act.id}>
                  {act.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Toolbar Controls (Reset & Sort) */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-line/60 text-stone">
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-royal font-medium hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSortOrder(sortOrder === "NEWEST" ? "OLDEST" : "NEWEST")}
              className="flex items-center gap-1.5 text-stone hover:text-graphite font-medium transition-colors"
            >
              <ArrowUpDown className="w-3 h-3" />
              <span>{sortOrder === "NEWEST" ? "Newest First" : "Oldest First"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Main Content Section (ACTIVITY VIEW vs AUDIT VIEW) */}
      {loading ? (
        <div className="bg-white border border-line rounded-2xl p-12 text-center space-y-3 shadow-sm">
          <RefreshCw className="w-6 h-6 animate-spin text-royal mx-auto" />
          <p className="text-xs text-stone font-medium">Loading canonical governance records...</p>
        </div>
      ) : loadError ? (
        <div className="bg-white border border-amber-200 rounded-2xl p-8 text-center space-y-3 shadow-sm bg-amber-50/30">
          <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
          <h3 className="text-sm font-bold text-graphite">Activity Temporarily Unavailable</h3>
          <p className="text-xs text-stone max-w-md mx-auto">{loadError}</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-12 text-center space-y-3 shadow-sm">
          <Info className="w-8 h-8 text-stone/60 mx-auto" />
          <h3 className="text-sm font-bold text-graphite">
            {hasActiveFilters
              ? "No activity matches your filters."
              : viewMode === "ACTIVITY"
              ? "No company activity yet."
              : "No governance events have been recorded yet."}
          </h3>
          {!hasActiveFilters && viewMode === "ACTIVITY" && (
            <p className="text-xs text-stone max-w-sm mx-auto">
              Important company actions and governance events will appear here.
            </p>
          )}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-xs font-semibold bg-royal text-white rounded-xl shadow-xs hover:bg-royal/90 transition-all"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : viewMode === "ACTIVITY" ? (
        /* =========================================================
           ACTIVITY VIEW (Default View) — Natural Business Sentences
           ========================================================= */
        <div className="space-y-3">
          {visibleEvents.map((event) => {
            const formatted = formatHumanActivity(event);
            const relativeTime = formatRelativeTime(event.timestamp);
            const { categoryLabel } = getModuleCategoryAndTarget(event.module);
            const avatarBg = getAvatarBgColor(event.actorUserId);

            return (
              <div
                key={event.eventId}
                onClick={() => setSelectedEvent(event)}
                className="bg-white border border-line rounded-xl p-4 shadow-2xs hover:shadow-sm hover:border-royal/30 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  {/* Actor Avatar */}
                  <div
                    className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${avatarBg}`}
                  >
                    {getInitials(formatted.actorName)}
                  </div>

                  {/* Operational Activity Sentence */}
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-graphite leading-relaxed group-hover:text-royal transition-colors">
                      <span className="font-bold text-slate">{formatted.actorName}</span>{" "}
                      <span className="text-graphite">{formatted.actionSentence}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone">
                      <span className="inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-md bg-mist border border-line text-slate">
                        {getModuleIcon(event.module, "w-3 h-3 text-stone")}
                        <span>{categoryLabel}</span>
                      </span>

                      {event.actorRole && (
                        <span className="text-stone">· {event.actorRole}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Relative Time & Action Arrow */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-line/50">
                  <span className="text-xs text-stone font-medium whitespace-nowrap">
                    {relativeTime}
                  </span>
                  <ChevronRight className="w-4 h-4 text-stone/50 group-hover:text-royal group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* =========================================================
           AUDIT VIEW (Formal Governance Record View)
           ========================================================= */
        <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden divide-y divide-line">
          {visibleEvents.map((event) => {
            const formatted = formatHumanActivity(event);
            const relativeTime = formatRelativeTime(event.timestamp);
            const { categoryLabel } = getModuleCategoryAndTarget(event.module);

            return (
              <div
                key={event.eventId}
                onClick={() => setSelectedEvent(event)}
                className="p-4 hover:bg-mist/40 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                {/* Left: Action Title & Category */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-slate/10 text-graphite text-[11px] font-extrabold tracking-wider uppercase border border-line">
                      {formatted.badgeLabel}
                    </span>
                    <span className="text-xs font-semibold text-stone">
                      {categoryLabel}
                    </span>
                  </div>

                  <div className="text-xs font-medium text-graphite truncate">
                    Target: <span className="font-semibold text-slate">{formatted.entityName}</span>
                  </div>
                </div>

                {/* Center: Actor & Role */}
                <div className="text-xs text-stone space-y-0.5 shrink-0 md:w-56">
                  <div className="font-semibold text-graphite flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-stone" />
                    <span>{formatted.actorName}</span>
                  </div>
                  <div className="text-[11px] text-stone">
                    {event.actorRole || "MEMBER"} {event.actorBusinessEmail ? `(${event.actorBusinessEmail})` : ""}
                  </div>
                </div>

                {/* Right: Timestamp & Details Arrow */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                  <div className="text-xs text-stone font-medium text-right">
                    <div>{relativeTime}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone/50 group-hover:text-royal group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Pagination Load More Button */}
      {visibleEvents.length < filteredEvents.length && (
        <div className="text-center pt-2">
          <button
            onClick={() => setVisibleCount((prev) => prev + 50)}
            className="px-6 py-2.5 text-xs font-bold bg-white border border-line text-graphite rounded-xl shadow-2xs hover:bg-mist hover:border-royal/30 transition-all inline-flex items-center gap-2"
          >
            <span>Load More Activity Records</span>
            <span className="text-stone">
              ({filteredEvents.length - visibleEvents.length} remaining)
            </span>
          </button>
        </div>
      )}

      {/* =========================================================
         7. EVENT DETAIL DRAWER / MODAL
         ========================================================= */}
      {selectedEvent && (
        <EventDetailDrawer
          event={selectedEvent}
          companyName={companyDisplayName}
          memberRole={memberRole}
          onClose={() => setSelectedEvent(null)}
          onNavigateToModule={onNavigateToModule}
        />
      )}
    </div>
  );
};

/* =========================================================
   EVENT DETAIL DRAWER COMPONENT
   ========================================================= */
interface EventDetailDrawerProps {
  event: AuditEvent;
  companyName: string;
  memberRole?: string;
  onClose: () => void;
  onNavigateToModule?: (module: StudioNavigationModule) => void;
}

const EventDetailDrawer: React.FC<EventDetailDrawerProps> = ({
  event,
  companyName,
  memberRole = "MEMBER",
  onClose,
  onNavigateToModule,
}) => {
  const formatted = formatHumanActivity(event);
  const { categoryLabel, targetModule } = getModuleCategoryAndTarget(event.module);
  const fullTimestamp = formatFullDate(event.timestamp);
  const relativeTime = formatRelativeTime(event.timestamp);

  const isPrivilegedRole =
    memberRole === "OWNER" || memberRole === "ADMIN" || memberRole === "COMMERCIAL";

  // Compute state changes / diffs
  const diffItems = useMemo(() => {
    const prev = event.previousState || {};
    const next = event.newState || {};

    const allKeys = Array.from(new Set([...Object.keys(prev), ...Object.keys(next)]));
    const ignoredKeys = [
      "_id",
      "updatedAt",
      "createdAt",
      "companyId",
      "businessId",
      "password",
      "token",
      "secret",
      "apiKey",
      "privateKey",
      "credential",
      "stripe",
      "stripeSecretKey",
      "paymentCredentials",
      "prompt",
      "rawPrompt",
      "privatePrompt",
      "confidential",
      "cvv",
      "cardNumber",
    ];

    const changes: Array<{ field: string; previous: string; current: string }> = [];

    allKeys.forEach((key) => {
      if (ignoredKeys.includes(key)) return;

      let pVal = prev[key];
      let nVal = next[key];

      // Role-aware masking for financial or sensitive key names if not privileged
      const isSensitiveKey =
        /stripe|payment|amount|card|secret|token|credential|price/i.test(key);
      if (isSensitiveKey && !isPrivilegedRole) {
        if (pVal !== undefined) pVal = "•••••••• (Protected)";
        if (nVal !== undefined) nVal = "•••••••• (Protected)";
      }

      if (JSON.stringify(pVal) !== JSON.stringify(nVal)) {
        // Format human key label
        const formattedField = key
          .replace(/([A-Z])/g, " $1")
          .replace(/_/g, " ")
          .replace(/^./, (str) => str.toUpperCase());

        changes.push({
          field: formattedField,
          previous:
            pVal !== undefined
              ? typeof pVal === "object"
                ? JSON.stringify(pVal)
                : String(pVal)
              : "—",
          current:
            nVal !== undefined
              ? typeof nVal === "object"
                ? JSON.stringify(nVal)
                : String(nVal)
              : "—",
        });
      }
    });

    return changes;
  }, [event, isPrivilegedRole]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-graphite/40 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-line overflow-y-auto">
        {/* Drawer Header */}
        <div className="p-6 border-b border-line flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-royal">
              EVENT DETAIL
            </div>
            <h3 className="text-lg font-bold text-graphite tracking-tight">
              {formatted.badgeLabel}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone hover:text-graphite hover:bg-mist transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-6 space-y-6 flex-1 text-xs">
          {/* Section: WHO */}
          <div className="bg-mist/40 border border-line rounded-xl p-4 space-y-2">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-royal" />
              <span>WHO</span>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-bold text-graphite">
                {formatted.actorName}
              </div>
              <div className="text-stone flex items-center gap-2">
                <span className="font-semibold text-slate">Role: {event.actorRole || "MEMBER"}</span>
                {event.actorBusinessEmail && (
                  <span>· {event.actorBusinessEmail}</span>
                )}
              </div>
            </div>
          </div>

          {/* Section: WHEN */}
          <div className="bg-mist/40 border border-line rounded-xl p-4 space-y-2">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-royal" />
              <span>WHEN</span>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-graphite">
                {fullTimestamp}
              </div>
              <div className="text-stone">{relativeTime}</div>
            </div>
          </div>

          {/* Section: ENTITY */}
          <div className="bg-mist/40 border border-line rounded-xl p-4 space-y-2">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone flex items-center gap-1.5">
              {getModuleIcon(event.module, "w-3.5 h-3.5 text-royal")}
              <span>ENTITY</span>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-graphite text-xs">
                {categoryLabel}
              </div>
              <div className="text-stone">
                Target: <span className="font-semibold text-slate">{formatted.entityName}</span>
              </div>
              <div className="text-stone">
                Company: <span className="font-semibold text-slate">{companyName}</span>
              </div>
            </div>
          </div>

          {/* Section: CHANGE / BEFORE & AFTER DIFF */}
          <div className="space-y-2">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-royal" />
              <span>CHANGE RECORD</span>
            </div>

            {diffItems.length > 0 ? (
              <div className="space-y-3">
                {diffItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="border border-line rounded-xl overflow-hidden bg-white shadow-2xs"
                  >
                    <div className="bg-mist/60 px-3 py-1.5 font-bold text-graphite border-b border-line text-[11px]">
                      {item.field}
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-line text-[11px]">
                      <div className="p-3 bg-amber-50/20 space-y-1">
                        <div className="text-[10px] uppercase font-bold text-amber-800">
                          Previous
                        </div>
                        <div className="font-medium text-slate break-all">
                          {item.previous}
                        </div>
                      </div>
                      <div className="p-3 bg-emerald-50/20 space-y-1">
                        <div className="text-[10px] uppercase font-bold text-emerald-800">
                          New
                        </div>
                        <div className="text-emerald-950 font-semibold break-all">
                          {item.current}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-mist/30 border border-line rounded-xl text-stone text-xs">
                {formatted.actionSentence}.
              </div>
            )}
          </div>

          {/* Section: AUTHORIZATION */}
          <div className="bg-mist/40 border border-line rounded-xl p-4 space-y-1.5">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-royal" />
              <span>AUTHORIZATION</span>
            </div>
            <div className="text-xs text-graphite font-medium">
              {event.authorizationContext?.details || "Authorized company action"}
            </div>
            <div className="text-[11px] text-stone">
              Authority Source: {event.source || "STUDIO"}
            </div>
          </div>

          {/* Section: REFERENCE & NAVIGATION */}
          <div className="border-t border-line pt-4 space-y-3">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone">
              REFERENCE DETAILS
            </div>

            <div className="space-y-1 text-[11px] text-stone bg-mist/30 p-3 rounded-xl border border-line">
              <div>Event Reference: <span className="text-graphite font-semibold">{event.eventId}</span></div>
              {event.correlationId && (
                <div>Correlation Ref: <span className="text-graphite">{event.correlationId}</span></div>
              )}
            </div>

            {/* Entity Navigation Button */}
            {targetModule && onNavigateToModule && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToModule(targetModule);
                }}
                className="w-full py-2.5 px-4 bg-royal text-white rounded-xl font-semibold text-xs shadow-xs hover:bg-royal/90 transition-all flex items-center justify-center gap-2"
              >
                <span>Open {categoryLabel}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
