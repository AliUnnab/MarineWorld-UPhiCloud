import { SectorConfig } from "@/lib/types";
import { getCityAnchor, isCompanyAnchor } from "@/lib/registry";

export type AdvisorOpenSource = "sector_city_page" | "directory_compact_strip" | "company_page";

export interface AdvisorOpenEvent {
  id: string;
  cityId: string;
  cityDomain: string;
  source: AdvisorOpenSource;
  timestamp: string; // ISO 8601 string
  referringCompanyId?: string;
  referringCompanyName?: string;
  anchorCompanyId?: string;
  anchorCompanyName?: string;
}

export interface AnchorSourceBreakdown {
  sector_city_page: number;
  directory_compact_strip: number;
  company_page: number;
}

export interface AnchorVisibilityReport {
  anchorCompanyId: string;
  anchorCompanyName: string;
  cityId: string;
  cityDomain: string;
  totalImpressions: number;
  bySource: AnchorSourceBreakdown;
  recentEvents: AdvisorOpenEvent[];
  lastImpressionAt: string | null;
  storageMode: "CLIENT_PERSISTED_TELEMETRY";
  telemetryNotice: string;
}

const STORAGE_KEY = "mw_advisor_visibility_events_v1";
const EVENT_NAME = "mw_advisor_open_event_recorded";

/**
 * Retrieve raw persisted event log from browser storage
 */
export function getAllAdvisorOpenEvents(): AdvisorOpenEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to read advisor open events:", e);
    return [];
  }
}

/**
 * Record a genuine City Advisor open event
 */
export function recordAdvisorOpenEvent(payload: {
  cityId: string;
  cityDomain: string;
  source: AdvisorOpenSource;
  referringCompanyId?: string;
  referringCompanyName?: string;
  anchorCompanyId?: string;
  anchorCompanyName?: string;
}): AdvisorOpenEvent {
  const newEvent: AdvisorOpenEvent = {
    id: `adv-evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    cityId: payload.cityId.toLowerCase().replace(/\.city$/i, ""),
    cityDomain: payload.cityDomain.toUpperCase(),
    source: payload.source,
    timestamp: new Date().toISOString(),
    referringCompanyId: payload.referringCompanyId,
    referringCompanyName: payload.referringCompanyName,
    anchorCompanyId: payload.anchorCompanyId,
    anchorCompanyName: payload.anchorCompanyName,
  };

  if (typeof window !== "undefined") {
    try {
      const existing = getAllAdvisorOpenEvents();
      // Keep up to last 500 events to prevent unbounded localStorage growth
      const updated = [newEvent, ...existing].slice(0, 500);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Notify in-session subscribers
      window.dispatchEvent(
        new CustomEvent(EVENT_NAME, { detail: newEvent })
      );
    } catch (e) {
      console.error("Failed to persist advisor open event:", e);
    }
  }

  return newEvent;
}

/**
 * Subscribe to real-time advisor open events
 */
export function subscribeAdvisorVisibility(callback: (event?: AdvisorOpenEvent) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustom = (e: Event) => {
    const custom = e as CustomEvent<AdvisorOpenEvent>;
    callback(custom.detail);
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback();
    }
  };

  window.addEventListener(EVENT_NAME, handleCustom);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(EVENT_NAME, handleCustom);
    window.removeEventListener("storage", handleStorage);
  };
}

/**
 * Generate a transparent, genuine visibility report for an Anchor holding company
 */
export function getAnchorVisibilityReport(
  companyId: string,
  config?: SectorConfig,
  cityIdFilter?: string
): AnchorVisibilityReport {
  const events = getAllAdvisorOpenEvents();
  const cleanCompId = companyId.toLowerCase();

  // Find matching city anchor details
  let matchedCityId = cityIdFilter?.toLowerCase().replace(/\.city$/i, "") || "";
  let matchedCityDomain = "";
  let anchorName = "";

  if (config) {
    for (const city of config.explorer?.cities || []) {
      const anchorCred = getCityAnchor(config, city.id);
      if (
        anchorCred &&
        (anchorCred.company.id.toLowerCase() === cleanCompId ||
          (anchorCred.company.slug && anchorCred.company.slug.toLowerCase() === cleanCompId))
      ) {
        if (!matchedCityId || matchedCityId === city.id.toLowerCase()) {
          matchedCityId = city.id;
          matchedCityDomain = city.domain.toUpperCase();
          anchorName = anchorCred.company.displayName || anchorCred.company.name;
          break;
        }
      }
    }
  }

  if (!matchedCityDomain && matchedCityId) {
    matchedCityDomain = `${matchedCityId.toUpperCase()}.CITY`;
  }

  // Filter events where this company was the anchor, OR where the event happened in their anchor city
  const filteredEvents = events.filter((ev) => {
    const evCity = (ev.cityId || "").toLowerCase();
    const evAnchorComp = (ev.anchorCompanyId || "").toLowerCase();

    if (evAnchorComp && (evAnchorComp === cleanCompId)) {
      return true;
    }
    if (matchedCityId && evCity === matchedCityId) {
      return true;
    }
    return false;
  });

  const bySource: AnchorSourceBreakdown = {
    sector_city_page: 0,
    directory_compact_strip: 0,
    company_page: 0,
  };

  for (const ev of filteredEvents) {
    if (ev.source in bySource) {
      bySource[ev.source]++;
    }
  }

  const totalImpressions = filteredEvents.length;
  const lastImpressionAt = filteredEvents.length > 0 ? filteredEvents[0].timestamp : null;

  return {
    anchorCompanyId: companyId,
    anchorCompanyName: anchorName || "Anchor Enterprise",
    cityId: matchedCityId,
    cityDomain: matchedCityDomain || (matchedCityId ? `${matchedCityId.toUpperCase()}.CITY` : "ALL SECTOR CITIES"),
    totalImpressions,
    bySource,
    recentEvents: filteredEvents.slice(0, 20),
    lastImpressionAt,
    storageMode: "CLIENT_PERSISTED_TELEMETRY",
    telemetryNotice:
      "All metrics represent genuine, real-time client telemetry captured across live sessions in this browser. To ensure persistent multi-device durability across all worldwide traffic, enterprise analytics are aggregated through the sovereign ledger in production.",
  };
}

/**
 * Format a human-readable label for the event source
 */
export function formatAdvisorSourceLabel(source: AdvisorOpenSource): string {
  switch (source) {
    case "sector_city_page":
      return "Sector City Entrance";
    case "directory_compact_strip":
      return "Companies Directory Filter";
    case "company_page":
      return "Company Profile Referral";
    default:
      return "Direct System Trigger";
  }
}
