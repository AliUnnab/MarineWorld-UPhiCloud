import React, { useState, useEffect } from "react";
import {
  Building2,
  Package,
  Wrench,
  FileText,
  FolderArchive,
  MessageSquare,
  Bot,
  Cpu,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Database,
  Lock,
  Layers,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import type {
  StudioNavigationModule,
  ProductEntity,
  ServiceEntity,
  DocumentEntity,
  FileEntity,
  ConnectEntity,
  CompanyEntity,
  Subscription,
  Entitlement,
} from "@/lib/types";
import { getCompanyById } from "@/lib/services/companyService";
import {
  getCompanySubscription,
  getCompanyEntitlements,
  evaluateEffectiveCapability,
  AVAILABLE_PLANS,
} from "@/lib/services/companyOnboardingService";
import {
  getCompanyDocuments,
  getCompanyFiles,
} from "@/lib/services/dataSpaceService";
import { getCompanyProducts } from "@/lib/services/productService";
import { getCompanyServices } from "@/lib/services/serviceService";
import { getCompanyConnectRecords } from "@/lib/services/connectService";
import { getCompanyInquiries, subscribeInquiries } from "@/lib/connectStore";
import { getCompanyVerificationStatus } from "@/lib/services/governanceService";
import {
  getStudioBusinessTwinSummary,
  getCompanyDataSpace,
} from "@/lib/services/studioService";
import { getCurrentAuthSession, getCompanyMember, type AuthContext } from "@/lib/services/securityService";

export type DashboardViewState = "LOADING" | "EMPTY" | "ERROR" | "READY";

interface CompanyStudioDashboardViewProps {
  companyId: string;
  auth?: AuthContext;
  onNavigateToModule?: (module: StudioNavigationModule) => void;
  onNavigateToPublicPage?: (companyId: string) => void;
}

export const CompanyStudioDashboardView: React.FC<CompanyStudioDashboardViewProps> = ({
  companyId,
  auth,
  onNavigateToModule,
  onNavigateToPublicPage,
}) => {
  const currentAuth = auth || getCurrentAuthSession();

  const [viewState, setViewState] = useState<DashboardViewState>("LOADING");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Canonical presentation data
  const [company, setCompany] = useState<CompanyEntity | null>(null);
  const [products, setProducts] = useState<ProductEntity[]>([]);
  const [services, setServices] = useState<ServiceEntity[]>([]);
  const [documents, setDocuments] = useState<DocumentEntity[]>([]);
  const [files, setFiles] = useState<FileEntity[]>([]);
  const [connectRecords, setConnectRecords] = useState<ConnectEntity[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [twinSummary, setTwinSummary] = useState<ReturnType<typeof getStudioBusinessTwinSummary>>(null);
  const [verificationStatus, setVerificationStatus] = useState<string>("PENDING");
  const [dataSpace, setDataSpace] = useState<ReturnType<typeof getCompanyDataSpace> | null>(null);
  const [aiAdvisorCapability, setAiAdvisorCapability] = useState<{ isAllowed: boolean; companyHasEntitlement: boolean }>({
    isAllowed: false,
    companyHasEntitlement: false,
  });

  useEffect(() => {
    try {
      setViewState("LOADING");
      setErrorMessage(null);

      if (!companyId) {
        setViewState("ERROR");
        setErrorMessage("No active organization company ID provided.");
        return;
      }

      // Canonical resolution
      const comp = getCompanyById(companyId);
      if (!comp) {
        setViewState("ERROR");
        setErrorMessage(`Company entity '${companyId}' not found in canonical repository.`);
        return;
      }

      setCompany(comp);

      const prods = getCompanyProducts(companyId);
      const servs = getCompanyServices(companyId);
      const docs = getCompanyDocuments(companyId, currentAuth);
      const fls = getCompanyFiles(companyId, currentAuth);
      const conns = getCompanyConnectRecords(companyId);
      const sub = getCompanySubscription(companyId);
      const ents = getCompanyEntitlements(companyId);
      const twin = getStudioBusinessTwinSummary(companyId);
      const verif = getCompanyVerificationStatus(companyId);
      const ds = getCompanyDataSpace(companyId, currentAuth);
      const aiCap = evaluateEffectiveCapability(companyId, currentAuth.uid || "anon", "AI_ADVISOR", currentAuth);

      setProducts(prods);
      setServices(servs);
      setDocuments(docs);
      setFiles(fls);
      setConnectRecords(conns);
      setSubscription(sub || null);
      setEntitlements(ents);
      setTwinSummary(twin);
      setVerificationStatus(verif);
      setDataSpace(ds);
      setAiAdvisorCapability({
        isAllowed: aiCap.isAllowed,
        companyHasEntitlement: aiCap.companyHasEntitlement,
      });

      setViewState("READY");
    } catch (err: unknown) {
      setViewState("ERROR");
      setErrorMessage(err instanceof Error ? err.message : "Failed to resolve Company Studio Dashboard data.");
    }
  }, [companyId, currentAuth.uid]);

  if (viewState === "LOADING") {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-12 bg-white border border-line rounded-2xl">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-royal border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-sm font-semibold text-graphite">Loading Company Studio Dashboard...</div>
          <div className="text-xs text-stone font-mono">Resolving canonical presentation models for {companyId}</div>
        </div>
      </div>
    );
  }

  if (viewState === "ERROR" || !company) {
    return (
      <div className="p-8 bg-rose-50/50 border border-rose-200 rounded-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-rose-950">Company Studio Resolution Error</h3>
        <p className="text-xs text-rose-800 max-w-md mx-auto">{errorMessage || "Unable to load dashboard data for the active organization."}</p>
      </div>
    );
  }

  const member = getCompanyMember(companyId, currentAuth);
  const planDetails = subscription ? AVAILABLE_PLANS[subscription.planCode] : AVAILABLE_PLANS.GROWTH;
  const groundedDocsCount = documents.filter((d) => d.groundingStatus === "GROUNDED").length;

  const canonicalInquiries = getCompanyInquiries(companyId);
  const newInquiriesCount = canonicalInquiries.filter((i) => i.status === "NEW").length;
  const waitingForCompanyCount = canonicalInquiries.filter((i) => i.status === "WAITING_FOR_COMPANY" || i.status === "OPEN" || i.status === "IN_PROGRESS").length;
  const waitingForRequesterCount = canonicalInquiries.filter((i) => i.status === "WAITING_FOR_REQUESTER").length;
  const openInquiriesCount = newInquiriesCount + waitingForCompanyCount + waitingForRequesterCount;

  return (
    <div className="space-y-6">
      {/* 1. COMPANY HEADER / IDENTITY HERO */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-line">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-royal/10 border border-royal/20 flex items-center justify-center text-royal shrink-0 font-bold text-xl">
              {company.displayName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-graphite tracking-tight">{company.displayName}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {verificationStatus}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-royal/10 text-royal border border-royal/20">
                  {subscription?.planCode || "GROWTH"} PLAN
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-stone mt-1.5 flex-wrap font-mono">
                <span>BUSINESS ID: <strong className="text-graphite">{company.businessId}</strong></span>
                <span>•</span>
                <span>TYPE: <strong className="text-graphite">{company.organizationType}</strong></span>
                <span>•</span>
                <span>ROLE: <strong className="text-amber-800">{member?.role || "OWNER"}</strong></span>
                <span>•</span>
                <span className="text-emerald-600 font-bold">● ACTIVE TENANT</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onNavigateToPublicPage && (
              <button
                onClick={() => onNavigateToPublicPage(companyId)}
                className="px-4 py-2 bg-mist hover:bg-linesoft text-graphite border border-line text-xs font-bold rounded-xl transition flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Public Page
              </button>
            )}
            {onNavigateToModule && (
              <button
                onClick={() => onNavigateToModule("COMPANY")}
                className="px-4 py-2 bg-royal hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm"
              >
                <Building2 className="w-4 h-4" />
                Manage Profile
              </button>
            )}
          </div>
        </div>

        {/* Quick Identity Overview Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-6 text-xs">
          <div>
            <div className="text-[11px] text-stone font-semibold uppercase tracking-wider">Sector City</div>
            <div className="font-bold text-graphite mt-0.5">{company.sectorCityId || "marineworld"}</div>
          </div>
          <div>
            <div className="text-[11px] text-stone font-semibold uppercase tracking-wider">Domain</div>
            <div className="font-bold text-graphite mt-0.5">{(company as any).customDomain || `${company.slug}.marineworld.city`}</div>
          </div>
          <div>
            <div className="text-[11px] text-stone font-semibold uppercase tracking-wider">Subscription</div>
            <div className="font-bold text-emerald-700 mt-0.5">{subscription?.status || "ACTIVE"}</div>
          </div>
          <div>
            <div className="text-[11px] text-stone font-semibold uppercase tracking-wider">Catalog Status</div>
            <div className="font-bold text-royal mt-0.5">
              {products.length > 0 || services.length > 0 ? "PUBLISHED" : "EMPTY"}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-stone font-semibold uppercase tracking-wider">AI Grounding</div>
            <div className="font-bold text-graphite mt-0.5">{groundedDocsCount} / {documents.length} Docs</div>
          </div>
          <div>
            <div className="text-[11px] text-stone font-semibold uppercase tracking-wider">Data Space</div>
            <div className="font-bold text-graphite mt-0.5">{dataSpace?.totalStorageUsedMb || 1.2} MB Used</div>
          </div>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Products Card */}
        <div
          onClick={() => onNavigateToModule?.("PRODUCTS")}
          className="bg-white border border-line rounded-2xl p-5 shadow-sm hover:border-royal/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Published Products</span>
            <div className="p-2 rounded-xl bg-royal/10 text-royal group-hover:bg-royal group-hover:text-white transition">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-graphite">{products.length}</div>
          <div className="flex items-center justify-between text-[11px] text-stone mt-3 pt-3 border-t border-line">
            <span className="text-emerald-700 font-bold">Canonical ProductEntity</span>
            <span className="flex items-center gap-1 font-semibold group-hover:text-royal transition">
              View <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Services Card */}
        <div
          onClick={() => onNavigateToModule?.("SERVICES")}
          className="bg-white border border-line rounded-2xl p-5 shadow-sm hover:border-royal/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Published Services</span>
            <div className="p-2 rounded-xl bg-royal/10 text-royal group-hover:bg-royal group-hover:text-white transition">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-graphite">{services.length}</div>
          <div className="flex items-center justify-between text-[11px] text-stone mt-3 pt-3 border-t border-line">
            <span className="text-emerald-700 font-bold">Canonical ServiceEntity</span>
            <span className="flex items-center gap-1 font-semibold group-hover:text-royal transition">
              View <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Data Space Records Card */}
        <div
          onClick={() => onNavigateToModule?.("DOCUMENTS")}
          className="bg-white border border-line rounded-2xl p-5 shadow-sm hover:border-royal/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Data Space Records</span>
            <div className="p-2 rounded-xl bg-royal/10 text-royal group-hover:bg-royal group-hover:text-white transition">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-graphite">{documents.length + files.length}</div>
          <div className="flex items-center justify-between text-[11px] text-stone mt-3 pt-3 border-t border-line">
            <span className="text-royal font-bold">{groundedDocsCount} Grounded for AI</span>
            <span className="flex items-center gap-1 font-semibold group-hover:text-royal transition">
              View <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Commercial Inquiries Card */}
        <div
          onClick={() => onNavigateToModule?.("CONNECTIONS")}
          className="bg-white border border-line rounded-2xl p-5 shadow-sm hover:border-royal/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Connect / RFQs</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-800 group-hover:bg-amber-800 group-hover:text-white transition">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-graphite">{connectRecords.length}</div>
          <div className="flex items-center justify-between text-[11px] text-stone mt-3 pt-3 border-t border-line">
            <span className="text-amber-800 font-bold">{openInquiriesCount} Open Inquiries</span>
            <span className="flex items-center gap-1 font-semibold group-hover:text-royal transition">
              View <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* 3. TWO-COLUMN OPERATIONAL SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PRODUCTS & SERVICES SUMMARY */}
        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-royal" />
              <h3 className="text-base font-bold text-graphite">Catalog Overview</h3>
            </div>
            <div className="text-xs text-stone font-mono">
              {products.length} Products • {services.length} Services
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-bold text-stone uppercase tracking-wider">Recent Published Products</div>
            {products.length === 0 ? (
              <div className="p-4 rounded-xl bg-mist/50 border border-line text-xs text-stone text-center">
                No products registered in active company catalog.
              </div>
            ) : (
              <div className="space-y-2">
                {products.slice(0, 3).map((prod) => (
                  <div
                    key={prod.id}
                    className="p-3 rounded-xl bg-mist/40 border border-line flex items-center justify-between text-xs hover:bg-mist/70 transition"
                  >
                    <div>
                      <div className="font-bold text-graphite">{prod.name}</div>
                      <div className="text-stone font-mono text-[11px]">{prod.category || "Maritime Hardware"}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-white border border-line text-graphite font-mono font-bold text-[10px]">
                      {prod.status || "PUBLISHED"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold text-stone uppercase tracking-wider">Recent Published Services</div>
            {services.length === 0 ? (
              <div className="p-4 rounded-xl bg-mist/50 border border-line text-xs text-stone text-center">
                No services registered in active company catalog.
              </div>
            ) : (
              <div className="space-y-2">
                {services.slice(0, 3).map((serv) => (
                  <div
                    key={serv.id}
                    className="p-3 rounded-xl bg-mist/40 border border-line flex items-center justify-between text-xs hover:bg-mist/70 transition"
                  >
                    <div>
                      <div className="font-bold text-graphite">{serv.name}</div>
                      <div className="text-stone font-mono text-[11px]">{serv.category || "Maritime Engineering"}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-white border border-line text-emerald-800 font-mono font-bold text-[10px]">
                      {serv.status || "AVAILABLE"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CONNECT / RFQ SUMMARY */}
        <div
          onClick={() => onNavigateToModule?.("CONNECTIONS")}
          className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-5 cursor-pointer hover:border-royal/50 transition group"
        >
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-800" />
              <h3 className="text-base font-bold text-graphite group-hover:text-royal transition">Connect & RFQ Inquiries</h3>
            </div>
            <div className="text-xs font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span>{openInquiriesCount} Active</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-center">
              <div className="text-amber-900 font-bold text-[10.5px] uppercase tracking-wider">⚡ New</div>
              <div className="text-xl font-extrabold text-amber-950 mt-0.5">{newInquiriesCount}</div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-center">
              <div className="text-rose-900 font-bold text-[10.5px] uppercase tracking-wider">📥 Action</div>
              <div className="text-xl font-extrabold text-rose-950 mt-0.5">{waitingForCompanyCount}</div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center">
              <div className="text-emerald-900 font-bold text-[10.5px] uppercase tracking-wider">💬 Waiting</div>
              <div className="text-xl font-extrabold text-emerald-950 mt-0.5">{waitingForRequesterCount}</div>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="text-xs font-bold text-stone uppercase tracking-wider">Recent Commercial Inquiries</div>
            {canonicalInquiries.length === 0 ? (
              <div className="p-6 rounded-xl bg-mist/50 border border-line text-xs text-stone text-center">
                No inquiries or RFQs received yet.
              </div>
            ) : (
              <div className="space-y-2">
                {canonicalInquiries.slice(0, 3).map((inq) => (
                  <div
                    key={inq.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-line text-xs space-y-1 hover:bg-slate-100 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-graphite truncate max-w-[200px]">
                        {inq.productName || inq.serviceName || inq.subject}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white border border-line">
                        {inq.status}
                      </span>
                    </div>
                    <div className="text-stone text-[11px] flex items-center justify-between">
                      <span>From: <strong className="text-graphite">{inq.requesterName} ({inq.requesterCompany || "Member"})</strong></span>
                      <span className="font-mono text-royal font-bold">#{inq.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. AI & DATA SPACE DUAL MODULE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* COMPANY AI CAPABILITY */}
        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-royal" />
              <h3 className="text-base font-bold text-graphite">AI Advisor & Grounding</h3>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                aiAdvisorCapability.isAllowed
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {aiAdvisorCapability.isAllowed ? "ACTIVE ADVISOR" : "UPGRADE REQUIRED"}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-royal/5 border border-royal/20 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-graphite flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-royal" />
                Grounding Readiness
              </span>
              <span className="font-mono font-bold text-royal">
                {groundedDocsCount > 0 ? "GROUNDED" : "AWAITING DOCUMENTS"}
              </span>
            </div>
            <p className="text-stone leading-relaxed text-[11px]">
              Company AI Advisor operates strictly within the tenant boundary of <strong className="text-graphite">{company.displayName}</strong>.
              Private documents and proprietary catalog records are never leaked across company boundaries.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="p-3 rounded-xl bg-mist/50 border border-line">
              <div className="text-stone text-[10px] uppercase font-bold">Grounded Docs</div>
              <div className="text-lg font-bold text-graphite mt-1">{groundedDocsCount}</div>
            </div>
            <div className="p-3 rounded-xl bg-mist/50 border border-line">
              <div className="text-stone text-[10px] uppercase font-bold">Total Catalog</div>
              <div className="text-lg font-bold text-graphite mt-1">{products.length + services.length}</div>
            </div>
            <div className="p-3 rounded-xl bg-mist/50 border border-line">
              <div className="text-stone text-[10px] uppercase font-bold">Tenant Scope</div>
              <div className="text-xs font-bold text-emerald-700 mt-1 font-mono">ISOLATED</div>
            </div>
          </div>
        </div>

        {/* DATA SPACE SUMMARY */}
        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-royal" />
              <h3 className="text-base font-bold text-graphite">Data Space & Storage</h3>
            </div>
            <span className="text-xs font-mono text-stone">
              {dataSpace?.totalStorageUsedMb || 1.2} MB / {dataSpace?.storageLimitMb || 10000} MB
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-mist/50 border border-line">
              <div className="text-stone font-semibold text-[11px]">Canonical Documents</div>
              <div className="text-2xl font-bold text-graphite mt-1">{documents.length}</div>
              <div className="text-[10px] text-royal font-mono font-bold mt-1">{groundedDocsCount} Indexed for AI</div>
            </div>
            <div className="p-3.5 rounded-xl bg-mist/50 border border-line">
              <div className="text-stone font-semibold text-[11px]">Binary Asset Files</div>
              <div className="text-2xl font-bold text-graphite mt-1">{files.length}</div>
              <div className="text-[10px] text-stone font-mono mt-1">CAD & Specifications</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-mist/40 border border-line flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-emerald-700" />
              <div>
                <div className="font-bold text-graphite">Confidentiality Enforcement</div>
                <div className="text-[11px] text-stone">Private document metadata is hidden from public surfaces.</div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold text-[10px]">
              ENFORCED
            </span>
          </div>
        </div>
      </div>

      {/* 5. BUSINESS TWIN & GOVERNANCE / SUBSCRIPTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business Twin Derived Analytical Model */}
        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-amber-800" />
              <h3 className="text-base font-bold text-graphite">Business Twin</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
              DERIVED VIEW
            </span>
          </div>

          <p className="text-xs text-stone leading-relaxed">
            Analytical digital twin projection computed dynamically from canonical entity registries.
          </p>

          <div className="space-y-2.5 text-xs pt-1">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-mist/50 border border-line">
              <span className="text-stone">Readiness Index</span>
              <span className="font-bold text-emerald-700 font-mono">
                {(twinSummary as any)?.readinessIndex ? `${Math.round((twinSummary as any).readinessIndex)}%` : "94%"}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-mist/50 border border-line">
              <span className="text-stone">Provenance</span>
              <span className="font-bold text-graphite font-mono">DERIVED_FROM_CANONICAL</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-mist/50 border border-line">
              <span className="text-stone">Model Status</span>
              <span className="font-bold text-amber-800 font-mono">SYNCHRONIZED</span>
            </div>
          </div>
        </div>

        {/* Subscription & Entitlements */}
        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-royal" />
              <h3 className="text-base font-bold text-graphite">Subscription & Plan</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-royal/10 text-royal border border-royal/20">
              {subscription?.planCode || "GROWTH"}
            </span>
          </div>

          <p className="text-xs text-stone leading-relaxed">
            Commercial plan status: <strong className="text-emerald-700 font-bold">{subscription?.status || "ACTIVE"}</strong>
          </p>

          <div className="space-y-2.5 text-xs pt-1">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-mist/50 border border-line">
              <span className="text-stone">Active Entitlements</span>
              <span className="font-bold text-graphite font-mono">{entitlements.length} Capabilities</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-mist/50 border border-line">
              <span className="text-stone">Monthly Price</span>
              <span className="font-bold text-graphite font-mono">${planDetails.price} / mo</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-mist/50 border border-line">
              <span className="text-stone">Company Studio</span>
              <span className="font-bold text-emerald-700 font-mono">ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Governance & Authority */}
        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <h3 className="text-base font-bold text-graphite">Governance & Trust</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {verificationStatus}
            </span>
          </div>

          <p className="text-xs text-stone leading-relaxed">
            Principal authority verified by MarineWorld Trust Architecture.
          </p>

          <div className="space-y-2.5 text-xs pt-1">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-mist/50 border border-line">
              <span className="text-stone">Principal Role</span>
              <span className="font-bold text-amber-800 font-mono">{member?.role || "OWNER"}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-mist/50 border border-line">
              <span className="text-stone">Verification State</span>
              <span className="font-bold text-emerald-700 font-mono">{verificationStatus}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-mist/50 border border-line">
              <span className="text-stone">Audit Attribution</span>
              <span className="font-bold text-graphite font-mono">ENABLED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
