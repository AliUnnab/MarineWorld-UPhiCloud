import React, { useState, useMemo } from "react";
import {
  X,
  Search,
  CheckCircle2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building2,
  ArrowRight,
  Filter,
  ShieldCheck,
  Globe,
} from "lucide-react";
import { CompanyProfile, SectorConfig } from "@/lib/types";
import { formatCompactLocation } from "@/lib/registry";

export interface CompanyDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  city: {
    id: string;
    name?: string;
    domain: string;
    slug: string;
  };
  parentDomainName: string;
  activeRegionEdition: {
    name: string;
    slug: string;
    regionCode?: string;
  };
  allCityCompanies: CompanyProfile[];
  occupiedCompanyIds?: Set<string> | string[];
  config?: SectorConfig;
}

type StatusFilter = "ALL" | "VERIFIED" | "ACTIVE_PRESENCE";
type SortOption = "RELEVANCE" | "NAME_ASC" | "NAME_DESC" | "LOCATION";

export function CompanyDiscoveryModal({
  isOpen,
  onClose,
  city,
  parentDomainName,
  activeRegionEdition,
  allCityCompanies,
  occupiedCompanyIds = new Set(),
  config,
}: CompanyDiscoveryModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");
  const [selectedCapability, setSelectedCapability] = useState<string>("ALL");
  const [sortOption, setSortOption] = useState<SortOption>("RELEVANCE");
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 24;

  // Convert active presence IDs to set for O(1) lookup
  const activePresenceSet = useMemo(() => {
    if (occupiedCompanyIds instanceof Set) return occupiedCompanyIds;
    return new Set(occupiedCompanyIds.map((id) => id.toLowerCase()));
  }, [occupiedCompanyIds]);

  // Extract unique locations and capabilities for dropdown filters
  const { locationOptions, capabilityOptions } = useMemo(() => {
    const locations = new Set<string>();
    const capabilities = new Set<string>();

    allCityCompanies.forEach((c) => {
      if (c.country) locations.add(c.country);
      else if (c.location) locations.add(c.location.split(",")[0].trim());

      if (Array.isArray(c.capabilities)) {
        c.capabilities.forEach((cap) => {
          if (cap && cap.trim()) capabilities.add(cap.trim());
        });
      }
    });

    return {
      locationOptions: Array.from(locations).sort(),
      capabilityOptions: Array.from(capabilities).sort().slice(0, 30),
    };
  }, [allCityCompanies]);

  // Filter and sort companies
  const filteredAndSortedCompanies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = allCityCompanies.filter((company) => {
      const companyIdKey = (company.id || "").toLowerCase();
      const companySlugKey = (company.slug || "").toLowerCase();
      const hasActivePresence =
        activePresenceSet.has(companyIdKey) || activePresenceSet.has(companySlugKey);

      // Status Filter
      if (statusFilter === "ACTIVE_PRESENCE" && !hasActivePresence) {
        return false;
      }
      if (statusFilter === "VERIFIED") {
        const vStatus = String(company.verificationStatus || "").toUpperCase();
        const isVerified =
          vStatus === "VERIFIED" ||
          vStatus === "VERIFIED_ACCURATE" ||
          vStatus === "ACCREDITED" ||
          !company.verificationStatus; // Default to true for accredited dataset
        if (!isVerified) return false;
      }

      // Location Filter
      if (selectedLocation !== "ALL") {
        const compLoc = (company.country || company.location || "").toLowerCase();
        if (!compLoc.includes(selectedLocation.toLowerCase())) {
          return false;
        }
      }

      // Capability Filter
      if (selectedCapability !== "ALL") {
        const hasCap = company.capabilities?.some(
          (cap) => cap.toLowerCase() === selectedCapability.toLowerCase()
        );
        if (!hasCap) return false;
      }

      // Search Query
      if (query) {
        const name = (company.displayName || company.legalName || company.name || "").toLowerCase();
        const loc = (company.location || company.city || company.country || "").toLowerCase();
        const desc = (company.description || company.shortDescription || (company as any).tagline || "").toLowerCase();
        const caps = (company.capabilities || []).join(" ").toLowerCase();
        const services = (company.services || []).join(" ").toLowerCase();

        return (
          name.includes(query) ||
          loc.includes(query) ||
          desc.includes(query) ||
          caps.includes(query) ||
          services.includes(query)
        );
      }

      return true;
    });

    // Sorting
    return filtered.sort((a, b) => {
      if (sortOption === "NAME_ASC") {
        const nameA = a.displayName || a.name || "";
        const nameB = b.displayName || b.name || "";
        return nameA.localeCompare(nameB);
      }
      if (sortOption === "NAME_DESC") {
        const nameA = a.displayName || a.name || "";
        const nameB = b.displayName || b.name || "";
        return nameB.localeCompare(nameA);
      }
      if (sortOption === "LOCATION") {
        const locA = a.country || a.location || "";
        const locB = b.country || b.location || "";
        return locA.localeCompare(locB);
      }
      // RELEVANCE: Active presence first, then verified
      const aActive = activePresenceSet.has((a.id || "").toLowerCase()) || activePresenceSet.has((a.slug || "").toLowerCase());
      const bActive = activePresenceSet.has((b.id || "").toLowerCase()) || activePresenceSet.has((b.slug || "").toLowerCase());

      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return 0;
    });
  }, [
    allCityCompanies,
    searchQuery,
    statusFilter,
    selectedLocation,
    selectedCapability,
    sortOption,
    activePresenceSet,
  ]);

  // Reset page on filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedLocation, selectedCapability, sortOption]);

  if (!isOpen) return null;

  const totalResults = filteredAndSortedCompanies.length;
  const totalPages = Math.ceil(totalResults / pageSize) || 1;
  const startIndex = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalResults);

  const paginatedCompanies = filteredAndSortedCompanies.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setSelectedLocation("ALL");
    setSelectedCapability("ALL");
    setSortOption("RELEVANCE");
    setCurrentPage(1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200/90 md:rounded-2xl w-full max-w-6xl h-full md:h-[85vh] md:max-h-[850px] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-5 sm:p-6 bg-white border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-500">
              AI-NATIVE COMPANY PRESENCE
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              AI-Native Companies
            </h2>
            <p className="text-xs text-slate-500 font-light">
              Verified and active companies operating within this Sector City.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTEXT BAR */}
        <div className="px-5 sm:px-6 py-2.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium text-slate-500 uppercase tracking-wider overflow-x-auto no-scrollbar">
            <span>{parentDomainName || "MARINE & MARITIME"}</span>
            <span className="text-slate-300">→</span>
            <span className="text-slate-800 font-bold">{city.domain.toUpperCase()}</span>
            <span className="text-slate-300">→</span>
            <span className="text-royal font-semibold">{activeRegionEdition.name.toUpperCase()}</span>
          </div>

          <div className="font-mono text-xs font-semibold text-slate-700 shrink-0">
            {totalResults.toLocaleString()} companies
          </div>
        </div>

        {/* DISCOVERY TOOLBAR */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-100 space-y-3 shrink-0">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Primary Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search companies, capabilities, services or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-mono text-slate-400 uppercase hidden sm:inline">Sort:</span>
              <div className="relative">
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl pl-3 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                >
                  <option value="RELEVANCE">Relevance</option>
                  <option value="NAME_ASC">Name (A–Z)</option>
                  <option value="NAME_DESC">Name (Z–A)</option>
                  <option value="LOCATION">Location</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Compact Filter Pills & Dropdowns */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100/80">
            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  statusFilter === "ALL"
                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                    : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-white hover:text-slate-900"
                }`}
              >
                All Companies
              </button>

              <button
                onClick={() => setStatusFilter("ACTIVE_PRESENCE")}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border inline-flex items-center gap-1.5 ${
                  statusFilter === "ACTIVE_PRESENCE"
                    ? "bg-royal text-white border-royal shadow-2xs"
                    : "bg-royal/5 text-royal border-royal/20 hover:bg-royal/10/80"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-royal shrink-0" />
                <span>Active Presence</span>
              </button>

              <button
                onClick={() => setStatusFilter("VERIFIED")}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border inline-flex items-center gap-1.5 ${
                  statusFilter === "VERIFIED"
                    ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs"
                    : "bg-emerald-50/60 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/80"
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Verified</span>
              </button>
            </div>

            {/* Dropdown Filters */}
            <div className="flex items-center gap-2">
              {/* Location Select */}
              {locationOptions.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-medium rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-800 max-w-[140px] truncate cursor-pointer"
                  >
                    <option value="ALL">Location: All</option>
                    {locationOptions.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}

              {/* Capability Select */}
              {capabilityOptions.length > 0 && (
                <div className="relative hidden sm:block">
                  <select
                    value={selectedCapability}
                    onChange={(e) => setSelectedCapability(e.target.value)}
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-medium rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-800 max-w-[150px] truncate cursor-pointer"
                  >
                    <option value="ALL">Capability: All</option>
                    {capabilityOptions.map((cap) => (
                      <option key={cap} value={cap}>
                        {cap}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}

              {/* Clear filters shortcut */}
              {(searchQuery || statusFilter !== "ALL" || selectedLocation !== "ALL" || selectedCapability !== "ALL") && (
                <button
                  onClick={clearAllFilters}
                  className="text-[11px] font-mono text-royal hover:text-royal-dark hover:underline font-medium"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RESULTS METADATA BAR */}
        <div className="px-5 sm:px-6 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0 font-mono">
          <div>
            Showing <strong className="text-slate-900 font-semibold">{startIndex}–{endIndex}</strong> of {totalResults.toLocaleString()} companies
          </div>

          {totalPages > 1 && (
            <div>
              Page {currentPage} of {totalPages}
            </div>
          )}
        </div>

        {/* SCROLLABLE COMPANY RESULTS GRID */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/30">
          {totalResults === 0 ? (
            /* EMPTY STATE */
            <div className="text-center py-16 px-4 bg-white border border-dashed border-slate-200 rounded-2xl max-w-lg mx-auto space-y-3 my-8">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  NO AI-NATIVE COMPANIES FOUND
                </h3>
                <p className="text-xs text-slate-500 font-light mt-1 max-w-sm mx-auto leading-relaxed">
                  No verified or active companies match your search within this Sector City.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shadow-2xs"
                >
                  CLEAR FILTERS
                </button>
              </div>
            </div>
          ) : (
            /* COMPACT INSTITUTIONAL COMPANY GRID (2 COLUMNS DESKTOP) */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {paginatedCompanies.map((company) => {
                const companyName =
                  company.displayName || company.legalName || company.name || "Company";
                const location = formatCompactLocation(company.country, company.city);
                const companyId = company.slug || company.id;
                const companyIdKey = (company.id || "").toLowerCase();
                const companySlugKey = (company.slug || "").toLowerCase();
                const hasActivePresence =
                  activePresenceSet.has(companyIdKey) || activePresenceSet.has(companySlugKey);

                return (
                  <a
                    key={company.id}
                    href={`/companies/${companyId}`}
                    className="group bg-white border border-slate-200/90 hover:border-royal/40/80 rounded-xl p-4 transition-all hover:shadow-xs flex flex-col justify-between space-y-3 relative"
                  >
                    <div className="space-y-2.5">
                      {/* Top Row: Logo, Name, Location, Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {company.coverImage ? (
                            <img
                              src={company.coverImage}
                              alt={companyName}
                              className="w-10 h-10 rounded-lg object-contain border border-slate-100 bg-slate-50 p-1 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0 text-xs font-mono">
                              {companyName.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-royal transition-colors leading-tight truncate">
                              {companyName}
                            </h3>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{location}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badges: Distinct ACTIVE PRESENCE vs VERIFIED */}
                        {hasActivePresence ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-royal bg-royal/5 px-2 py-0.5 rounded border border-royal/20 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-royal shrink-0" />
                            <span>ACTIVE PRESENCE</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>VERIFIED</span>
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-600 font-light leading-relaxed line-clamp-2">
                        {(company as any).tagline ||
                          company.shortDescription ||
                          company.description ||
                          `Accredited AI-Native enterprise operating within ${city.domain}.`}
                      </p>

                      {/* Capabilities */}
                      {company.capabilities && company.capabilities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {company.capabilities.slice(0, 3).map((cap, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-mono bg-slate-50 border border-slate-200/80 text-slate-600 px-2 py-0.5 rounded"
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Row */}
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        AI-Native Enterprise
                      </span>
                      <span className="text-xs font-bold font-mono text-royal group-hover:text-royal-dark transition-colors uppercase tracking-wider flex items-center gap-1">
                        <span>EXPLORE COMPANY</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER WITH PAGINATION AND CLOSE BUTTON */}
        <div className="p-4 sm:px-6 bg-white border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          {/* Pagination Controls */}
          {totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1 text-xs font-mono">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 2 + i;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        currentPage === pageNum
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-mono hidden sm:block">
              Sector City Verified Roster
            </div>
          )}

          {/* Clean Close Button */}
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shadow-2xs"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
