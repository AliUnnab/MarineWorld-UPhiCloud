import React, { useState } from "react";
import {
  Search,
  Filter,
  Users,
  Building2,
  CheckCircle2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import {
  getEcosystemMembersPaginated,
  type EcosystemOrganizationSummary,
  type EcosystemMemberStatus,
  type EcosystemMemberVerificationState,
  type EcosystemMemberRecord,
} from "@/lib/services/ecosystemOrganizationService";

interface EcosystemMembersViewProps {
  organization: EcosystemOrganizationSummary;
  onNavigateUrl?: (url: string) => void;
  onInviteModalOpen: () => void;
}

export function EcosystemMembersView({
  organization,
  onNavigateUrl,
  onInviteModalOpen,
}: EcosystemMembersViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<EcosystemMemberStatus | "ALL">("ALL");
  const [verificationFilter, setVerificationFilter] = useState<EcosystemMemberVerificationState | "ALL">("ALL");
  const [sectorCityFilter, setSectorCityFilter] = useState<string>("ALL");
  const [countryFilter, setCountryFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const queryResult = getEcosystemMembersPaginated(organization.id, {
    query: searchQuery,
    statusFilter: statusTab,
    verificationFilter,
    sectorCityFilter,
    countryFilter,
    page: currentPage,
    pageSize,
  });

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusTab("ALL");
    setVerificationFilter("ALL");
    setSectorCityFilter("ALL");
    setCountryFilter("ALL");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-royal uppercase tracking-widest mb-1">
            <Users className="w-4 h-4 text-royal" />
            <span>Organization Roster</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            MEMBERS
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Companies connected to {organization.name} through MarineWorld.
          </p>
        </div>

        <button
          onClick={onInviteModalOpen}
          className="px-4 py-2.5 rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start sm:self-center"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite New Member</span>
        </button>
      </div>

      {/* FILTER & SEARCH CONTROL BAR */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        {/* TOP STATUS TABS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100">
          <button
            onClick={() => {
              setStatusTab("ALL");
              setCurrentPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusTab === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            All Members ({organization.totalMembersCount})
          </button>

          <button
            onClick={() => {
              setStatusTab("ACTIVE");
              setCurrentPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusTab === "ACTIVE"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            }`}
          >
            Active ({queryResult.statusCounts.ACTIVE})
          </button>

          <button
            onClick={() => {
              setStatusTab("VERIFIED");
              setCurrentPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusTab === "VERIFIED"
                ? "bg-royal-dark text-white shadow-xs"
                : "bg-royal/5 text-royal-dark hover:bg-royal/10"
            }`}
          >
            Verified ({queryResult.statusCounts.VERIFIED})
          </button>

          <button
            onClick={() => {
              setStatusTab("COMPANY_CREATED");
              setCurrentPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusTab === "COMPANY_CREATED"
                ? "bg-slate-800 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Company Created ({queryResult.statusCounts.COMPANY_CREATED})
          </button>

          <button
            onClick={() => {
              setStatusTab("INVITED");
              setCurrentPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusTab === "INVITED"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100"
            }`}
          >
            Invited ({queryResult.statusCounts.INVITED})
          </button>

          <button
            onClick={() => {
              setStatusTab("NOT_REGISTERED");
              setCurrentPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusTab === "NOT_REGISTERED"
                ? "bg-rose-700 text-white shadow-xs"
                : "bg-rose-50 text-rose-800 hover:bg-rose-100"
            }`}
          >
            Not Registered ({queryResult.statusCounts.NOT_REGISTERED})
          </button>
        </div>

        {/* SEARCH INPUT & DROPDOWN FILTERS */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          {/* SEARCH */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search members, companies, capabilities or locations..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal focus:bg-white transition-all font-medium"
            />
          </div>

          {/* SECTOR CITY FILTER */}
          <div className="md:col-span-3">
            <select
              value={sectorCityFilter}
              onChange={(e) => {
                setSectorCityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-royal focus:bg-white cursor-pointer"
            >
              <option value="ALL">All Sector Cities</option>
              <option value="supplychain">SupplyChain.City</option>
              <option value="charter">Charter.City</option>
              <option value="brokerage">Brokerage.City</option>
              <option value="shipbuilding">Shipbuilding.City</option>
              <option value="navigation">Navigation.City</option>
              <option value="marina">Marina.City</option>
              <option value="portops">PortOps.City</option>
              <option value="marine-services">MarineServices.City</option>
              <option value="procurement">Procurement.City</option>
            </select>
          </div>

          {/* COUNTRY FILTER */}
          <div className="md:col-span-2">
            <select
              value={countryFilter}
              onChange={(e) => {
                setCountryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-royal focus:bg-white cursor-pointer"
            >
              <option value="ALL">All Countries</option>
              <option value="Netherlands">Netherlands</option>
              <option value="Germany">Germany</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Norway">Norway</option>
              <option value="Singapore">Singapore</option>
              <option value="Greece">Greece</option>
              <option value="Türkiye">Türkiye</option>
              <option value="United States">United States</option>
              <option value="Italy">Italy</option>
            </select>
          </div>

          {/* RESET BUTTON */}
          <div className="md:col-span-2 flex items-center justify-end">
            <button
              onClick={handleResetFilters}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* MEMBER TABLE RESULTS */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* RESULTS HEADER INFO */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Showing {queryResult.totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1} –{" "}
            {Math.min(currentPage * pageSize, queryResult.totalCount)} of {queryResult.totalCount}{" "}
            Member Companies
          </span>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 px-2 py-1 focus:outline-none cursor-pointer"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80">
                <th className="py-3.5 px-6">Member Company</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">MarineWorld Status</th>
                <th className="py-3.5 px-4">Sector City</th>
                <th className="py-3.5 px-4">Verification</th>
                <th className="py-3.5 px-4">Last Activity</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queryResult.members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800">No member companies found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Try adjusting your search query or filter options.
                    </p>
                  </td>
                </tr>
              ) : (
                queryResult.members.map((member) => (
                  <tr key={member.memberId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs">
                          {member.companyName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 text-xs">
                              {member.companyName}
                            </span>
                            {(member.companyName.includes("#") || /#\d+/.test(member.companyName)) && (
                              <span className="inline-flex items-center text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80" title="Demo record for testing ecosystem workflow">
                                Demo Record
                              </span>
                            )}
                          </div>
                          <span className="block text-[10px] font-medium text-slate-500">
                            {member.legalName}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-slate-700 font-semibold">
                      {member.city}, {member.country}
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          member.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : member.status === "VERIFIED"
                            ? "bg-royal/5 text-royal-dark border border-royal/20"
                            : member.status === "COMPANY_CREATED"
                            ? "bg-slate-100 text-slate-800 border border-slate-200"
                            : member.status === "INVITED"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-rose-50 text-rose-800 border border-rose-200"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {member.status === "NOT_REGISTERED" ? "Not Registered" : member.status.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono text-[11px] font-extrabold text-royal">
                      {member.sectorCityId}.city
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                          member.verificationStatus === "VERIFIED"
                            ? "text-emerald-700"
                            : member.verificationStatus === "PENDING"
                            ? "text-amber-700"
                            : "text-rose-700"
                        }`}
                      >
                        {member.verificationStatus === "VERIFIED" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : member.verificationStatus === "PENDING" ? (
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        <span>
                          {member.verificationStatus === "ACTION_REQUIRED"
                            ? "Action Required"
                            : member.verificationStatus.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                      </span>
                    </td>

                    <td className="py-4 px-4 text-slate-500 font-medium text-[11px]">
                      {member.lastActivityAt}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => {
                          if (onNavigateUrl) {
                            onNavigateUrl(`/companies/${member.companyId}?fromHub=true&returnTab=members&orgId=${organization.id}`);
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-royal text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                      >
                        <span>VIEW COMPANY</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        {queryResult.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="text-xs font-bold text-slate-600">
              Page {queryResult.page} of {queryResult.totalPages}
            </span>

            <button
              disabled={currentPage === queryResult.totalPages}
              onClick={() => setCurrentPage((p) => Math.min(queryResult.totalPages, p + 1))}
              className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
