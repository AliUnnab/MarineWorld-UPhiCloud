import type { CompanyProfile } from "@/lib/types";
import type { StaffMemberInfo } from "@/components/company/StaffDigitalCardModal";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

export interface CompanyETradeNode {
  id: string;
  title: string;
  description: string;
  url: string;
  badge: string;
  iconType: "ShoppingCart" | "Package" | "ExternalLink" | "Globe" | "Store" | "Briefcase";
  buttonText: string;
}

export interface CompanySocialChannel {
  id: string;
  name: string;
  handle: string;
  url: string;
  colorType?: "linkedin" | "x" | "instagram" | "youtube" | "facebook" | "whatsapp" | "custom";
}

export interface CompanyGeneralContacts {
  officialEmail?: string;
  supportEmail?: string;
  phoneHq?: string;
  phoneOperations?: string;
  phoneStrategic?: string;
  officialWebsite?: string;
  bookingUrl?: string;
  procurementUrl?: string;
  shopUrl?: string;
  address?: string;
}

export interface CompanyContactsPackage {
  companyId: string;
  updatedAt: string;
  generalContacts: CompanyGeneralContacts;
  teamMembers: StaffMemberInfo[];
  eTradeNodes: CompanyETradeNode[];
  socialChannels: CompanySocialChannel[];
}

const UPDATE_EVENT = "mw-company-contacts-updated";

// In-memory runtime cache for reactive UI
const contactsCache = new Map<string, CompanyContactsPackage>();

export function getDefaultCompanyContacts(company: Partial<CompanyProfile> | { id: string; name?: string; slug?: string }): CompanyContactsPackage {
  const companyId = company.id || "company";
  return {
    companyId,
    updatedAt: new Date().toISOString(),
    generalContacts: {
      officialEmail: (company as any).officialEmail || (company as any).email || "",
      phoneHq: (company as any).officialPhone || (company as any).phone || "",
      officialWebsite: (company as any).websiteUrl || (company as any).website || "",
      address: (company as any).location || (company as any).headquartersCity || "",
    },
    teamMembers: [],
    eTradeNodes: [],
    socialChannels: [],
  };
}

/**
 * Fetch company contacts asynchronously from Firestore
 */
export async function fetchCompanyContactsAsync(
  companyOrId: string | Partial<CompanyProfile>
): Promise<CompanyContactsPackage> {
  const companyId = typeof companyOrId === "string" ? companyOrId : companyOrId.id || "company";
  const fallbackObj = typeof companyOrId === "string" ? { id: companyOrId } : companyOrId;
  const def = getDefaultCompanyContacts(fallbackObj);

  if (!companyId) return def;

  try {
    const docRef = doc(db, "companies", companyId, "contacts", "package");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as CompanyContactsPackage;
      contactsCache.set(companyId, data);
      return data;
    }

    // Check root company doc
    const compDocRef = doc(db, "companies", companyId);
    const compSnap = await getDoc(compDocRef);
    if (compSnap.exists()) {
      const compData = compSnap.data();
      if (compData.teamMembers || compData.socialChannels || compData.eTradeNodes || compData.contacts) {
        const assembled: CompanyContactsPackage = {
          companyId,
          updatedAt: compData.updatedAt || new Date().toISOString(),
          generalContacts: compData.contacts || def.generalContacts,
          teamMembers: compData.teamMembers || def.teamMembers,
          eTradeNodes: compData.eTradeNodes || def.eTradeNodes,
          socialChannels: compData.socialChannels || def.socialChannels,
        };
        contactsCache.set(companyId, assembled);
        return assembled;
      }
    }
  } catch (err) {
    console.warn(`[CompanyContactService] Firestore fetch error for ${companyId}:`, err);
  }

  const cached = contactsCache.get(companyId);
  return cached || def;
}

/**
 * Fetch company contacts from runtime cache or default
 */
export function getCompanyContacts(companyOrId: string | Partial<CompanyProfile>): CompanyContactsPackage {
  const companyId = typeof companyOrId === "string" ? companyOrId : companyOrId.id || "company";
  const cached = contactsCache.get(companyId);
  if (cached) return cached;

  const fallbackObj = typeof companyOrId === "string" ? { id: companyOrId } : companyOrId;
  const def = getDefaultCompanyContacts(fallbackObj);
  contactsCache.set(companyId, def);

  // Trigger async Firestore fetch in background to warm cache
  fetchCompanyContactsAsync(companyOrId).then((data) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(UPDATE_EVENT, {
          detail: { companyId, data },
        })
      );
    }
  }).catch(() => {});

  return def;
}

/**
 * Save contacts for a company directly to Firestore and notify active components
 */
export async function saveCompanyContacts(companyId: string, data: CompanyContactsPackage): Promise<boolean> {
  if (!companyId) return false;

  const payload: CompanyContactsPackage = {
    ...data,
    companyId,
    updatedAt: new Date().toISOString(),
  };
  contactsCache.set(companyId, payload);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(UPDATE_EVENT, {
        detail: { companyId, data: payload },
      })
    );
  }

  try {
    const docRef = doc(db, "companies", companyId, "contacts", "package");
    await setDoc(docRef, payload, { merge: true });

    // Sync to main company doc as well for high-performance direct lookups
    const rootDocRef = doc(db, "companies", companyId);
    await setDoc(
      rootDocRef,
      {
        contacts: payload.generalContacts,
        teamMembers: payload.teamMembers,
        eTradeNodes: payload.eTradeNodes,
        socialChannels: payload.socialChannels,
        updatedAt: payload.updatedAt,
      },
      { merge: true }
    );

    return true;
  } catch (err) {
    console.error("[CompanyContactService] Failed to save company contacts to Firestore:", err);
    return false;
  }
}

/**
 * Subscribe to contacts updates for a specific company via Firestore realtime listener
 */
export function subscribeCompanyContacts(companyId: string, callback: (data: CompanyContactsPackage) => void): () => void {
  if (!companyId) return () => {};

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<{ companyId: string; data: CompanyContactsPackage }>;
    if (customEvent.detail && customEvent.detail.companyId === companyId) {
      callback(customEvent.detail.data);
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener(UPDATE_EVENT, handleCustomEvent);
  }

  let unsubFirestore: (() => void) | null = null;
  try {
    const docRef = doc(db, "companies", companyId, "contacts", "package");
    unsubFirestore = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as CompanyContactsPackage;
        contactsCache.set(companyId, data);
        callback(data);
      }
    });
  } catch (e) {
    console.warn(`[CompanyContactService] Firestore onSnapshot failed for ${companyId}:`, e);
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener(UPDATE_EVENT, handleCustomEvent);
    }
    if (unsubFirestore) {
      unsubFirestore();
    }
  };
}
