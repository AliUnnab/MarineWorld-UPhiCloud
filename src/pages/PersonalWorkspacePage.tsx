import React, { useState, useEffect, useRef } from "react";
import {
  Compass,
  Building2,
  Package,
  Layers,
  Folder,
  Activity,
  UserCheck,
  Plus,
  Trash2,
  ExternalLink,
  Shield,
  Cpu,
  ArrowRight,
  LogOut,
  Clock,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronRight,
  ChevronDown,
  User,
  Briefcase,
  X,
  Send,
  MessageSquare,
} from "lucide-react";
import { MyInquiriesWorkspaceModule } from "@/components/workspace/MyInquiriesWorkspaceModule";
import { getUserInquiries, subscribeToUserInquiries } from "@/services/inquiryService";
import {
  subscribeToUserSavedItems,
  subscribeToUserCollections,
  subscribeToUserActivities,
} from "@/services/workspaceService";
import { getCurrentAuthSession, signOutCurrentUser } from "@/lib/services/securityService";
import {
  resolveAccessContext,
  isPersonalVisitor,
  isGuestVisitor,
  getActiveOrganizationContext,
  getUserMemberships,
} from "@/lib/services/accessContextService";
import {
  getSavedCompanies,
  getSavedProducts,
  getSavedServices,
  getUserCollections,
  getUserActivities,
  getUserActivitiesFiltered,
  clearUserActivities,
  resolveActivityEntity,
  removeSavedCompanyReference,
  removeSavedProductReference,
  removeSavedServiceReference,
  createCollection,
  renameCollection,
  updateCollection,
  deleteCollection,
  removeItemFromCollection,
  getCollectionWithResolvedItems,
  subscribeToPersonalWorkspace,
  syncWorkspaceFromFirestore,
} from "@/lib/services/personalWorkspaceService";
import {
  executePublicCompanyAI,
  executePublicProductAI,
  executePublicServiceAI,
} from "@/lib/services/aiDomainService";
import { createPersonalConnectRequest } from "@/lib/services/connectService";
import {
  getUserTrustProfile,
  requestHumanVerification,
  submitHumanVerification,
  subscribeToTrustState,
} from "@/lib/services/personalTrustService";
import type {
  PersonalCollection,
  PersonalActivityRecord,
  CompanyProfile,
  CompanyEntity,
  ProductEntity,
  ServiceEntity,
  GroundingSourceAttribution,
  UserTrustProfile,
  InquiryEntity,
} from "@/lib/types";

interface PersonalWorkspacePageProps {
  initialTab?: "overview" | "companies" | "products" | "services" | "inquiries" | "collections" | "activity" | "account";
  onNavigate?: (path: string) => void;
}

export function PersonalWorkspacePage({
  initialTab = "overview",
  onNavigate,
}: PersonalWorkspacePageProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "companies" | "products" | "services" | "inquiries" | "collections" | "activity" | "account"
  >(initialTab);

  const [authSession, setAuthSession] = useState(() => getCurrentAuthSession());
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [savedCompanies, setSavedCompanies] = useState<
    Array<{ reference: any; entity: CompanyProfile | CompanyEntity | null; isAvailable: boolean }>
  >([]);
  const [savedProducts, setSavedProducts] = useState<
    Array<{ reference: any; entity: ProductEntity | null; isAvailable: boolean }>
  >([]);
  const [savedServices, setSavedServices] = useState<
    Array<{ reference: any; entity: ServiceEntity | null; isAvailable: boolean }>
  >([]);
  const [userInquiries, setUserInquiries] = useState<InquiryEntity[]>([]);
  const [collections, setCollections] = useState<PersonalCollection[]>([]);
  const [activities, setActivities] = useState<PersonalActivityRecord[]>([]);

  // User Dropdown state
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // New Collection Form state
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDesc, setNewCollectionDesc] = useState("");
  const [collectionError, setCollectionError] = useState<string | null>(null);

  // Selected Collection Detail state
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [resolvedCollectionData, setResolvedCollectionData] = useState<{
    collection: PersonalCollection | null;
    resolvedItems: Array<{
      item: any;
      entity: any;
      displayName: string;
      isAvailable: boolean;
    }>;
    stats: {
      totalItems: number;
      companyCount: number;
      productCount: number;
      serviceCount: number;
    };
  } | null>(null);
  const [isRenamingCollection, setIsRenamingCollection] = useState(false);
  const [editCollectionName, setEditCollectionName] = useState("");
  const [editCollectionDesc, setEditCollectionDesc] = useState("");

  // Activity Tab State
  const [activityFilter, setActivityFilter] = useState<
    "ALL" | "COMPANIES" | "PRODUCTS" | "SERVICES" | "COLLECTIONS"
  >("ALL");
  const [isConfirmingClearActivity, setIsConfirmingClearActivity] = useState(false);

  // Trust & Human Verification State (Stage 3.5.8)
  const [trustProfile, setTrustProfile] = useState<UserTrustProfile>(() =>
    getUserTrustProfile(getCurrentAuthSession().uid)
  );
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Public AI Modal state (Stage 3.5.7)
  const [activeAIModal, setActiveAIModal] = useState<{
    type: "PRODUCT" | "SERVICE" | "COMPANY";
    id: string;
    name: string;
    companyId: string;
    companyName: string;
    entity: any;
  } | null>(null);
  const [aiModalQuery, setAIModalQuery] = useState("");
  const [aiModalLoading, setAIModalLoading] = useState(false);
  const [aiModalAnswer, setAIModalAnswer] = useState<{
    text: string;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    sources: GroundingSourceAttribution[];
  } | null>(null);
  const [aiConnectSent, setAIConnectSent] = useState(false);

  const handleOpenAIModal = (
    type: "PRODUCT" | "SERVICE" | "COMPANY",
    id: string,
    name: string,
    companyId: string,
    companyName: string,
    entity: any
  ) => {
    setActiveAIModal({ type, id, name, companyId, companyName, entity });
    setAIModalQuery("");
    setAIModalAnswer(null);
    setAIConnectSent(false);
  };

  const handleAskAIModal = async (questionText: string) => {
    if (!activeAIModal || !questionText.trim()) return;
    setAIModalLoading(true);
    try {
      if (activeAIModal.type === "PRODUCT") {
        const res = await executePublicProductAI(
          activeAIModal.companyId,
          activeAIModal.id,
          questionText
        );
        setAIModalAnswer({
          text: res.answer,
          confidence: res.confidence,
          sources: res.sources,
        });
      } else if (activeAIModal.type === "SERVICE") {
        const res = await executePublicServiceAI(
          activeAIModal.companyId,
          activeAIModal.id,
          questionText
        );
        setAIModalAnswer({
          text: res.answer,
          confidence: res.confidence,
          sources: res.sources,
        });
      } else {
        const res = await executePublicCompanyAI(
          activeAIModal.companyId,
          questionText
        );
        setAIModalAnswer({
          text: res.answer,
          confidence: res.confidence,
          sources: res.sources,
        });
      }
    } catch {
      setAIModalAnswer({
        text: "Based on publicly available information from this company, no matching verified records were found.",
        confidence: "LOW",
        sources: [],
      });
    } finally {
      setAIModalLoading(false);
    }
  };

  const handleSendPersonalConnectFromAI = async () => {
    if (!activeAIModal || !authSession.uid) return;
    try {
      await createPersonalConnectRequest({
        toCompanyId: activeAIModal.companyId,
        type: "INQUIRY",
        subject: `Inquiry regarding ${activeAIModal.name}`,
        message: `I would like more commercial information regarding ${activeAIModal.name}.`,
        productId: activeAIModal.type === "PRODUCT" ? activeAIModal.id : undefined,
        serviceId: activeAIModal.type === "SERVICE" ? activeAIModal.id : undefined,
      });
      setAIConnectSent(true);
    } catch (err: any) {
      console.error("Connect failed:", err);
    }
  };

  const formatActivityTitle = (act: PersonalActivityRecord): string => {
    switch (act.type) {
      case "VIEW_COMPANY":
        return `Viewed ${act.targetName}`;
      case "VIEW_PRODUCT":
        return `Viewed product ${act.targetName}`;
      case "VIEW_SERVICE":
        return `Viewed service ${act.targetName}`;
      case "SAVE_COMPANY":
        return `Saved ${act.targetName}`;
      case "SAVE_PRODUCT":
        return `Saved product ${act.targetName}`;
      case "SAVE_SERVICE":
        return `Saved service ${act.targetName}`;
      case "UNSAVE_COMPANY":
        return `Unsaved ${act.targetName}`;
      case "UNSAVE_PRODUCT":
        return `Unsaved product ${act.targetName}`;
      case "UNSAVE_SERVICE":
        return `Unsaved service ${act.targetName}`;
      case "CREATE_COLLECTION":
        return `Created collection "${act.targetName}"`;
      case "RENAME_COLLECTION":
        return `Renamed collection to "${act.targetName}"`;
      case "DELETE_COLLECTION":
        return `Deleted collection "${act.targetName}"`;
      case "ADD_TO_COLLECTION":
        return `Added item to "${act.targetName}"`;
      case "REMOVE_FROM_COLLECTION":
        return `Removed item from "${act.targetName}"`;
      default:
        return act.targetName;
    }
  };

  const getActivityLinkAndAction = (
    act: PersonalActivityRecord
  ): {
    label: string;
    href: string | null;
    isAvailable: boolean;
  } => {
    if (act.type.includes("COLLECTION")) {
      if (act.type === "DELETE_COLLECTION") {
        return { label: "DELETED", href: null, isAvailable: false };
      }
      return { label: "OPEN COLLECTION", href: "/collections", isAvailable: true };
    }
    if (act.type.includes("PRODUCT")) {
      return {
        label: "VIEW",
        href: act.companyId
          ? `/companies/${act.companyId}/products?product=${act.targetId}`
          : `/companies`,
        isAvailable: true,
      };
    }
    if (act.type.includes("SERVICE")) {
      return {
        label: "VIEW",
        href: act.companyId
          ? `/companies/${act.companyId}/services?service=${act.targetId}`
          : `/companies`,
        isAvailable: true,
      };
    }
    if (act.type.includes("COMPANY")) {
      return {
        label: "OPEN",
        href: `/companies/${act.targetId || act.companyId}`,
        isAvailable: true,
      };
    }
    return { label: "VIEW", href: "/workspace", isAvailable: true };
  };

  const groupActivitiesByDate = (acts: PersonalActivityRecord[]) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: {
      TODAY: PersonalActivityRecord[];
      YESTERDAY: PersonalActivityRecord[];
      EARLIER: PersonalActivityRecord[];
    } = {
      TODAY: [],
      YESTERDAY: [],
      EARLIER: [],
    };

    acts.forEach((act) => {
      const actDate = new Date(act.timestamp);
      if (actDate.toDateString() === today.toDateString()) {
        groups.TODAY.push(act);
      } else if (actDate.toDateString() === yesterday.toDateString()) {
        groups.YESTERDAY.push(act);
      } else {
        groups.EARLIER.push(act);
      }
    });

    return groups;
  };

  const accessCtx = resolveAccessContext(authSession);
  const isPersonalUser = accessCtx.isAuthenticated && accessCtx.personalUser !== null;

  const navigateTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const reloadData = async () => {
    const current = getCurrentAuthSession();
    setAuthSession(current);
    if (!current.uid) {
      setSavedCompanies([]);
      setSavedProducts([]);
      setSavedServices([]);
      setCollections([]);
      setActivities([]);
      setResolvedCollectionData(null);
      setIsLoadingWorkspace(false);
      return;
    }

    try {
      // 1. Authoritative Firestore Sync
      await syncWorkspaceFromFirestore(current.uid);

      // 2. Resolve items & collections
      const [comps, prods, servs, inqs] = await Promise.all([
        getSavedCompanies(current.uid),
        getSavedProducts(current.uid),
        getSavedServices(current.uid),
        getUserInquiries(current.uid).catch(() => []),
      ]);

      const userCols = getUserCollections(current.uid);
      setSavedCompanies(comps);
      setSavedProducts(prods);
      setSavedServices(servs);
      setUserInquiries(inqs);
      setCollections(userCols);
      setActivities(getUserActivities(current.uid));
      setTrustProfile(getUserTrustProfile(current.uid));

      if (selectedCollectionId) {
        const colData = await getCollectionWithResolvedItems(current.uid, selectedCollectionId);
        setResolvedCollectionData(colData);
      }
    } catch (err: any) {
      console.warn("[PersonalWorkspace] Reload data fallback:", err);
      setWorkspaceError("Some cloud data could not be synchronized.");
    } finally {
      setIsLoadingWorkspace(false);
    }
  };

  useEffect(() => {
    const current = getCurrentAuthSession();
    if (current.uid) {
      const memberships = getUserMemberships(current.uid);
      const activeCtx = getActiveOrganizationContext(current.uid);
      const companyId = activeCtx?.companyId || (memberships.length > 0 ? memberships[0]?.companyId : null);
      if (companyId) {
        navigateTo("/studio");
        return;
      }
    }

    reloadData();
    const unsubWorkspace = subscribeToPersonalWorkspace(() => {
      reloadData();
    });

    const targetUid = authSession.uid || "usr-owner-001";
    const unsubInquiries = subscribeToUserInquiries(targetUid, (inqs) => {
      setUserInquiries(inqs);
    });

    const unsubSaved = subscribeToUserSavedItems(targetUid, () => {
      reloadData();
    });

    const unsubCols = subscribeToUserCollections(targetUid, () => {
      reloadData();
    });

    const unsubActs = subscribeToUserActivities(targetUid, () => {
      reloadData();
    });

    const unsubTrust = subscribeToTrustState(() => {
      if (authSession.uid) {
        setTrustProfile(getUserTrustProfile(authSession.uid));
      }
    });

    return () => {
      unsubWorkspace();
      unsubInquiries();
      unsubSaved();
      unsubCols();
      unsubActs();
      unsubTrust();
    };
  }, [authSession.uid, selectedCollectionId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenCollection = async (colId: string) => {
    setSelectedCollectionId(colId);
    setCollectionError(null);
    setIsRenamingCollection(false);
    if (authSession.uid) {
      const colData = await getCollectionWithResolvedItems(authSession.uid, colId);
      setResolvedCollectionData(colData);
      if (colData.collection) {
        setEditCollectionName(colData.collection.name);
        setEditCollectionDesc(colData.collection.description || "");
      }
    }
  };

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authSession.uid || !newCollectionName.trim()) return;
    setCollectionError(null);
    try {
      const col = createCollection(authSession.uid, newCollectionName, newCollectionDesc);
      setNewCollectionName("");
      setNewCollectionDesc("");
      setIsCreatingCollection(false);
      reloadData();
      handleOpenCollection(col.id);
    } catch (err: any) {
      setCollectionError(err.message || "Failed to create collection");
    }
  };

  const handleSaveRenameCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authSession.uid || !selectedCollectionId || !editCollectionName.trim()) return;
    setCollectionError(null);
    try {
      updateCollection(authSession.uid, selectedCollectionId, {
        name: editCollectionName,
        description: editCollectionDesc,
      });
      setIsRenamingCollection(false);
      reloadData();
    } catch (err: any) {
      setCollectionError(err.message || "Failed to rename collection");
    }
  };

  const handleDeleteCollection = (colId: string) => {
    if (!authSession.uid) return;
    deleteCollection(authSession.uid, colId);
    if (selectedCollectionId === colId) {
      setSelectedCollectionId(null);
      setResolvedCollectionData(null);
    }
    reloadData();
  };

  const handleRemoveCollectionItem = (itemId: string) => {
    if (!authSession.uid || !selectedCollectionId) return;
    removeItemFromCollection(authSession.uid, selectedCollectionId, itemId);
    reloadData();
  };

  const handleRemoveCompany = async (companyId: string) => {
    if (!authSession.uid) return;
    await removeSavedCompanyReference(authSession.uid, companyId);
    reloadData();
  };

  const handleRemoveProduct = async (productId: string) => {
    if (!authSession.uid) return;
    await removeSavedProductReference(authSession.uid, productId);
    reloadData();
  };

  const handleRemoveService = async (serviceId: string) => {
    if (!authSession.uid) return;
    await removeSavedServiceReference(authSession.uid, serviceId);
    reloadData();
  };

  const handleSignOut = async () => {
    await signOutCurrentUser();
    setUserMenuOpen(false);
    navigateTo("/gateway");
  };

  // Guard for non-authenticated guests
  if (!isPersonalUser || !authSession.uid) {
    return (
      <div
        id="personal-workspace-unauthenticated"
        className="min-h-screen bg-canvas text-graphite flex flex-col justify-between font-sans antialiased"
      >
        <header className="border-b border-line bg-white sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div
              onClick={() => navigateTo("/")}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-royal flex items-center justify-center text-white shadow-xs">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-graphite">
                MarineWorld.City
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <button
                onClick={() => navigateTo("/gateway")}
                className="text-stone hover:text-graphite font-semibold px-3 py-1.5 rounded-lg border border-line bg-white hover:bg-slate-50 transition cursor-pointer"
              >
                ← Back to Gateway
              </button>
              <button
                onClick={() => navigateTo("/login/personal")}
                className="text-white bg-royal hover:bg-royal-dark font-bold px-3.5 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-line rounded-2xl p-8 text-center space-y-6 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold uppercase tracking-tight text-graphite">
                Personal Workspace Required
              </h1>
              <p className="text-xs text-stone leading-relaxed">
                Please sign in with your personal visitor account to access your saved maritime companies, products, services, and custom collections.
              </p>
            </div>
            <div className="space-y-3 pt-2">
              <button
                id="btn-workspace-goto-login"
                onClick={() => navigateTo("/login/personal")}
                className="w-full py-2.5 px-4 rounded-xl bg-royal hover:bg-royal-dark text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Sign In to Personal Workspace
              </button>
              <button
                id="btn-workspace-goto-gateway"
                onClick={() => navigateTo("/gateway")}
                className="w-full py-2 text-xs font-semibold text-stone hover:text-graphite transition cursor-pointer"
              >
                Back to Access Gateway
              </button>
            </div>
          </div>
        </main>

        <footer className="py-6 border-t border-line text-center text-xs text-stone">
          <p>MarineWorld.City — Sovereign Maritime Operating Environment</p>
        </footer>
      </div>
    );
  }

  const displayName = accessCtx.personalUser?.displayName || "Personal Visitor";
  const userEmail = accessCtx.personalUser?.email || "visitor@marineworld.city";

  return (
    <div
      id="marineworld-personal-workspace"
      className="min-h-screen bg-canvas text-graphite flex flex-col justify-between font-sans antialiased"
    >
      {/* Standalone Personal Workspace Header: MarineWorld.City   <displayName> ▾ */}
      <header className="border-b border-line bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div
            onClick={() => {
              setActiveTab("overview");
              navigateTo("/workspace");
            }}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-royal flex items-center justify-center text-white shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-graphite">
              MarineWorld.City
            </span>
          </div>

          {/* User Profile Menu with Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              id="btn-personal-workspace-user-menu"
              onClick={() => setUserMenuOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white hover:bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-graphite shadow-sm transition cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-royal shrink-0" />
              <span id="personal-header-display-name" className="truncate max-w-[140px] sm:max-w-[200px]">
                {displayName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-stone shrink-0" />
            </button>

            {userMenuOpen && (
              <div
                id="dropdown-personal-workspace-menu"
                className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-line bg-white p-3 shadow-xl z-50 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150"
              >
                {/* User Identity Header */}
                <div className="p-2.5 bg-slate-50 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-graphite truncate">{displayName}</div>
                  <div className="text-[11px] font-mono text-stone truncate">{userEmail}</div>
                  <div className="pt-1">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-royal/10 text-royal">
                      PERSONAL VISITOR
                    </span>
                  </div>
                </div>

                {/* Dropdown Items */}
                <div className="pt-1 border-t border-line/60 space-y-0.5">
                  <button
                    type="button"
                    id="menu-item-my-workspace"
                    onClick={() => {
                      setActiveTab("overview");
                      navigateTo("/workspace");
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-100 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5 text-royal" />
                    <span>My Workspace</span>
                  </button>
                  <button
                    type="button"
                    id="menu-item-saved-companies"
                    onClick={() => {
                      setActiveTab("companies");
                      navigateTo("/saved/companies");
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Saved Companies</span>
                  </button>
                  <button
                    type="button"
                    id="menu-item-saved-products"
                    onClick={() => {
                      setActiveTab("products");
                      navigateTo("/saved/products");
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5 text-slate-500" />
                    <span>Saved Products</span>
                  </button>
                  <button
                    type="button"
                    id="menu-item-saved-services"
                    onClick={() => {
                      setActiveTab("services");
                      navigateTo("/saved/services");
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span>Saved Services</span>
                  </button>
                  <button
                    type="button"
                    id="menu-item-collections"
                    onClick={() => {
                      setActiveTab("collections");
                      navigateTo("/collections");
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Folder className="w-3.5 h-3.5 text-slate-500" />
                    <span>Collections</span>
                  </button>
                  <button
                    type="button"
                    id="menu-item-activity"
                    onClick={() => {
                      setActiveTab("activity");
                      navigateTo("/activity");
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5 text-slate-500" />
                    <span>Activity</span>
                  </button>
                  <button
                    type="button"
                    id="menu-item-account"
                    onClick={() => {
                      setActiveTab("account");
                      navigateTo("/account");
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                    <span>Account</span>
                  </button>
                </div>

                {/* CTA: CREATE YOUR AI-NATIVE COMPANY */}
                <div className="pt-1.5 border-t border-line/60">
                  <button
                    type="button"
                    id="menu-item-create-company"
                    onClick={() => {
                      navigateTo("/company/onboarding");
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold bg-royal text-white hover:bg-royal-dark flex items-center justify-between transition shadow-sm cursor-pointer"
                  >
                    <span>CREATE YOUR AI-NATIVE COMPANY</span>
                    <ArrowRight className="w-3.5 h-3.5 text-sky-200" />
                  </button>
                </div>

                {/* Sign Out */}
                <div className="pt-1.5 border-t border-line/60">
                  <button
                    type="button"
                    id="menu-item-signout"
                    onClick={handleSignOut}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center justify-between transition cursor-pointer"
                  >
                    <span>Sign Out</span>
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Workspace Header Banner */}
      <div className="bg-white border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-line text-slate-700 text-xs font-mono font-bold tracking-wide">
                <Compass className="w-3.5 h-3.5 text-royal" />
                <span>PERSONAL WORKSPACE</span>
              </div>
              <h1 id="workspace-header-title" className="text-2xl sm:text-3xl font-extrabold text-graphite tracking-tight uppercase">
                MY WORKSPACE
              </h1>
              <div className="flex items-center gap-3 text-xs text-stone">
                <span id="workspace-user-name" className="font-semibold text-graphite">
                  {displayName}
                </span>
                <span>•</span>
                <span id="workspace-user-email" className="font-mono text-slate-500">
                  {userEmail}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified Identity</span>
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <a
                id="btn-workspace-create-company-cta"
                href="/company/onboarding"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo("/company/onboarding");
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-royal hover:bg-royal-dark text-white font-bold text-xs uppercase tracking-wider shadow-sm transition"
              >
                <ArrowRight className="w-4 h-4 text-sky-200" />
                <span>CREATE YOUR AI-NATIVE COMPANY</span>
              </a>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto pt-6 border-t border-line/60 mt-6 scrollbar-none">
            {[
              { id: "overview", label: "Overview", icon: Compass, route: "/workspace" },
              { id: "companies", label: `Saved Companies (${savedCompanies.length})`, icon: Building2, route: "/saved/companies" },
              { id: "products", label: `Saved Products (${savedProducts.length})`, icon: Package, route: "/saved/products" },
              { id: "services", label: `Saved Services (${savedServices.length})`, icon: Layers, route: "/saved/services" },
              {
                id: "inquiries",
                label: `My Inquiries (${userInquiries.length})`,
                icon: MessageSquare,
                route: "/workspace/inquiries",
                unreadCount: userInquiries.filter((i) => i.status === "WAITING_FOR_REQUESTER").length,
              },
              { id: "collections", label: `Collections (${collections.length})`, icon: Folder, route: "/collections" },
              { id: "activity", label: `Recent Activity (${activities.length})`, icon: Activity, route: "/activity" },
              { id: "account", label: "Account", icon: UserCheck, route: "/account" },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-workspace-${tab.id}`}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    navigateTo(tab.route);
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-stone hover:text-graphite hover:bg-slate-100"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-sky-300" : "text-stone"}`} />
                  <span>{tab.label}</span>
                  {tab.unreadCount !== undefined && tab.unreadCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB: OVERVIEW */}
        {activeTab === "overview" && (
          <div id="section-workspace-overview" className="space-y-8">
            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div
                id="card-summary-companies"
                onClick={() => {
                  setActiveTab("companies");
                  navigateTo("/saved/companies");
                }}
                className="bg-white border border-line rounded-2xl p-5 hover:border-slate-300 transition cursor-pointer space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between text-stone">
                  <span className="text-xs font-semibold uppercase tracking-wider">Saved Companies</span>
                  <Building2 className="w-4 h-4 text-royal" />
                </div>
                <div className="text-3xl font-extrabold text-graphite">{savedCompanies.length}</div>
                <div className="text-[11px] text-stone">Bookmarked maritime leaders</div>
              </div>

              <div
                id="card-summary-products"
                onClick={() => {
                  setActiveTab("products");
                  navigateTo("/saved/products");
                }}
                className="bg-white border border-line rounded-2xl p-5 hover:border-slate-300 transition cursor-pointer space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between text-stone">
                  <span className="text-xs font-semibold uppercase tracking-wider">Saved Products</span>
                  <Package className="w-4 h-4 text-royal" />
                </div>
                <div className="text-3xl font-extrabold text-graphite">{savedProducts.length}</div>
                <div className="text-[11px] text-stone">Vessels, hardware & components</div>
              </div>

              <div
                id="card-summary-services"
                onClick={() => {
                  setActiveTab("services");
                  navigateTo("/saved/services");
                }}
                className="bg-white border border-line rounded-2xl p-5 hover:border-slate-300 transition cursor-pointer space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between text-stone">
                  <span className="text-xs font-semibold uppercase tracking-wider">Saved Services</span>
                  <Layers className="w-4 h-4 text-royal" />
                </div>
                <div className="text-3xl font-extrabold text-graphite">{savedServices.length}</div>
                <div className="text-[11px] text-stone">Specialized capabilities & engineering</div>
              </div>

              <div
                id="card-summary-inquiries"
                onClick={() => {
                  setActiveTab("inquiries");
                  navigateTo("/workspace/inquiries");
                }}
                className="bg-white border border-line rounded-2xl p-5 hover:border-slate-300 transition cursor-pointer space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between text-stone">
                  <span className="text-xs font-semibold uppercase tracking-wider">My Inquiries</span>
                  <MessageSquare className="w-4 h-4 text-royal" />
                </div>
                <div className="text-3xl font-extrabold text-graphite">{userInquiries.length}</div>
                <div className="text-[11px] text-stone">Commercial RFQs & Direct Messages</div>
              </div>

              <div
                id="card-summary-collections"
                onClick={() => {
                  setActiveTab("collections");
                  navigateTo("/collections");
                }}
                className="bg-white border border-line rounded-2xl p-5 hover:border-slate-300 transition cursor-pointer space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between text-stone">
                  <span className="text-xs font-semibold uppercase tracking-wider">Collections</span>
                  <Folder className="w-4 h-4 text-royal" />
                </div>
                <div className="text-3xl font-extrabold text-graphite">{collections.length}</div>
                <div className="text-[11px] text-stone">Custom curated project folders</div>
              </div>
            </div>

            {/* Quick Preview Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Saved Companies */}
              <div className="bg-white border border-line rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">Recent Saved Companies</h2>
                  <button
                    onClick={() => {
                      setActiveTab("companies");
                      navigateTo("/saved/companies");
                    }}
                    className="text-xs font-semibold text-royal hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {savedCompanies.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-line rounded-xl space-y-2">
                    <Building2 className="w-8 h-8 text-stone/40 mx-auto" />
                    <div className="text-xs font-medium text-stone">No saved companies yet</div>
                    <a
                      href="/companies"
                      className="text-xs font-semibold text-royal hover:underline inline-block"
                    >
                      Explore Companies →
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedCompanies.slice(0, 3).map(({ reference, entity, isAvailable }) => (
                      <div
                        key={reference.companyId}
                        className="p-3 rounded-xl border border-line/80 hover:border-slate-300 flex items-center justify-between gap-3 transition"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-graphite truncate">
                            {(entity as any)?.displayName || (entity as any)?.name || (isAvailable ? reference.companyId : "Company no longer available")}
                          </div>
                          <div className="text-[11px] text-stone font-mono">{reference.businessId}</div>
                        </div>
                        <a
                          href={`/companies/${entity?.slug || reference.companyId}`}
                          className="p-1.5 text-stone hover:text-royal transition"
                          title="View Company"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Activity Snapshot */}
              <div className="bg-white border border-line rounded-2xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-graphite flex items-center gap-2">
                    <Activity className="w-4 h-4 text-royal" />
                    <span>Recent Activity</span>
                  </h2>
                  <button
                    id="btn-overview-full-activity"
                    onClick={() => {
                      setActiveTab("activity");
                      navigateTo("/workspace/activity");
                    }}
                    className="text-xs font-semibold text-royal hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full Log</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {activities.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-line rounded-xl space-y-2">
                    <Activity className="w-8 h-8 text-stone/40 mx-auto" />
                    <div className="text-xs font-medium text-stone">No recent activity recorded</div>
                    <div className="text-[11px] text-stone">Actions like browsing and saving items will appear here</div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activities.slice(0, 5).map((act) => {
                      const action = getActivityLinkAndAction(act);
                      return (
                        <div
                          key={act.id}
                          id={`overview-activity-item-${act.id}`}
                          className="p-3 rounded-xl bg-slate-50 border border-line/60 flex items-center justify-between gap-3 text-xs hover:bg-slate-100/70 transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="px-2 py-0.5 rounded-md bg-white border border-line font-mono text-[10px] font-bold text-slate-700 shrink-0">
                              {act.type.replace(/_/g, " ")}
                            </span>
                            <span className="font-medium text-graphite truncate">
                              {formatActivityTitle(act)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="text-[10px] text-stone font-mono">
                              {new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {action.href && (
                              <a
                                href={action.href}
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigateTo(action.href!);
                                }}
                                className="px-2 py-1 rounded-md bg-white border border-line text-royal hover:bg-royal hover:text-white font-bold text-[10px] uppercase tracking-wider transition"
                              >
                                {action.label}
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: COMPANIES */}
        {activeTab === "companies" && (
          <div id="section-workspace-companies" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-graphite uppercase tracking-tight">Saved Companies</h2>
                <p className="text-xs text-stone">Bookmarked maritime enterprises and supply chain leaders.</p>
              </div>
              <a
                href="/companies"
                className="text-xs font-semibold text-royal hover:underline"
              >
                Explore AI-Native Companies →
              </a>
            </div>

            {savedCompanies.length === 0 ? (
              <div id="empty-saved-companies" className="bg-white border border-line rounded-2xl p-12 text-center space-y-4">
                <Building2 className="w-12 h-12 text-stone/40 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-graphite uppercase">No Saved Companies</h3>
                  <p className="text-xs text-stone max-w-sm mx-auto">
                    You haven&apos;t saved any companies yet. Explore verified shipyards, naval architects, and component suppliers.
                  </p>
                </div>
                <a
                  href="/companies"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-royal text-white text-xs font-bold uppercase tracking-wide hover:bg-royal-dark transition"
                >
                  <span>Explore Companies</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedCompanies.map(({ reference, entity, isAvailable }) => (
                  <div
                    key={reference.companyId}
                    id={`card-saved-company-${reference.companyId}`}
                    className="bg-white border border-line rounded-2xl p-6 space-y-4 hover:border-slate-300 transition flex flex-col justify-between shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                          {(entity as any)?.sector || (entity as any)?.sectorCityId ? (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold uppercase">
                              {(entity as any)?.sector || (entity as any)?.sectorCityId}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold uppercase">
                              Company
                            </span>
                          )}
                          {(entity as any)?.verificationStatus === "verified" || (entity as any)?.verificationStatus === "VERIFIED" ? (
                            <span className="px-2 py-0.5 rounded bg-soft text-royal font-bold">
                              ✓ VERIFIED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-canvas border border-line text-stone">
                              PUBLIC NODE
                            </span>
                          )}
                        </div>
                        <button
                          id={`btn-remove-saved-company-${reference.companyId}`}
                          onClick={() => handleRemoveCompany(reference.companyId)}
                          className="text-stone hover:text-rose-600 transition p-1 cursor-pointer"
                          title="Remove bookmark"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <h3 className="font-bold text-base text-graphite">
                          {(entity as any)?.displayName || (entity as any)?.name || (isAvailable ? reference.companyId : "Company no longer available")}
                        </h3>
                        <div className="font-mono text-[11px] text-mute mt-0.5">
                          ID: {reference.businessId || reference.companyId.toUpperCase()}
                        </div>
                        <p className="text-xs text-stone line-clamp-2 mt-1.5">
                          {(entity as any)?.summary || (entity as any)?.tagline || entity?.description || "Verified maritime ecosystem company profile."}
                        </p>
                      </div>

                      {(entity as any)?.city && (
                        <div className="flex items-center gap-1.5 text-xs text-stone font-mono">
                          <span className="text-[11px] text-mute">SECTOR CITY:</span>
                          <span className="font-semibold text-graphite">{(entity as any).city}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-line/60 flex items-center justify-between gap-2">
                      <button
                        id={`btn-remove-saved-company-${reference.companyId}`}
                        onClick={() => handleRemoveCompany(reference.companyId)}
                        className="font-mono text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                      >
                        REMOVE SAVED
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          id={`btn-ask-ai-company-${reference.companyId}`}
                          onClick={() =>
                            handleOpenAIModal(
                              "COMPANY",
                              reference.companyId,
                              (entity as any)?.displayName || (entity as any)?.name || reference.companyId,
                              reference.companyId,
                              (entity as any)?.displayName || (entity as any)?.name || reference.companyId,
                              entity
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-soft text-royal text-[11px] font-bold uppercase tracking-wider hover:bg-royal/10 transition cursor-pointer"
                        >
                          <Cpu className="w-3 h-3" />
                          <span>ASK AI</span>
                        </button>
                        <a
                          id={`btn-explore-company-${reference.companyId}`}
                          href={`/companies/${entity?.slug || reference.companyId}`}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-royal text-white text-[11px] font-bold uppercase tracking-wider hover:bg-royal-dark transition"
                        >
                          <span>EXPLORE</span>
                          <ArrowRight className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: PRODUCTS */}
        {activeTab === "products" && (
          <div id="section-workspace-products" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-graphite uppercase tracking-tight">Saved Products</h2>
                <p className="text-xs text-stone">Bookmarked vessels, marine equipment, propulsion, and technical packages.</p>
              </div>
              <a
                href="/products"
                className="text-xs font-semibold text-royal hover:underline"
              >
                Browse Products Catalog →
              </a>
            </div>

            {savedProducts.length === 0 ? (
              <div id="empty-saved-products" className="bg-white border border-line rounded-2xl p-12 text-center space-y-4">
                <Package className="w-12 h-12 text-stone/40 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-graphite uppercase">No Saved Products</h3>
                  <p className="text-xs text-stone max-w-sm mx-auto">
                    You haven&apos;t bookmarked any products yet. Discover vessel designs, engines, and navigation systems.
                  </p>
                </div>
                <a
                  href="/products"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-royal text-white text-xs font-bold uppercase tracking-wide hover:bg-royal-dark transition"
                >
                  <span>Browse Products</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedProducts.map(({ reference, entity, isAvailable }) => (
                  <div
                    key={reference.productId}
                    id={`card-saved-product-${reference.productId}`}
                    className="bg-white border border-line rounded-2xl p-6 space-y-4 hover:border-slate-300 transition flex flex-col justify-between shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                          {entity?.category ? (
                            <span className="px-2 py-0.5 rounded bg-soft text-royal font-bold uppercase">
                              {entity.category}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold uppercase">
                              Product
                            </span>
                          )}
                          {!isAvailable ? (
                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200">
                              ITEM NO LONGER AVAILABLE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-canvas border border-line text-stone">
                              {entity?.availability || "AVAILABLE"}
                            </span>
                          )}
                        </div>
                        <button
                          id={`btn-remove-saved-product-${reference.productId}`}
                          onClick={() => handleRemoveProduct(reference.productId)}
                          className="text-stone hover:text-rose-600 transition p-1 cursor-pointer"
                          title="Remove bookmark"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <h3 className="font-bold text-base text-graphite">
                          {entity?.name || (!isAvailable ? "ITEM NO LONGER AVAILABLE" : reference.productId)}
                        </h3>
                        {reference.businessId && (
                          <div className="font-mono text-[11px] text-mute mt-0.5">
                            REF: {reference.businessId}
                          </div>
                        )}
                        <p className="text-xs text-stone line-clamp-2 mt-1.5">
                          {entity?.shortDescription || entity?.description || (!isAvailable ? "This item is no longer available in the public catalog." : "Verified maritime product specification.")}
                        </p>
                      </div>

                      {entity?.category && isAvailable && (
                        <div className="text-xs text-stone">
                          Category: <span className="font-medium text-graphite">{entity.category}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-line/60 flex items-center justify-between gap-2">
                      <button
                        id={`btn-remove-saved-product-${reference.productId}`}
                        onClick={() => handleRemoveProduct(reference.productId)}
                        className="font-mono text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                      >
                        REMOVE
                      </button>
                      <div className="flex items-center gap-2">
                        {isAvailable && (
                          <button
                            id={`btn-ask-ai-product-${reference.productId}`}
                            onClick={() =>
                              handleOpenAIModal(
                                "PRODUCT",
                                reference.productId,
                                entity?.name || reference.productId,
                                reference.companyId,
                                reference.companyId,
                                entity
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-soft text-royal text-[11px] font-bold uppercase tracking-wider hover:bg-royal/10 transition cursor-pointer"
                          >
                            <Cpu className="w-3 h-3" />
                            <span>ASK AI</span>
                          </button>
                        )}
                        {isAvailable ? (
                          <a
                            id={`link-open-product-${reference.productId}`}
                            href={`/companies/${reference.companyId}/products?product=${entity?.slug || reference.productId}`}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-royal hover:underline uppercase tracking-wide"
                          >
                            <span>OPEN PRODUCT</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="font-mono text-[11px] text-mute">UNAVAILABLE</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: SERVICES */}
        {activeTab === "services" && (
          <div id="section-workspace-services" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-graphite uppercase tracking-tight">Saved Services</h2>
                <p className="text-xs text-stone">Bookmarked naval engineering, survey, classification, and refit capabilities.</p>
              </div>
              <a
                href="/services"
                className="text-xs font-semibold text-royal hover:underline"
              >
                Browse Services Directory →
              </a>
            </div>

            {savedServices.length === 0 ? (
              <div id="empty-saved-services" className="bg-white border border-line rounded-2xl p-12 text-center space-y-4">
                <Layers className="w-12 h-12 text-stone/40 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-graphite uppercase">No Saved Services</h3>
                  <p className="text-xs text-stone max-w-sm mx-auto">
                    You haven&apos;t bookmarked any services yet. Find naval architecture, refit yards, and marine certification services.
                  </p>
                </div>
                <a
                  href="/services"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-royal text-white text-xs font-bold uppercase tracking-wide hover:bg-royal-dark transition"
                >
                  <span>Browse Services</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedServices.map(({ reference, entity, isAvailable }) => (
                  <div
                    key={reference.serviceId}
                    id={`card-saved-service-${reference.serviceId}`}
                    className="bg-white border border-line rounded-2xl p-6 space-y-4 hover:border-slate-300 transition flex flex-col justify-between shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                          {entity?.category ? (
                            <span className="px-2 py-0.5 rounded bg-soft text-royal font-bold uppercase">
                              {entity.category}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold uppercase">
                              Service
                            </span>
                          )}
                          {!isAvailable ? (
                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200">
                              ITEM NO LONGER AVAILABLE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-canvas border border-line text-stone">
                              {entity?.availability || "AVAILABLE"}
                            </span>
                          )}
                        </div>
                        <button
                          id={`btn-remove-saved-service-${reference.serviceId}`}
                          onClick={() => handleRemoveService(reference.serviceId)}
                          className="text-stone hover:text-rose-600 transition p-1 cursor-pointer"
                          title="Remove bookmark"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <h3 className="font-bold text-base text-graphite">
                          {entity?.name || (!isAvailable ? "ITEM NO LONGER AVAILABLE" : reference.serviceId)}
                        </h3>
                        {reference.businessId && (
                          <div className="font-mono text-[11px] text-mute mt-0.5">
                            REF: {reference.businessId}
                          </div>
                        )}
                        <p className="text-xs text-stone line-clamp-2 mt-1.5">
                          {entity?.shortDescription || entity?.description || (!isAvailable ? "This service is no longer available in the public catalog." : "Verified maritime professional service offering.")}
                        </p>
                      </div>

                      {entity?.category && isAvailable && (
                        <div className="text-xs text-stone">
                          Domain: <span className="font-medium text-graphite">{entity.category}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-line/60 flex items-center justify-between gap-2">
                      <button
                        id={`btn-remove-saved-service-${reference.serviceId}`}
                        onClick={() => handleRemoveService(reference.serviceId)}
                        className="font-mono text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                      >
                        REMOVE
                      </button>
                      <div className="flex items-center gap-2">
                        {isAvailable && (
                          <button
                            id={`btn-ask-ai-service-${reference.serviceId}`}
                            onClick={() =>
                              handleOpenAIModal(
                                "SERVICE",
                                reference.serviceId,
                                entity?.name || reference.serviceId,
                                reference.companyId,
                                reference.companyId,
                                entity
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-soft text-royal text-[11px] font-bold uppercase tracking-wider hover:bg-royal/10 transition cursor-pointer"
                          >
                            <Cpu className="w-3 h-3" />
                            <span>ASK AI</span>
                          </button>
                        )}
                        {isAvailable ? (
                          <a
                            id={`link-open-service-${reference.serviceId}`}
                            href={`/companies/${reference.companyId}/services?service=${entity?.slug || reference.serviceId}`}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-royal hover:underline uppercase tracking-wide"
                          >
                            <span>OPEN SERVICE</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="font-mono text-[11px] text-mute">UNAVAILABLE</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: MY INQUIRIES */}
        {activeTab === "inquiries" && (
          <div id="section-workspace-inquiries" className="space-y-6">
            <MyInquiriesWorkspaceModule
              onNavigate={navigateTo}
              onOpenOfferingDetail={(compSlug, offId, type) => {
                navigateTo(`/companies/${compSlug}/${type === "service" ? "services" : "products"}/${offId}`);
              }}
            />
          </div>
        )}

        {/* TAB: COLLECTIONS */}
        {activeTab === "collections" && (
          <div id="section-workspace-collections" className="space-y-6">
            {collectionError && (
              <div
                id="banner-collection-error"
                className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between"
              >
                <span>{collectionError}</span>
                <button
                  onClick={() => setCollectionError(null)}
                  className="text-rose-600 hover:text-rose-900 font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            {/* If a collection is selected, render Collection Detail View */}
            {selectedCollectionId && resolvedCollectionData?.collection ? (
              <div id="collection-detail-view" className="space-y-6 animate-in fade-in">
                {/* Header & Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-line">
                  <div className="space-y-1">
                    <button
                      id="btn-back-to-collections"
                      onClick={() => {
                        setSelectedCollectionId(null);
                        setResolvedCollectionData(null);
                        setIsRenamingCollection(false);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-royal hover:underline cursor-pointer mb-2"
                    >
                      <span>← Back to all collections</span>
                    </button>
                    {!isRenamingCollection ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h2
                            id="selected-collection-title"
                            className="text-xl font-bold text-graphite uppercase tracking-tight"
                          >
                            {resolvedCollectionData.collection.name}
                          </h2>
                          <button
                            id="btn-edit-collection-name"
                            onClick={() => {
                              setIsRenamingCollection(true);
                              setEditCollectionName(resolvedCollectionData.collection!.name);
                              setEditCollectionDesc(resolvedCollectionData.collection!.description || "");
                            }}
                            className="text-xs font-semibold text-royal hover:underline cursor-pointer"
                          >
                            Rename / Edit
                          </button>
                        </div>
                        {resolvedCollectionData.collection.description && (
                          <p id="selected-collection-desc" className="text-xs text-stone">
                            {resolvedCollectionData.collection.description}
                          </p>
                        )}
                      </div>
                    ) : (
                      <form
                        id="form-rename-collection"
                        onSubmit={handleSaveRenameCollection}
                        className="space-y-3 p-4 bg-slate-50 border border-line rounded-xl max-w-lg"
                      >
                        <div>
                          <label className="block text-[11px] font-bold text-graphite mb-1">
                            Collection Name *
                          </label>
                          <input
                            id="input-rename-collection-name"
                            type="text"
                            required
                            value={editCollectionName}
                            onChange={(e) => setEditCollectionName(e.target.value)}
                            className="w-full px-3 py-1.5 border border-line rounded-lg text-xs bg-white text-graphite focus:ring-2 focus:ring-royal/20 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-graphite mb-1">
                            Description
                          </label>
                          <input
                            id="input-rename-collection-desc"
                            type="text"
                            value={editCollectionDesc}
                            onChange={(e) => setEditCollectionDesc(e.target.value)}
                            className="w-full px-3 py-1.5 border border-line rounded-lg text-xs bg-white text-graphite focus:ring-2 focus:ring-royal/20 outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsRenamingCollection(false)}
                            className="px-3 py-1 text-xs text-stone hover:text-graphite cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            id="btn-save-collection-rename"
                            className="px-3.5 py-1.5 bg-royal text-white text-xs font-bold uppercase rounded-lg hover:bg-royal-dark transition cursor-pointer"
                          >
                            Save Changes
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="btn-delete-selected-collection"
                      onClick={() => handleDeleteCollection(resolvedCollectionData.collection!.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Collection</span>
                    </button>
                  </div>
                </div>

                {/* Collection Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-white border border-line">
                    <div className="text-mute text-[10px] uppercase font-bold">Total Items</div>
                    <div className="text-lg font-bold text-graphite mt-0.5">
                      {resolvedCollectionData.stats.totalItems}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-line">
                    <div className="text-mute text-[10px] uppercase font-bold">Companies</div>
                    <div className="text-lg font-bold text-graphite mt-0.5">
                      {resolvedCollectionData.stats.companyCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-line">
                    <div className="text-mute text-[10px] uppercase font-bold">Products</div>
                    <div className="text-lg font-bold text-graphite mt-0.5">
                      {resolvedCollectionData.stats.productCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-line">
                    <div className="text-mute text-[10px] uppercase font-bold">Services</div>
                    <div className="text-lg font-bold text-graphite mt-0.5">
                      {resolvedCollectionData.stats.serviceCount}
                    </div>
                  </div>
                </div>

                {/* Resolved Items List */}
                {resolvedCollectionData.resolvedItems.length === 0 ? (
                  <div
                    id="empty-collection-items"
                    className="bg-white border border-line rounded-2xl p-12 text-center space-y-4"
                  >
                    <Folder className="w-12 h-12 text-stone/40 mx-auto" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-graphite uppercase">
                        This Collection is Empty
                      </h3>
                      <p className="text-xs text-stone max-w-sm mx-auto">
                        Add public companies, products, or specialized maritime services using the &apos;Add to Collection&apos; button across the directory.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <a
                        href="/companies"
                        className="px-3.5 py-1.5 rounded-xl bg-royal text-white text-xs font-bold uppercase hover:bg-royal-dark transition"
                      >
                        Explore Companies
                      </a>
                      <a
                        href="/products"
                        className="px-3.5 py-1.5 rounded-xl border border-line bg-white text-graphite text-xs font-semibold hover:bg-slate-50 transition"
                      >
                        Explore Products
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {resolvedCollectionData.resolvedItems.map(({ item, entity, displayName, isAvailable }) => (
                      <div
                        key={item.id}
                        id={`collection-item-${item.id}`}
                        className="bg-white border border-line rounded-2xl p-5 space-y-3 hover:border-slate-300 transition flex flex-col justify-between shadow-xs"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded bg-soft text-royal font-mono text-[10px] font-bold uppercase">
                              {item.type}
                            </span>
                            {!isAvailable && (
                              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-mono text-[9.5px] font-bold border border-rose-200">
                                UNAVAILABLE
                              </span>
                            )}
                          </div>

                          <div>
                            <h4 className="font-bold text-sm text-graphite line-clamp-1">
                              {displayName}
                            </h4>
                            {item.businessId && (
                              <div className="font-mono text-[10.5px] text-mute">
                                {item.businessId}
                              </div>
                            )}
                            <p className="text-xs text-stone line-clamp-2 mt-1">
                              {(entity as any)?.shortDescription ||
                                (entity as any)?.description ||
                                (isAvailable ? "Curated maritime entity specification." : "This entity is no longer available in the public directory.")}
                            </p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-line/60 flex items-center justify-between text-xs">
                          <button
                            id={`btn-remove-col-item-${item.id}`}
                            onClick={() => handleRemoveCollectionItem(item.id)}
                            className="font-mono text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                          >
                            REMOVE FROM COLLECTION
                          </button>
                          {isAvailable && (
                            <a
                              href={
                                item.type === "company"
                                  ? `/companies/${(entity as any)?.slug || item.referenceId}`
                                  : item.type === "product"
                                  ? `/companies/${item.companyId}/products?product=${(entity as any)?.slug || item.referenceId}`
                                  : `/companies/${item.companyId}/services?service=${(entity as any)?.slug || item.referenceId}`
                              }
                              className="inline-flex items-center gap-1 font-bold text-royal hover:underline uppercase tracking-wider text-[11px]"
                            >
                              <span>VIEW</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* All Collections Overview List */
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-graphite uppercase tracking-tight">Curated Collections</h2>
                    <p className="text-xs text-stone">Custom project portfolios and procurement packages.</p>
                  </div>
                  {!isCreatingCollection && (
                    <button
                      id="btn-new-collection"
                      onClick={() => {
                        setIsCreatingCollection(true);
                        setCollectionError(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-royal text-white text-xs font-bold uppercase tracking-wide hover:bg-royal-dark transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Collection</span>
                    </button>
                  )}
                </div>

                {/* Create Collection Form */}
                {isCreatingCollection && (
                  <form
                    id="form-create-collection"
                    onSubmit={handleCreateCollection}
                    className="bg-white border-2 border-royal/30 rounded-2xl p-6 space-y-4 animate-in fade-in"
                  >
                    <div className="font-bold text-sm text-graphite">Create New Curated Collection</div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-graphite mb-1">Collection Name *</label>
                        <input
                          id="input-collection-name"
                          type="text"
                          required
                          value={newCollectionName}
                          onChange={(e) => setNewCollectionName(e.target.value)}
                          placeholder="e.g. 2026 Retrofit Fleet Suppliers"
                          className="w-full px-3.5 py-2 border border-line rounded-xl text-xs text-graphite bg-white focus:ring-2 focus:ring-royal/20 focus:border-royal outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-graphite mb-1">Description (Optional)</label>
                        <input
                          id="input-collection-desc"
                          type="text"
                          value={newCollectionDesc}
                          onChange={(e) => setNewCollectionDesc(e.target.value)}
                          placeholder="e.g. Propulsion vendors and naval architects for hydrogen retrofitting"
                          className="w-full px-3.5 py-2 border border-line rounded-xl text-xs text-graphite bg-white focus:ring-2 focus:ring-royal/20 focus:border-royal outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsCreatingCollection(false)}
                        className="px-3 py-1.5 text-xs font-medium text-stone hover:text-graphite transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        id="btn-submit-collection"
                        className="px-4 py-2 rounded-xl bg-royal text-white text-xs font-bold uppercase tracking-wide hover:bg-royal-dark transition cursor-pointer"
                      >
                        Create Collection
                      </button>
                    </div>
                  </form>
                )}

                {collections.length === 0 ? (
                  <div id="empty-collections" className="bg-white border border-line rounded-2xl p-12 text-center space-y-4">
                    <Folder className="w-12 h-12 text-stone/40 mx-auto" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-graphite uppercase">No Collections Yet</h3>
                      <p className="text-xs text-stone max-w-sm mx-auto">
                        Create custom collections like &apos;2026 Yacht Refit&apos; or &apos;Green Shipping Suppliers&apos; to group your saved maritime assets.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsCreatingCollection(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-royal hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create your first collection</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {collections.map((col) => (
                      <div
                        key={col.id}
                        id={`collection-card-${col.id}`}
                        onClick={() => handleOpenCollection(col.id)}
                        className="bg-white border border-line rounded-2xl p-5 space-y-3 hover:border-royal/50 hover:shadow-xs transition cursor-pointer flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="font-bold text-sm text-graphite hover:text-royal transition-colors">
                                {col.name}
                              </div>
                              {col.description && <p className="text-xs text-stone line-clamp-2">{col.description}</p>}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCollection(col.id);
                              }}
                              className="text-stone hover:text-rose-600 transition p-1 cursor-pointer"
                              title="Delete collection"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-line/60 flex items-center justify-between text-xs">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[10px] font-semibold text-slate-700">
                            {col.items.length} items referenced
                          </span>
                          <span className="text-royal font-semibold text-xs inline-flex items-center gap-1">
                            <span>Open Collection</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB: ACTIVITY */}
        {activeTab === "activity" && (
          <div id="section-workspace-activity" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-graphite uppercase tracking-tight">Recent Activity</h2>
                <p className="text-xs text-stone">Chronological log of your discovery and bookmarking actions.</p>
              </div>

              {activities.length > 0 && (
                <button
                  type="button"
                  id="btn-clear-activity-dialog"
                  onClick={() => setIsConfirmingClearActivity(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line text-xs font-semibold text-stone hover:text-rose-600 hover:border-rose-200 transition self-start sm:self-auto cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>CLEAR ACTIVITY</span>
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            {activities.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: "ALL", label: "ALL", count: activities.length },
                  { id: "COMPANIES", label: "COMPANIES", count: activities.filter((a) => a.type.includes("COMPANY")).length },
                  { id: "PRODUCTS", label: "PRODUCTS", count: activities.filter((a) => a.type.includes("PRODUCT")).length },
                  { id: "SERVICES", label: "SERVICES", count: activities.filter((a) => a.type.includes("SERVICE")).length },
                  { id: "COLLECTIONS", label: "COLLECTIONS", count: activities.filter((a) => a.type.includes("COLLECTION")).length },
                ].map((f) => (
                  <button
                    key={f.id}
                    id={`filter-activity-${f.id.toLowerCase()}`}
                    onClick={() => setActivityFilter(f.id as any)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                      activityFilter === f.id
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-white border border-line text-stone hover:text-graphite hover:bg-slate-50"
                    }`}
                  >
                    <span>{f.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                        activityFilter === f.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Activity List or Empty State */}
            {(() => {
              const filteredList = activities.filter((a) => {
                if (activityFilter === "ALL") return true;
                if (activityFilter === "COMPANIES") return a.type.includes("COMPANY");
                if (activityFilter === "PRODUCTS") return a.type.includes("PRODUCT");
                if (activityFilter === "SERVICES") return a.type.includes("SERVICE");
                if (activityFilter === "COLLECTIONS") return a.type.includes("COLLECTION");
                return true;
              });

              if (filteredList.length === 0) {
                return (
                  <div id="empty-activity" className="bg-white border border-line rounded-2xl p-12 text-center space-y-4">
                    <Activity className="w-12 h-12 text-stone/40 mx-auto" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-graphite uppercase">No activity yet.</h3>
                      <p className="text-xs text-stone max-w-sm mx-auto">
                        Your recent MarineWorld discoveries and saved actions will appear here.
                      </p>
                    </div>
                    <a
                      id="btn-activity-explore-cta"
                      href="/companies"
                      onClick={(e) => {
                        e.preventDefault();
                        navigateTo("/companies");
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-royal text-white text-xs font-bold uppercase tracking-wider hover:bg-royal-dark transition shadow-sm"
                    >
                      <Compass className="w-3.5 h-3.5 text-sky-200" />
                      <span>EXPLORE MARINEWORLD</span>
                    </a>
                  </div>
                );
              }

              const grouped = groupActivitiesByDate(filteredList);

              return (
                <div className="space-y-6">
                  {(["TODAY", "YESTERDAY", "EARLIER"] as const).map((period) => {
                    const items = grouped[period];
                    if (items.length === 0) return null;

                    return (
                      <div key={period} className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-stone uppercase tracking-wider">
                          <Clock className="w-3.5 h-3.5 text-royal" />
                          <span>{period}</span>
                          <span className="text-[10px] text-stone font-normal">({items.length})</span>
                        </div>

                        <div className="bg-white border border-line rounded-2xl divide-y divide-line overflow-hidden shadow-xs">
                          {items.map((act) => {
                            const action = getActivityLinkAndAction(act);
                            return (
                              <div
                                key={act.id}
                                id={`activity-item-${act.id}`}
                                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/70 transition"
                              >
                                <div className="flex items-start sm:items-center gap-3">
                                  <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-line font-mono text-[10px] font-bold text-slate-700 shrink-0">
                                    {act.type.replace(/_/g, " ")}
                                  </span>
                                  <div className="space-y-0.5">
                                    <div className="font-semibold text-graphite">
                                      {formatActivityTitle(act)}
                                    </div>
                                    <div className="text-[11px] text-stone font-mono">
                                      {new Date(act.timestamp).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                      })}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                  {action.isAvailable && action.href ? (
                                    <a
                                      id={`btn-act-action-${act.id}`}
                                      href={action.href}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        navigateTo(action.href!);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-royal/10 text-royal hover:bg-royal hover:text-white font-bold text-xs uppercase tracking-wider transition"
                                    >
                                      <span>{action.label}</span>
                                      <ChevronRight className="w-3 h-3" />
                                    </a>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-md bg-slate-100 text-stone font-mono text-[10px] uppercase">
                                      ITEM NO LONGER AVAILABLE
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Clear Activity Confirmation Modal */}
            {isConfirmingClearActivity && (
              <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white border border-line rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-graphite uppercase">Clear Activity History</h3>
                      <p className="text-xs text-stone">Remove your personal discovery timeline.</p>
                    </div>
                  </div>
                  <p className="text-xs text-stone leading-relaxed">
                    This will clear your personal discovery timeline. Your saved companies, saved products, saved services, and collections will <strong>not</strong> be deleted.
                  </p>
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      id="btn-cancel-clear-activity"
                      onClick={() => setIsConfirmingClearActivity(false)}
                      className="px-4 py-2 rounded-xl border border-line text-xs font-semibold text-stone hover:text-graphite transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      id="btn-confirm-clear-activity"
                      onClick={async () => {
                        if (authSession.uid) {
                          clearUserActivities(authSession.uid);
                          await reloadData();
                        }
                        setIsConfirmingClearActivity(false);
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                    >
                      Clear Activity
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: ACCOUNT */}
        {activeTab === "account" && (
          <div id="section-workspace-account" className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-bold text-graphite uppercase tracking-tight">Personal Account</h2>
              <p className="text-xs text-stone">Human visitor identity details and sovereign company transition options.</p>
            </div>

            <div className="bg-white border border-line rounded-2xl p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <span className="text-xs font-semibold text-stone uppercase">Display Name</span>
                  <span id="account-field-name" className="text-sm font-bold text-graphite">{displayName}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <span className="text-xs font-semibold text-stone uppercase">Work Email</span>
                  <span id="account-field-email" className="text-sm font-mono text-graphite">{userEmail}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <span className="text-xs font-semibold text-stone uppercase">Verification State</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified Email</span>
                  </span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <span className="text-xs font-semibold text-stone uppercase">Human Verification</span>
                  <div className="flex items-center gap-2">
                    {trustProfile.trustState === "VERIFIED" ? (
                      <span id="account-field-human-verified" className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verified Human</span>
                      </span>
                    ) : trustProfile.trustState === "BLOCKED" ? (
                      <span id="account-field-human-blocked" className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
                        <AlertCircle className="w-3 h-3" />
                        <span>Blocked (Abuse Prevention)</span>
                      </span>
                    ) : trustProfile.trustState === "RATE_LIMITED" ? (
                      <span id="account-field-human-ratelimited" className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                        <Clock className="w-3 h-3" />
                        <span>Rate Limited</span>
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span id="account-field-human-unverified" className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                          <span>Standard Visitor</span>
                        </span>
                        <button
                          type="button"
                          id="btn-verify-human"
                          onClick={() => {
                            setVerificationError(null);
                            setIsVerificationModalOpen(true);
                          }}
                          className="px-2.5 py-0.5 rounded-lg bg-royal hover:bg-royal-dark text-white text-xs font-semibold transition cursor-pointer"
                        >
                          Verify Status
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <span className="text-xs font-semibold text-stone uppercase">Account Status</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 text-xs font-semibold border border-sky-200">
                    <Compass className="w-3 h-3" />
                    <span>Active Personal Workspace</span>
                  </span>
                </div>
              </div>

              {/* Company Transition Callout */}
              <div className="p-4 rounded-xl bg-slate-50 border border-line space-y-3">
                <div className="flex items-center gap-2 text-graphite font-bold text-xs uppercase">
                  <Cpu className="w-4 h-4 text-royal" />
                  <span>Ready to operate as a company?</span>
                </div>
                <p className="text-xs text-stone leading-relaxed">
                  You can register and operate an AI-native company while preserving your personal visitor identity.
                </p>
                <a
                  id="btn-account-create-company"
                  href="/company/onboarding"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo("/company/onboarding");
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-royal hover:bg-royal-dark text-white font-bold text-xs uppercase tracking-wide transition"
                >
                  <span>CREATE YOUR AI-NATIVE COMPANY</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Sign Out Action */}
              <div className="pt-4 border-t border-line flex items-center justify-between">
                <button
                  type="button"
                  id="btn-account-sign-out"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold uppercase tracking-wide transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PUBLIC AI ADVISOR MODAL — STAGE 3.5.7 */}
        {activeAIModal && (
          <div
            id="modal-public-ai-advisor"
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
          >
            <div className="bg-white border border-line rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-line pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-soft text-royal border border-royal/20">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-graphite">
                      PUBLIC AI ADVISOR
                    </h3>
                    <p className="text-xs text-stone font-medium">
                      Based on publicly available information from this company.
                    </p>
                  </div>
                </div>
                <button
                  id="btn-close-ai-modal"
                  onClick={() => setActiveAIModal(null)}
                  className="text-stone hover:text-graphite p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Target Entity Banner */}
              <div className="p-3 rounded-xl bg-slate-50 border border-line flex items-center justify-between text-xs">
                <div>
                  <span className="text-stone uppercase font-mono text-[10px] block">TARGET ENTITY:</span>
                  <span className="font-bold text-graphite">{activeAIModal.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-stone uppercase font-mono text-[10px] block">SCOPE:</span>
                  <span className="font-mono font-bold text-royal">{activeAIModal.type} PUBLIC AI</span>
                </div>
              </div>

              {/* Suggested Prompts */}
              <div className="space-y-1.5">
                <span className="font-mono text-[10.5px] uppercase tracking-wider text-mute block font-semibold">
                  SUGGESTED QUESTIONS
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    `What are the verified capabilities of ${activeAIModal.name}?`,
                    `What specifications are publicly registered?`,
                    `How can I submit an inquiry or RFQ?`,
                  ].map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setAIModalQuery(prompt);
                        handleAskAIModal(prompt);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-line bg-white hover:border-royal hover:text-royal text-[11px] font-medium text-graphite transition cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Query Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskAIModal(aiModalQuery);
                }}
                className="flex gap-2"
              >
                <input
                  id="input-ai-modal-query"
                  type="text"
                  value={aiModalQuery}
                  onChange={(e) => setAIModalQuery(e.target.value)}
                  placeholder={`Ask public question about ${activeAIModal.name}...`}
                  className="flex-1 rounded-xl border border-line bg-canvas px-3.5 py-2 text-xs text-graphite placeholder:text-mute focus:outline-none focus:border-royal transition"
                />
                <button
                  type="submit"
                  id="btn-submit-ai-modal-query"
                  disabled={aiModalLoading || !aiModalQuery.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-royal text-white text-xs font-bold uppercase tracking-wider hover:bg-royal-dark transition disabled:opacity-50 cursor-pointer"
                >
                  {aiModalLoading ? (
                    <span>Analyzing...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Ask</span>
                    </>
                  )}
                </button>
              </form>

              {/* AI Answer Display */}
              {aiModalAnswer && (
                <div
                  id="ai-modal-answer-card"
                  className="rounded-xl border border-line bg-slate-50/70 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs border-b border-line/60 pb-2">
                    <span className="font-semibold text-graphite">AI Response</span>
                    <span className="inline-flex items-center gap-1 font-mono text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      CONFIDENCE: {aiModalAnswer.confidence}
                    </span>
                  </div>

                  <p className="text-xs text-graphite leading-relaxed">
                    {aiModalAnswer.text}
                  </p>

                  {aiModalAnswer.sources && aiModalAnswer.sources.length > 0 && (
                    <div className="pt-2 border-t border-line/60 space-y-1">
                      <span className="font-mono text-[10px] text-mute uppercase font-semibold block">
                        PUBLIC GROUNDING SOURCES:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {aiModalAnswer.sources.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-white border border-line text-[10.5px] font-mono text-stone"
                          >
                            {s.title || s.provenance}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Commercial Connect / RFQ Trigger */}
                  <div className="pt-2 border-t border-line/60 flex items-center justify-between">
                    {aiConnectSent ? (
                      <span
                        id="connect-sent-badge"
                        className="text-xs font-bold text-emerald-700 flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Inquiry transmitted via Connect!
                      </span>
                    ) : (
                      <button
                        type="button"
                        id="btn-ai-modal-connect"
                        onClick={handleSendPersonalConnectFromAI}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-royal text-white text-xs font-bold uppercase tracking-wider hover:bg-royal-dark transition cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Send Personal RFQ / Connect</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* HUMAN VERIFICATION MODAL — STAGE 3.5.8 */}
        {isVerificationModalOpen && (
          <div
            id="modal-human-verification"
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
          >
            <div className="bg-white border border-line rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
              <div className="flex items-start justify-between border-b border-line pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-royal/10 text-royal border border-royal/20">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-graphite">
                      HUMAN VERIFICATION
                    </h3>
                    <p className="text-xs text-stone font-medium">
                      Anti-abuse and interaction protection
                    </p>
                  </div>
                </div>
                <button
                  id="btn-close-verification-modal"
                  onClick={() => setIsVerificationModalOpen(false)}
                  className="text-stone hover:text-graphite p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-stone leading-relaxed">
                <p>
                  Please confirm you are a human visitor to continue executing discovery queries, saved collections, and commercial RFQs without rate friction.
                </p>
                <div className="p-3 bg-slate-50 border border-line rounded-xl space-y-1">
                  <span className="font-mono text-[10px] text-stone uppercase font-bold block">
                    TRANSIENT TRUST SECURITY
                  </span>
                  <p className="text-[11px] text-slate-600">
                    Verification is deterministic, in-memory, and does not require third-party cookies or intrusive tracking.
                  </p>
                </div>
              </div>

              {verificationError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{verificationError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  id="btn-cancel-verification"
                  onClick={() => setIsVerificationModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-line text-xs font-semibold text-stone hover:text-graphite transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-submit-verification"
                  disabled={verificationLoading}
                  onClick={async () => {
                    if (!authSession.uid) return;
                    setVerificationLoading(true);
                    setVerificationError(null);
                    try {
                      requestHumanVerification(authSession.uid);
                      const res = submitHumanVerification(authSession.uid, { outcome: "SUCCESS" });
                      if (res.success) {
                        setTrustProfile(getUserTrustProfile(authSession.uid));
                        setIsVerificationModalOpen(false);
                      } else {
                        setVerificationError(res.message || "Verification failed.");
                      }
                    } catch (err: any) {
                      setVerificationError(err?.message || "Verification error.");
                    } finally {
                      setVerificationLoading(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{verificationLoading ? "Verifying..." : "Confirm Human Visitor"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Note */}
      <footer className="py-6 border-t border-line text-center text-xs text-stone">
        <p>MarineWorld.City — Sovereign Maritime Operating Environment</p>
      </footer>
    </div>
  );
}
