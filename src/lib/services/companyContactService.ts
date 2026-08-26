import type { CompanyProfile } from "@/lib/types";
import type { StaffMemberInfo } from "@/components/company/StaffDigitalCardModal";

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

const STORAGE_PREFIX = "mw_company_contacts_v1_";
const UPDATE_EVENT = "mw-company-contacts-updated";

/**
 * Generate default realistic contact records for any company if none exist in localStorage
 */
export function getDefaultCompanyContacts(company: Partial<CompanyProfile> | { id: string; name?: string; slug?: string }): CompanyContactsPackage {
  const companyId = company.id || "company";
  const displayName = (company as CompanyProfile).displayName || (company as CompanyProfile).name || "Enterprise Company";
  const hqCity = String((company as CompanyProfile).headquartersCity || (company as CompanyProfile).city || "Headquarters");
  const country = String((company as CompanyProfile).country || (company as CompanyProfile).location || "Global");

  const companySlug = String((company as CompanyProfile).slug || companyId || "company");
  const webDomain = (company as CompanyProfile).website
    ? (company as CompanyProfile).website!.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "")
    : `${companySlug.toLowerCase()}.com`;

  const officialEmail = (company as CompanyProfile).officialEmail || `info@${webDomain}`;
  const officialWebsite = (company as CompanyProfile).website?.startsWith("http")
    ? (company as CompanyProfile).website!
    : `https://${webDomain}`;

  // Grounded realistic numbers
  const isTurkey = country.toLowerCase().includes("turkey") || country.toLowerCase().includes("türkiye") || hqCity.toLowerCase().includes("istanbul");
  const isGermany = country.toLowerCase().includes("germany") || country.toLowerCase().includes("deutschland") || hqCity.toLowerCase().includes("bremen") || hqCity.toLowerCase().includes("hamburg");
  const isUK = country.toLowerCase().includes("uk") || country.toLowerCase().includes("united kingdom") || country.toLowerCase().includes("britain");
  const isNorway = country.toLowerCase().includes("norway") || country.toLowerCase().includes("norge") || hqCity.toLowerCase().includes("oslo") || hqCity.toLowerCase().includes("bergen");
  const isNetherlands = country.toLowerCase().includes("netherlands") || country.toLowerCase().includes("holland") || hqCity.toLowerCase().includes("rotterdam");

  const phoneHq = (company as CompanyProfile).officialPhone || (
    isTurkey ? "+90 (212) 555 1255" :
    isGermany ? "+49 (421) 6604-0" :
    isUK ? "+44 (20) 7946 0991" :
    isNorway ? "+47 (22) 55 99 00" :
    isNetherlands ? "+31 (10) 799 9000" :
    "+1 (212) 555-0199"
  );

  const phoneOperations = (
    isTurkey ? "+90 (232) 444 8833" :
    isGermany ? "+49 (40) 3344 8800" :
    isUK ? "+44 (23) 8099 4433" :
    isNorway ? "+47 (55) 30 11 00" :
    isNetherlands ? "+31 (10) 412 8844" :
    "+1 (305) 555-0182"
  );

  const phoneStrategic = (
    isTurkey ? "+90 (532) 999 4400" :
    isGermany ? "+49 (170) 552 1199" :
    isUK ? "+44 (7700) 900822" :
    isNorway ? "+47 (90) 12 34 56" :
    isNetherlands ? "+31 (6) 5544 3322" :
    "+1 (800) 555-0144"
  );

  const cleanPhone = (phone: string) => phone.replace(/[^\d+]/g, "");

  const teamMembers: StaffMemberInfo[] = [
    {
      id: `${companyId}-staff-1`,
      name: "SARAH CHEN",
      role: "CEO / Strategic Relations",
      department: "Executive Office",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80",
      email: `s.chen@${webDomain}`,
      phone: phoneStrategic,
      whatsapp: cleanPhone(phoneStrategic),
      linkedin: `https://linkedin.com/company/${companySlug}`,
      twitter: "https://x.com",
      instagram: "https://instagram.com",
      isOnline: true,
      isExecutive: true,
    },
    {
      id: `${companyId}-staff-2`,
      name: "MARCUS VANE",
      role: "Sales Engineer",
      department: "Commercial & B2B Solutions",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
      email: `m.vane@${webDomain}`,
      phone: phoneOperations,
      whatsapp: cleanPhone(phoneOperations),
      linkedin: `https://linkedin.com/company/${companySlug}`,
      twitter: "https://x.com",
      instagram: "https://instagram.com",
      isOnline: true,
      isExecutive: false,
    },
    {
      id: `${companyId}-staff-3`,
      name: "ELENA ROSTOVA",
      role: "Operations Director",
      department: "Global Shipyard Operations",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80",
      email: `e.rostova@${webDomain}`,
      phone: phoneHq,
      whatsapp: cleanPhone(phoneHq),
      linkedin: `https://linkedin.com/company/${companySlug}`,
      twitter: "https://x.com",
      instagram: "https://instagram.com",
      isOnline: true,
      isExecutive: false,
    },
    {
      id: `${companyId}-staff-4`,
      name: "DAVID KAEL",
      role: "Customer Success Tech",
      department: "Fleet Support & Warranty",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
      email: `d.kael@${webDomain}`,
      phone: phoneOperations,
      whatsapp: cleanPhone(phoneOperations),
      linkedin: `https://linkedin.com/company/${companySlug}`,
      twitter: "https://x.com",
      instagram: "https://instagram.com",
      isOnline: true,
      isExecutive: false,
    },
  ];

  const eTradeNodes: CompanyETradeNode[] = [
    {
      id: `${companyId}-eshop`,
      title: "Official Direct Store",
      description: "Direct parts catalog, certified marine spares, and accessories with global express courier delivery.",
      url: `${officialWebsite}/shop`,
      badge: "Direct Store",
      iconType: "ShoppingCart",
      buttonText: "Visit Store",
    },
    {
      id: `${companyId}-procurement`,
      title: "B2B Procurement Portal",
      description: "Institutional trade portal for bulk equipment orders, RFQ generation, and contractual fleet procurement.",
      url: `${officialWebsite}/procurement`,
      badge: "B2B Procurement",
      iconType: "Package",
      buttonText: "Procurement Portal",
    },
  ];

  const socialChannels: CompanySocialChannel[] = [
    {
      id: "linkedin",
      name: "LinkedIn",
      handle: `@${companySlug}`,
      url: `https://linkedin.com/company/${companySlug}`,
      colorType: "linkedin",
    },
    {
      id: "x",
      name: "X",
      handle: `@${companySlug}_official`,
      url: "https://x.com",
      colorType: "x",
    },
    {
      id: "instagram",
      name: "Instagram",
      handle: `@${companySlug}`,
      url: "https://instagram.com",
      colorType: "instagram",
    },
    {
      id: "youtube",
      name: "YouTube",
      handle: `${displayName} Official`,
      url: "https://youtube.com",
      colorType: "youtube",
    },
    {
      id: "facebook",
      name: "Facebook",
      handle: displayName,
      url: "https://facebook.com",
      colorType: "facebook",
    },
    {
      id: "whatsapp-channel",
      name: "WhatsApp Broadcast",
      handle: "Official Corporate Feed",
      url: `https://wa.me/${cleanPhone(phoneHq)}`,
      colorType: "whatsapp",
    },
  ];

  return {
    companyId,
    updatedAt: new Date().toISOString(),
    generalContacts: {
      officialEmail,
      supportEmail: `support@${webDomain}`,
      phoneHq,
      phoneOperations,
      phoneStrategic,
      officialWebsite,
      bookingUrl: `${officialWebsite}/book`,
      procurementUrl: `${officialWebsite}/procurement`,
      shopUrl: `${officialWebsite}/shop`,
      address: `${hqCity}, ${country}`,
    },
    teamMembers,
    eTradeNodes,
    socialChannels,
  };
}

/**
 * Fetch company contacts from storage or fallback to defaults
 */
export function getCompanyContacts(companyOrId: string | Partial<CompanyProfile>): CompanyContactsPackage {
  const companyId = typeof companyOrId === "string" ? companyOrId : companyOrId.id || "company";
  
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${companyId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as CompanyContactsPackage;
        if (parsed && Array.isArray(parsed.teamMembers)) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
  }

  const fallbackObj = typeof companyOrId === "string" ? { id: companyOrId } : companyOrId;
  return getDefaultCompanyContacts(fallbackObj);
}

/**
 * Save contacts for a company and notify active components
 */
export function saveCompanyContacts(companyId: string, data: CompanyContactsPackage): boolean {
  if (typeof window === "undefined") return false;
  try {
    const payload: CompanyContactsPackage = {
      ...data,
      companyId,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(`${STORAGE_PREFIX}${companyId}`, JSON.stringify(payload));
    window.dispatchEvent(
      new CustomEvent(UPDATE_EVENT, {
        detail: { companyId, data: payload },
      })
    );
    return true;
  } catch (err) {
    console.error("Failed to save company contacts", err);
    return false;
  }
}

/**
 * Subscribe to contacts updates for a specific company
 */
export function subscribeCompanyContacts(companyId: string, callback: (data: CompanyContactsPackage) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<{ companyId: string; data: CompanyContactsPackage }>;
    if (customEvent.detail && customEvent.detail.companyId === companyId) {
      callback(customEvent.detail.data);
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === `${STORAGE_PREFIX}${companyId}` && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue) as CompanyContactsPackage;
        callback(parsed);
      } catch {
        // ignore
      }
    }
  };

  window.addEventListener(UPDATE_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(UPDATE_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}
