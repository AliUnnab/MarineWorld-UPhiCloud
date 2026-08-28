import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  Users,
  Package,
  Wrench,
  FileText,
  FolderArchive,
  MessageSquare,
  Cpu,
  Bot,
  BarChart3,
  CreditCard,
  History,
  ChevronRight,
  Menu,
  X,
  Lock,
  CheckCircle2,
  ExternalLink,
  ArrowLeft,
  Building,
  Share2,
  LogOut,
  AlertCircle,
  ShieldAlert,
  User,
  Compass,
  MapPin,
  Globe,
  Radio,
  Eye,
  Receipt,
  Landmark,
  Layers,
  PhoneCall,
} from "lucide-react";
import type {
  StudioNavigationModule,
  StudioNavItem,
  CompanyStudioAccessResult,
  CompanyEntity,
} from "@/lib/types";
import {
  resolveCompanyStudioAccess,
  resolveCompanyStudioAccessAsync,
  getStudioNavigation,
  getCompanyDataSpace,
  getStudioDocuments,
  getStudioFiles,
  getStudioProducts,
  getStudioServices,
  getStudioConnectInquiries,
  getStudioExternalSources,
  getStudioOverviewMetrics,
  getStudioBusinessTwinSummary,
} from "@/lib/services/studioService";
import {
  getCurrentAuthSession,
  getCompanyMember,
  signOutCurrentUser,
  subscribeAuthState,
  isAuthInitialized,
  waitForAuthReady,
  type AuthContext,
} from "@/lib/services/securityService";
import { getCompanyById, getActionAttributionLog, getCompanyNodes } from "@/lib/services/companyService";
import { getCompanySubscription, getCompanyEntitlements } from "@/lib/services/companyOnboardingService";
import { getCompanyVerificationStatus } from "@/lib/services/governanceService";
import { CompanyStudioDashboardView } from "./CompanyStudioDashboardView";
import { CompanyStudioPropertiesView } from "./CompanyStudioPropertiesView";
import { CompanyStudioBillingView } from "./CompanyStudioBillingView";
import { CompanyIdentityView } from "./CompanyIdentityView";
import { LoginPage } from "@/pages/LoginPage";
import { CompanyStudioIdentityView } from "./CompanyStudioIdentityView";
import { CompanyStudioPositioningView } from "./CompanyStudioPositioningView";
import { CompanyStudioPresenceView } from "./CompanyStudioPresenceView";
import { CompanyStudioOfferingsView } from "./CompanyStudioOfferingsView";
import { CompanyStudioKnowledgeView } from "./CompanyStudioKnowledgeView";
import { CompanyStudioAIView } from "./CompanyStudioAIView";
import { CompanyStudioDigitalPresenceView } from "./CompanyStudioDigitalPresenceView";
import { CompanyStudioPublishView } from "./CompanyStudioPublishView";
import { CompanyStudioConnectView } from "./CompanyStudioConnectView";
import { CompanyStudioContactsView } from "./CompanyStudioContactsView";
import { CompanyStudioTeamView } from "./CompanyStudioTeamView";
import { CompanyStudioAuditView } from "./CompanyStudioAuditView";
import { getCompanyInquiries, subscribeToCompanyInquiries } from "@/services/inquiryService";
import { CompanyStudioReadinessBar, computeCompanyReadiness } from "./CompanyStudioReadinessBar";
import { CompanyStudioPreviewContainer } from "./CompanyStudioPreviewContainer";
import { getCompanyRecordSync, getCompanyRecord } from "@/lib/repositories/companyRepository";

export type StudioAuthUIState =
  | "AUTH_LOADING"
  | "UNAUTHENTICATED"
  | "AUTHENTICATED_NO_MEMBERSHIP"
  | "AUTHENTICATED_ACTIVE"
  | "AUTH_ERROR";

function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

interface CompanyStudioShellProps {
  companyId?: string;
  initialModule?: StudioNavigationModule;
  onExitStudio?: () => void;
  onNavigateToPublicPage?: (companyId: string) => void;
}

export const CompanyStudioShell: React.FC<CompanyStudioShellProps> = ({
  companyId: requestedCompanyId,
  initialModule = "OVERVIEW",
  onExitStudio,
  onNavigateToPublicPage,
}) => {
  const normalizedModule: StudioNavigationModule = useMemo(() => {
    const mod = (initialModule as string)?.toUpperCase()?.replace(/-/g, "_");
    if (mod === "INVOICES" || mod === "PAYMENTS" || mod === "BILLING" || mod === "PAYMENT_METHODS") {
      return "BILLING";
    }
    if (mod === "DIRECT_REACH" || mod === "CONTACTS" || mod === "COMPANY_CONTACTS") {
      return "CONTACTS";
    }
    if (mod === "CONNECT" || mod === "CONNECTIONS" || mod === "INQUIRIES" || mod === "RFQS") {
      return "CONNECTIONS";
    }
    return initialModule;
  }, [initialModule]);

  const [activeModule, setActiveModule] = useState<StudioNavigationModule>(normalizedModule);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [accessResult, setAccessResult] = useState<CompanyStudioAccessResult | null>(null);
  const [navItems, setNavItems] = useState<StudioNavItem[]>([]);
  const [auth, setAuth] = useState<AuthContext>(() => getCurrentAuthSession());
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(() => !isAuthInitialized());
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Subscribe to auth state updates (session restoration, Google Sign-In, Sign-Out)
  useEffect(() => {
    const unsubscribe = subscribeAuthState((newAuth) => {
      setAuth(newAuth);
      setIsAuthLoading(false);
    });

    if (isAuthInitialized()) {
      setIsAuthLoading(false);
    } else {
      waitForAuthReady().then((readyAuth) => {
        setAuth(readyAuth);
        setIsAuthLoading(false);
      });
    }

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!auth.uid) {
      setAccessResult(null);
      return;
    }

    let isMounted = true;
    resolveCompanyStudioAccessAsync(auth, requestedCompanyId).then((access) => {
      if (!isMounted) return;
      setAccessResult(access);

      if (access.isAllowed && access.companyId && auth.uid) {
        const items = getStudioNavigation(access.companyId, auth.uid, auth);
        setNavItems(items);
        getCompanyRecord(access.companyId).then(() => {
          if (isMounted) {
            setRefreshKey((k) => k + 1);
          }
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [requestedCompanyId, auth.uid, isAuthLoading]);

  const currentCompanyId = accessResult?.companyId || requestedCompanyId || "";
  const company = useMemo(() => {
    if (!currentCompanyId) return undefined;
    return getCompanyById(currentCompanyId) || (getCompanyRecordSync(currentCompanyId) as unknown as CompanyEntity) || undefined;
  }, [currentCompanyId, refreshKey]);

  const productsList = useMemo(() => {
    if (!currentCompanyId) return [];
    return getStudioProducts(currentCompanyId);
  }, [currentCompanyId, refreshKey]);

  const servicesList = useMemo(() => {
    if (!currentCompanyId) return [];
    return getStudioServices(currentCompanyId);
  }, [currentCompanyId, refreshKey]);

  const documentsList = useMemo(() => {
    if (!currentCompanyId) return [];
    return getStudioDocuments(currentCompanyId, auth);
  }, [currentCompanyId, auth, refreshKey]);

  const nodesList = useMemo(() => {
    if (!currentCompanyId) return [];
    return getCompanyNodes(currentCompanyId);
  }, [currentCompanyId, refreshKey]);

  const capabilitiesList = (company as any)?.primaryCapabilities || (company as any)?.capabilities || [];

  const [studioInquiries, setStudioInquiries] = useState<any[]>([]);

  useEffect(() => {
    if (!currentCompanyId) return;
    getCompanyInquiries(currentCompanyId)
      .then((inqs) => {
        if (inqs) setStudioInquiries(inqs);
      })
      .catch(() => {});

    const unsub = subscribeToCompanyInquiries(currentCompanyId, (inqs) => {
      setStudioInquiries(inqs);
    });

    const handleCustomEvent = () => {
      getCompanyInquiries(currentCompanyId).then((inqs) => setStudioInquiries(inqs));
    };

    const handleDocsUpdate = () => {
      setRefreshKey((k) => k + 1);
    };

    window.addEventListener("marineworld_inquiry_updated", handleCustomEvent);
    window.addEventListener("marineworld_documents_updated", handleDocsUpdate);
    window.addEventListener("marineworld_dataspace_updated", handleDocsUpdate);

    return () => {
      unsub();
      window.removeEventListener("marineworld_inquiry_updated", handleCustomEvent);
      window.removeEventListener("marineworld_documents_updated", handleDocsUpdate);
      window.removeEventListener("marineworld_dataspace_updated", handleDocsUpdate);
    };
  }, [currentCompanyId]);

  const newInquiriesCount = useMemo(() => {
    return studioInquiries.filter((i) => i.status === "NEW").length;
  }, [studioInquiries]);

  const waitingCompanyCount = useMemo(() => {
    return studioInquiries.filter((i) => i.status === "WAITING_FOR_COMPANY").length;
  }, [studioInquiries]);

  const readiness = useMemo(() => {
    return computeCompanyReadiness(
      company,
      productsList.length,
      servicesList.length,
      documentsList.length,
      nodesList.length,
      capabilitiesList.length
    );
  }, [company, productsList.length, servicesList.length, documentsList.length, nodesList.length, capabilitiesList.length, refreshKey]);

  const dataSpace = useMemo(() => (currentCompanyId ? getCompanyDataSpace(currentCompanyId, auth) : null), [currentCompanyId, auth.uid, refreshKey]);
  const metrics = useMemo(() => (currentCompanyId ? getStudioOverviewMetrics(currentCompanyId, auth) : null), [currentCompanyId, auth.uid, refreshKey]);
  const sub = useMemo(() => (currentCompanyId ? getCompanySubscription(currentCompanyId) : null), [currentCompanyId, refreshKey]);
  const entitlements = useMemo(() => (currentCompanyId ? getCompanyEntitlements(currentCompanyId) : []), [currentCompanyId, refreshKey]);
  const member = useMemo(() => (currentCompanyId ? getCompanyMember(currentCompanyId, auth) : null), [currentCompanyId, auth.uid, refreshKey]);
  const twinSummary = useMemo(() => (currentCompanyId ? getStudioBusinessTwinSummary(currentCompanyId) : null), [currentCompanyId, refreshKey]);

  const handleSignOut = async () => {
    await signOutCurrentUser();
    setAuth({ uid: null, isDevelopmentSession: false });
    setAccessResult(null);
    setAuthError(null);
    if (onExitStudio) {
      onExitStudio();
    }
  };

  // 0. AUTH RESOLUTION LOADING STATE
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-canvas text-graphite flex items-center justify-center p-6 antialiased font-sans">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-royal border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone text-sm font-medium">Verifying Secure Enterprise Credentials...</p>
        </div>
      </div>
    );
  }

  // 1. UNAUTHENTICATED STATE & DEVELOPMENT LOGIN
  if (!auth.uid) {
    return (
      <LoginPage
        onNavigate={(newPath) => {
          if (newPath === "/" && onExitStudio) {
            onExitStudio();
          } else {
            window.history.pushState({}, "", newPath);
            window.dispatchEvent(new PopStateEvent("popstate"));
          }
        }}
        onLoginSuccess={async () => {
          const newAuth = getCurrentAuthSession();
          setAuth(newAuth);
          const access = await resolveCompanyStudioAccessAsync(newAuth, requestedCompanyId);
          setAccessResult(access);
        }}
      />
    );
  }

  // 2. GATE LOADING STATE
  if (!accessResult) {
    return (
      <div className="min-h-screen bg-canvas text-graphite flex items-center justify-center p-6 antialiased font-sans">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-royal border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone text-sm font-medium">Resolving Company Studio Operational Gate...</p>
        </div>
      </div>
    );
  }

  // 3. AUTHENTICATED_NO_MEMBERSHIP / GATE DENIAL STATE
  if (!accessResult.isAllowed) {
    const isNoMembership =
      accessResult.status === "MEMBERSHIP_REQUIRED" ||
      accessResult.status === "ORGANIZATION_REQUIRED";

    return (
      <div className="min-h-screen bg-canvas text-graphite flex items-center justify-center p-6 antialiased font-sans">
        <div className="max-w-md w-full bg-white border border-line rounded-2xl p-8 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-graphite mb-2 tracking-tight">
            {isNoMembership ? "Organization Membership Required" : "Company Studio Access Denied"}
          </h2>

          <div className="inline-block px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 mb-4">
            GATE STATUS: {accessResult.status}
          </div>

          {/* Authenticated User Details */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-line text-left mb-6 space-y-1">
            <div className="text-[10px] uppercase font-mono font-bold text-stone">AUTHENTICATED IDENTITY</div>
            <div className="text-xs font-bold text-graphite truncate flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-stone" />
              {auth.displayName || auth.email || "Authenticated User"}
            </div>
            {auth.email && (
              <div className="text-[11px] text-stone font-mono truncate">{auth.email}</div>
            )}
            <div className="text-[10px] text-royal font-mono truncate">UID: {auth.uid}</div>
          </div>

          <p className="text-xs text-stone leading-relaxed mb-6">
            {isNoMembership
              ? "You're signed in, but you don't currently belong to an organization."
              : accessResult.denialReason ||
                "Your account is authenticated, but you do not possess active membership in an authorized enterprise organization."}
          </p>

          <div className="flex flex-col gap-3">
            <a
              href="/company/onboarding"
              className="w-full h-11 bg-royal hover:bg-royal-dark text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Building2 className="w-4 h-4" />
              CREATE YOUR AI-NATIVE COMPANY
            </a>

            <a
              href="/"
              className="w-full h-11 bg-mist hover:bg-linesoft text-graphite text-xs font-bold rounded-xl border border-line transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4 text-stone" />
              EXPLORE MARINEWORLD
            </a>

            <button
              id="btn-studio-denial-signout"
              onClick={handleSignOut}
              className="w-full h-11 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              SIGN OUT
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. AUTHENTICATED_ACTIVE STATE: FULL STUDIO WORKSPACE
  const renderModuleIcon = (iconName: string) => {
    switch (iconName) {
      case "LayoutDashboard": return <LayoutDashboard className="w-4 h-4" />;
      case "Building2": return <Building2 className="w-4 h-4" />;
      case "Compass": return <Compass className="w-4 h-4" />;
      case "MapPin": return <MapPin className="w-4 h-4" />;
      case "Package": return <Package className="w-4 h-4" />;
      case "Share2": return <Share2 className="w-4 h-4" />;
      case "Bot": return <Bot className="w-4 h-4" />;
      case "Globe": return <Globe className="w-4 h-4" />;
      case "Radio": return <Radio className="w-4 h-4" />;
      case "ShieldCheck": return <ShieldCheck className="w-4 h-4" />;
      case "Users": return <Users className="w-4 h-4" />;
      case "Wrench": return <Wrench className="w-4 h-4" />;
      case "FileText": return <FileText className="w-4 h-4" />;
      case "FolderArchive": return <FolderArchive className="w-4 h-4" />;
      case "MessageSquare": return <MessageSquare className="w-4 h-4" />;
      case "Cpu": return <Cpu className="w-4 h-4" />;
      case "BarChart3": return <BarChart3 className="w-4 h-4" />;
      case "CreditCard": return <CreditCard className="w-4 h-4" />;
      case "Receipt": return <Receipt className="w-4 h-4" />;
      case "History": return <History className="w-4 h-4" />;
      case "Landmark": return <Landmark className="w-4 h-4" />;
      case "Layers": return <Layers className="w-4 h-4" />;
      case "PhoneCall": return <PhoneCall className="w-4 h-4" />;
      default: return <LayoutDashboard className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-graphite flex flex-col md:flex-row antialiased font-sans">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-white border-b border-line p-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 min-h-[44px] min-w-[44px] rounded-xl bg-mist text-graphite flex items-center justify-center border border-line"
            aria-label="Toggle Navigation Menu"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div>
            <div className="text-sm font-bold text-graphite leading-tight truncate max-w-[180px]">
              {accessResult.companyName}
            </div>
            <div className="text-[11px] font-mono text-royal">
              {accessResult?.businessId || "N/A"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-2 text-stone hover:text-rose-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <LogOut className="w-5 h-5" />
          </button>
          {onExitStudio && (
            <button
              onClick={onExitStudio}
              className="p-2 text-stone hover:text-graphite min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Studio Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-line flex flex-col transform transition-transform duration-200 ease-in-out shadow-sm ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Active Organization Context Header */}
        <div className="p-5 border-b border-line">
          <div className="flex items-center justify-between mb-2.5">
            <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-royal/10 text-royal border border-royal/20 rounded-md">
              COMPANY STUDIO
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {accessResult.verificationStatus || "VERIFIED"}
            </span>
          </div>

          <h1 className="text-base font-bold text-graphite truncate mb-0.5">
            {accessResult.companyName}
          </h1>

          <div className="text-xs font-mono text-royal font-semibold truncate mb-3">
            {accessResult?.businessId || "N/A"}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line text-xs">
            <div>
              <div className="text-[10px] text-stone uppercase tracking-wider font-semibold">
                ROLE
              </div>
              <div className="font-bold text-amber-800">
                {accessResult.userRole || "OWNER"}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-stone uppercase tracking-wider font-semibold">
                STATUS
              </div>
              <div className="font-bold text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                ACTIVE
              </div>
            </div>
            <div>
              <div className="text-[10px] text-stone uppercase tracking-wider font-semibold">
                PLAN
              </div>
              <div className="font-bold text-graphite">
                {accessResult.planCode || "GROWTH"}
              </div>
            </div>
          </div>
        </div>

        {/* Capability-driven Navigation Items */}
        <nav className="flex-1 p-3 overflow-y-auto space-y-4">
          {/* Dedicated Studio Overview Hub */}
          <div>
            <button
              onClick={() => {
                setActiveModule("OVERVIEW");
                if (typeof window !== "undefined" && window.history) {
                  window.history.pushState({}, "", "/studio");
                }
                setIsSidebarOpen(false);
              }}
              className={`w-full min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition ${
                activeModule === "OVERVIEW"
                  ? "bg-royal text-white shadow-sm"
                  : "bg-mist/70 text-graphite hover:bg-mist hover:text-royal border border-line"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className={`w-4 h-4 ${activeModule === "OVERVIEW" ? "text-white" : "text-royal"}`} />
                <span>Studio Overview</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  activeModule === "OVERVIEW"
                    ? "bg-white/20 text-white"
                    : "bg-white text-stone border border-line/60"
                }`}
              >
                HUB
              </span>
            </button>
          </div>

          {/* Section 1: Company Creation (01-08) */}
          <div className="space-y-1">
            <div className="px-3 py-1 flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-royal">
                COMPANY CREATION
              </span>
              <span className="text-[9px] font-mono text-stone">01–08</span>
            </div>
            {navItems
              .filter((item) =>
                [
                  "IDENTITY",
                  "POSITIONING",
                  "PRESENCE",
                  "OFFERINGS",
                  "KNOWLEDGE",
                  "AI",
                  "DIGITAL_PRESENCE",
                  "PUBLISH",
                ].includes(item.id)
              )
              .map((item) => {
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.isAllowed) {
                        setActiveModule(item.id);
                        if (typeof window !== "undefined" && window.history) {
                          const newPath = `/studio/${item.id.toLowerCase()}`;
                          window.history.pushState({}, "", newPath);
                        }
                        setIsSidebarOpen(false);
                      }
                    }}
                    disabled={!item.isAllowed}
                    className={`w-full min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                      isActive
                        ? "bg-royal text-white shadow-2xs"
                        : item.isAllowed
                        ? "text-stone hover:bg-mist hover:text-graphite"
                        : "text-stone/40 cursor-not-allowed opacity-50"
                    }`}
                    title={item.denialReason}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={isActive ? "text-white" : item.isAllowed ? "text-stone" : "text-stone/40"}>
                        {renderModuleIcon(item.iconName)}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>

                    {!item.isAllowed && <Lock className="w-3.5 h-3.5 text-stone/40" />}
                  </button>
                );
              })}
          </div>

          <div className="h-px bg-line/80 mx-2" />

          {/* Section 2: Company Operations */}
          <div className="space-y-1">
            <div className="px-3 py-1 flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-graphite">
                COMPANY OPERATIONS
              </span>
              <span className="text-[9px] font-mono text-stone">OPERATE</span>
            </div>
            {navItems
              .filter((item) =>
                [
                  "PROPERTIES",
                  "CONNECTIONS",
                  "CONTACTS",
                  "TEAM",
                  "BILLING",
                  "AUDIT",
                ].includes(item.id)
              )
              .map((item) => {
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.isAllowed) {
                        setActiveModule(item.id);
                        if (typeof window !== "undefined" && window.history) {
                          const newPath = item.id === "OVERVIEW" ? "/studio" : `/studio/${item.id.toLowerCase()}`;
                          window.history.pushState({}, "", newPath);
                        }
                        setIsSidebarOpen(false);
                      }
                    }}
                    disabled={!item.isAllowed}
                    className={`w-full min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                      isActive
                        ? "bg-royal text-white shadow-2xs"
                        : item.isAllowed
                        ? "text-stone hover:bg-mist hover:text-graphite"
                        : "text-stone/40 cursor-not-allowed opacity-50"
                    }`}
                    title={item.denialReason}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={isActive ? "text-white" : item.isAllowed ? "text-stone" : "text-stone/40"}>
                        {renderModuleIcon(item.iconName)}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.id === "CONNECTIONS" && (
                      <div className="flex items-center gap-1">
                        {newInquiriesCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500 text-white animate-pulse">
                            {newInquiriesCount} New
                          </span>
                        )}
                        {waitingCompanyCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            {waitingCompanyCount} Action
                          </span>
                        )}
                      </div>
                    )}

                    {!item.isAllowed && <Lock className="w-3.5 h-3.5 text-stone/40" />}
                  </button>
                );
              })}
          </div>
        </nav>

        {/* User Account / Session & Footer */}
        <div className="p-4 border-t border-line space-y-2">
          {/* User identity info */}
          <div className="p-2.5 rounded-xl bg-canvas border border-line flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              {auth.photoURL ? (
                <img
                  src={auth.photoURL}
                  alt={auth.displayName || "User"}
                  className="w-7 h-7 rounded-full object-cover border border-line"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-royal/10 text-royal flex items-center justify-center font-bold text-xs shrink-0">
                  {(auth.displayName || auth.email || "U")[0].toUpperCase()}
                </div>
              )}
              <div className="truncate">
                <div className="text-xs font-bold text-graphite truncate leading-tight">
                  {auth.displayName || "Operator"}
                </div>
                <div className="text-[10px] text-stone font-mono truncate leading-tight">
                  {auth.email || auth.uid?.slice(0, 12)}
                </div>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 text-stone hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {accessResult.companyId && onNavigateToPublicPage && (
            <button
              onClick={() => onNavigateToPublicPage(accessResult.companyId!)}
              className="w-full h-10 bg-mist hover:bg-linesoft text-graphite text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 border border-line"
            >
              <ExternalLink className="w-3.5 h-3.5 text-royal" />
              Public Company Presence
            </button>
          )}

          {onExitStudio && (
            <button
              onClick={onExitStudio}
              className="w-full h-10 text-stone hover:text-graphite text-xs font-semibold transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Exit Studio Workspace
            </button>
          )}
        </div>
      </aside>

      {/* Main Studio Operational Content View */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto bg-canvas">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Module Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-royal mb-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModule("OVERVIEW");
                    if (typeof window !== "undefined" && window.history) {
                      window.history.pushState({}, "", "/studio");
                    }
                  }}
                  className="hover:underline font-bold text-royal flex items-center gap-1"
                >
                  MarineWorld.City Studio
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-stone" />
                <span className="uppercase font-bold text-graphite">
                  {activeModule === "OVERVIEW" ? "Overview Dashboard" : activeModule}
                </span>
                {activeModule !== "OVERVIEW" && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule("OVERVIEW");
                      if (typeof window !== "undefined" && window.history) {
                        window.history.pushState({}, "", "/studio");
                      }
                    }}
                    className="ml-2 px-2 py-0.5 rounded bg-mist hover:bg-linesoft text-stone hover:text-royal text-[10px] font-mono font-bold transition border border-line flex items-center gap-1"
                  >
                    <ArrowLeft className="w-2.5 h-2.5" />
                    Overview
                  </button>
                )}
              </div>
              <h2 className="text-2xl font-bold text-graphite tracking-tight">
                {activeModule === "OVERVIEW"
                  ? "Studio Overview"
                  : navItems.find((n) => n.id === activeModule)?.label || "Studio Workspace"}
              </h2>
              <p className="text-xs text-stone mt-0.5">
                {activeModule === "OVERVIEW"
                  ? "Executive operational hub, company readiness sequence & real-time controls."
                  : navItems.find((n) => n.id === activeModule)?.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="px-3.5 py-2 bg-white hover:bg-mist text-graphite rounded-xl text-xs font-bold border border-line flex items-center gap-1.5 transition shadow-2xs min-h-[40px]"
              >
                <Eye className="w-3.5 h-3.5 text-royal" />
                Preview Live
              </button>

              <div className="px-3 py-2 rounded-xl bg-white border border-line text-xs text-stone font-mono shadow-2xs">
                DATA SPACE: <span className="text-emerald-700 font-bold">{dataSpace?.totalStorageUsedMb || 0}MB</span> / {dataSpace?.storageLimitMb || 500}MB
              </div>
            </div>
          </div>

          {/* Real-time Readiness Bar (across all 8 IA modules) */}
          <CompanyStudioReadinessBar
            readiness={readiness}
            activeModule={activeModule}
            onNavigateToModule={(mod) => setActiveModule(mod)}
            onOpenPreview={() => setIsPreviewOpen(true)}
          />

          {/* Module 01: IDENTITY */}
          {(activeModule === "IDENTITY" || activeModule === "COMPANY") && (
            <CompanyStudioIdentityView
              companyId={currentCompanyId}
              onSaved={() => setRefreshKey((k) => k + 1)}
            />
          )}

          {/* Module 02: POSITIONING */}
          {activeModule === "POSITIONING" && (
            <CompanyStudioPositioningView
              companyId={currentCompanyId}
              onSaved={() => setRefreshKey((k) => k + 1)}
            />
          )}

          {/* Module 03: PRESENCE */}
          {activeModule === "PRESENCE" && (
            <CompanyStudioPresenceView
              companyId={currentCompanyId}
              onSaved={() => setRefreshKey((k) => k + 1)}
            />
          )}

          {/* Module 04: OFFERINGS */}
          {(activeModule === "OFFERINGS" || activeModule === "PRODUCTS" || activeModule === "SERVICES") && (
            <CompanyStudioOfferingsView
              companyId={currentCompanyId}
              onSaved={() => setRefreshKey((k) => k + 1)}
              onNavigateToAI={() => setActiveModule("AI")}
            />
          )}

          {/* Module 05: KNOWLEDGE */}
          {(activeModule === "KNOWLEDGE" || activeModule === "DOCUMENTS" || activeModule === "FILES" || activeModule === "EXTERNAL_SOURCES") && (
            <CompanyStudioKnowledgeView
              companyId={currentCompanyId}
              auth={auth}
              onSaved={() => setRefreshKey((k) => k + 1)}
              onNavigateToOfferings={() => setActiveModule("OFFERINGS")}
              onNavigateToPresence={() => setActiveModule("PRESENCE")}
            />
          )}

          {/* Module 06: AI */}
          {activeModule === "AI" && (
            <CompanyStudioAIView
              companyId={currentCompanyId}
              onNavigateToOfferings={() => setActiveModule("OFFERINGS")}
              onNavigateToKnowledge={() => setActiveModule("KNOWLEDGE")}
              onNavigateToPresence={() => setActiveModule("PRESENCE")}
              onOpenPreview={() => setIsPreviewOpen(true)}
            />
          )}

          {/* Module 07: DIGITAL PRESENCE */}
          {activeModule === "DIGITAL_PRESENCE" && (
            <CompanyStudioDigitalPresenceView
              companyId={currentCompanyId}
              onOpenPreview={() => setIsPreviewOpen(true)}
            />
          )}

          {/* Module 08: PUBLISH */}
          {activeModule === "PUBLISH" && (
            <CompanyStudioPublishView
              companyId={currentCompanyId}
              readiness={readiness}
              onNavigateToModule={(mod) => setActiveModule(mod)}
              onOpenPreview={() => setIsPreviewOpen(true)}
              onPublished={() => setRefreshKey((k) => k + 1)}
            />
          )}

          {/* Studio Overview Dashboard */}
          {activeModule === "OVERVIEW" && (
            <CompanyStudioDashboardView
              companyId={currentCompanyId}
              auth={auth}
              onNavigateToModule={(mod) => setActiveModule(mod)}
              onNavigateToPublicPage={onNavigateToPublicPage}
            />
          )}

          {/* Connections & RFQ Inbox */}
          {activeModule === "CONNECTIONS" && (
            <CompanyStudioConnectView
              companyId={currentCompanyId}
              memberRole={member?.role || "OWNER"}
              userEmail={auth.email || auth.displayName || "authorized_member"}
            />
          )}

          {/* Company Contacts & Direct Reach */}
          {activeModule === "CONTACTS" && (
            <CompanyStudioContactsView
              companyId={currentCompanyId}
              onSaved={() => setRefreshKey((k) => k + 1)}
            />
          )}

          {/* Properties & Showrooms */}
          {activeModule === "PROPERTIES" && (
            <CompanyStudioPropertiesView
              companyId={currentCompanyId}
              memberRole={member?.role || "VIEWER"}
              userEmail={auth.email || auth.displayName || "authorized_member"}
            />
          )}

          {/* Team Members & Access */}
          {activeModule === "TEAM" && (
            <CompanyStudioTeamView
              companyId={currentCompanyId}
              memberRole={member?.role || "VIEWER"}
              userEmail={auth.email || auth.displayName || "authorized_member"}
            />
          )}

          {/* Governance */}
          {activeModule === "GOVERNANCE" && (
            <div className="bg-white border border-line rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="text-base font-bold text-graphite border-b border-line pb-3">Governance & Principal Authority</h3>
              <p className="text-xs text-stone">Principal Authority and Verification controls.</p>
              <div className="p-4 rounded-xl bg-mist/50 border border-line text-xs font-mono text-emerald-700 font-bold">
                VERIFICATION STATUS: {getCompanyVerificationStatus(currentCompanyId)}
              </div>
            </div>
          )}

          {/* Subscription & Entitlements */}
          {activeModule === "SUBSCRIPTION" && (
            <div className="bg-white border border-line rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="text-base font-bold text-graphite border-b border-line pb-3">Subscription & Commercial Entitlements</h3>
              <div className="p-4 rounded-xl bg-mist/50 border border-line space-y-2 text-xs font-mono">
                <div>Active Plan: <span className="text-royal font-bold">{sub?.planCode}</span></div>
                <div>Plan Status: <span className="text-emerald-700 font-bold">{sub?.status}</span></div>
                <div>Active Entitlements: <span className="text-graphite font-bold">{entitlements.length}</span></div>
              </div>
            </div>
          )}

          {/* Billing & Payments */}
          {activeModule === "BILLING" && (
            <CompanyStudioBillingView
              companyId={currentCompanyId}
              memberRole={member?.role || "VIEWER"}
              userEmail={auth.email || auth.displayName || "authorized_member"}
              initialSubView={
                (initialModule as string)?.toUpperCase() === "INVOICES"
                  ? "INVOICES"
                  : (initialModule as string)?.toUpperCase() === "PAYMENTS"
                  ? "PAYMENTS"
                  : "OVERVIEW"
              }
            />
          )}

          {/* Analytics / Audit Logs */}
          {(activeModule === "ANALYTICS" || activeModule === "AUDIT") && (
            <CompanyStudioAuditView
              companyId={currentCompanyId}
              memberRole={member?.role || "VIEWER"}
              userEmail={auth.email || auth.displayName || "authorized_member"}
              onNavigateToModule={(mod) => setActiveModule(mod)}
            />
          )}
        </div>
      </main>

      {/* Embedded Live Preview Modal */}
      {isPreviewOpen && (
        <CompanyStudioPreviewContainer
          companySlug={company?.slug || currentCompanyId}
          onClosePreview={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
};
