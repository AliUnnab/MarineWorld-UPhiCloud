import { marineSector } from "@/lib/sectors/marine";
import { CANONICAL_CITY_REGIONS } from "@/lib/constants/regions";
import { getCompanyRecordSync, updateCompanyBillingConfig } from "@/lib/repositories/companyRepository";
import { getCurrentAuthSession } from "@/lib/services/securityService";
import { recordCanonicalAuditEvent } from "@/lib/services/auditService";
import {
  saveCommercialProperty,
  saveReservationIntent,
  saveCommercialOffer,
  saveCommercialAgreement,
  recordCommercialAudit as repoRecordCommercialAudit,
  atomicHoldSlot,
  atomicReleaseSlot,
  atomicAcceptOfferAndCreateAgreement,
  atomicConfirmPaymentAndActivateProperty,
  getAllCommercialPropertiesFromFirestore,
} from "@/lib/repositories/commercialRepository";
import {
  BillingMethod,
  StripeBillingRecord,
  GoogleCloudBillingRecord,
  NormalizedBillingEvent,
  stripeProvider,
  googleCloudProvider,
  recordBillingEvent,
  getStripeBillingRecord,
  getGoogleCloudBillingRecord,
} from "./commercialBillingService";

export type CommercialStatus =
  | "AVAILABLE"
  | "HELD"
  | "RESERVED"
  | "OFFERED"
  | "AGREED"
  | "PAYMENT_PENDING"
  | "ACTIVE"
  | "EXPIRED"
  | "SUSPENDED";

export type ReservationIntentStatus =
  | "PENDING_REVIEW"
  | "UNDER_COMMERCIAL_REVIEW"
  | "OFFER_CREATED"
  | "DECLINED"
  | "EXPIRED"
  | "CANCELLED";

export type CommercialOfferStatus =
  | "DRAFT"
  | "ISSUED"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"
  | "CANCELLED";

export type CommercialContractStatus =
  | "ACCEPTED"
  | "CONTRACT_PENDING"
  | "PAYMENT_PENDING"
  | "PAYMENT_CONFIRMED"
  | "ACTIVE"
  | "SUSPENDED"
  | "EXPIRED"
  | "CANCELLED";

export type CommercialBillingStatus =
  | "UNCONFIGURED"
  | "PENDING"
  | "ACTIVE"
  | "PAST_DUE"
  | "PAUSED"
  | "SUSPENDED"
  | "CANCELLED";

export type PricingModel = "ONE_TIME" | "MONTHLY" | "ANNUAL" | "CUSTOM";
export type BillingPeriod = "MONTH" | "YEAR" | "ONE_TIME" | "CUSTOM";
export type CommercialPropertyTier = "LANDMARK" | "FLAGSHIP" | "PRESENCE";

export interface CommercialTermOption {
  termMonths: number;
  label: string;
  billingPeriod: BillingPeriod;
  price: number;
  currency: string;
  discountPct?: number;
}

export interface CommercialDigitalProperty {
  cityId: string;
  regionCode: string;
  slotId: string;
  canonicalPropertyKey: string; // e.g. SUPPLYCHAIN::MED::LM-01
  propertyName: string;
  frontageDescription: string;
  tier: CommercialPropertyTier;
  tierName: string;
  tenantCompanyId?: string | null;
  tenantCompanyName?: string | null;
  availabilityStatus: CommercialStatus;
  commercialStatus: CommercialStatus;
  pricingModel: PricingModel;
  price: number;
  currency: string;
  billingPeriod: BillingPeriod;
  termOptions: CommercialTermOption[];
  termDetails?: {
    startDate?: string;
    endDate?: string;
    termLengthMonths?: number;
    autoRenew?: boolean;
  };
  heldAt?: string;
  heldBy?: string;
  holdExpiresAt?: string;
  features: string[];
  locationSpecification: string;
}

export interface CommercialReservationIntent {
  intentId: string;
  companyId: string;
  companyName: string;
  cityId: string;
  regionCode: string;
  slotId: string;
  canonicalPropertyKey: string;
  status: ReservationIntentStatus;
  requestedAt: string;
  requestedBy: string;
  commercialTermsSnapshot: {
    tier: CommercialPropertyTier;
    pricingModel: PricingModel;
    price: number;
    currency: string;
    billingPeriod: BillingPeriod;
    termLengthMonths: number;
    autoRenew: boolean;
  };
  notes?: string;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  offerId?: string;
}

export interface CommercialOffer {
  offerId: string;
  reservationIntentId?: string;
  companyId: string;
  companyName: string;
  propertyKey: string;
  canonicalPropertyKey: string;
  cityId: string;
  regionCode: string;
  slotId: string;
  tier: CommercialPropertyTier;
  price: number;
  currency: string;
  billingPeriod: BillingPeriod;
  termMonths: number;
  annualRate: number;
  totalContractValue: number;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  notes?: string;
  conditions?: string[];
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  status: CommercialOfferStatus;
  isImmutable: boolean;
}

export interface CommercialAgreement {
  agreementId: string;
  offerId?: string;
  reservationIntentId?: string;
  companyId: string;
  companyName: string;
  propertyKey: string;
  canonicalPropertyKey: string;
  cityId: string;
  regionCode: string;
  slotId: string;
  tier: CommercialPropertyTier;
  currency: string;
  annualRate: number;
  termMonths: number;
  totalContractValue: number;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  contractStatus: CommercialContractStatus;
  billingStatus: CommercialBillingStatus;
  billingMethod: BillingMethod;
  billingCustomerRef?: string;
  billingSubscriptionRef?: string;
  billingAgreementRef?: string;
  createdAt: string;
  createdBy: string;
  acceptedAt?: string;
  acceptedBy?: string;
  activatedAt?: string;
  activatedBy?: string;
  expiredAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  renewalParentAgreementId?: string;
  renewalChildAgreementId?: string;
  offerSnapshot?: CommercialOffer;
  notes?: string;
}

export type CommercialAuditAction =
  | "RESERVATION_CREATED"
  | "RESERVATION_REVIEWED"
  | "HOLD_CREATED"
  | "HOLD_RELEASED"
  | "OFFER_CREATED"
  | "OFFER_ISSUED"
  | "OFFER_ACCEPTED"
  | "OFFER_DECLINED"
  | "AGREEMENT_CREATED"
  | "BILLING_METHOD_SELECTED"
  | "STRIPE_BILLING_CREATED"
  | "STRIPE_PAYMENT_CONFIRMED"
  | "GOOGLE_OFFER_CREATED"
  | "GOOGLE_OFFER_ACCEPTED"
  | "GOOGLE_ENTITLEMENT_CREATED"
  | "GOOGLE_ENTITLEMENT_ACTIVE"
  | "PAYMENT_PENDING"
  | "PAYMENT_FAILED"
  | "PAYMENT_CONFIRMED"
  | "ACTIVATED"
  | "RENEWAL_STARTED"
  | "RENEWED"
  | "EXPIRED"
  | "CANCELLED"
  | "VIEW"
  | "RESERVE"
  | "HOLD"
  | "RELEASE"
  | "ACTIVATE"
  | "EXPIRE"
  | "SUSPEND"
  | "SUSPENDED";

export interface CommercialAuditRecord {
  auditId: string;
  actor: string;
  companyId: string;
  propertyKey: string;
  agreementId?: string;
  action: CommercialAuditAction;
  timestamp: string;
  metadata?: Record<string, any>;
}

export const REGION_CANONICAL_SHORT_CODES: Record<string, string> = {
  GLOBAL: "GLO",
  MEDITERRANEAN: "MED",
  WESTERN_EUROPE: "WEU",
  NORTHERN_EUROPE: "NEU",
  NORTH_AMERICA: "NAM",
  ASIA_PACIFIC: "APAC",
  CARIBBEAN: "CAR",
  MIDDLE_EAST: "MEA",
  GLO: "GLO",
  MED: "MED",
  WEU: "WEU",
  NEU: "NEU",
  NOE: "NEU",
  NOR: "NEU",
  NAM: "NAM",
  APAC: "APAC",
  CAR: "CAR",
  MEA: "MEA",
};

export function formatCanonicalKey(cityId: string, regionCode: string, slotId: string): string {
  const c = (cityId || "").toUpperCase().replace(/\.CITY$/i, "");
  const normRegion = (regionCode || "GLOBAL").toUpperCase();
  const r = REGION_CANONICAL_SHORT_CODES[normRegion] || normRegion.replace(/[^A-Z]/g, "").slice(0, 4) || "REG";
  let s = (slotId || "").toUpperCase();
  if (s.includes("LM")) {
    s = "LM-01";
  } else if (s.includes("FS")) {
    const num = s.split("-").pop() || "01";
    s = `FS-${num.padStart(2, "0")}`;
  } else if (s.includes("BP") || s.includes("PRESENCE")) {
    const num = s.split("-").pop() || "01";
    s = `BP-${num.padStart(2, "0")}`;
  }
  return `${c}::${r}::${s}`;
}

export function calculateTermDates(
  startDateStr?: string | Date,
  termMonths: number = 12
): { startDate: string; endDate: string } {
  const start = startDateStr ? new Date(startDateStr) : new Date();
  if (isNaN(start.getTime())) {
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + termMonths);
    return { startDate: now.toISOString(), endDate: end.toISOString() };
  }
  const end = new Date(start);
  end.setMonth(end.getMonth() + termMonths);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export const TIER_COMMERCIAL_CONFIG: Record<
  CommercialPropertyTier,
  {
    tierName: string;
    pricingModel: PricingModel;
    price: number;
    currency: string;
    billingPeriod: BillingPeriod;
    features: string[];
    termOptions: CommercialTermOption[];
  }
> = {
  LANDMARK: {
    tierName: "Tier 1 — Sector Landmark Frontage",
    pricingModel: "ANNUAL",
    price: 45000,
    currency: "USD",
    billingPeriod: "YEAR",
    features: [
      "Exclusive City Anchor Placement & Billboard Frontage",
      "Full Hero Spatial Canvas in Public Sector Entrance",
      "Prime Geographic Edition Placement & Regional Prominence",
      "Direct Interactive Digital Operating Environment Launch",
      "Unlimited High-Resolution Media & Cinematic Showroom Video",
      "Dedicated Verified Founding Partner Seal",
    ],
    termOptions: [
      {
        termMonths: 12,
        label: "12 Months (Standard Commitment)",
        billingPeriod: "YEAR",
        price: 45000,
        currency: "USD",
      },
      {
        termMonths: 24,
        label: "24 Months (15% Multi-Year Discount)",
        billingPeriod: "YEAR",
        price: 38250,
        currency: "USD",
        discountPct: 15,
      },
      {
        termMonths: 36,
        label: "36 Months (25% Sovereign Institutional Term)",
        billingPeriod: "YEAR",
        price: 33750,
        currency: "USD",
        discountPct: 25,
      },
    ],
  },
  FLAGSHIP: {
    tierName: "Tier 2 — Regional District Showroom",
    pricingModel: "ANNUAL",
    price: 18000,
    currency: "USD",
    billingPeriod: "YEAR",
    features: [
      "Prominent Cluster Grid Frontage in Sector Entrance",
      "Rich Interactive Showcase with Media & Specification Sheets",
      "Regional Edition Verification & Search Matrix Priority",
      "Dedicated Product & Service Showroom Links",
      "Verified Corporate Entity Trust Seal",
    ],
    termOptions: [
      {
        termMonths: 12,
        label: "12 Months (Standard Regional Tier)",
        billingPeriod: "YEAR",
        price: 18000,
        currency: "USD",
      },
      {
        termMonths: 24,
        label: "24 Months (10% Regional Multi-Year Term)",
        billingPeriod: "YEAR",
        price: 16200,
        currency: "USD",
        discountPct: 10,
      },
      {
        termMonths: 36,
        label: "36 Months (20% Institutional Tier)",
        billingPeriod: "YEAR",
        price: 14400,
        currency: "USD",
        discountPct: 20,
      },
    ],
  },
  PRESENCE: {
    tierName: "Tier 3 — Business District Slot",
    pricingModel: "ANNUAL",
    price: 4800,
    currency: "USD",
    billingPeriod: "YEAR",
    features: [
      "Directory & Sector District Listing in Selected Edition",
      "Standard Profile Linkage & Verified Company Badge",
      "Access to MarineWorld Ecosystem RFQs and Lead Routing",
    ],
    termOptions: [
      {
        termMonths: 12,
        label: "12 Months (Annual Standard)",
        billingPeriod: "YEAR",
        price: 4800,
        currency: "USD",
      },
      {
        termMonths: 24,
        label: "24 Months (10% Multi-Year Discount)",
        billingPeriod: "YEAR",
        price: 4320,
        currency: "USD",
        discountPct: 10,
      },
    ],
  },
};

// In-Memory Persistent Data Stores
const commercialInventoryStore = new Map<string, CommercialDigitalProperty>();
const reservationIntentsStore = new Map<string, CommercialReservationIntent>();
const commercialOffersStore = new Map<string, CommercialOffer>();
const commercialAgreementsStore = new Map<string, CommercialAgreement>();
const commercialAuditLogStore: CommercialAuditRecord[] = [];

function getCommercialPropertyKey(cityId: string, regionCode: string, slotId: string): string {
  return `${(cityId || "").toLowerCase()}::${(regionCode || "GLOBAL").toUpperCase()}::${(slotId || "").toLowerCase()}`;
}

// -------------------------------------------------------------
// SEED INVENTORY INITIALIZATION
// -------------------------------------------------------------
function initializeCommercialInventory(): void {
  if (commercialInventoryStore.size > 0) return;

  const config = marineSector;
  const cities = config.explorer.cities;
  const regions = CANONICAL_CITY_REGIONS;

  cities.forEach((city) => {
    regions.forEach((region) => {
      // 1. Tier 1 Landmark (1 slot per city edition)
      const lmSlotId = `slot-lm-${city.id}-${region.slug}`;
      const lmKey = `${city.id.toLowerCase()}::${region.code.toUpperCase()}::${lmSlotId.toLowerCase()}`;
      const lmConfig = TIER_COMMERCIAL_CONFIG.LANDMARK;

      let lmTenantId: string | null = null;
      let lmTenantName: string | null = null;
      let lmStatus: CommercialStatus = "AVAILABLE";
      let lmTermDetails = undefined;

      // Seed active occupancy for Argento Marine on supplychain::MED
      if (city.id === "supplychain" && region.code === "MEDITERRANEAN") {
        lmTenantId = "argento-marine";
        lmTenantName = "Argento Marine";
        lmStatus = "ACTIVE";
        lmTermDetails = {
          startDate: "2026-01-01T00:00:00.000Z",
          endDate: "2026-12-31T23:59:59.000Z",
          termLengthMonths: 12,
          autoRenew: true,
        };
      }

      commercialInventoryStore.set(lmKey, {
        cityId: city.id,
        regionCode: region.code,
        slotId: lmSlotId,
        canonicalPropertyKey: formatCanonicalKey(city.id, region.code, lmSlotId),
        propertyName: `${city.domain} Landmark Frontage`,
        frontageDescription: `Exclusive anchor placement for ${city.domain.toUpperCase()} — ${region.name}`,
        tier: "LANDMARK",
        tierName: lmConfig.tierName,
        tenantCompanyId: lmTenantId,
        tenantCompanyName: lmTenantName,
        availabilityStatus: lmStatus,
        commercialStatus: lmStatus,
        pricingModel: lmConfig.pricingModel,
        price: lmConfig.price,
        currency: lmConfig.currency,
        billingPeriod: lmConfig.billingPeriod,
        termOptions: lmConfig.termOptions,
        termDetails: lmTermDetails,
        features: lmConfig.features,
        locationSpecification: `Sector City ${city.domain} • ${region.name} • Tier 1 Landmark Anchor`,
      });

      // 2. Tier 2 Flagships (4 slots per edition)
      const fsConfig = TIER_COMMERCIAL_CONFIG.FLAGSHIP;
      for (let i = 1; i <= 4; i++) {
        const fsSlotId = `slot-fs-${city.id}-${region.slug}-${i}`;
        const fsKey = `${city.id.toLowerCase()}::${region.code.toUpperCase()}::${fsSlotId.toLowerCase()}`;

        let fsTenantId: string | null = null;
        let fsTenantName: string | null = null;
        let fsStatus: CommercialStatus = "AVAILABLE";
        let fsTermDetails = undefined;

        if (city.id === "supplychain" && region.code === "MEDITERRANEAN" && i === 1) {
          fsTenantId = "med-marine-systems";
          fsTenantName = "Mediterranean Marine Systems";
          fsStatus = "ACTIVE";
          fsTermDetails = {
            startDate: "2026-01-01T00:00:00.000Z",
            endDate: "2026-12-31T23:59:59.000Z",
            termLengthMonths: 12,
            autoRenew: true,
          };
        } else if (city.id === "supplychain" && region.code === "NORTH_AMERICA" && i === 1) {
          fsTenantId = "north-atlantic";
          fsTenantName = "North Atlantic Marine";
          fsStatus = "ACTIVE";
          fsTermDetails = {
            startDate: "2026-01-01T00:00:00.000Z",
            endDate: "2026-12-31T23:59:59.000Z",
            termLengthMonths: 12,
            autoRenew: true,
          };
        }

        commercialInventoryStore.set(fsKey, {
          cityId: city.id,
          regionCode: region.code,
          slotId: fsSlotId,
          canonicalPropertyKey: formatCanonicalKey(city.id, region.code, fsSlotId),
          propertyName: `${city.domain} Regional Showroom 0${i}`,
          frontageDescription: `Cluster 0${i} frontage in ${city.domain.toUpperCase()} — ${region.name}`,
          tier: "FLAGSHIP",
          tierName: fsConfig.tierName,
          tenantCompanyId: fsTenantId,
          tenantCompanyName: fsTenantName,
          availabilityStatus: fsStatus,
          commercialStatus: fsStatus,
          pricingModel: fsConfig.pricingModel,
          price: fsConfig.price,
          currency: fsConfig.currency,
          billingPeriod: fsConfig.billingPeriod,
          termOptions: fsConfig.termOptions,
          termDetails: fsTermDetails,
          features: fsConfig.features,
          locationSpecification: `Sector City ${city.domain} • ${region.name} • Tier 2 Showroom #${i}`,
        });
      }

      // 3. Tier 3 Business Presences (6 slots per edition)
      const bpConfig = TIER_COMMERCIAL_CONFIG.PRESENCE;
      for (let i = 1; i <= 6; i++) {
        const bpSlotId = `slot-bp-${city.id}-${region.slug}-${i}`;
        const bpKey = `${city.id.toLowerCase()}::${region.code.toUpperCase()}::${bpSlotId.toLowerCase()}`;

        commercialInventoryStore.set(bpKey, {
          cityId: city.id,
          regionCode: region.code,
          slotId: bpSlotId,
          canonicalPropertyKey: formatCanonicalKey(city.id, region.code, bpSlotId),
          propertyName: `${city.domain} Business District Slot 0${i}`,
          frontageDescription: `District presence slot in ${city.domain.toUpperCase()} — ${region.name}`,
          tier: "PRESENCE",
          tierName: bpConfig.tierName,
          tenantCompanyId: null,
          tenantCompanyName: null,
          availabilityStatus: "AVAILABLE",
          commercialStatus: "AVAILABLE",
          pricingModel: bpConfig.pricingModel,
          price: bpConfig.price,
          currency: bpConfig.currency,
          billingPeriod: bpConfig.billingPeriod,
          termOptions: bpConfig.termOptions,
          features: bpConfig.features,
          locationSpecification: `Sector City ${city.domain} • ${region.name} • Tier 3 District Slot #${i}`,
        });
      }
    });
  });

  seedInitialCommercialLedger();
}

function seedInitialCommercialLedger(): void {
  // 1. Canonical Active Agreement 1: Argento Marine on SUPPLYCHAIN::MED::LM-01 (Google Cloud Marketplace Billing Rail)
  const ag1: CommercialAgreement = {
    agreementId: "agr-seed-argento-med-lm01",
    offerId: "off-seed-argento-01",
    companyId: "argento-marine",
    companyName: "Argento Marine",
    propertyKey: "SUPPLYCHAIN::MED::LM-01",
    canonicalPropertyKey: "SUPPLYCHAIN::MED::LM-01",
    cityId: "supplychain",
    regionCode: "MEDITERRANEAN",
    slotId: "slot-lm-supplychain-mediterranean",
    tier: "LANDMARK",
    currency: "USD",
    annualRate: 45000,
    termMonths: 12,
    totalContractValue: 45000,
    startDate: "2026-01-01T00:00:00.000Z",
    endDate: "2026-12-31T23:59:59.000Z",
    autoRenew: true,
    contractStatus: "ACTIVE",
    billingStatus: "ACTIVE",
    billingMethod: "GOOGLE_CLOUD_MARKETPLACE",
    billingCustomerRef: "01A2B3-45C6D7-89E0F1",
    billingSubscriptionRef: "ent-mw-argento-482001",
    billingAgreementRef: "gcp-po-2026-arg-lm01",
    createdAt: "2025-12-15T10:00:00.000Z",
    createdBy: "commercial-ops@marineworld.city",
    acceptedAt: "2025-12-20T14:30:00.000Z",
    acceptedBy: "corporate@argentomarine.com",
    activatedAt: "2026-01-01T00:00:00.000Z",
    activatedBy: "commercial-ops@marineworld.city",
    notes: "Founding Partner Landmark Anchor agreement billed via Google Cloud Marketplace SaaS Private Offer.",
  };
  commercialAgreementsStore.set(ag1.agreementId, ag1);

  // 2. Canonical Active Agreement 2: Mediterranean Marine Systems on SUPPLYCHAIN::MED::FS-01 (Stripe Billing Rail)
  const ag2: CommercialAgreement = {
    agreementId: "agr-seed-medmarine-med-fs01",
    offerId: "off-seed-medmarine-01",
    companyId: "med-marine-systems",
    companyName: "Mediterranean Marine Systems",
    propertyKey: "SUPPLYCHAIN::MED::FS-01",
    canonicalPropertyKey: "SUPPLYCHAIN::MED::FS-01",
    cityId: "supplychain",
    regionCode: "MEDITERRANEAN",
    slotId: "slot-fs-supplychain-mediterranean-1",
    tier: "FLAGSHIP",
    currency: "USD",
    annualRate: 18000,
    termMonths: 12,
    totalContractValue: 18000,
    startDate: "2026-01-01T00:00:00.000Z",
    endDate: "2026-12-31T23:59:59.000Z",
    autoRenew: true,
    contractStatus: "ACTIVE",
    billingStatus: "ACTIVE",
    billingMethod: "STRIPE",
    billingCustomerRef: "cus_mms_genoa_99",
    billingSubscriptionRef: "sub_mw_mms_2026_01",
    billingAgreementRef: "in_1N4820MMS2026",
    createdAt: "2025-12-18T11:00:00.000Z",
    createdBy: "commercial-ops@marineworld.city",
    acceptedAt: "2025-12-22T09:00:00.000Z",
    acceptedBy: "contact@medmarinesystems.it",
    activatedAt: "2026-01-01T00:00:00.000Z",
    activatedBy: "commercial-ops@marineworld.city",
    notes: "Regional Flagship Showroom 01 billed via Stripe corporate invoice subscription.",
  };
  commercialAgreementsStore.set(ag2.agreementId, ag2);

  // 3. Issued Commercial Offer for BlueHarbour on SUPPLYCHAIN::WEU::LM-01
  const offBlueHarbour: CommercialOffer = {
    offerId: "off-seed-blueharbour-01",
    reservationIntentId: "intent-seed-blueharbour-01",
    companyId: "blueharbour",
    companyName: "BlueHarbour",
    propertyKey: "SUPPLYCHAIN::WEU::LM-01",
    canonicalPropertyKey: "SUPPLYCHAIN::WEU::LM-01",
    cityId: "supplychain",
    regionCode: "WESTERN_EUROPE",
    slotId: "slot-lm-supplychain-western-europe",
    tier: "LANDMARK",
    price: 38250,
    currency: "USD",
    billingPeriod: "YEAR",
    termMonths: 24,
    annualRate: 38250,
    totalContractValue: 76500,
    startDate: "2026-09-01T00:00:00.000Z",
    endDate: "2028-08-31T23:59:59.000Z",
    autoRenew: true,
    notes: "Western Europe deepwater logistics anchor offer with 15% 24-month multi-year rate.",
    conditions: [
      "Exclusive Western Europe Supply Chain Landmark billboard frontage",
      "Direct interactive digital operating environment launch",
      "Full dual billing support (Stripe or Google Cloud Marketplace)",
    ],
    createdBy: "commercial-ops@marineworld.city",
    createdAt: "2026-08-15T09:00:00.000Z",
    expiresAt: "2026-09-15T23:59:59.000Z",
    status: "ISSUED",
    isImmutable: true,
  };
  commercialOffersStore.set(offBlueHarbour.offerId, offBlueHarbour);

  // 4. Seed Reservation Intent 1 (BlueHarbour - linked to offer above)
  const res1: CommercialReservationIntent = {
    intentId: "intent-seed-blueharbour-01",
    companyId: "blueharbour",
    companyName: "BlueHarbour",
    cityId: "supplychain",
    regionCode: "WESTERN_EUROPE",
    slotId: "slot-lm-supplychain-western-europe",
    canonicalPropertyKey: "SUPPLYCHAIN::WEU::LM-01",
    status: "OFFER_CREATED",
    requestedAt: "2026-08-10T14:00:00.000Z",
    requestedBy: "contact@blueharbour.nl",
    commercialTermsSnapshot: {
      tier: "LANDMARK",
      pricingModel: "ANNUAL",
      price: 38250,
      currency: "USD",
      billingPeriod: "YEAR",
      termLengthMonths: 24,
      autoRenew: true,
    },
    notes: "Requested landmark anchor for Rotterdam spares hub.",
    offerId: offBlueHarbour.offerId,
  };
  reservationIntentsStore.set(res1.intentId, res1);

  // 5. Seed Reservation Intent 2 (Argento Marine - new reservation on CHARTER::MED::LM-01)
  const res2: CommercialReservationIntent = {
    intentId: "intent-seed-argento-charter-01",
    companyId: "argento-marine",
    companyName: "Argento Marine",
    cityId: "charter",
    regionCode: "MEDITERRANEAN",
    slotId: "slot-lm-charter-mediterranean",
    canonicalPropertyKey: "CHARTER::MED::LM-01",
    status: "PENDING_REVIEW",
    requestedAt: "2026-08-16T11:30:00.000Z",
    requestedBy: "corporate@argentomarine.com",
    commercialTermsSnapshot: {
      tier: "LANDMARK",
      pricingModel: "ANNUAL",
      price: 45000,
      currency: "USD",
      billingPeriod: "YEAR",
      termLengthMonths: 12,
      autoRenew: true,
    },
    notes: "Intent to secure Charter Sector Landmark anchor in Mediterranean edition.",
  };
  reservationIntentsStore.set(res2.intentId, res2);

  // Set property commercial status for reserved slots
  const weuProp = commercialInventoryStore.get("supplychain::WESTERN_EUROPE::slot-lm-supplychain-western-europe");
  if (weuProp) {
    weuProp.availabilityStatus = "RESERVED";
    weuProp.commercialStatus = "OFFERED";
    weuProp.tenantCompanyId = "blueharbour";
    weuProp.tenantCompanyName = "BlueHarbour";
  }

  const charterProp = commercialInventoryStore.get("charter::MEDITERRANEAN::slot-lm-charter-mediterranean");
  if (charterProp) {
    charterProp.availabilityStatus = "RESERVED";
    charterProp.commercialStatus = "RESERVED";
    charterProp.tenantCompanyId = "argento-marine";
    charterProp.tenantCompanyName = "Argento Marine";
  }

  // 6. Historical Expired Agreement: Poseidon Logistics on SUPPLYCHAIN::MED::LM-01 (2024-2025)
  const agHist: CommercialAgreement = {
    agreementId: "agr-seed-hist-poseidon",
    companyId: "poseidon-logistics",
    companyName: "Poseidon Logistics Global",
    propertyKey: "SUPPLYCHAIN::MED::LM-01",
    canonicalPropertyKey: "SUPPLYCHAIN::MED::LM-01",
    cityId: "supplychain",
    regionCode: "MEDITERRANEAN",
    slotId: "slot-lm-supplychain-mediterranean",
    tier: "LANDMARK",
    currency: "USD",
    annualRate: 45000,
    termMonths: 12,
    totalContractValue: 45000,
    startDate: "2024-01-01T00:00:00.000Z",
    endDate: "2024-12-31T23:59:59.000Z",
    autoRenew: false,
    contractStatus: "EXPIRED",
    billingStatus: "ACTIVE",
    billingMethod: "STRIPE",
    billingCustomerRef: "cus_pos_hist_2024",
    createdAt: "2023-12-01T10:00:00.000Z",
    createdBy: "commercial-ops@marineworld.city",
    acceptedAt: "2023-12-10T11:00:00.000Z",
    activatedAt: "2024-01-01T00:00:00.000Z",
    expiredAt: "2024-12-31T23:59:59.000Z",
    notes: "Historical founding period occupancy (concluded).",
  };
  commercialAgreementsStore.set(agHist.agreementId, agHist);

  // Seed initial audit trail
  recordCommercialAudit("SYSTEM", "argento-marine", "SUPPLYCHAIN::MED::LM-01", "ACTIVATED", ag1.agreementId, {
    billingMethod: "GOOGLE_CLOUD_MARKETPLACE",
    tier: "LANDMARK",
  });
  recordCommercialAudit("SYSTEM", "med-marine-systems", "SUPPLYCHAIN::MED::FS-01", "ACTIVATED", ag2.agreementId, {
    billingMethod: "STRIPE",
    tier: "FLAGSHIP",
  });
  recordCommercialAudit("commercial-ops@marineworld.city", "blueharbour", "SUPPLYCHAIN::WEU::LM-01", "OFFER_ISSUED", undefined, {
    offerId: offBlueHarbour.offerId,
    totalContractValue: 76500,
  });
}

initializeCommercialInventory();

// -------------------------------------------------------------
// INVENTORY & READ ACCESSORS
// -------------------------------------------------------------
export function getAllCommercialInventory(filters?: {
  cityId?: string;
  regionCode?: string;
  tier?: CommercialPropertyTier;
  availability?: CommercialStatus;
}): CommercialDigitalProperty[] {
  initializeCommercialInventory();
  sweepExpiredHolds();

  let list = Array.from(commercialInventoryStore.values());

  if (filters?.cityId) {
    list = list.filter((p) => p.cityId.toLowerCase() === filters.cityId!.toLowerCase());
  }
  if (filters?.regionCode) {
    list = list.filter((p) => p.regionCode.toUpperCase() === filters.regionCode!.toUpperCase());
  }
  if (filters?.tier) {
    list = list.filter((p) => p.tier === filters.tier);
  }
  if (filters?.availability) {
    list = list.filter((p) => p.availabilityStatus === filters.availability);
  }
  return list;
}

export function getCommercialProperty(
  cityId: string,
  regionCode: string,
  slotId: string
): CommercialDigitalProperty | undefined {
  initializeCommercialInventory();
  sweepExpiredHolds();
  const key = getCommercialPropertyKey(cityId, regionCode, slotId);
  return commercialInventoryStore.get(key);
}

export function getCommercialPropertyByKey(canonicalKey: string): CommercialDigitalProperty | undefined {
  initializeCommercialInventory();
  sweepExpiredHolds();
  return Array.from(commercialInventoryStore.values()).find(
    (p) => p.canonicalPropertyKey === canonicalKey || p.canonicalPropertyKey.toUpperCase() === canonicalKey.toUpperCase()
  );
}

/**
 * MY PROPERTIES: commercialStatus === "ACTIVE" ONLY!
 * Reserved or Held properties are NOT counted as active holdings.
 */
export function getCompanyCommercialHoldings(companyId: string): CommercialDigitalProperty[] {
  initializeCommercialInventory();
  sweepExpiredHolds();
  return Array.from(commercialInventoryStore.values()).filter(
    (p) =>
      (p.tenantCompanyId === companyId ||
        p.tenantCompanyId?.toLowerCase() === companyId.toLowerCase()) &&
      p.commercialStatus === "ACTIVE"
  );
}

// -------------------------------------------------------------
// RESERVATION INTENTS REPOSITORY
// -------------------------------------------------------------
export function getCompanyReservationIntents(companyId: string): CommercialReservationIntent[] {
  initializeCommercialInventory();
  return Array.from(reservationIntentsStore.values()).filter(
    (i) => i.companyId === companyId || i.companyId.toLowerCase() === companyId.toLowerCase()
  );
}

export function getAllReservationIntents(): CommercialReservationIntent[] {
  initializeCommercialInventory();
  return Array.from(reservationIntentsStore.values()).sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );
}

export function getReservationIntentById(intentId: string): CommercialReservationIntent | undefined {
  initializeCommercialInventory();
  return reservationIntentsStore.get(intentId);
}

// -------------------------------------------------------------
// COMMERCIAL OFFERS REPOSITORY
// -------------------------------------------------------------
export function getAllCommercialOffers(): CommercialOffer[] {
  initializeCommercialInventory();
  return Array.from(commercialOffersStore.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getCompanyCommercialOffers(companyId: string): CommercialOffer[] {
  initializeCommercialInventory();
  return Array.from(commercialOffersStore.values())
    .filter((o) => (o.companyId === companyId || o.companyId.toLowerCase() === companyId.toLowerCase()) && o.status === "ISSUED")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getCommercialOfferById(offerId: string): CommercialOffer | undefined {
  initializeCommercialInventory();
  return commercialOffersStore.get(offerId);
}

// -------------------------------------------------------------
// COMMERCIAL AGREEMENTS REPOSITORY
// -------------------------------------------------------------
export function getAllCommercialAgreements(): CommercialAgreement[] {
  initializeCommercialInventory();
  return Array.from(commercialAgreementsStore.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getCommercialAgreementById(agreementId: string): CommercialAgreement | undefined {
  initializeCommercialInventory();
  return commercialAgreementsStore.get(agreementId);
}

export function getCompanyCommercialAgreements(companyId: string): CommercialAgreement[] {
  initializeCommercialInventory();
  return Array.from(commercialAgreementsStore.values())
    .filter((a) => a.companyId === companyId || a.companyId.toLowerCase() === companyId.toLowerCase())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getPropertyAgreementHistory(canonicalPropertyKey: string): CommercialAgreement[] {
  initializeCommercialInventory();
  return Array.from(commercialAgreementsStore.values())
    .filter(
      (a) =>
        a.canonicalPropertyKey === canonicalPropertyKey ||
        a.canonicalPropertyKey.toUpperCase() === canonicalPropertyKey.toUpperCase()
    )
    .sort((a, b) => new Date(b.startDate || b.createdAt).getTime() - new Date(a.startDate || a.createdAt).getTime());
}

// -------------------------------------------------------------
// AUDIT LOGGING
// -------------------------------------------------------------
export function recordCommercialAudit(
  actor: string,
  companyId: string,
  propertyKey: string,
  action: CommercialAuditAction,
  agreementId?: string,
  metadata?: Record<string, any>
): void {
  const auditRecord: CommercialAuditRecord = {
    auditId: `caud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    actor: actor || "SYSTEM",
    companyId: companyId || "UNKNOWN",
    propertyKey,
    agreementId,
    action,
    timestamp: new Date().toISOString(),
    metadata,
  };
  commercialAuditLogStore.unshift(auditRecord);
  repoRecordCommercialAudit(auditRecord).catch(() => {});

  if (companyId && companyId !== "UNKNOWN" && companyId !== "SYSTEM") {
    recordCanonicalAuditEvent({
      companyId,
      actorUserId: actor || "SYSTEM",
      actionType: `PROPERTY_${action}`,
      module: "DIGITAL_PROPERTIES",
      entityType: "COMMERCIAL_PROPERTY",
      entityId: propertyKey,
      reason: `Commercial property action: ${action}`,
      metadata: {
        ...metadata,
        agreementId,
        propertyKey,
      },
      source: "COMMERCIAL_PROPERTY_SERVICE",
      authorizationContext: {
        authenticated: true,
        userRole: "OPERATOR",
        details: `Commercial property action: ${action}`,
      },
    }).catch(() => {});
  }
}

export function getCommercialAuditLogs(propertyKey?: string, companyId?: string): CommercialAuditRecord[] {
  return commercialAuditLogStore.filter((log) => {
    if (propertyKey && log.propertyKey !== propertyKey) return false;
    if (companyId && log.companyId !== companyId) return false;
    return true;
  });
}

// -------------------------------------------------------------
// HOLD MANAGEMENT & EXPIRATION SWEEP
// -------------------------------------------------------------
export function sweepExpiredHolds(): void {
  const now = new Date().toISOString();
  for (const [key, prop] of commercialInventoryStore.entries()) {
    if (prop.availabilityStatus === "HELD" && prop.holdExpiresAt && prop.holdExpiresAt < now) {
      prop.availabilityStatus = "AVAILABLE";
      prop.commercialStatus = "AVAILABLE";
      prop.heldAt = undefined;
      prop.heldBy = undefined;
      prop.holdExpiresAt = undefined;
      prop.tenantCompanyId = null;
      prop.tenantCompanyName = null;
      commercialInventoryStore.set(key, prop);
      saveCommercialProperty(prop).catch(() => {});

      recordCommercialAudit(
        "SYSTEM_DAEMON",
        "SYSTEM",
        prop.canonicalPropertyKey,
        "HOLD_RELEASED",
        undefined,
        { reason: "Hold expiration window elapsed." }
      );
    }
  }
}

export function createPropertyHold(params: {
  cityId: string;
  regionCode: string;
  slotId: string;
  companyId: string;
  actor: string;
  holdDurationHours?: number;
  reason?: string;
}): { success: boolean; property?: CommercialDigitalProperty; error?: string } {
  const { cityId, regionCode, slotId, companyId, actor, holdDurationHours = 72, reason } = params;
  const propKey = getCommercialPropertyKey(cityId, regionCode, slotId);
  const property = commercialInventoryStore.get(propKey);

  if (!property) return { success: false, error: "Property not found." };
  if (property.availabilityStatus === "ACTIVE" && property.tenantCompanyId !== companyId) {
    return { success: false, error: "Cannot hold an actively occupied property." };
  }

  const now = new Date();
  const expires = new Date(now.getTime() + holdDurationHours * 3600 * 1000);
  const company = getCompanyRecordSync(companyId);
  const companyName = company?.displayName || company?.legalName || companyId;

  property.availabilityStatus = "HELD";
  property.commercialStatus = "HELD";
  property.tenantCompanyId = companyId;
  property.tenantCompanyName = companyName;
  property.heldAt = now.toISOString();
  property.heldBy = actor;
  property.holdExpiresAt = expires.toISOString();

  commercialInventoryStore.set(propKey, property);
  saveCommercialProperty(property).catch(() => {});

  recordCommercialAudit(actor, companyId, property.canonicalPropertyKey, "HOLD_CREATED", undefined, {
    holdDurationHours,
    expiresAt: expires.toISOString(),
    reason,
  });

  return { success: true, property };
}

export function releasePropertyHold(
  propertyKey: string,
  actor: string,
  reason?: string
): { success: boolean; error?: string } {
  const property = getCommercialPropertyByKey(propertyKey);
  if (!property) return { success: false, error: "Property not found." };

  property.availabilityStatus = "AVAILABLE";
  property.commercialStatus = "AVAILABLE";
  property.heldAt = undefined;
  property.heldBy = undefined;
  property.holdExpiresAt = undefined;
  property.tenantCompanyId = null;
  property.tenantCompanyName = null;

  const storeKey = getCommercialPropertyKey(property.cityId, property.regionCode, property.slotId);
  commercialInventoryStore.set(storeKey, property);
  saveCommercialProperty(property).catch(() => {});

  recordCommercialAudit(actor, "SYSTEM", property.canonicalPropertyKey, "HOLD_RELEASED", undefined, { reason });
  return { success: true };
}

// -------------------------------------------------------------
// COMMERCIAL DEAL DESK OPERATIONS
// -------------------------------------------------------------

/**
 * 1. RESERVATION INTENT CREATION
 * Reservation Intent is NOT a Commercial Agreement.
 * Does NOT create a CommercialAgreement in agreementsStore.
 */
export function createReservationIntent(params: {
  companyId: string;
  cityId: string;
  regionCode: string;
  slotId: string;
  termMonths?: number;
  autoRenew?: boolean;
  notes?: string;
}): { success: boolean; intent?: CommercialReservationIntent; error?: string } {
  const { companyId, cityId, regionCode, slotId, termMonths = 12, autoRenew = true, notes } = params;
  const propertyKey = getCommercialPropertyKey(cityId, regionCode, slotId);
  const property = commercialInventoryStore.get(propertyKey);

  if (!property) {
    return { success: false, error: `Property not found for key: ${propertyKey}` };
  }

  // Check collision with actively occupied property
  if (property.availabilityStatus === "ACTIVE" && property.tenantCompanyId !== companyId) {
    return {
      success: false,
      error: `Slot collision: Slot ${slotId} in ${cityId} (${regionCode}) is ACTIVE by another company (${property.tenantCompanyName || property.tenantCompanyId}).`,
    };
  }

  // Check collision with pending reservation intent
  const existingPending = Array.from(reservationIntentsStore.values()).find(
    (i) =>
      i.canonicalPropertyKey === property.canonicalPropertyKey &&
      i.status === "PENDING_REVIEW" &&
      i.companyId !== companyId
  );
  if (existingPending) {
    return {
      success: false,
      error: `Slot collision: Slot ${slotId} is currently under pending reservation review by another company (${existingPending.companyName}).`,
    };
  }

  const company = getCompanyRecordSync(companyId);
  const companyName = company?.displayName || company?.legalName || companyId;
  const currentAuth = getCurrentAuthSession();
  const now = new Date().toISOString();
  const actor = currentAuth.email || currentAuth.uid || "authorized_member";

  const selectedTerm = property.termOptions.find((t) => t.termMonths === termMonths) || property.termOptions[0];

  const intent: CommercialReservationIntent = {
    intentId: `intent-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    companyId,
    companyName,
    cityId,
    regionCode,
    slotId,
    canonicalPropertyKey: property.canonicalPropertyKey,
    status: "PENDING_REVIEW",
    requestedAt: now,
    requestedBy: actor,
    commercialTermsSnapshot: {
      tier: property.tier,
      pricingModel: property.pricingModel,
      price: selectedTerm.price,
      currency: selectedTerm.currency,
      billingPeriod: selectedTerm.billingPeriod,
      termLengthMonths: selectedTerm.termMonths,
      autoRenew,
    },
    notes,
  };

  reservationIntentsStore.set(intent.intentId, intent);
  saveReservationIntent(intent).catch(() => {});

  // Update property to RESERVED
  property.availabilityStatus = "RESERVED";
  property.commercialStatus = "RESERVED";
  property.tenantCompanyId = companyId;
  property.tenantCompanyName = companyName;
  commercialInventoryStore.set(propertyKey, property);
  saveCommercialProperty(property).catch(() => {});
  atomicHoldSlot(companyId, slotId, property.canonicalPropertyKey, intent).catch(() => {});

  recordCommercialAudit(actor, companyId, property.canonicalPropertyKey, "RESERVATION_CREATED", undefined, {
    intentId: intent.intentId,
    terms: intent.commercialTermsSnapshot,
  });

  return { success: true, intent };
}

/**
 * 2. REVIEW RESERVATION INTENT (MarineWorld Commercial Operator Action)
 */
export function reviewReservationIntent(params: {
  intentId: string;
  operatorActor: string;
  action: "REVIEW" | "REQUEST_INFO" | "DECLINE";
  notes?: string;
}): { success: boolean; intent?: CommercialReservationIntent; error?: string } {
  const { intentId, operatorActor, action, notes } = params;
  const intent = reservationIntentsStore.get(intentId);
  if (!intent) return { success: false, error: "Reservation intent not found." };

  if (action === "REVIEW") {
    intent.status = "UNDER_COMMERCIAL_REVIEW";
    intent.reviewNotes = notes;
    intent.reviewedBy = operatorActor;
    intent.reviewedAt = new Date().toISOString();
    reservationIntentsStore.set(intent.intentId, intent);
    saveReservationIntent(intent).catch(() => {});
  } else if (action === "DECLINE") {
    intent.status = "DECLINED";
    intent.reviewNotes = notes || "Declined during commercial review.";
    intent.reviewedBy = operatorActor;
    intent.reviewedAt = new Date().toISOString();
    reservationIntentsStore.set(intent.intentId, intent);
    saveReservationIntent(intent).catch(() => {});

    // Release property hold
    releasePropertyHold(intent.canonicalPropertyKey, operatorActor, "Reservation intent declined.");
  }

  recordCommercialAudit(
    operatorActor,
    intent.companyId,
    intent.canonicalPropertyKey,
    "RESERVATION_REVIEWED",
    undefined,
    { intentId, action, notes }
  );

  return { success: true, intent };
}

/**
 * 3. CREATE IMMUTABLE COMMERCIAL OFFER (MarineWorld Deal Desk)
 * Once issued, terms are immutable.
 */
export function createCommercialOffer(params: {
  reservationIntentId?: string;
  companyId: string;
  companyName?: string;
  canonicalPropertyKey?: string;
  cityId?: string;
  regionCode?: string;
  slotId?: string;
  tier?: CommercialPropertyTier;
  price?: number;
  annualRate?: number;
  currency?: string;
  billingPeriod?: BillingPeriod;
  termMonths?: number;
  startDate?: string;
  autoRenew?: boolean;
  notes?: string;
  conditions?: string[];
  operatorActor?: string;
  operatorEmail?: string;
  expiresInDays?: number;
}): { success: boolean; offer?: CommercialOffer; error?: string } {
  const {
    reservationIntentId,
    companyId,
    canonicalPropertyKey: inputCanonicalKey,
    startDate,
    notes,
    conditions,
    expiresInDays = 30,
  } = params;

  let property: CommercialDigitalProperty | undefined;
  if (inputCanonicalKey) {
    property = getCommercialPropertyByKey(inputCanonicalKey);
  } else if (params.cityId && params.regionCode && params.slotId) {
    const propertyKey = getCommercialPropertyKey(params.cityId, params.regionCode, params.slotId);
    property = commercialInventoryStore.get(propertyKey);
  }

  const cityId = params.cityId || property?.cityId || "";
  const regionCode = params.regionCode || property?.regionCode || "";
  const slotId = params.slotId || property?.slotId || "";
  const tier: CommercialPropertyTier = params.tier || property?.tier || "LANDMARK";
  const price = params.price ?? params.annualRate ?? property?.price ?? 45000;
  const currency = params.currency || property?.currency || "USD";
  const billingPeriod: BillingPeriod = params.billingPeriod || property?.billingPeriod || "YEAR";
  const termMonths = params.termMonths || 12;
  const autoRenew = params.autoRenew !== undefined ? params.autoRenew : true;
  const operatorActor = params.operatorActor || params.operatorEmail || "commercial-ops@marineworld.city";

  const canonicalPropertyKey = property
    ? property.canonicalPropertyKey
    : (inputCanonicalKey || formatCanonicalKey(cityId, regionCode, slotId));

  const company = getCompanyRecordSync(companyId);
  const companyName = params.companyName || company?.displayName || company?.legalName || companyId;

  const now = new Date();
  const termDates = calculateTermDates(startDate || now.toISOString(), termMonths);
  const offerExpires = new Date(now.getTime() + expiresInDays * 24 * 3600 * 1000);

  const annualRate = price;
  const totalContractValue = Math.round((annualRate * termMonths) / 12);

  const offer: CommercialOffer = {
    offerId: `off-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    reservationIntentId,
    companyId,
    companyName,
    propertyKey: canonicalPropertyKey,
    canonicalPropertyKey,
    cityId,
    regionCode,
    slotId,
    tier,
    price,
    currency,
    billingPeriod,
    termMonths,
    annualRate,
    totalContractValue,
    startDate: termDates.startDate,
    endDate: termDates.endDate,
    autoRenew,
    notes,
    conditions: conditions || [
      "Guaranteed priority digital real estate placement in selected Sector City edition",
      "Full dual billing support (Stripe or Google Cloud Marketplace)",
      "Direct Interactive Digital Operating Environment Launch",
    ],
    createdBy: operatorActor,
    createdAt: now.toISOString(),
    expiresAt: offerExpires.toISOString(),
    status: "ISSUED",
    isImmutable: true,
  };

  commercialOffersStore.set(offer.offerId, offer);
  saveCommercialOffer(offer).catch(() => {});

  // Link to reservation intent if present
  if (reservationIntentId) {
    const intent = reservationIntentsStore.get(reservationIntentId);
    if (intent) {
      intent.status = "OFFER_CREATED";
      intent.offerId = offer.offerId;
      reservationIntentsStore.set(intent.intentId, intent);
      saveReservationIntent(intent).catch(() => {});
    }
  }

  // Update property commercial status
  if (property) {
    property.availabilityStatus = "RESERVED";
    property.commercialStatus = "OFFERED";
    property.tenantCompanyId = companyId;
    property.tenantCompanyName = companyName;
    const storeKey = getCommercialPropertyKey(property.cityId, property.regionCode, property.slotId);
    commercialInventoryStore.set(storeKey, property);
    saveCommercialProperty(property).catch(() => {});
  }

  recordCommercialAudit(operatorActor, companyId, canonicalPropertyKey, "OFFER_CREATED", undefined, {
    offerId: offer.offerId,
    totalContractValue,
    termMonths,
  });

  recordCommercialAudit(operatorActor, companyId, canonicalPropertyKey, "OFFER_ISSUED", undefined, {
    offerId: offer.offerId,
  });

  return { success: true, offer };
}

/**
 * 4. ACCEPT COMMERCIAL OFFER & SELECT BILLING METHOD (Company OWNER / ADMIN Action)
 * Creates the canonical CommercialAgreement and initializes the chosen billing rail.
 */
export async function acceptCommercialOffer(params: {
  offerId: string;
  companyActor: string;
  memberRole: string;
  billingMethod: BillingMethod;
  billingContext?: {
    cloudBillingAccountId?: string;
    cloudBillingOrganizationId?: string;
    cloudBillingContact?: string;
    stripeCustomerId?: string;
  };
}): Promise<{ success: boolean; agreement?: CommercialAgreement; error?: string }> {
  const { offerId, companyActor, memberRole, billingMethod, billingContext } = params;

  if (memberRole !== "OWNER" && memberRole !== "ADMIN") {
    return {
      success: false,
      error: "Access Denied: Only company OWNER or ADMIN roles may accept commercial offers.",
    };
  }

  const offer = commercialOffersStore.get(offerId);
  if (!offer) return { success: false, error: "Commercial offer not found." };
  if (offer.status !== "ISSUED") {
    return { success: false, error: `Cannot accept offer in status: ${offer.status}` };
  }

  // If company context provided, update company-level settings
  if (billingContext) {
    updateCompanyBillingConfig(offer.companyId, {
      cloudBillingAccountId: billingContext.cloudBillingAccountId,
      cloudBillingOrganizationId: billingContext.cloudBillingOrganizationId,
      cloudBillingContact: billingContext.cloudBillingContact,
      googleMarketplaceEnabled: billingMethod === "GOOGLE_CLOUD_MARKETPLACE" ? true : undefined,
      stripeCustomerId: billingContext.stripeCustomerId,
    });
  }

  const now = new Date().toISOString();

  // Create Canonical CommercialAgreement
  const agreementId = `agr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const agreement: CommercialAgreement = {
    agreementId,
    offerId: offer.offerId,
    reservationIntentId: offer.reservationIntentId,
    companyId: offer.companyId,
    companyName: offer.companyName,
    propertyKey: offer.canonicalPropertyKey,
    canonicalPropertyKey: offer.canonicalPropertyKey,
    cityId: offer.cityId,
    regionCode: offer.regionCode,
    slotId: offer.slotId,
    tier: offer.tier,
    currency: offer.currency,
    annualRate: offer.annualRate,
    termMonths: offer.termMonths,
    totalContractValue: offer.totalContractValue,
    startDate: offer.startDate,
    endDate: offer.endDate,
    autoRenew: offer.autoRenew,
    contractStatus: "ACCEPTED",
    billingStatus: "PENDING",
    billingMethod,
    createdAt: now,
    createdBy: companyActor,
    acceptedAt: now,
    acceptedBy: companyActor,
    offerSnapshot: offer,
    notes: `Commercial offer accepted via ${billingMethod} rail.`,
  };

  commercialAgreementsStore.set(agreement.agreementId, agreement);

  // Update offer status
  offer.status = "ACCEPTED";
  commercialOffersStore.set(offer.offerId, offer);

  // Initialize Billing Provider Projection
  if (billingMethod === "STRIPE") {
    const stripeRes = await stripeProvider.createBillingOffer({
      agreementId: agreement.agreementId,
      companyId: agreement.companyId,
      propertyKey: agreement.propertyKey,
      currency: agreement.currency,
      annualRate: agreement.annualRate,
      totalContractValue: agreement.totalContractValue,
      termMonths: agreement.termMonths,
      companyContext: {
        stripeCustomerId: billingContext?.stripeCustomerId,
      },
    });
    if (stripeRes.success) {
      agreement.billingCustomerRef = (stripeRes.record as StripeBillingRecord).customerId;
      agreement.billingSubscriptionRef = (stripeRes.record as StripeBillingRecord).subscriptionId;
      agreement.contractStatus = "PAYMENT_PENDING";
      commercialAgreementsStore.set(agreement.agreementId, agreement);
    }
  } else if (billingMethod === "GOOGLE_CLOUD_MARKETPLACE") {
    const gcpRes = await googleCloudProvider.createBillingOffer({
      agreementId: agreement.agreementId,
      companyId: agreement.companyId,
      propertyKey: agreement.propertyKey,
      currency: agreement.currency,
      annualRate: agreement.annualRate,
      totalContractValue: agreement.totalContractValue,
      termMonths: agreement.termMonths,
      companyContext: {
        cloudBillingAccountId: billingContext?.cloudBillingAccountId,
        cloudBillingOrganizationId: billingContext?.cloudBillingOrganizationId,
        cloudBillingContact: billingContext?.cloudBillingContact,
      },
    });
    if (gcpRes.success) {
      agreement.billingCustomerRef = (gcpRes.record as GoogleCloudBillingRecord).cloudBillingAccountId;
      agreement.billingAgreementRef = (gcpRes.record as GoogleCloudBillingRecord).privateOfferId;
      agreement.contractStatus = "CONTRACT_PENDING";
      commercialAgreementsStore.set(agreement.agreementId, agreement);
    }
  }

  // Update property state
  const property = getCommercialPropertyByKey(offer.canonicalPropertyKey);
  if (property) {
    property.commercialStatus = "AGREED";
    property.availabilityStatus = "RESERVED";
    const key = getCommercialPropertyKey(property.cityId, property.regionCode, property.slotId);
    commercialInventoryStore.set(key, property);
    saveCommercialProperty(property).catch(() => {});
  }

  saveCommercialAgreement(agreement).catch(() => {});
  saveCommercialOffer(offer).catch(() => {});
  if (property) {
    atomicAcceptOfferAndCreateAgreement(agreement, offer, property).catch(() => {});
  }

  recordCommercialAudit(companyActor, offer.companyId, offer.canonicalPropertyKey, "OFFER_ACCEPTED", agreement.agreementId, {
    offerId: offer.offerId,
    billingMethod,
  });

  recordCommercialAudit(companyActor, offer.companyId, offer.canonicalPropertyKey, "BILLING_METHOD_SELECTED", agreement.agreementId, {
    billingMethod,
  });

  recordCommercialAudit(companyActor, offer.companyId, offer.canonicalPropertyKey, "AGREEMENT_CREATED", agreement.agreementId, {
    totalContractValue: agreement.totalContractValue,
  });

  return { success: true, agreement };
}

/**
 * 5. DECLINE COMMERCIAL OFFER (Company OWNER / ADMIN Action)
 */
export function declineCommercialOffer(params: {
  offerId: string;
  companyActor: string;
  memberRole: string;
  reason?: string;
}): { success: boolean; error?: string } {
  const { offerId, companyActor, memberRole, reason } = params;

  if (memberRole !== "OWNER" && memberRole !== "ADMIN") {
    return {
      success: false,
      error: "Access Denied: Only company OWNER or ADMIN roles may decline commercial offers.",
    };
  }

  const offer = commercialOffersStore.get(offerId);
  if (!offer) return { success: false, error: "Offer not found." };

  offer.status = "DECLINED";
  commercialOffersStore.set(offer.offerId, offer);
  saveCommercialOffer(offer).catch(() => {});

  // Release property hold
  releasePropertyHold(offer.canonicalPropertyKey, companyActor, reason || "Offer declined by company.");

  recordCommercialAudit(companyActor, offer.companyId, offer.canonicalPropertyKey, "OFFER_DECLINED", undefined, {
    offerId,
    reason,
  });

  return { success: true };
}

/**
 * 6. AUTHORITATIVE PAYMENT / ENTITLEMENT CONFIRMATION (Webhook or Operational Event)
 * Authoritative payment event transitions agreement to PAYMENT_CONFIRMED.
 */
export function confirmProviderPayment(
  paramsOrId: { agreementId: string; actor?: string; providerEventRef?: string } | string,
  actorArg?: string,
  providerEventRefArg?: string
): { success: boolean; agreement?: CommercialAgreement; error?: string } {
  let agreementId: string;
  let actor: string = "payment-webhook-worker";
  let providerEventRef: string | undefined = undefined;

  if (typeof paramsOrId === "string") {
    agreementId = paramsOrId;
    if (actorArg) actor = actorArg;
    if (providerEventRefArg) providerEventRef = providerEventRefArg;
  } else {
    agreementId = paramsOrId.agreementId;
    if (paramsOrId.actor) actor = paramsOrId.actor;
    if (paramsOrId.providerEventRef) providerEventRef = paramsOrId.providerEventRef;
  }

  const agreement = commercialAgreementsStore.get(agreementId);
  if (!agreement) return { success: false, error: "Commercial agreement not found." };

  if (agreement.billingMethod === "STRIPE") {
    stripeProvider.simulateWebhookPaymentSuccess(agreementId, actor);
  } else if (agreement.billingMethod === "GOOGLE_CLOUD_MARKETPLACE") {
    googleCloudProvider.simulateEntitlementApproved(agreementId, actor);
  }

  agreement.contractStatus = "PAYMENT_CONFIRMED";
  agreement.billingStatus = "ACTIVE";
  commercialAgreementsStore.set(agreement.agreementId, agreement);
  saveCommercialAgreement(agreement).catch(() => {});

  recordCommercialAudit(actor, agreement.companyId, agreement.canonicalPropertyKey, "PAYMENT_CONFIRMED", agreement.agreementId, {
    billingMethod: agreement.billingMethod,
    providerEventRef,
  });

  return { success: true, agreement };
}

/**
 * 7. PROPERTY COMMERCIAL ACTIVATION
 * Requires: CommercialAgreement.contractStatus === "PAYMENT_CONFIRMED"
 * Result: CommercialStatus = ACTIVE
 * (Governance lifecycle remains completely separate)
 */
export function activateCommercialProperty(
  paramsOrId: { agreementId: string; operatorActor: string } | string,
  operatorActorArg?: string
): { success: boolean; agreement?: CommercialAgreement; property?: CommercialDigitalProperty; error?: string } {
  let agreementId: string;
  let operatorActor: string = "commercial-ops";

  if (typeof paramsOrId === "string") {
    agreementId = paramsOrId;
    if (operatorActorArg) operatorActor = operatorActorArg;
  } else {
    agreementId = paramsOrId.agreementId;
    operatorActor = paramsOrId.operatorActor;
  }

  const agreement = commercialAgreementsStore.get(agreementId);
  if (!agreement) return { success: false, error: "Agreement not found." };

  if (agreement.contractStatus !== "PAYMENT_CONFIRMED" && agreement.contractStatus !== "ACTIVE") {
    return {
      success: false,
      error: `Activation failed: Commercial agreement requires PAYMENT_CONFIRMED status (current: ${agreement.contractStatus}).`,
    };
  }

  const property = getCommercialPropertyByKey(agreement.canonicalPropertyKey);
  if (!property) return { success: false, error: "Target digital property not found." };

  if (
    property.availabilityStatus === "ACTIVE" &&
    property.tenantCompanyId &&
    property.tenantCompanyId !== agreement.companyId
  ) {
    return {
      success: false,
      error: `Activation collision: Property is already occupied by ${property.tenantCompanyName || property.tenantCompanyId}.`,
    };
  }

  const now = new Date().toISOString();

  // 1. Activate Agreement
  agreement.contractStatus = "ACTIVE";
  agreement.billingStatus = "ACTIVE";
  agreement.activatedAt = now;
  agreement.activatedBy = operatorActor;
  commercialAgreementsStore.set(agreement.agreementId, agreement);

  // 2. Activate Property (Commercial State ONLY)
  property.availabilityStatus = "ACTIVE";
  property.commercialStatus = "ACTIVE";
  property.tenantCompanyId = agreement.companyId;
  property.tenantCompanyName = agreement.companyName;
  property.heldAt = undefined;
  property.heldBy = undefined;
  property.holdExpiresAt = undefined;
  property.termDetails = {
    startDate: agreement.startDate,
    endDate: agreement.endDate,
    termLengthMonths: agreement.termMonths,
    autoRenew: agreement.autoRenew,
  };

  const storeKey = getCommercialPropertyKey(property.cityId, property.regionCode, property.slotId);
  commercialInventoryStore.set(storeKey, property);

  saveCommercialAgreement(agreement).catch(() => {});
  saveCommercialProperty(property).catch(() => {});
  atomicConfirmPaymentAndActivateProperty(agreement, property).catch(() => {});

  recordCommercialAudit(operatorActor, agreement.companyId, agreement.canonicalPropertyKey, "ACTIVATED", agreement.agreementId, {
    activatedAt: now,
    startDate: agreement.startDate,
    endDate: agreement.endDate,
    billingMethod: agreement.billingMethod,
  });

  return { success: true, agreement, property };
}

export const activateCommercialAgreement = activateCommercialProperty;

/**
 * SUSPEND COMMERCIAL AGREEMENT
 */
export function suspendCommercialAgreement(
  agreementId: string,
  operatorActor: string = "commercial-ops",
  reason?: string
): { success: boolean; agreement?: CommercialAgreement; error?: string } {
  const agreement = commercialAgreementsStore.get(agreementId);
  if (!agreement) return { success: false, error: "Agreement not found." };

  agreement.contractStatus = "SUSPENDED";
  agreement.billingStatus = "PAUSED";
  commercialAgreementsStore.set(agreement.agreementId, agreement);

  const property = getCommercialPropertyByKey(agreement.canonicalPropertyKey);
  if (property && property.tenantCompanyId === agreement.companyId) {
    property.commercialStatus = "SUSPENDED";
    property.availabilityStatus = "HELD";
    const storeKey = getCommercialPropertyKey(property.cityId, property.regionCode, property.slotId);
    commercialInventoryStore.set(storeKey, property);
    saveCommercialProperty(property).catch(() => {});
  }

  saveCommercialAgreement(agreement).catch(() => {});

  recordCommercialAudit(operatorActor, agreement.companyId, agreement.canonicalPropertyKey, "SUSPENDED", agreement.agreementId, {
    reason: reason || "Commercial operations suspension",
  });

  return { success: true, agreement };
}


/**
 * 8. RENEWAL WINDOW TRIGGER
 * For ACTIVE agreements approaching expiration.
 */
export function triggerRenewalWindow(params: {
  agreementId: string;
  operatorActor: string;
  termMonths?: number;
  discountPct?: number;
}): { success: boolean; renewalOffer?: CommercialOffer; error?: string } {
  const { agreementId, operatorActor, termMonths = 12, discountPct = 10 } = params;
  const parentAgreement = commercialAgreementsStore.get(agreementId);
  if (!parentAgreement) return { success: false, error: "Parent agreement not found." };

  const currentEnd = new Date(parentAgreement.endDate || new Date());
  const renewalDates = calculateTermDates(currentEnd, termMonths);
  const discountedAnnualRate = Math.round(parentAgreement.annualRate * (1 - discountPct / 100));
  const totalContractValue = Math.round((discountedAnnualRate * termMonths) / 12);

  const renewalOffer: CommercialOffer = {
    offerId: `off-ren-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    companyId: parentAgreement.companyId,
    companyName: parentAgreement.companyName,
    propertyKey: parentAgreement.canonicalPropertyKey,
    canonicalPropertyKey: parentAgreement.canonicalPropertyKey,
    cityId: parentAgreement.cityId,
    regionCode: parentAgreement.regionCode,
    slotId: parentAgreement.slotId,
    tier: parentAgreement.tier,
    price: discountedAnnualRate,
    currency: parentAgreement.currency,
    billingPeriod: "YEAR",
    termMonths,
    annualRate: discountedAnnualRate,
    totalContractValue,
    startDate: renewalDates.startDate,
    endDate: renewalDates.endDate,
    autoRenew: true,
    conditions: [
      `${discountPct}% Loyalty Renewal Discount`,
      "Continuous Landmark Anchor uninterrupted entitlement",
      "Seamless creative roll-forward",
    ],
    notes: `Renewal cycle for parent agreement ${parentAgreement.agreementId}.`,
    createdBy: operatorActor,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    status: "ISSUED",
    isImmutable: true,
  };

  commercialOffersStore.set(renewalOffer.offerId, renewalOffer);

  recordCommercialAudit(operatorActor, parentAgreement.companyId, parentAgreement.canonicalPropertyKey, "RENEWAL_STARTED", parentAgreement.agreementId, {
    parentAgreementId: parentAgreement.agreementId,
    renewalOfferId: renewalOffer.offerId,
  });

  return { success: true, renewalOffer };
}

/**
 * 9. EXPIRATION & CANCELLATION
 */
export function expireCommercialAgreement(
  agreementId: string,
  actor: string = "SYSTEM"
): { success: boolean; agreement?: CommercialAgreement; error?: string } {
  const agreement = commercialAgreementsStore.get(agreementId);
  if (!agreement) return { success: false, error: "Agreement not found." };

  const now = new Date().toISOString();
  agreement.contractStatus = "EXPIRED";
  agreement.expiredAt = now;
  commercialAgreementsStore.set(agreement.agreementId, agreement);

  const property = getCommercialPropertyByKey(agreement.canonicalPropertyKey);
  if (property && property.tenantCompanyId === agreement.companyId) {
    property.commercialStatus = "EXPIRED";
    property.availabilityStatus = "AVAILABLE";
    property.tenantCompanyId = null;
    property.tenantCompanyName = null;
    const storeKey = getCommercialPropertyKey(property.cityId, property.regionCode, property.slotId);
    commercialInventoryStore.set(storeKey, property);
  }

  recordCommercialAudit(actor, agreement.companyId, agreement.canonicalPropertyKey, "EXPIRED", agreement.agreementId, {
    expiredAt: now,
  });

  return { success: true, agreement };
}

/**
 * 10. PUBLIC VISIBILITY RULE
 * Exact rule:
 * commercialStatus === ACTIVE AND governanceStatus === PUBLISHED
 */
export function resolvePublicPropertyVisibility(
  canonicalPropertyKey: string,
  governanceStatus: string
): {
  isPublic: boolean;
  commercialStatus: CommercialStatus;
  governanceStatus: string;
  reason: string;
} {
  const property = getCommercialPropertyByKey(canonicalPropertyKey);
  const commStatus: CommercialStatus = property ? property.commercialStatus : "AVAILABLE";

  const isCommercialActive = commStatus === "ACTIVE";
  const isGovernancePublished = governanceStatus === "PUBLISHED";

  if (isCommercialActive && isGovernancePublished) {
    return {
      isPublic: true,
      commercialStatus: commStatus,
      governanceStatus,
      reason: "PUBLIC: Valid active commercial entitlement + published creative governance.",
    };
  }

  if (isCommercialActive && !isGovernancePublished) {
    return {
      isPublic: false,
      commercialStatus: commStatus,
      governanceStatus,
      reason: `NOT PUBLIC: Commercial agreement is ACTIVE, but creative governance is ${governanceStatus}.`,
    };
  }

  if (!isCommercialActive && isGovernancePublished) {
    return {
      isPublic: false,
      commercialStatus: commStatus,
      governanceStatus,
      reason: `NOT PUBLIC: Creative is PUBLISHED, but commercial entitlement is ${commStatus} (Requires ACTIVE deal).`,
    };
  }

  return {
    isPublic: false,
    commercialStatus: commStatus,
    governanceStatus,
    reason: `NOT PUBLIC: Commercial state is ${commStatus} and Governance state is ${governanceStatus}.`,
  };
}
