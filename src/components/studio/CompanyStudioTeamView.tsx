import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  Shield,
  ShieldCheck,
  Briefcase,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  AlertTriangle,
  RotateCw,
  UserX,
  Eye,
  X,
  Info,
  ChevronDown,
} from "lucide-react";
import type { CompanyMemberRole, CompanyMemberStatus } from "@/lib/types";
import {
  getCompanyTeam,
  inviteTeamMember,
  resendInvitation,
  updateTeamMemberRole,
  suspendTeamMember,
  reactivateTeamMember,
  revokeTeamMemberAccess,
  getHumanRoleLabel,
  getHumanRoleShort,
  getRoleBadgeClass,
  getRoleAccessSummary,
  ROLE_ACCESS_CONFIGS,
  type CompanyTeamMember,
  type RoleAccessSummary,
} from "@/lib/services/teamService";
import { getCurrentAuthSession } from "@/lib/services/securityService";

import {
  getCompanyMembers,
  subscribeToCompanyMembers,
} from "@/services/membershipService";
import { saveMember } from "@/lib/repositories/membershipRepository";

interface CompanyStudioTeamViewProps {
  companyId: string;
  memberRole?: string;
  userEmail?: string;
}

type FilterTab = "ALL" | "ACTIVE" | "PENDING" | "SUSPENDED";

/**
 * Format ISO date string into human-friendly last-activity text
 */
function formatLastActive(isoString?: string): string {
  if (!isoString) return "Last active — not available";
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    if (diffMs < 0 || isNaN(diffMs)) return "Last active — not available";
    const minutes = Math.floor(diffMs / (1000 * 60));
    if (minutes < 3) return "Last active now";
    if (minutes < 60) return `Last active ${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return "Last active today";
    const days = Math.floor(hours / 24);
    if (days === 1) return "Last active yesterday";
    if (days < 7) return `Last active ${days} days ago`;
    if (days < 30) return `Last active ${Math.floor(days / 7)} weeks ago`;
    return `Last active on ${new Date(isoString).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  } catch {
    return "Last active — not available";
  }
}

/**
 * Format expiration date string into human-friendly text
 */
function formatExpiresAt(isoString?: string): string {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    return `Invitation expires ${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  } catch {
    return "";
  }
}

export const CompanyStudioTeamView: React.FC<CompanyStudioTeamViewProps> = ({
  companyId,
  memberRole = "MEMBER",
  userEmail,
}) => {
  const auth = getCurrentAuthSession();
  const [teamMembers, setTeamMembers] = useState<CompanyTeamMember[]>(() => getCompanyTeam(companyId));
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Dialog States
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [viewingAccessMember, setViewingAccessMember] = useState<CompanyTeamMember | null>(null);
  const [roleChangeMember, setRoleChangeMember] = useState<CompanyTeamMember | null>(null);
  const [newSelectedRole, setNewSelectedRole] = useState<CompanyMemberRole>("COMMERCIAL");
  const [suspendingMember, setSuspendingMember] = useState<CompanyTeamMember | null>(null);
  const [revokingMember, setRevokingMember] = useState<CompanyTeamMember | null>(null);
  const [activeActionMenuUserId, setActiveActionMenuUserId] = useState<string | null>(null);

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteJobTitle, setInviteJobTitle] = useState("");
  const [inviteDepartment, setInviteDepartment] = useState("Commercial");
  const [inviteRole, setInviteRole] = useState<CompanyMemberRole>("COMMERCIAL");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccessMember, setInviteSuccessMember] = useState<CompanyTeamMember | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // General Notification / Error
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Real-time Firestore synchronization for Team Members
  useEffect(() => {
    if (!companyId) return;

    // 1. Initial Firestore fetch
    getCompanyMembers(companyId)
      .then((liveMembers) => {
        if (liveMembers && liveMembers.length > 0) {
          liveMembers.forEach((m) => {
            saveMember(m);
          });
          setTeamMembers(getCompanyTeam(companyId));
        }
      })
      .catch((err) => {
        console.warn("[CompanyStudioTeamView] Initial members fetch warning:", err);
      });

    // 2. Real-time Firestore subscription
    const unsub = subscribeToCompanyMembers(companyId, (liveMembers) => {
      if (liveMembers && liveMembers.length > 0) {
        liveMembers.forEach((m) => {
          saveMember(m);
        });
        setTeamMembers(getCompanyTeam(companyId));
      }
    });

    const handleCustomUpdate = () => {
      setTeamMembers(getCompanyTeam(companyId));
    };

    window.addEventListener("marineworld_members_updated", handleCustomUpdate);

    return () => {
      unsub();
      window.removeEventListener("marineworld_members_updated", handleCustomUpdate);
    };
  }, [companyId]);

  // Close open action menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".action-menu-container")) {
        setActiveActionMenuUserId(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Refresh Team Data
  const refreshTeam = () => {
    setTeamMembers(getCompanyTeam(companyId));
  };

  // Caller Permissions
  const canManageTeam = memberRole === "OWNER" || memberRole === "ADMIN";
  const isOwner = memberRole === "OWNER";

  // Filtered Members
  const filteredMembers = useMemo(() => {
    return teamMembers.filter((m) => {
      // Tab filter
      if (activeTab === "ACTIVE" && m.status !== "ACTIVE") return false;
      if (activeTab === "PENDING" && m.status !== "PENDING" && m.status !== "INVITED") return false;
      if (activeTab === "SUSPENDED" && m.status !== "SUSPENDED") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = m.displayName.toLowerCase().includes(q);
        const matchesEmail = m.businessEmail.toLowerCase().includes(q);
        const matchesTitle = (m.jobTitle || "").toLowerCase().includes(q);
        const matchesDept = (m.department || "").toLowerCase().includes(q);
        const matchesRole = getHumanRoleLabel(m.role).toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesTitle || matchesDept || matchesRole;
      }
      return true;
    });
  }, [teamMembers, activeTab, searchQuery]);

  // Counts
  const activeCount = teamMembers.filter((m) => m.status === "ACTIVE").length;
  const pendingCount = teamMembers.filter((m) => m.status === "PENDING" || m.status === "INVITED").length;
  const suspendedCount = teamMembers.filter((m) => m.status === "SUSPENDED").length;

  // Handle Invite Submission
  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);

    const res = inviteTeamMember(
      companyId,
      {
        businessEmail: inviteEmail,
        displayName: inviteName,
        role: inviteRole,
        jobTitle: inviteJobTitle,
        department: inviteDepartment,
      },
      auth
    );

    if (!res.success) {
      setInviteError(res.error || "Failed to issue invitation.");
      return;
    }

    refreshTeam();
    if (res.member) {
      setInviteSuccessMember(res.member);
    }
    setActionSuccess(`Invitation sent successfully to ${inviteEmail}.`);
  };

  // Reset Invite Modal
  const handleCloseInviteModal = () => {
    setIsInviteModalOpen(false);
    setInviteEmail("");
    setInviteName("");
    setInviteJobTitle("");
    setInviteDepartment("Commercial");
    setInviteRole("COMMERCIAL");
    setInviteError(null);
    setInviteSuccessMember(null);
  };

  // Handle Role Change
  const handleConfirmRoleChange = () => {
    if (!roleChangeMember) return;
    setActionError(null);

    const res = updateTeamMemberRole(companyId, roleChangeMember.userId, newSelectedRole, auth);
    if (!res.success) {
      setActionError(res.error || "Failed to update role.");
      return;
    }

    refreshTeam();
    setRoleChangeMember(null);
    setActionSuccess(`Role updated to ${getHumanRoleLabel(newSelectedRole)} for ${roleChangeMember.displayName}.`);
  };

  // Handle Suspend
  const handleConfirmSuspend = () => {
    if (!suspendingMember) return;
    setActionError(null);

    const res = suspendTeamMember(companyId, suspendingMember.userId, auth);
    if (!res.success) {
      setActionError(res.error || "Failed to suspend member.");
      return;
    }

    refreshTeam();
    setSuspendingMember(null);
    setActionSuccess(`Suspended access for ${suspendingMember.displayName}.`);
  };

  // Handle Reactivate
  const handleReactivate = (member: CompanyTeamMember) => {
    setActionError(null);
    const res = reactivateTeamMember(companyId, member.userId, auth);
    if (!res.success) {
      setActionError(res.error || "Failed to reactivate member.");
      return;
    }

    refreshTeam();
    setActiveActionMenuUserId(null);
    setActionSuccess(`Reactivated access for ${member.displayName}.`);
  };

  // Handle Revoke / Remove
  const handleConfirmRevoke = () => {
    if (!revokingMember) return;
    setActionError(null);

    const res = revokeTeamMemberAccess(companyId, revokingMember.userId, auth);
    if (!res.success) {
      setActionError(res.error || "Failed to revoke access.");
      return;
    }

    refreshTeam();
    setRevokingMember(null);
    setActionSuccess(`Removed ${revokingMember.displayName} from the company.`);
  };

  // Handle Resend Invite
  const handleResendInvite = (member: CompanyTeamMember) => {
    const res = resendInvitation(companyId, member.userId, auth);
    if (res.success) {
      refreshTeam();
      setActiveActionMenuUserId(null);
      setActionSuccess(`Invitation resent to ${member.businessEmail}.`);
    } else {
      setActionError(res.error || "Failed to resend invitation.");
    }
  };

  // Active Role Access Summary for previewing during invite or view
  const currentInviteRoleSummary: RoleAccessSummary = ROLE_ACCESS_CONFIGS[inviteRole] || ROLE_ACCESS_CONFIGS.MEMBER;

  return (
    <div className="space-y-6 antialiased font-sans text-graphite">
      {/* Toast Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-700 hover:text-rose-900 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Primary Action */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-royal/10 text-royal flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-graphite tracking-tight">Team & Access</h1>
            </div>
            <p className="text-xs text-stone">
              Manage the people who operate your company on MarineWorld.
            </p>
          </div>

          {canManageTeam && (
            <button
              id="btn-invite-team-member"
              onClick={() => setIsInviteModalOpen(true)}
              className="h-10 px-4 min-h-[44px] rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs transition shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Team Member</span>
            </button>
          )}
        </div>

        {/* Top Summary Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-line/70">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-line/60">
            <div className="text-[11px] font-medium text-stone">Total Team</div>
            <div className="text-lg font-bold text-graphite mt-0.5">{teamMembers.length}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
            <div className="text-[11px] font-medium text-emerald-800">Active Members</div>
            <div className="text-lg font-bold text-emerald-950 mt-0.5">{activeCount}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100">
            <div className="text-[11px] font-medium text-amber-800">Pending Invitations</div>
            <div className="text-lg font-bold text-amber-950 mt-0.5">{pendingCount}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-line/60">
            <div className="text-[11px] font-medium text-stone">Suspended</div>
            <div className="text-lg font-bold text-graphite mt-0.5">{suspendedCount}</div>
          </div>
        </div>
      </div>

      {/* Directory & Filter Controls */}
      <div className="bg-white border border-line rounded-2xl shadow-2xs overflow-hidden">
        {/* Filters and Search Bar */}
        <div className="p-4 border-b border-line flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === "ALL"
                  ? "bg-royal text-white shadow-2xs"
                  : "bg-white text-stone hover:text-graphite border border-line"
              }`}
            >
              All Members ({teamMembers.length})
            </button>
            <button
              onClick={() => setActiveTab("ACTIVE")}
              className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === "ACTIVE"
                  ? "bg-royal text-white shadow-2xs"
                  : "bg-white text-stone hover:text-graphite border border-line"
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setActiveTab("PENDING")}
              className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === "PENDING"
                  ? "bg-royal text-white shadow-2xs"
                  : "bg-white text-stone hover:text-graphite border border-line"
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setActiveTab("SUSPENDED")}
              className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === "SUSPENDED"
                  ? "bg-royal text-white shadow-2xs"
                  : "bg-white text-stone hover:text-graphite border border-line"
              }`}
            >
              Suspended ({suspendedCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-stone absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-line rounded-lg focus:outline-hidden focus:border-royal focus:ring-1 focus:ring-royal transition placeholder:text-stone/60"
            />
          </div>
        </div>

        {/* Members List */}
        <div className="divide-y divide-line/70">
          {filteredMembers.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-mist text-stone flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-semibold text-graphite">No team members found</div>
                <p className="text-xs text-stone max-w-sm mx-auto">
                  {searchQuery
                    ? "No members match your search criteria. Try a different search term."
                    : activeTab === "ALL"
                    ? "No team members are currently recorded for this company."
                    : `No members currently in ${activeTab.toLowerCase()} status.`}
                </p>
              </div>
              {canManageTeam && !searchQuery && (
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-lg bg-royal text-white text-xs font-medium hover:bg-royal-dark transition mt-2"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Invite Team Member
                </button>
              )}
            </div>
          ) : (
            filteredMembers.map((member) => {
              const isSelf = member.userId === auth.uid || member.businessEmail === auth.email;
              const isPending = member.status === "PENDING" || member.status === "INVITED";
              const isSuspended = member.status === "SUSPENDED";
              const isMemberOwner = member.role === "OWNER";
              const isMenuOpen = activeActionMenuUserId === member.userId;

              // Compute initials from human name
              const initials = member.displayName !== "Name not provided"
                ? member.displayName
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                : "TM";

              return (
                <div
                  key={member.userId}
                  className={`p-4 hover:bg-slate-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSuspended ? "opacity-75 bg-slate-50/40" : ""
                  }`}
                >
                  {/* Left: Avatar + Identity + Contact */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isMemberOwner
                          ? "bg-indigo-100 text-indigo-900 border border-indigo-200"
                          : isPending
                          ? "bg-amber-100 text-amber-900 border border-amber-200"
                          : isSuspended
                          ? "bg-slate-200 text-slate-700 border border-slate-300"
                          : "bg-royal/10 text-royal border border-royal/20"
                      }`}
                    >
                      {initials}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-graphite truncate">{member.displayName}</span>
                        {isSelf && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-royal/10 text-royal border border-royal/20">
                            You
                          </span>
                        )}
                        {member.jobTitle && (
                          <span className="text-xs text-stone font-medium hidden sm:inline">
                            · {member.jobTitle}
                          </span>
                        )}
                        {member.department && (
                          <span className="text-xs text-stone/80 hidden sm:inline">
                            ({member.department})
                          </span>
                        )}
                      </div>

                      {/* Contact & Mobile Job Title */}
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-stone">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 text-stone/70 shrink-0" />
                          <span className="truncate">{member.businessEmail}</span>
                        </span>
                        {member.jobTitle && (
                          <span className="sm:hidden text-stone/80 font-medium">
                            · {member.jobTitle} {member.department ? `(${member.department})` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Role, Status, Last Active & Action Menu */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-line/40">
                    {/* Role Badge */}
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${getRoleBadgeClass(member.role)} whitespace-nowrap`}>
                      {getHumanRoleLabel(member.role)}
                    </span>

                    {/* Status Badge */}
                    {isPending ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                        Pending
                      </span>
                    ) : isSuspended ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1 whitespace-nowrap">
                        <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
                        Suspended
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 whitespace-nowrap">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        Active
                      </span>
                    )}

                    {/* Last Active Indicator */}
                    <div className="hidden lg:block text-right min-w-[130px]">
                      <div className="text-[11px] text-stone">
                        {isPending && member.expiresAt
                          ? formatExpiresAt(member.expiresAt)
                          : formatLastActive(member.lastActiveAt)}
                      </div>
                    </div>

                    {/* Compact Action Menu Container */}
                    <div className="relative action-menu-container">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveActionMenuUserId(isMenuOpen ? null : member.userId);
                        }}
                        className="w-8 h-8 min-h-[36px] min-w-[36px] rounded-lg border border-line flex items-center justify-center text-stone hover:text-graphite hover:bg-mist transition"
                        title="Member Actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div className="absolute right-0 top-9 z-30 w-52 bg-white border border-line rounded-xl shadow-lg py-1.5 text-xs text-graphite divide-y divide-line/60 animate-in fade-in zoom-in-95 duration-100">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                setActiveActionMenuUserId(null);
                                setViewingAccessMember(member);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-stone hover:text-graphite font-medium transition"
                            >
                              <Eye className="w-3.5 h-3.5 text-stone/70" />
                              <span>View Access</span>
                            </button>
                          </div>

                          {canManageTeam && (
                            <div className="py-1">
                              {/* Pending Invitation Actions */}
                              {isPending ? (
                                <>
                                  <button
                                    onClick={() => handleResendInvite(member)}
                                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-royal font-medium transition"
                                  >
                                    <RotateCw className="w-3.5 h-3.5" />
                                    <span>Resend Invitation</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveActionMenuUserId(null);
                                      setRevokingMember(member);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-rose-50 flex items-center gap-2 text-rose-600 font-medium transition"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Revoke Invitation</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  {/* Change Role */}
                                  {(!isMemberOwner || isOwner) && (
                                    <button
                                      onClick={() => {
                                        setActiveActionMenuUserId(null);
                                        setRoleChangeMember(member);
                                        setNewSelectedRole(member.role);
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-stone hover:text-graphite font-medium transition"
                                    >
                                      <Briefcase className="w-3.5 h-3.5 text-stone/70" />
                                      <span>Change Role</span>
                                    </button>
                                  )}

                                  {/* Suspend or Reactivate */}
                                  {!isMemberOwner && !isSelf && (
                                    isSuspended ? (
                                      <button
                                        onClick={() => handleReactivate(member)}
                                        className="w-full px-3 py-2 text-left hover:bg-emerald-50 flex items-center gap-2 text-emerald-800 font-medium transition"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Reactivate Access</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setActiveActionMenuUserId(null);
                                          setSuspendingMember(member);
                                        }}
                                        className="w-full px-3 py-2 text-left hover:bg-amber-50 flex items-center gap-2 text-amber-800 font-medium transition"
                                      >
                                        <XCircle className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Suspend Access</span>
                                      </button>
                                    )
                                  )}

                                  {/* Revoke / Remove Access */}
                                  {!isMemberOwner && !isSelf && (
                                    <button
                                      onClick={() => {
                                        setActiveActionMenuUserId(null);
                                        setRevokingMember(member);
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-rose-50 flex items-center gap-2 text-rose-600 font-medium transition"
                                    >
                                      <UserX className="w-3.5 h-3.5 text-rose-600" />
                                      <span>Revoke Access</span>
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. INVITE TEAM MEMBER DIALOG                                             */}
      {/* ========================================================================= */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-line rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            {/* Header */}
            <div className="p-6 border-b border-line flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-graphite">Invite Team Member</h3>
                <p className="text-xs text-stone">
                  Grant a colleague access to operate your company workspace on MarineWorld.
                </p>
              </div>
              <button
                onClick={handleCloseInviteModal}
                className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-stone hover:text-graphite hover:bg-mist transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content / Confirmation vs Form */}
            {inviteSuccessMember ? (
              <div className="p-6 space-y-5">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-bold text-emerald-950">INVITATION SENT</div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    An official invitation has been created for <span className="font-semibold">{inviteSuccessMember.displayName}</span> ({inviteSuccessMember.businessEmail}).
                  </p>
                </div>

                {/* Recipient & Role Summary */}
                <div className="p-4 rounded-xl bg-slate-50 border border-line space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-line/60">
                    <span className="text-stone">Recipient</span>
                    <span className="font-bold text-graphite">{inviteSuccessMember.displayName}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-line/60">
                    <span className="text-stone">Business Email</span>
                    <span className="font-medium text-graphite">{inviteSuccessMember.businessEmail}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-line/60">
                    <span className="text-stone">Role</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${getRoleBadgeClass(inviteSuccessMember.role)}`}>
                      {getHumanRoleLabel(inviteSuccessMember.role)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-line/60">
                    <span className="text-stone">Status</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Pending
                    </span>
                  </div>
                  {inviteSuccessMember.expiresAt && (
                    <div className="flex items-center justify-between pt-1 text-[11px] text-stone">
                      <span>Expiration</span>
                      <span>{formatExpiresAt(inviteSuccessMember.expiresAt)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    onClick={() => handleResendInvite(inviteSuccessMember)}
                    className="h-10 px-4 min-h-[44px] rounded-xl border border-line text-xs font-semibold text-royal hover:bg-royal/5 transition flex items-center gap-1.5"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Resend Invitation</span>
                  </button>
                  <button
                    onClick={handleCloseInviteModal}
                    className="h-10 px-5 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-graphite text-xs font-semibold transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="p-6 space-y-4">
                {inviteError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{inviteError}</span>
                  </div>
                )}

                {/* Email & Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-graphite">
                      Business Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. j.doe@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-white border border-line rounded-xl focus:outline-hidden focus:border-royal focus:ring-1 focus:ring-royal transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-graphite">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Johnathan Doe"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-white border border-line rounded-xl focus:outline-hidden focus:border-royal focus:ring-1 focus:ring-royal transition"
                    />
                  </div>
                </div>

                {/* Job Title & Department */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-graphite">Job Title (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Sales Director, Marine Engineer"
                      value={inviteJobTitle}
                      onChange={(e) => setInviteJobTitle(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-white border border-line rounded-xl focus:outline-hidden focus:border-royal focus:ring-1 focus:ring-royal transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-graphite">Department (Optional)</label>
                    <select
                      value={inviteDepartment}
                      onChange={(e) => setInviteDepartment(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-white border border-line rounded-xl focus:outline-hidden focus:border-royal focus:ring-1 focus:ring-royal transition"
                    >
                      <option value="Commercial">Commercial</option>
                      <option value="Sales">Sales</option>
                      <option value="Procurement">Procurement</option>
                      <option value="Technical">Technical</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Operations">Operations</option>
                      <option value="Finance">Finance</option>
                      <option value="Management">Management</option>
                    </select>
                  </div>
                </div>

                {/* Role Selection */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-graphite">
                    Operational Role <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(["COMMERCIAL", "TECHNICAL", "ADMIN", "MEMBER"] as CompanyMemberRole[]).map((r) => {
                      const cfg = ROLE_ACCESS_CONFIGS[r];
                      const isSelected = inviteRole === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setInviteRole(r)}
                          className={`p-3 rounded-xl border text-left transition flex items-start justify-between gap-2 ${
                            isSelected
                              ? "bg-royal/5 border-royal text-royal shadow-2xs"
                              : "bg-white border-line text-graphite hover:bg-slate-50"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold flex items-center gap-1.5">
                              <span>{cfg.label}</span>
                            </div>
                            <p className="text-[11px] text-stone line-clamp-2 leading-relaxed">
                              {cfg.description}
                            </p>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-royal shrink-0 mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Plain Language Access Summary Box */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-line space-y-2.5">
                  <div className="text-xs font-bold text-graphite flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-royal" />
                    <span>Access Summary for {currentInviteRoleSummary.label}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                    <div className="space-y-1">
                      <span className="font-semibold text-emerald-800">CAN</span>
                      <ul className="space-y-1 text-graphite">
                        {currentInviteRoleSummary.can.slice(0, 3).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <Check className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-1">
                      <span className="font-semibold text-rose-800">CANNOT</span>
                      <ul className="space-y-1 text-stone">
                        {currentInviteRoleSummary.cannot.length > 0 ? (
                          currentInviteRoleSummary.cannot.slice(0, 3).map((item, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <X className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-stone/70 italic">Full company authority</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Dynamic Invite Confirmation Text */}
                <div className="text-xs text-stone bg-slate-50 p-2.5 rounded-xl border border-line/60">
                  Invite <span className="font-semibold text-graphite">{inviteName || "Colleague"}</span> as{" "}
                  <span className="font-semibold text-graphite">{currentInviteRoleSummary.label}</span>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-line flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={handleCloseInviteModal}
                    className="h-10 px-4 min-h-[44px] rounded-xl border border-line text-xs font-semibold text-stone hover:text-graphite hover:bg-mist transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-10 px-5 min-h-[44px] rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-semibold shadow-2xs transition flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>SEND INVITATION</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VIEW ACCESS DETAILS MODAL                                             */}
      {/* ========================================================================= */}
      {viewingAccessMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-line rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-line flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-graphite">{viewingAccessMember.displayName}</h3>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${getRoleBadgeClass(viewingAccessMember.role)}`}>
                    {getHumanRoleLabel(viewingAccessMember.role)}
                  </span>
                </div>
                <p className="text-xs text-stone">
                  {viewingAccessMember.jobTitle ? `${viewingAccessMember.jobTitle} · ` : ""}{viewingAccessMember.businessEmail}
                </p>
              </div>
              <button
                onClick={() => setViewingAccessMember(null)}
                className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-stone hover:text-graphite hover:bg-mist transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Role Scope Description */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-line text-xs text-graphite leading-relaxed">
                {getRoleAccessSummary(viewingAccessMember.role).description}
              </div>

              {/* Module-by-Module Permission Matrix in Human Business Language */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone">Module Responsibilities & Authority</h4>
                <div className="border border-line rounded-xl overflow-hidden divide-y divide-line/70">
                  {getRoleAccessSummary(viewingAccessMember.role).modulePermissions.map((mod, idx) => (
                    <div key={idx} className="p-3 bg-white flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-bold text-graphite">{mod.moduleName}</div>
                        <div className="text-stone text-[11px]">{mod.description}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          mod.level === "FULL"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : mod.level === "EDIT"
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : mod.level === "VIEW"
                            ? "bg-slate-100 text-slate-700 border border-slate-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {mod.level === "FULL" ? "Full Control" : mod.level === "EDIT" ? "Edit Access" : mod.level === "VIEW" ? "View Only" : "No Access"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setViewingAccessMember(null)}
                  className="h-10 px-5 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-graphite text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CHANGE ROLE MODAL                                                     */}
      {/* ========================================================================= */}
      {roleChangeMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-line rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-line flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-graphite">Change Operational Role</h3>
                <p className="text-xs text-stone">
                  Update role for <span className="font-semibold text-graphite">{roleChangeMember.displayName}</span>
                </p>
              </div>
              <button
                onClick={() => setRoleChangeMember(null)}
                className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-stone hover:text-graphite hover:bg-mist transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-graphite">Select New Role</label>
                <div className="space-y-2">
                  {(["OWNER", "ADMIN", "COMMERCIAL", "TECHNICAL", "MEMBER"] as CompanyMemberRole[])
                    .filter((r) => r !== "OWNER" || isOwner) // Only Owner can select Owner
                    .map((r) => {
                      const cfg = ROLE_ACCESS_CONFIGS[r];
                      const isSelected = newSelectedRole === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setNewSelectedRole(r)}
                          className={`w-full p-3 rounded-xl border text-left transition flex items-start justify-between gap-2 ${
                            isSelected
                              ? "bg-royal/5 border-royal text-royal shadow-2xs"
                              : "bg-white border-line text-graphite hover:bg-slate-50"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold">{cfg.label}</div>
                            <p className="text-[11px] text-stone leading-relaxed">{cfg.description}</p>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-royal shrink-0 mt-0.5" />}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Role Transition Notice */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Role modifications take effect immediately across all Company Studio modules and API authorization gates.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-line flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRoleChangeMember(null)}
                  className="h-10 px-4 min-h-[44px] rounded-xl border border-line text-xs font-semibold text-stone hover:text-graphite hover:bg-mist transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRoleChange}
                  className="h-10 px-5 min-h-[44px] rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-semibold shadow-2xs transition"
                >
                  Confirm Role Change
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUSPEND MEMBER CONFIRMATION                                           */}
      {/* ========================================================================= */}
      {suspendingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-line rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-graphite">Suspend Member Access</h3>
              <p className="text-xs text-stone">
                Are you sure you want to suspend access for <span className="font-semibold text-graphite">{suspendingMember.displayName}</span> ({suspendingMember.businessEmail})?
              </p>
            </div>

            <p className="text-xs text-stone/80 bg-slate-50 border border-line p-3 rounded-xl text-left leading-relaxed">
              This member will temporarily lose access to the company workspace and inbound inquiries until reactivated by an administrator.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSuspendingMember(null)}
                className="h-10 px-4 min-h-[44px] rounded-xl border border-line text-xs font-semibold text-stone hover:text-graphite hover:bg-mist transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSuspend}
                className="h-10 px-5 min-h-[44px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-2xs transition"
              >
                Suspend Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. REVOKE / REMOVE MEMBER CONFIRMATION                                   */}
      {/* ========================================================================= */}
      {revokingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-line rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <UserX className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-graphite">Remove Member from Company</h3>
              <p className="text-xs text-stone">
                Are you sure you want to permanently revoke company membership for <span className="font-semibold text-graphite">{revokingMember.displayName}</span>?
              </p>
            </div>

            <p className="text-xs text-stone/80 bg-slate-50 border border-line p-3 rounded-xl text-left leading-relaxed">
              All company access and operational permissions will be terminated permanently. Historical audit records and past actions will remain intact.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setRevokingMember(null)}
                className="h-10 px-4 min-h-[44px] rounded-xl border border-line text-xs font-semibold text-stone hover:text-graphite hover:bg-mist transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRevoke}
                className="h-10 px-5 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs transition"
              >
                Revoke Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
