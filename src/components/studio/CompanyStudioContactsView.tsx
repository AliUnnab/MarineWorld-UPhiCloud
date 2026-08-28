import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  Edit2,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Phone,
  Mail,
  MessageCircle,
  Linkedin,
  Instagram,
  Youtube,
  Facebook,
  Globe,
  ShoppingCart,
  Package,
  Store,
  Briefcase,
  ExternalLink,
  ShieldCheck,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Sparkles,
  Info,
  X,
  RefreshCw,
} from "lucide-react";
import type { CompanyProfile, CompanyEntity } from "@/lib/types";
import { getCompanyById } from "@/lib/services/companyService";
import { getCompanyRecordSync } from "@/lib/repositories/companyRepository";
import {
  uploadFileToStorage,
  deleteFileFromStorage,
  validateStorageFile,
} from "@/lib/services/storageService";
import {
  getCompanyContacts,
  fetchCompanyContactsAsync,
  subscribeCompanyContacts,
  saveCompanyContacts,
  getDefaultCompanyContacts,
  type CompanyContactsPackage,
  type CompanyETradeNode,
  type CompanySocialChannel,
  type CompanyGeneralContacts,
} from "@/lib/services/companyContactService";
import type { StaffMemberInfo } from "@/components/company/StaffDigitalCardModal";
import { CompanyConnectPortalModal } from "@/components/company/CompanyConnectPortalModal";

interface CompanyStudioContactsViewProps {
  companyId: string;
  onSaved?: () => void;
}

export const CompanyStudioContactsView: React.FC<CompanyStudioContactsViewProps> = ({
  companyId,
  onSaved,
}) => {
  const canonicalCompany = useMemo(() => {
    return (
      (getCompanyById(companyId) as unknown as CompanyProfile) ||
      (getCompanyRecordSync(companyId) as unknown as CompanyProfile) ||
      ({ id: companyId, slug: companyId, displayName: companyId, name: companyId } as unknown as CompanyProfile)
    );
  }, [companyId]);

  // Main contacts package state
  const [data, setData] = useState<CompanyContactsPackage>(() =>
    getCompanyContacts(canonicalCompany as any)
  );

  const [activeTab, setActiveTab] = useState<"TEAM" | "ETRADE" | "SOCIAL" | "GENERAL">("TEAM");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [showDesktopPreview, setShowDesktopPreview] = useState(true);

  // Edit / Add Staff State
  const [editingStaff, setEditingStaff] = useState<StaffMemberInfo | null>(null);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const staffFileInputRef = useRef<HTMLInputElement>(null);

  // Edit / Add ETrade State
  const [editingETrade, setEditingETrade] = useState<CompanyETradeNode | null>(null);
  const [isAddingETrade, setIsAddingETrade] = useState(false);

  // Edit / Add Social State
  const [editingSocial, setEditingSocial] = useState<CompanySocialChannel | null>(null);
  const [isAddingSocial, setIsAddingSocial] = useState(false);

  useEffect(() => {
    // Initial async Firestore fetch
    fetchCompanyContactsAsync(canonicalCompany as any).then((fresh) => {
      if (fresh) setData(fresh);
    });

    // Realtime subscription
    const unsubscribe = subscribeCompanyContacts(companyId, (freshData) => {
      setData(freshData);
    });

    return () => {
      unsubscribe();
    };
  }, [canonicalCompany, companyId]);

  // Handle Save
  const handleSaveAll = async () => {
    const success = await saveCompanyContacts(companyId, data);
    if (success) {
      setSaveSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => setSaveSuccess(false), 3500);
    }
  };

  // Reset to Defaults
  const handleResetDefaults = async () => {
    if (window.confirm("Reset all contact nodes to recommended system defaults?")) {
      const def = getDefaultCompanyContacts(canonicalCompany as any);
      setData(def);
      await saveCompanyContacts(companyId, def);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  // ----------------- TEAM MEMBER HANDLERS -----------------
  const handleOpenAddStaff = () => {
    const slug = canonicalCompany.slug || companyId;
    const newStaff: StaffMemberInfo = {
      id: `${companyId}-staff-${Date.now()}`,
      name: "",
      role: "Representative",
      department: "Commercial & B2B Solutions",
      avatar: "",
      email: `contact@${slug}.com`,
      phone: data.generalContacts.phoneOperations || "+1 (555) 0199",
      whatsapp: (data.generalContacts.phoneOperations || "+15550199").replace(/[^\d+]/g, ""),
      linkedin: `https://linkedin.com/company/${slug}`,
      twitter: "",
      instagram: "",
      isOnline: true,
      isExecutive: false,
    };
    setEditingStaff(newStaff);
    setIsAddingStaff(true);
  };

  const handleSaveStaffForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !editingStaff.name.trim()) return;

    const exists = data.teamMembers.some((m) => m.id === editingStaff.id);
    let updated: StaffMemberInfo[];
    if (exists) {
      updated = data.teamMembers.map((m) => (m.id === editingStaff.id ? editingStaff : m));
    } else {
      updated = [...data.teamMembers, editingStaff];
    }

    const updatedPackage: CompanyContactsPackage = { ...data, teamMembers: updated };
    setData(updatedPackage);
    setEditingStaff(null);
    setIsAddingStaff(false);

    await saveCompanyContacts(companyId, updatedPackage);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
    if (onSaved) onSaved();
  };

  const handleDeleteStaff = async (id: string) => {
    if (window.confirm("Remove this representative from contacts?")) {
      const updatedPackage: CompanyContactsPackage = {
        ...data,
        teamMembers: data.teamMembers.filter((m) => m.id !== id),
      };
      setData(updatedPackage);
      await saveCompanyContacts(companyId, updatedPackage);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (onSaved) onSaved();
    }
  };

  const handleMoveStaff = async (index: number, direction: "UP" | "DOWN") => {
    const targetIdx = direction === "UP" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= data.teamMembers.length) return;
    const newArr = [...data.teamMembers];
    const item = newArr.splice(index, 1)[0];
    newArr.splice(targetIdx, 0, item);
    const updatedPackage: CompanyContactsPackage = { ...data, teamMembers: newArr };
    setData(updatedPackage);
    await saveCompanyContacts(companyId, updatedPackage);
  };

  const handleStaffFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingStaff) return;

    const validation = validateStorageFile(file, "IMAGE", 5 * 1024 * 1024);
    if (!validation.valid) {
      alert(validation.error || "Please select a valid image (max 5MB).");
      return;
    }

    try {
      const previousAvatar = editingStaff.avatar;
      const res = await uploadFileToStorage(file, {
        companyId,
        categoryFolder: "contacts",
        subFolder: "avatars",
        fileRole: "staff_avatar",
      });

      if (previousAvatar && previousAvatar.includes("firebasestorage.app")) {
        deleteFileFromStorage(previousAvatar).catch(() => {});
      }

      setEditingStaff({ ...editingStaff, avatar: res.url });
    } catch (err: any) {
      alert(`Avatar upload failed: ${err.message || "Unknown error"}`);
    } finally {
      e.target.value = "";
    }
  };

  // ----------------- E-TRADE HANDLERS -----------------
  const handleOpenAddETrade = () => {
    const newETrade: CompanyETradeNode = {
      id: `${companyId}-node-${Date.now()}`,
      title: "Parts & Equipment Store",
      description: "Direct parts catalog and certified accessories with global courier dispatch.",
      url: `${canonicalCompany.website || "https://company.com"}/shop`,
      badge: "Direct Store",
      iconType: "ShoppingCart",
      buttonText: "Visit Store",
    };
    setEditingETrade(newETrade);
    setIsAddingETrade(true);
  };

  const handleSaveETradeForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingETrade || !editingETrade.title.trim()) return;

    const exists = data.eTradeNodes.some((n) => n.id === editingETrade.id);
    let updated: CompanyETradeNode[];
    if (exists) {
      updated = data.eTradeNodes.map((n) => (n.id === editingETrade.id ? editingETrade : n));
    } else {
      updated = [...data.eTradeNodes, editingETrade];
    }

    const updatedPackage: CompanyContactsPackage = { ...data, eTradeNodes: updated };
    setData(updatedPackage);
    setEditingETrade(null);
    setIsAddingETrade(false);

    await saveCompanyContacts(companyId, updatedPackage);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
    if (onSaved) onSaved();
  };

  const handleDeleteETrade = async (id: string) => {
    if (window.confirm("Remove this procurement / store node?")) {
      const updatedPackage: CompanyContactsPackage = {
        ...data,
        eTradeNodes: data.eTradeNodes.filter((n) => n.id !== id),
      };
      setData(updatedPackage);
      await saveCompanyContacts(companyId, updatedPackage);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (onSaved) onSaved();
    }
  };

  // ----------------- SOCIAL CHANNELS HANDLERS -----------------
  const handleOpenAddSocial = () => {
    const newSocial: CompanySocialChannel = {
      id: `custom-${Date.now()}`,
      name: "Official Network",
      handle: `@${canonicalCompany.slug || "company"}`,
      url: "https://",
      colorType: "linkedin",
    };
    setEditingSocial(newSocial);
    setIsAddingSocial(true);
  };

  const handleSaveSocialForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSocial || !editingSocial.name.trim()) return;

    const exists = data.socialChannels.some((s) => s.id === editingSocial.id);
    let updated: CompanySocialChannel[];
    if (exists) {
      updated = data.socialChannels.map((s) => (s.id === editingSocial.id ? editingSocial : s));
    } else {
      updated = [...data.socialChannels, editingSocial];
    }

    const updatedPackage: CompanyContactsPackage = { ...data, socialChannels: updated };
    setData(updatedPackage);
    setEditingSocial(null);
    setIsAddingSocial(false);

    await saveCompanyContacts(companyId, updatedPackage);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
    if (onSaved) onSaved();
  };

  const handleDeleteSocial = async (id: string) => {
    const updatedPackage: CompanyContactsPackage = {
      ...data,
      socialChannels: data.socialChannels.filter((s) => s.id !== id),
    };
    setData(updatedPackage);
    await saveCompanyContacts(companyId, updatedPackage);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    if (onSaved) onSaved();
  };

  // Clean phone helper
  const cleanPhone = (phone: string) => phone.replace(/[^\d+]/g, "");

  return (
    <div className="space-y-6 font-sans text-graphite pb-12">
      
      {/* Top Banner / Breadcrumb & Actions */}
      <div className="bg-white border border-line rounded-2xl p-6 sm:p-7 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-royal uppercase tracking-wider">
              <span>Company Studio</span>
              <span className="text-slate-300">•</span>
              <span>Connect &amp; Direct Reach Config</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-graphite font-sans">
              Company Contacts &amp; Direct Reach
            </h2>
            <p className="text-xs sm:text-sm text-stone max-w-2xl leading-relaxed">
              Configure and publish your official company representatives, executive desks, verified phone lines, procurement portals, and social channels displayed inside the public <strong>Connect Drawer</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsLiveModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-line bg-white hover:bg-canvas text-xs font-bold text-graphite transition shadow-2xs cursor-pointer min-h-[40px]"
            >
              <Eye className="w-4 h-4 text-royal" />
              <span>Preview Live Modal</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-line bg-white hover:bg-canvas text-xs font-medium text-stone transition shadow-2xs cursor-pointer min-h-[40px]"
              title="Restore system defaults"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Defaults</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-bold transition shadow-sm cursor-pointer min-h-[40px]"
            >
              <Save className="w-4 h-4" />
              <span>Save &amp; Publish Contacts</span>
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {saveSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Contacts Published!</strong> All representatives, channels, and procurement nodes have been saved and synced directly to your live company profile.
              </span>
            </div>
            <button
              onClick={() => setIsLiveModalOpen(true)}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shrink-0 transition"
            >
              View Public Result
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto border-t border-line pt-4 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("TEAM")}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${
              activeTab === "TEAM"
                ? "bg-royal text-white shadow-2xs"
                : "bg-canvas text-stone hover:text-graphite hover:bg-slate-100"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team Representatives ({data.teamMembers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ETRADE")}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${
              activeTab === "ETRADE"
                ? "bg-royal text-white shadow-2xs"
                : "bg-canvas text-stone hover:text-graphite hover:bg-slate-100"
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Shop &amp; Procurement ({data.eTradeNodes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("SOCIAL")}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${
              activeTab === "SOCIAL"
                ? "bg-royal text-white shadow-2xs"
                : "bg-canvas text-stone hover:text-graphite hover:bg-slate-100"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Social Channels ({data.socialChannels.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("GENERAL")}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${
              activeTab === "GENERAL"
                ? "bg-royal text-white shadow-2xs"
                : "bg-canvas text-stone hover:text-graphite hover:bg-slate-100"
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Official Lines &amp; Routing</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Management Form on Left, Live Embedded Preview Card on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Management Panels (7 or 12 Cols) */}
        <div className={showDesktopPreview ? "xl:col-span-7 space-y-6" : "xl:col-span-12 space-y-6"}>
          
          {/* TAB 1: TEAM REPRESENTATIVES */}
          {activeTab === "TEAM" && (
            <div className="bg-white border border-line rounded-2xl p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div>
                  <h3 className="text-sm font-bold text-graphite">Key Representatives &amp; Staff</h3>
                  <p className="text-xs text-stone mt-0.5">
                    Direct representatives with digital business cards, email, direct phone &amp; WhatsApp.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddStaff}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-royal text-white text-xs font-bold hover:bg-royal-dark transition cursor-pointer shadow-2xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Representative</span>
                </button>
              </div>

              {/* Staff List */}
              <div className="space-y-3">
                {data.teamMembers.map((staff, idx) => (
                  <div
                    key={staff.id}
                    className="p-4 rounded-xl border border-line bg-canvas/40 hover:bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative shrink-0">
                        {staff.avatar ? (
                          <img
                            src={staff.avatar}
                            alt={staff.name}
                            className="w-12 h-12 rounded-xl object-cover border border-line"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-200 border border-line flex items-center justify-center text-xs font-bold text-slate-700">
                            {staff.name.slice(0, 2) || "TM"}
                          </div>
                        )}
                        {staff.isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-graphite truncate">
                            {staff.name || "Untitled Representative"}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                              staff.isExecutive
                                ? "bg-amber-50 text-amber-900 border-amber-200"
                                : "bg-royal/5 text-royal border-royal/15"
                            }`}
                          >
                            {staff.isExecutive ? "Executive Desk" : "Direct Reach"}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone truncate mt-0.5">
                          {staff.role} • {staff.department}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                          <span>{staff.email}</span>
                          <span>•</span>
                          <span>{staff.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveStaff(idx, "UP")}
                        disabled={idx === 0}
                        className="p-1.5 text-stone hover:text-graphite disabled:opacity-30 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                        title="Move Up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveStaff(idx, "DOWN")}
                        disabled={idx === data.teamMembers.length - 1}
                        className="p-1.5 text-stone hover:text-graphite disabled:opacity-30 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                        title="Move Down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStaff(staff);
                          setIsAddingStaff(false);
                        }}
                        className="p-1.5 text-royal hover:text-royal-dark rounded-lg hover:bg-royal/5 transition cursor-pointer"
                        title="Edit Representative"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStaff(staff.id)}
                        className="p-1.5 text-rose-600 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title="Remove Representative"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SHOP & PROCUREMENT NODES */}
          {activeTab === "ETRADE" && (
            <div className="bg-white border border-line rounded-2xl p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div>
                  <h3 className="text-sm font-bold text-graphite">Shop &amp; Procurement Links</h3>
                  <p className="text-xs text-stone mt-0.5">
                    Direct web shops, B2B procurement portals, parts catalogs, and booking desks.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddETrade}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-royal text-white text-xs font-bold hover:bg-royal-dark transition cursor-pointer shadow-2xs"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Add Procurement Link</span>
                </button>
              </div>

              <div className="space-y-3">
                {data.eTradeNodes.map((node) => (
                  <div
                    key={node.id}
                    className="p-4 rounded-xl border border-line bg-canvas/40 hover:bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-graphite">{node.title}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-canvas border border-line text-stone">
                          {node.badge}
                        </span>
                      </div>
                      <p className="text-xs text-stone">{node.description}</p>
                      <div className="text-[11px] font-mono text-royal flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" />
                        <span className="truncate">{node.url}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingETrade(node);
                          setIsAddingETrade(false);
                        }}
                        className="p-1.5 text-royal hover:text-royal-dark rounded-lg hover:bg-royal/5 transition cursor-pointer"
                        title="Edit Node"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteETrade(node.id)}
                        className="p-1.5 text-rose-600 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title="Remove Node"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SOCIAL MEDIA CHANNELS */}
          {activeTab === "SOCIAL" && (
            <div className="bg-white border border-line rounded-2xl p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div>
                  <h3 className="text-sm font-bold text-graphite">Official Social Channels</h3>
                  <p className="text-xs text-stone mt-0.5">
                    Verified profiles (LinkedIn, X, Instagram, YouTube, Facebook, WhatsApp Broadcast).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddSocial}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-royal text-white text-xs font-bold hover:bg-royal-dark transition cursor-pointer shadow-2xs"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Add Social Channel</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.socialChannels.map((soc) => (
                  <div
                    key={soc.id}
                    className="p-3.5 rounded-xl border border-line bg-canvas/40 hover:bg-white hover:border-slate-300 transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-graphite truncate">{soc.name}</div>
                      <div className="text-[11px] text-stone truncate">{soc.handle}</div>
                      <div className="text-[10px] font-mono text-royal truncate mt-0.5">{soc.url}</div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSocial(soc);
                          setIsAddingSocial(false);
                        }}
                        className="p-1.5 text-royal hover:text-royal-dark rounded-lg hover:bg-royal/5 transition cursor-pointer"
                        title="Edit Social"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSocial(soc.id)}
                        className="p-1.5 text-rose-600 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title="Remove Social"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: GENERAL LINES & ROUTING */}
          {activeTab === "GENERAL" && (
            <div className="bg-white border border-line rounded-2xl p-6 shadow-2xs space-y-5">
              <div className="pb-3 border-b border-line">
                <h3 className="text-sm font-bold text-graphite">Official Phone Lines &amp; Routing</h3>
                <p className="text-xs text-stone mt-0.5">
                  General corporate switchboards, operational desks, executive lines, and central email.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-graphite">Headquarters Phone (HQ)</label>
                  <input
                    type="text"
                    value={data.generalContacts.phoneHq || ""}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        generalContacts: { ...prev.generalContacts, phoneHq: e.target.value },
                      }))
                    }
                    placeholder="+1 (212) 555-0199"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-white text-xs text-graphite focus:outline-hidden focus:border-royal focus:ring-1 focus:ring-royal transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-graphite">Operations &amp; Support Phone</label>
                  <input
                    type="text"
                    value={data.generalContacts.phoneOperations || ""}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        generalContacts: { ...prev.generalContacts, phoneOperations: e.target.value },
                      }))
                    }
                    placeholder="+1 (305) 555-0182"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-white text-xs text-graphite focus:outline-hidden focus:border-royal focus:ring-1 focus:ring-royal transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-graphite">Executive &amp; Strategic Line</label>
                  <input
                    type="text"
                    value={data.generalContacts.phoneStrategic || ""}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        generalContacts: { ...prev.generalContacts, phoneStrategic: e.target.value },
                      }))
                    }
                    placeholder="+1 (800) 555-0144"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-white text-xs text-graphite focus:outline-hidden focus:border-royal focus:ring-1 focus:ring-royal transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-graphite">Official General Email</label>
                  <input
                    type="email"
                    value={data.generalContacts.officialEmail || ""}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        generalContacts: { ...prev.generalContacts, officialEmail: e.target.value },
                      }))
                    }
                    placeholder="info@company.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-white text-xs text-graphite focus:outline-hidden focus:border-royal focus:ring-1 focus:ring-royal transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-graphite">Official Website URL</label>
                  <input
                    type="url"
                    value={data.generalContacts.officialWebsite || ""}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        generalContacts: { ...prev.generalContacts, officialWebsite: e.target.value },
                      }))
                    }
                    placeholder="https://company.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-white text-xs text-graphite focus:outline-hidden focus:border-royal focus:ring-1 focus:ring-royal transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-graphite">Registered Physical Address</label>
                  <input
                    type="text"
                    value={data.generalContacts.address || ""}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        generalContacts: { ...prev.generalContacts, address: e.target.value },
                      }))
                    }
                    placeholder="Marine Industrial Zone, Berth 4"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-white text-xs text-graphite focus:outline-hidden focus:border-royal focus:ring-1 focus:ring-royal transition"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveAll}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-bold transition shadow-2xs cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save General Contacts</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live In-Studio Interactive Preview */}
        {showDesktopPreview && (
          <div className="xl:col-span-5 space-y-4 sticky top-6">
            <div className="bg-white border border-line rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-royal" />
                  <span className="text-xs font-bold text-graphite">Live Connect Preview</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  REAL-TIME SYNC
                </span>
              </div>

              {/* Scaled Mini-Connect Preview Card */}
              <div className="border border-line rounded-xl bg-canvas/40 p-4 space-y-4">
                
                {/* Header preview */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-royal p-[1px] bg-white flex items-center justify-center overflow-hidden">
                    {canonicalCompany.logoUrl ? (
                      <img src={canonicalCompany.logoUrl} alt="" className="w-full h-full object-contain p-0.5 rounded-full" />
                    ) : (
                      <span className="text-xs font-bold text-royal">
                        {(canonicalCompany.displayName || "CP").slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-royal uppercase tracking-wider">
                      Company Contacts • Direct Reach
                    </div>
                    <div className="text-sm font-bold text-graphite">
                      {canonicalCompany.displayName || (canonicalCompany as any).name || (canonicalCompany as any).legalName || "Company"}
                    </div>
                  </div>
                </div>

                {/* Team Mini Cards */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-stone uppercase tracking-wider">
                    Representatives ({data.teamMembers.length})
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                    {data.teamMembers.map((m) => (
                      <div
                        key={m.id}
                        className="p-2.5 rounded-lg bg-white border border-line flex items-center justify-between gap-2 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {m.avatar ? (
                            <img src={m.avatar} alt="" className="w-8 h-8 rounded-lg object-cover border border-line" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-line flex items-center justify-center text-[10px] font-bold">
                              {m.name.slice(0, 2)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-graphite truncate text-[11px]">{m.name}</div>
                            <div className="text-[10px] text-stone truncate">{m.role}</div>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-canvas border border-line text-stone shrink-0">
                          {m.isExecutive ? "Executive" : "Direct"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ETrade preview */}
                {data.eTradeNodes.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-line">
                    <div className="text-[10px] font-bold text-stone uppercase tracking-wider">
                      E-Commerce &amp; Procurement ({data.eTradeNodes.length})
                    </div>
                    <div className="space-y-1.5">
                      {data.eTradeNodes.map((n) => (
                        <div
                          key={n.id}
                          className="p-2 rounded-lg bg-white border border-line text-xs flex items-center justify-between"
                        >
                          <span className="font-bold text-graphite truncate text-[11px]">{n.title}</span>
                          <span className="text-[10px] font-bold text-royal">{n.buttonText} →</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Open Modal Fullscreen Button */}
                <button
                  type="button"
                  onClick={() => setIsLiveModalOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <Eye className="w-4 h-4 text-royal-light" />
                  <span>Launch Full Connect Modal</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ----------------- MODAL: EDIT / ADD REPRESENTATIVE ----------------- */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-line rounded-2xl shadow-2xl max-w-xl w-full p-6 sm:p-7 space-y-5 animate-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-royal" />
                <h3 className="text-base font-bold text-graphite">
                  {isAddingStaff ? "Add Key Representative" : "Edit Representative"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="p-1.5 text-stone hover:text-graphite rounded-lg hover:bg-canvas transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaffForm} className="space-y-4">
              
              {/* Photo Upload / URL Section */}
              <div className="p-4 rounded-xl bg-canvas/60 border border-line space-y-3">
                <label className="text-xs font-bold text-graphite block">Photo / Avatar (Dual Option)</label>
                
                <div className="flex items-center gap-4">
                  {editingStaff.avatar ? (
                    <div className="relative shrink-0">
                      <img
                        src={editingStaff.avatar}
                        alt="Avatar"
                        className="w-16 h-16 rounded-xl object-cover border border-line shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingStaff({ ...editingStaff, avatar: "" })}
                        className="absolute -top-1.5 -right-1.5 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-2xs"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-200 border border-line flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                      No Photo
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => staffFileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-line hover:bg-slate-50 text-xs font-bold text-graphite shadow-2xs cursor-pointer transition"
                      >
                        <Upload className="w-3.5 h-3.5 text-royal" />
                        <span>Upload from Desktop</span>
                      </button>
                      <input
                        ref={staffFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleStaffFileUpload}
                        className="hidden"
                      />
                    </div>
                    
                    <input
                      type="url"
                      value={editingStaff.avatar?.startsWith("data:") ? "" : editingStaff.avatar || ""}
                      onChange={(e) => setEditingStaff({ ...editingStaff, avatar: e.target.value })}
                      placeholder="Or paste direct image URL (https://...)"
                      className="w-full px-3 py-1.5 rounded-lg border border-line bg-white text-xs text-graphite focus:outline-hidden focus:border-royal"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-graphite">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editingStaff.name}
                    onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                    placeholder="e.g. SARAH CHEN"
                    className="w-full px-3 py-2 rounded-xl border border-line text-xs font-bold text-graphite focus:outline-hidden focus:border-royal"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-graphite">Role / Title *</label>
                  <input
                    type="text"
                    required
                    value={editingStaff.role}
                    onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                    placeholder="e.g. Sales Engineer / Commercial Director"
                    className="w-full px-3 py-2 rounded-xl border border-line text-xs text-graphite focus:outline-hidden focus:border-royal"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-graphite">Department</label>
                  <input
                    type="text"
                    value={editingStaff.department || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, department: e.target.value })}
                    placeholder="e.g. Commercial & B2B Solutions"
                    className="w-full px-3 py-2 rounded-xl border border-line text-xs text-graphite focus:outline-hidden focus:border-royal"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-graphite">Direct Email</label>
                  <input
                    type="email"
                    value={editingStaff.email}
                    onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                    placeholder="s.chen@company.com"
                    className="w-full px-3 py-2 rounded-xl border border-line text-xs text-graphite focus:outline-hidden focus:border-royal"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-graphite">Direct Phone</label>
                  <input
                    type="text"
                    value={editingStaff.phone}
                    onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    placeholder="+1 (555) 0199"
                    className="w-full px-3 py-2 rounded-xl border border-line text-xs text-graphite focus:outline-hidden focus:border-royal"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-graphite">WhatsApp Number</label>
                  <input
                    type="text"
                    value={editingStaff.whatsapp || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, whatsapp: e.target.value })}
                    placeholder="+15550199"
                    className="w-full px-3 py-2 rounded-xl border border-line text-xs text-graphite focus:outline-hidden focus:border-royal"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-graphite">LinkedIn URL</label>
                  <input
                    type="url"
                    value={editingStaff.linkedin || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full px-3 py-2 rounded-xl border border-line text-xs text-graphite focus:outline-hidden focus:border-royal"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-graphite">X (Twitter) or Social URL</label>
                  <input
                    type="url"
                    value={editingStaff.twitter || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, twitter: e.target.value })}
                    placeholder="https://x.com/username"
                    className="w-full px-3 py-2 rounded-xl border border-line text-xs text-graphite focus:outline-hidden focus:border-royal"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-line grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-line bg-canvas/40 hover:bg-canvas cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={editingStaff.isExecutive}
                    onChange={(e) => setEditingStaff({ ...editingStaff, isExecutive: e.target.checked })}
                    className="rounded text-royal focus:ring-royal w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-bold text-graphite block">Executive Desk</span>
                    <span className="text-[10px] text-stone">Moderated strategic routing</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-line bg-canvas/40 hover:bg-canvas cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={editingStaff.isOnline}
                    onChange={(e) => setEditingStaff({ ...editingStaff, isOnline: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-bold text-graphite block">Available &amp; Online</span>
                    <span className="text-[10px] text-stone">Green status badge indicator</span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-xl border border-line text-xs font-bold text-stone hover:text-graphite transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  {isAddingStaff ? "Add Representative" : "Update Representative"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: EDIT / ADD E-TRADE NODE ----------------- */}
      {editingETrade && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-line rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-royal" />
                <h3 className="text-base font-bold text-graphite">
                  {isAddingETrade ? "Add Procurement / Store Node" : "Edit Procurement Link"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingETrade(null)}
                className="p-1.5 text-stone hover:text-graphite rounded-lg hover:bg-canvas transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveETradeForm} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-graphite">Node Title *</label>
                <input
                  type="text"
                  required
                  value={editingETrade.title}
                  onChange={(e) => setEditingETrade({ ...editingETrade, title: e.target.value })}
                  placeholder="e.g. Official Direct Store"
                  className="w-full px-3 py-2 rounded-xl border border-line text-xs font-bold text-graphite focus:outline-hidden focus:border-royal"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-graphite">Description</label>
                <textarea
                  rows={2}
                  value={editingETrade.description}
                  onChange={(e) => setEditingETrade({ ...editingETrade, description: e.target.value })}
                  placeholder="Direct parts catalog, certified marine spares, and accessories."
                  className="w-full px-3 py-2 rounded-xl border border-line text-xs text-graphite focus:outline-hidden focus:border-royal"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-graphite">Badge Label</label>
                  <input
                    type="text"
                    value={editingETrade.badge}
                    onChange={(e) => setEditingETrade({ ...editingETrade, badge: e.target.value })}
                    placeholder="e.g. Direct Store"
                    className="w-full px-3 py-2 rounded-xl border border-line text-xs text-graphite focus:outline-hidden focus:border-royal"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-graphite">Button Action Text</label>
                  <input
                    type="text"
                    value={editingETrade.buttonText}
                    onChange={(e) => setEditingETrade({ ...editingETrade, buttonText: e.target.value })}
                    placeholder="e.g. Visit Store"
                    className="w-full px-3 py-2 rounded-xl border border-line text-xs text-graphite focus:outline-hidden focus:border-royal"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-graphite">Destination URL *</label>
                <input
                  type="url"
                  required
                  value={editingETrade.url}
                  onChange={(e) => setEditingETrade({ ...editingETrade, url: e.target.value })}
                  placeholder="https://company.com/shop"
                  className="w-full px-3 py-2 rounded-xl border border-line text-xs font-mono text-royal focus:outline-hidden focus:border-royal"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditingETrade(null)}
                  className="px-4 py-2 rounded-xl border border-line text-xs font-bold text-stone hover:text-graphite transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  {isAddingETrade ? "Add Node" : "Update Node"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: EDIT / ADD SOCIAL CHANNEL ----------------- */}
      {editingSocial && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-line rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-royal" />
                <h3 className="text-base font-bold text-graphite">
                  {isAddingSocial ? "Add Social Channel" : "Edit Social Channel"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSocial(null)}
                className="p-1.5 text-stone hover:text-graphite rounded-lg hover:bg-canvas transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSocialForm} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-graphite">Platform / Network Name *</label>
                <input
                  type="text"
                  required
                  value={editingSocial.name}
                  onChange={(e) => setEditingSocial({ ...editingSocial, name: e.target.value })}
                  placeholder="e.g. LinkedIn, Instagram, X"
                  className="w-full px-3 py-2 rounded-xl border border-line text-xs font-bold text-graphite focus:outline-hidden focus:border-royal"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-graphite">Handle / Display Text</label>
                <input
                  type="text"
                  value={editingSocial.handle}
                  onChange={(e) => setEditingSocial({ ...editingSocial, handle: e.target.value })}
                  placeholder="@company_official"
                  className="w-full px-3 py-2 rounded-xl border border-line text-xs text-graphite focus:outline-hidden focus:border-royal"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-graphite">Profile URL *</label>
                <input
                  type="url"
                  required
                  value={editingSocial.url}
                  onChange={(e) => setEditingSocial({ ...editingSocial, url: e.target.value })}
                  placeholder="https://linkedin.com/company/slug"
                  className="w-full px-3 py-2 rounded-xl border border-line text-xs font-mono text-royal focus:outline-hidden focus:border-royal"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditingSocial(null)}
                  className="px-4 py-2 rounded-xl border border-line text-xs font-bold text-stone hover:text-graphite transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  {isAddingSocial ? "Add Channel" : "Update Channel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL LIVE PUBLIC MODAL PREVIEW */}
      <CompanyConnectPortalModal
        isOpen={isLiveModalOpen}
        onClose={() => setIsLiveModalOpen(false)}
        company={canonicalCompany as any}
      />
    </div>
  );
};
