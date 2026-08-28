import { SectorConfig } from "@/lib/types";
import { getCityAnchor, isCompanyAnchor } from "@/lib/registry";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, getDocs, query, where, limit } from "firebase/firestore";

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
  storageMode: "FIRESTORE_PERSISTED_TELEMETRY";
  telemetryNotice: string;
}

const EVENT_NAME = "mw_advisor_open_event_recorded";
const memoryEventsStore: AdvisorOpenEvent[] = [];

/**
 * Retrieve raw persisted event log from runtime store
 */
export function getAllAdvisorOpenEvents(): AdvisorOpenEvent[] {
  return memoryEventsStore;
}

/**
 * Async fetch events from Firestore collection anchorVisibilityEvents
 */
export async function fetchAnchorVisibilityEventsFromFirestore(companyId?: string): Promise<AdvisorOpenEvent[]> {
  try {
    const colRef = collection(db, "anchorVisibilityEvents");
    let q = query(colRef, limit(100));
    if (companyId) {
      q = query(colRef, where("anchorCompanyId", "==", companyId.toLowerCase()), limit(100));
    }
    const snap = await getDocs(q);
    const events = snap.docs.map((d) => d.data() as AdvisorOpenEvent);
    events.forEach((evt) => {
      if (!memoryEventsStore.some((m) => m.id === evt.id)) {
        memoryEventsStore.push(evt);
      }
    });
    return events;
  } catch (err) {
    console.warn("[AnchorVisibilityService] Firestore fetch error:", err);
    return memoryEventsStore;
  }
}

/**
 * Record a genuine City Advisor open event to Firestore and runtime store
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

  memoryEventsStore.unshift(newEvent);
  if (memoryEventsStore.length > 500) {
    memoryEventsStore.pop();
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, { detail: newEvent })
    );
  }

  // Asynchronously record to Firestore collection anchorVisibilityEvents
  try {
    const docRef = doc(db, "anchorVisibilityEvents", newEvent.id);
    setDoc(docRef, newEvent, { merge: true }).catch((err) => {
      console.warn("[AnchorVisibilityService] Firestore record error:", err);
    });
  } catch (err) {
    console.warn("[AnchorVisibilityService] Firestore write failed:", err);
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

  window.addEventListener(EVENT_NAME, handleCustom);

  return () => {
    window.removeEventListener(EVENT_NAME, handleCustom);
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

  if (config && config.explorer && config.explorer.cities) {
    for (const city of config.explorer.cities) {
      if (matchedCityId && city.id.toLowerCase() !== matchedCityId) continue;
      const anchorCred = getCityAnchor(config, city.id);
      if (anchorCred && anchorCred.company && (anchorCred.company.id.toLowerCase() === cleanCompId || anchorCred.company.slug?.toLowerCase() === cleanCompId)) {
        matchedCityId = city.id;
        matchedCityDomain = city.domain || `${city.id.toUpperCase()}.CITY`;
        anchorName = anchorCred.company.displayName || anchorCred.company.name;
        break;
      }
    }
  }

  // Filter events by anchorCompanyId OR referringCompanyId OR matchedCityId
  const matchingEvents = events.filter((evt) => {
    if (evt.anchorCompanyId && evt.anchorCompanyId.toLowerCase() === cleanCompId) return true;
    if (evt.referringCompanyId && evt.referringCompanyId.toLowerCase() === cleanCompId) return true;
    if (matchedCityId && evt.cityId.toLowerCase() === matchedCityId) return true;
    return false;
  });

  const breakdown: AnchorSourceBreakdown = {
    sector_city_page: 0,
    directory_compact_strip: 0,
    company_page: 0,
  };

  for (const evt of matchingEvents) {
    if (evt.source === "sector_city_page") breakdown.sector_city_page++;
    else if (evt.source === "directory_compact_strip") breakdown.directory_compact_strip++;
    else if (evt.source === "company_page") breakdown.company_page++;
  }

  const lastEvent = matchingEvents[0];

  return {
    anchorCompanyId: cleanCompId,
    anchorCompanyName: anchorName || companyId,
    cityId: matchedCityId || "all-cities",
    cityDomain: matchedCityDomain || "SECTOR-CITY",
    totalImpressions: matchingEvents.length,
    bySource: breakdown,
    recentEvents: matchingEvents.slice(0, 20),
    lastImpressionAt: lastEvent ? lastEvent.timestamp : null,
    storageMode: "FIRESTORE_PERSISTED_TELEMETRY",
    telemetryNotice: "Live telemetry served via MarineWorld Data Layer.",
  };
}

export function formatAdvisorSourceLabel(source: AdvisorOpenSource): string {
  switch (source) {
    case "sector_city_page":
      return "Sector City Node";
    case "directory_compact_strip":
      return "Directory Anchor Strip";
    case "company_page":
      return "Enterprise Profile";
    default:
      return source;
  }
}

