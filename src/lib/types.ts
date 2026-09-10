/**
 * DigiOne Sector City Framework — core type contracts.
 *
 * A Sector City is fully described by a SectorConfig. Swapping the
 * configuration (terminology, taxonomy, cities, regions, imagery)
 * produces a new sector city without touching UI architecture.
 *
 * Registry principle: adding a city / company / region requires ONE
 * new registry entry — never a new component, route or duplicated JSX.
 * The UI renders the registry.
 */

export type IconName =
  | "search"
  | "menu"
  | "close"
  | "arrowRight"
  | "arrowUpRight"
  | "arrowUp"
  | "chevronDown"
  | "anchor"
  | "ship"
  | "crane"
  | "gantry"
  | "exchange"
  | "route"
  | "drafting"
  | "sail"
  | "dock"
  | "helm"
  | "chip"
  | "twin"
  | "database"
  | "shield"
  | "scales"
  | "chart"
  | "lifebuoy"
  | "rig"
  | "sonar"
  | "globe"
  | "network"
  | "radar"
  | "doc"
  | "connect"
  | "building"
  | "check"
  | "scan"
  | "lock"
  | "layers"
  | "sliders"
  | "spark"
  | "compass"
  | "gauge"
  | "sunrise"
  | "flag"
  | "key"
  | "pin"
  | "send"
  | "cube"
  | "box"
  | "briefcase"
  | "crew";

export type CityCategory =
  | "Industrial Products, Equipment & Manufacturing"
  | "Maritime Services, Ports, Marinas & Operations"
  | "Yachting, Charter & Maritime Lifestyle"
  | "Offshore, Energy & Subsea"
  | "Real Estate & Hospitality"
  | "Maritime Technology & AI Systems"
  | "Legal, Finance & Compliance"
  | "Industry Governance, Associations & Clusters"
  | "Commerce"
  | "Industry"
  | "Operations"
  | "Technology"
  | "Capital"
  | "Lifestyle";

/** Lifecycle status for sector / city / company entities. */
export type EntityStatus = "LIVE" | "COMING_SOON" | "PRIVATE" | "ARCHIVED";

/** Navigation link contract (shared by header + footer). */
export interface NavigationItem {
  label: string;
  href: string;
}

export interface IndustryDomainEntity {
  id: string;
  slug: string;
  /** Human-readable name, e.g. "Maritime Services". */
  name: string;
  description: string;
  icon: IconName;
  status?: EntityStatus;
  featured?: boolean;
  sortOrder?: number;
}

export interface SectorCity {
  id: string;
  /** Display name, e.g. "SHIPYARD.CITY". */
  domain: string;
  /** URL slug — required for dynamic routing. */
  slug: string;
  /** Registry code, e.g. "REG 05". */
  code: string;
  /** Parent Industry Domain — connects city to domain hierarchy. */
  industryDomainId: string;
  category: CityCategory;
  /** Lifecycle status — resolves to COMING_SOON when omitted. */
  status?: EntityStatus;
  /** Production URL — only set when status === LIVE. */
  url?: string;
  /** Whether this city belongs to the curated landing subset. */
  featured?: boolean;
  sortOrder?: number;
  description: string;
  shortDescription: string;
  icon: IconName;
  /** Public registry geography. Empty / omitted means scope is not configured. */
  regionIds?: string[];
  countryIds?: string[];
  scope: string[];
}

export interface SectorRegion {
  id: string;
  code: string;
  name: string;
  /** Schematic graticule position, 0–100 x / 0–62 y space. */
  x: number;
  y: number;
  description: string;
  focus: string[];
}

export type VerificationStatus = "verified" | "review";
export type AIStatus = "twin" | "ready";
export type OfferingType = "product" | "service" | "capability";
export type BusinessTwinState = "AVAILABLE" | "COMING_SOON" | "NOT_CONFIGURED";

export interface OfferingMediaItem {
  id: string;
  url: string;
  title?: string;
  type: "cover" | "photo" | "video" | "drawing";
  isCover?: boolean;
  order?: number;
}

export interface OfferingGroundingSource {
  id: string;
  title: string;
  filename?: string;
  fileType?: string;
  size?: string;
  url?: string;
  uploadedAt?: string;
  sourceConfidence?: number;
  extractedFieldsCount?: number;
  origin?: "COMPUTER" | "GOOGLE_DRIVE" | "URL";
  drivePath?: string;
  driveFolderId?: string;
  syncStatus?: "CONNECTED" | "SYNCED" | "UPDATED" | "REVIEW_REQUIRED";
  syncEnabled?: boolean;
  isDownloadableDocument?: boolean;
  isGroundingSource?: boolean;
  summary?: string;
  contentExcerpt?: string;
  extractedText?: string;
  description?: string;
  base64Data?: string;
  hasConflict?: boolean;
  conflictDescription?: string;
}

export type AdvisorRole =
  | "Technical Expert"
  | "Sales Advisor"
  | "Application Specialist"
  | "Procurement Advisor"
  | "Compliance Specialist";

export type AdvisorConversationPriority =
  | "Technical Specifications"
  | "Applications & Suitability"
  | "Certifications & Compliance"
  | "Commercial Information"
  | "Availability & Lead Time"
  | "RFQ / Offer Requests";

export type AdvisorCommunicationStyle =
  | "Precise"
  | "Technical"
  | "Transparent"
  | "Commercial"
  | "Solution-Oriented"
  | "Concise";

export interface OfferingAIAdvisorConfig {
  enabled: boolean;
  advisorName?: string;
  roles: AdvisorRole[];
  conversationPriorities: AdvisorConversationPriority[];
  communicationStyle: AdvisorCommunicationStyle[];
  status?: "AI READY" | "GROUNDED" | "ACTIVE";
  verifiedSourcesCount?: number;
  lastGeneratedAt?: string;
}

export interface OfferingCommercialInfo {
  price?: string;
  currency?: string;
  priceAmount?: number;
  pricingType?: "FIXED" | "STARTING_FROM" | "RFQ_ONLY" | "UPON_REQUEST" | string;
  pricingGuidance?: string;
  incoterms?: string;
  leadTime?: string;
  availability?: string;
  rfqAvailable?: boolean;
  minOrderQty?: string;
  warranty?: string;
}

export interface GoogleDriveOfferingSync {
  connected: boolean;
  folderPath?: string;
  lastSyncedAt?: string;
  syncStatus: "CONNECTED" | "SYNCED" | "UPDATED" | "REVIEW_REQUIRED";
  syncEnabled: boolean;
  pendingChangesCount?: number;
}

export interface CompanyOffering {
  id: string;
  offeringId?: string; // Canonical alias for id
  entityId?: string; // Canonical entity identifier
  companyId: string;
  companySlug?: string; // Authoritative Company slug in canonical URL
  name: string;
  slug?: string;
  canonicalUrl?: string; // Format: https://{offeringSlug}.{companySlug}.{sectorCity}.marineworld.city
  type: OfferingType;
  entityType?: "PRODUCT" | "SERVICE" | "product" | "service";
  category: string;
  shortDescription: string;
  detailedDescription?: string;
  status?: "AVAILABLE" | "ACTIVE" | "SPECIFICATION" | "PUBLISHED" | "READY" | "DRAFT" | "ARCHIVED" | EntityStatus;
  publishState?: "DRAFT" | "READY" | "PUBLISHED" | "ARCHIVED";
  code?: string;
  sku?: string;
  canonicalSectorCity?: string; // Primary Sector City determining canonical identity
  sectorCity?: string; // Primary Sector City (alias for canonicalSectorCity)
  sectorCities?: string[]; // Multi-city network contexts without entity duplication
  industryDomain?: string;
  previousSlugs?: string[];
  company?: Partial<CompanyProfile>;
  specifications?: Record<string, string>;
  applications?: string[];
  certifications?: string[];
  standards?: string[];
  mediaReferences?: OfferingMediaItem[];
  media?: OfferingMediaItem[];
  price?: string;
  currency?: string;
  commercialInformation?: OfferingCommercialInfo;
  serviceScope?: string;
  coverage?: string;
  deliveryModel?: string;
  groundingSources?: OfferingGroundingSource[];
  sourceDocuments?: OfferingGroundingSource[];
  groundingStatus?: "NOT GROUNDED" | "GROUNDING REQUIRED" | "GROUNDED" | "AI READY";
  aiAdvisorConfig?: OfferingAIAdvisorConfig;
  fieldConfirmations?: Record<string, "AI_EXTRACTED" | "COMPANY_CONFIRMED">;
  sourceAttributions?: Record<string, string>;
  googleDriveSync?: GoogleDriveOfferingSync;
  pendingAiUpdate?: boolean;
  sectorCityReferences?: string[];
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/* --- Canonical Physical Operating Presence Schema --- */
export type PhysicalFacilityType =
  | "Office"
  | "Factory"
  | "Shipyard"
  | "Service Center"
  | "Showroom"
  | "Warehouse"
  | "Logistics Hub"
  | "Workshop"
  | "Sales Office"
  | "Regional Branch"
  | "Other"
  | "Headquarters"
  | "Distribution Hub"
  | "Marina / Port Facility"
  | "Branch Office"
  | "Regional Office"
  | "Training Center"
  | "Technical Center"
  | "Other Facility";

export type FacilityOperationalStatus =
  | "ACTIVE"
  | "MAINTENANCE"
  | "CONSTRUCTION"
  | "SEASONAL"
  | "STANDBY"
  | "INACTIVE";

export type FacilityVisibility = "PUBLIC" | "RESTRICTED" | "INTERNAL";

export type FacilityMediaCategory =
  | "EXTERIOR"
  | "INTERIOR"
  | "WORKSHOP"
  | "PRODUCTION"
  | "SHOWROOM"
  | "OFFICE"
  | "SERVICE"
  | "INFRASTRUCTURE"
  | "OTHER";

export interface FacilityMediaItem {
  id: string;
  type?: string;
  source: "upload" | "url";
  url: string;
  image?: string;
  storagePath?: string;
  caption?: string;
  title?: string;
  isCover?: boolean;
  sortOrder?: number;
  category?: FacilityMediaCategory;
  createdAt?: string;
}

export interface PhysicalFacility {
  id: string;
  companyId: string;
  facilityName: string;
  facilityType: PhysicalFacilityType;
  country: string;
  city: string;
  address: string;
  description: string;
  operationalScope?: string;
  contactEmail: string;
  contactPhone?: string;
  telephone?: string;
  status: FacilityOperationalStatus;
  operatingStatus?: FacilityOperationalStatus;
  visibility: FacilityVisibility;
  isHeadquarters?: boolean;
  sectorCityLinks?: string[];
  verificationStatus?: "VERIFIED" | "PENDING" | "UNVERIFIED";
  website?: string;
  geoCoordinates?: {
    latitude?: number;
    longitude?: number;
  };
  openingHours?: string;
  operatingHours?: string;
  yearEstablished?: string | number;
  media?: FacilityMediaItem[];
  createdAt?: string;
  updatedAt?: string;
}

/* --- Stage 08 — Digital Business Twin Schema --- */
export type CompanyNodeType =
  | "HEADQUARTERS"
  | "REGIONAL_NODE"
  | "BRANCH"
  | "AUTHORIZED_DISTRIBUTOR"
  | "STRATEGIC_PARTNER"
  | "LOCAL_SUPPORT_HUB"
  | "PRODUCTION_FACILITY"
  | "LOGISTICS_CENTER";

export interface CompanyNode {
  id: string;
  companyId: string;
  name: string;
  city: string;
  country: string;
  address?: string;
  operationType: CompanyNodeType;
  description?: string;
  subdomain?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: "ACTIVE" | "VERIFIED" | "PENDING" | "INACTIVE";
  isHeadquarters?: boolean;
}

export interface TwinSectionCompleteness {
  sectionId: "identity" | "organization" | "products" | "services" | "capabilities" | "digital_presence";
  sectionLabel: string;
  score: number;
  completedFieldsCount: number;
  totalFieldsCount: number;
  missingRequiredFields: string[];
}

export interface BusinessTwinModel {
  companyId: string;
  companySlug: string;
  lastUpdated: string;
  version: string;
  verificationStatus: "VERIFIED" | "PENDING" | "UNVERIFIED" | "SUSPENDED";

  // Completeness
  overallCompleteness: number;
  sectionCompleteness: Record<string, TwinSectionCompleteness>;

  // Canonical Sub-Sections
  identity: {
    legalName: string;
    brandName: string;
    companyType: string;
    industry: string;
    sectorId: string;
    subsectorId?: string;
    shortDescription: string;
    description: string;
    foundedYear?: string;
    registrationNumber?: string;
    website?: string;
  };

  organization: {
    headquarters: CompanyNode;
    regionalNodes: CompanyNode[];
    totalNodeCount: number;
    nodeTypesSummary: Record<string, number>;
    registeredHeadquarters?: PhysicalFacility;
    physicalFacilities?: PhysicalFacility[];
    operatingCountries?: string[];
    operatingRegions?: string[];
  };

  productsSummary: {
    totalCount: number;
    categoriesCount: number;
    productIds: string[];
  };

  servicesSummary: {
    totalCount: number;
    categoriesCount: number;
    serviceIds: string[];
  };

  capabilities: string[];

  digitalPresence: {
    profileUrl: string;
    websiteUrl?: string;
    subdomain?: string;
    hasLogo: boolean;
    hasHeroImage: boolean;
    publicVisibility: boolean;
    officialEmail?: string;
    officialPhone?: string;
  };

  trustSignals: Array<{
    id: string;
    label: string;
    verified: boolean;
    source: string;
  }>;
}

export interface CompanyProfile {
  id: string;
  slug?: string;
  name: string;
  initials: string;
  /** Registry record classification. */
  recordType?: "PUBLIC_REGISTRY" | string;
  industry: string;
  city: string;
  /** IDs of Sector Cities this company belongs to — supports multi-city membership. */
  cityIds: string[];
  location: string;
  country?: string;
  region?: string;
  website?: string;
  status?: EntityStatus;
  verificationStatus: VerificationStatus;
  capabilities: string[];
  products?: string[];
  services?: string[];
  offerings?: CompanyOffering[];
  aiStatus: AIStatus;
  businessTwinStatus?: BusinessTwinState;
  shortDescription?: string;
  description?: string;
  coverImage?: string;
  flagshipStatement?: string;
  coverImageCaption?: string;
  logo?: string;
  categoryIds?: string[];
  industryDomainIds?: string[];
  sectorCityIds?: string[];
  primarySectorCityId?: string;
  publicProfile?: boolean;
  featured?: boolean;
  sortOrder?: number;

  // Commercial Digital Property & Flagship / Anchor Registry Status (Portable Across Platform)
  presenceTier?: "FLAGSHIP" | "ENTERPRISE" | "STANDARD";
  isFlagship?: boolean;
  flagshipSectorCityId?: string;
  flagshipRegisteredAt?: string;
  flagshipLeaseId?: string;
  isAnchor?: boolean;
  anchorSectorCityId?: string;
  anchorRegisteredAt?: string;

  // Corporate Identity & Registry Fields
  ownerId?: string;
  businessId?: string;
  companyId6Digit?: string;
  mwCompanyDigitalId?: string;
  primaryRegistryCode?: string;
  primaryRegistryNode?: string;
  organizationType?: OrganizationEntityType;
  displayName?: string;
  legalName?: string;
  tradingName?: string;
  companyType?: string;
  foundedYear?: string;
  employeeRange?: string;
  operatingStatus?: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED" | "NOT CONFIGURED";

  // PHASE 4.17B Canonical Classification & Identity
  primarySectorCategory?: string;
  secondarySectorCategories?: string[];
  regionalEditions?: string[];
  headquartersCity?: string;
  logoUrl?: string;
  corporateDescription?: string;

  // Legal Identity
  registrationCountry?: string;
  registrationAuthority?: string;
  registrationStatus?: string;
  registrationNumberPublic?: boolean;
  registrationNumber?: string;

  // Official Digital & Public Contact
  officialEmail?: string;
  officialPhone?: string;
  officialLinkedIn?: string;

  // Corporate Structure
  parentCompanyId?: string;
  subsidiaryCompanyIds?: string[];
  businessUnits?: string[];

  // Ecosystem Organization Affiliation (Single enrolling org context)
  enrolledOrganizationId?: string;
  enrolledOrganizationName?: string;
  enrolledOrganizationCode?: string;
  enrolledOrganizationCountry?: string;
  enrolledOrganizationType?: string;
  enrolledOrganizationDiscount?: number;
  ecosystemAffiliations?: Array<{
    organizationId: string;
    organizationName: string;
    organizationCountry: string;
    enrollmentCode: string;
    status: string;
    benefit: string;
    enrolledAt: string;
  }>;

  // Certifications Summary
  certifications?: Array<{
    name: string;
    issuer?: string;
    status?: string;
    validity?: string;
  }>;

  // Governance & Trust Fields
  governanceStatus?: "ACTIVE" | "PENDING" | "REVIEW" | "RESTRICTED" | "SUSPENDED" | "NOT CONFIGURED";
  identityStatus?: "CONFIGURED" | "VERIFIED" | "PENDING" | "RESTRICTED";
  securityStatus?: "SECURED" | "STANDARD" | "LIMITED" | "REVIEW" | "RESTRICTED";
  verificationLevel?: "BASIC" | "STANDARD" | "ADVANCED" | "ENTERPRISE";
  dataGovernanceStatus?: "CONTROLLED" | "PUBLIC" | "RESTRICTED";
  aiGovernanceStatus?: "ENABLED" | "CONTROLLED" | "RESTRICTED" | "NOT CONFIGURED";
  verificationDimensions?: Array<{
    dimension: string;
    status: "VERIFIED" | "PENDING" | "UNVERIFIED" | "NOT CONFIGURED";
    source?: string;
    date?: string;
  }>;
  securityCapabilities?: Array<{
    name: string;
    enabled: boolean;
    status?: string;
  }>;
  aiSources?: string[];
  governanceEvents?: Array<{
    event: string;
    date: string;
    status: string;
  }>;
  lastReviewedAt?: string;

  // Data Sources Metadata
  dataSources?: Record<string, "COMPANY PROVIDED" | "MARINEWORLD VERIFIED" | "PUBLIC REGISTRY" | "SYSTEM GENERATED">;

  // Company-Level Dual Billing & Marketplace Context (Phase 4.15)
  cloudBillingAccountId?: string;
  cloudBillingOrganizationId?: string;
  cloudBillingContact?: string;
  googleMarketplaceEnabled?: boolean;
  stripeCustomerId?: string;

  // Canonical Product & Service Catalogs
  productsList?: ProductEntity[];
  servicesList?: ServiceEntity[];

  // Physical Operating Presence Data Contract
  registeredHeadquarters?: PhysicalFacility;
  physicalFacilities?: PhysicalFacility[];
  operatingCountries?: string[];
  countriesServed?: string[];
  operatingRegions?: string[];
}

/* --- Registry entity contracts (foundation for future pages) ---
   Defined now so the registry model is consistent across entities;
   data is only populated where real records exist. */

export interface ProductAttribute {
  key: string;
  label: string;
  value: string | number | boolean;
  unit?: string;
  type?: "text" | "number" | "boolean" | "measurement" | "select";
  category?: string;
}

export interface ProductDocumentRef {
  title: string;
  url: string;
  type?: string;
  size?: string;
}

export interface ProductCertification {
  name: string;
  issuer?: string;
  status?: string;
  validity?: string;
}

export interface ProductEntity {
  id: string;
  slug: string;
  name: string;
  companyId: string;
  companyNodeId?: string;
  sectorCityId?: string;
  companySlug?: string;
  shortDescription?: string;
  description?: string;
  primaryImage?: string;
  images?: string[];
  gallery?: string[];
  categoryId?: string;
  category?: string;
  productTypeId?: string;
  productType?: string;
  industryDomainId?: string;
  sectorId?: string;
  productCode?: string;
  status?: "ACTIVE" | "INACTIVE" | "DRAFT" | "ARCHIVED" | "DISCONTINUED" | "AVAILABLE" | EntityStatus;
  visibility?: "PUBLIC" | "AUTHENTICATED" | "COMPANY_ONLY" | "PRIVATE" | "RESTRICTED";
  availability?: "AVAILABLE" | "ON REQUEST" | "LIMITED" | "UNAVAILABLE" | "UPON_REQUEST" | "DISCONTINUED";
  attributes?: ProductAttribute[];
  specifications?: Record<string, string>;
  canonicalUrl?: string;
  certifications?: ProductCertification[];
  documentRefs?: ProductDocumentRef[];
  price?: string;
  currency?: string;
  viewsCount?: number;
  inquiriesCount?: number;
  createdAt?: string | unknown;
  updatedAt?: string | unknown;
}

export interface ServiceAttribute {
  key: string;
  label: string;
  value: string | number | boolean;
  unit?: string;
  type?: "text" | "number" | "boolean" | "measurement" | "select" | "multi-select";
  category?: string;
}

export interface ServiceDocumentRef {
  title: string;
  url: string;
  type?: string;
  size?: string;
}

export interface ServiceCertification {
  name: string;
  issuer?: string;
  status?: string;
  validity?: string;
}

export interface ServiceEntity {
  id: string;
  slug: string;
  name: string;
  companyId: string;
  companyNodeId?: string;
  sectorCityId?: string;
  companySlug?: string;
  shortDescription?: string;
  description?: string;
  serviceType?: string;
  categoryId?: string;
  category?: string;
  industryDomainId?: string;
  sectorId?: string;
  status?: "ACTIVE" | "INACTIVE" | "DRAFT" | "ARCHIVED" | "DISCONTINUED" | EntityStatus;
  visibility?: "PUBLIC" | "AUTHENTICATED" | "COMPANY_ONLY" | "PRIVATE" | "RESTRICTED";
  availability?: "AVAILABLE" | "ON REQUEST" | "LIMITED" | "UNAVAILABLE" | "UPON_REQUEST" | "DISCONTINUED";
  serviceAreas?: string[];
  capabilities?: string[];
  canonicalUrl?: string;
  attributes?: ServiceAttribute[];
  certifications?: ServiceCertification[];
  documentRefs?: ServiceDocumentRef[];
  relatedProductIds?: string[];
  primaryImage?: string;
  images?: string[];
  gallery?: string[];
  contactEnabled?: boolean;
  viewsCount?: number;
  inquiriesCount?: number;
  createdAt?: string | unknown;
  updatedAt?: string | unknown;
}

export type InquiryStatus =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "WAITING_FOR_COMPANY"
  | "RESOLVED"
  | "CLOSED"
  | "ARCHIVED";

export type InquiryPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type InquirySource =
  | "COMPANY"
  | "PRODUCT"
  | "SERVICE"
  | "SECTOR_CITY"
  | "DIRECTORY"
  | "NETWORK";

export interface InquiryMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "REQUESTER" | "COMPANY_MEMBER";
  body: string;
  createdAt: string;
}

export interface CommercialInquiry {
  inquiryId: string;
  companyId: string;
  offeringId: string;
  offeringType: "product" | "service" | "capability" | string;
  offeringName?: string;
  offeringCode?: string;
  canonicalUrl?: string;
  sectorCity: string;
  industryDomain?: string;
  requesterName: string;
  businessEmail: string;
  organization: string;
  quantityOrScope?: string;
  deliveryLocation?: string;
  message: string;
  status: "NEW" | "IN_REVIEW" | "OFFER_PREPARED" | "CLOSED" | string;
  createdAt: string;
}

export interface OfficialOfferRequest {
  offerRequestId: string;
  inquiryId?: string;
  companyId: string;
  offeringId: string;
  offeringType: "product" | "service" | "capability" | string;
  offeringName?: string;
  offeringCode?: string;
  canonicalUrl?: string;
  sectorCity?: string;
  industryDomain?: string;
  requesterName: string;
  businessEmail: string;
  organization: string;
  incoterms?: string;
  deliveryPort?: string;
  quantityOrScope?: string;
  engineeringRequirements?: string;
  commercialRequirements?: string;
  deliveryTimeline?: string;
  warrantyRequirements?: string;
  message?: string;
  status: "REQUESTED" | "DRAFTING" | "SEALED" | "EXPIRED" | string;
  createdAt: string;
}

export interface InquiryEntity {
  id: string;
  companyId: string;
  companySlug?: string;
  companyName?: string;
  requesterId: string;
  requesterName: string;
  requesterEmail?: string;
  requesterCompany?: string;
  productId?: string;
  productSlug?: string;
  productName?: string;
  serviceId?: string;
  serviceSlug?: string;
  serviceName?: string;
  sectorId?: string;
  sectorCityId?: string;
  subject: string;
  message: string;
  status: InquiryStatus;
  priority: InquiryPriority;
  source: InquirySource;
  contactMethod?: "Email" | "Platform Message" | string;
  assignedTo?: string;
  messages?: InquiryMessage[];
  createdAt: string;
  updatedAt: string;
  // Enhanced Commercial & RFQ protocol fields
  inquiryKind?: "INQUIRY" | "OFFICIAL_OFFER" | "TECHNICAL_RFQ";
  offeringReference?: string;
  canonicalUrl?: string;
  quantityOrScope?: string;
  deliveryLocation?: string;
  deliveryPort?: string;
  incoterms?: string;
  engineeringRequirements?: string;
  commercialRequirements?: string;
  deliveryTimeline?: string;
  warrantyRequirements?: string;
  commercialInquiryId?: string;
  officialOfferRequestId?: string;
}

/* --- Stage 07 — Metrics & Platform Intelligence Event Schema --- */
export type PlatformEventType =
  | "company_view"
  | "product_view"
  | "service_view"
  | "company_save"
  | "cta_click"
  | "inquiry_created"
  | "inquiry_replied"
  | "inquiry_status_changed";

export interface PlatformEvent {
  id: string;
  eventType: PlatformEventType;
  companyId: string;
  companySlug?: string;
  userId?: string;
  productId?: string;
  productSlug?: string;
  productName?: string;
  serviceId?: string;
  serviceSlug?: string;
  serviceName?: string;
  sectorId?: string;
  sectorCityId?: string;
  source?: InquirySource | "DIRECT" | "DIRECTORY" | "SEARCH";
  metadata?: Record<string, any>;
  timestamp: string;
}

export type MetricsTimePeriod = "7D" | "30D" | "90D" | "12M";

export interface MetricKpiValue {
  current: number;
  previous: number;
  percentChange: number | null;
}

export interface ActivityTrendPoint {
  date: string;
  timestamp: string;
  profileViews: number;
  productViews: number;
  serviceViews: number;
  inquiries: number;
  totalActivity: number;
}

export interface TopPerformingContentItem {
  id: string;
  slug: string;
  name: string;
  type: "PRODUCT" | "SERVICE";
  category?: string;
  views: number;
  inquiries: number;
  conversionRate: number;
}

export interface ProfileCompletenessItem {
  id: string;
  label: string;
  completed: boolean;
  importance: "REQUIRED" | "RECOMMENDED";
  impact: string;
}

export interface CompanyMetricsData {
  companyId: string;
  companyName: string;
  timePeriod: MetricsTimePeriod;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  isEmptyState: boolean;

  // Health Signal & Profile Completeness
  healthSignal: "STRONG" | "HEALTHY" | "DEVELOPING" | "INCOMPLETE";
  profileCompletenessScore: number;
  profileCompletenessItems: ProfileCompletenessItem[];

  // Primary KPIs
  kpis: {
    inquiries: MetricKpiValue;
    profileViews: MetricKpiValue;
    productViews: MetricKpiValue;
    serviceViews: MetricKpiValue;
    uniqueVisitors: MetricKpiValue;
    companySaves: MetricKpiValue;
    ctaClicks: MetricKpiValue;
  };

  // Activity Trend
  activityTrend: ActivityTrendPoint[];

  // Connect Performance
  connectMetrics: {
    totalInquiries: number;
    newInquiries: number;
    openInquiries: number;
    inProgressInquiries: number;
    waitingInquiries: number;
    resolvedInquiries: number;
    closedInquiries: number;
    avgFirstResponseHours: number | null;
    avgResolutionHours: number | null;
    statusDistribution: { status: InquiryStatus; label: string; count: number; percentage: number }[];
    sourceBreakdown: { source: InquirySource | string; label: string; count: number; percentage: number }[];
    conversionFunnel: {
      profileViews: number;
      productServiceViews: number;
      ctaClicks: number;
      inquiries: number;
      viewToInquiryRate: number;
    };
  };

  // Top Performing Content
  topProducts: TopPerformingContentItem[];
  topServices: TopPerformingContentItem[];

  // Presence & Visibility Metrics
  presenceMetrics: {
    profileViews: number;
    searchAppearances: number;
    sectorCityAppearances: number;
    directoryAppearances: number;
  };
}

export interface PortEntity {
  id: string;
  slug?: string;
  name: string;
  code?: string;
  region?: string;
  status?: EntityStatus;
}

export interface MarinaEntity {
  id: string;
  slug?: string;
  name: string;
  code?: string;
  region?: string;
  status?: EntityStatus;
}

export interface ShipyardEntity {
  id: string;
  slug?: string;
  name: string;
  code?: string;
  region?: string;
  status?: EntityStatus;
}

export interface WorkflowStep {
  id: string;
  index: string;
  title: string;
  description: string;
  example: string;
  icon: IconName;
}

export interface GovernancePillar {
  id: string;
  title: string;
  description: string;
  icon: IconName;
}

export interface AICapability {
  id: string;
  title: string;
  description: string;
  icon: IconName;
}

export interface TwinChainNode {
  id: string;
  label: string;
  status: string;
  icon: IconName;
}

export interface IndustryDomain {
  id: string;
  label: string;
  meta: string;
  icon: IconName;
}

export interface FooterColumn {
  title: string;
  links: NavigationItem[];
}

export interface SectorHeroTrustItem {
  index: string;
  title: string;
  desc: string;
}

export interface SectorConfig {
  /* Identity */
  sectorId: string;
  sectorCode: string;
  sectorName: string;
  sectorTld: string;
  wordmark: string;
  tagline: string;

  /* Global navigation */
  nav: NavigationItem[];

  /* Hero */
  hero: {
    eyebrow: string;
    statement: string;
    substatement?: string;
    accentPhrase: string;
    support: string;
    primaryCta: string;
    secondaryCta: string;
    trust: Array<string | SectorHeroTrustItem>;
    visualMeta: { coords: string; label: string };
    nodes: { id: string; icon: IconName; title: string; line: string }[];
  };

  /* Demonstration activity feed */
  activityFeed: string[];

  /* 03 — Industry intelligence */
  intelligence: {
    eyebrow: string;
    headline: string;
    lead: string;
    domains: IndustryDomain[];
    caption: string;
  };

  /* 04 — City explorer */
  explorer: {
    eyebrow: string;
    headline: string;
    lead: string;
    note: string;
    cities: SectorCity[];
  };

  /* 05 — Business ecosystem */
  network: {
    eyebrow: string;
    headline: string;
    lead: string;
    companies: CompanyProfile[];
    demoNotice: string;
  };

  /* 06 — AI-native layer */
  ai: {
    eyebrow: string;
    headline: string;
    lead: string;
    capabilities: AICapability[];
    twin: {
      eyebrow: string;
      headline: string;
      body: string;
      points: string[];
      chain: TwinChainNode[];
    };
  };

  /* 08 — Global reach */
  regions: {
    eyebrow: string;
    headline: string;
    lead: string;
    note: string;
    items: SectorRegion[];
  };

  /* 09 — Business workflow */
  workflow: {
    eyebrow: string;
    headline: string;
    lead: string;
    steps: WorkflowStep[];
  };

  /* 10 — Governance */
  governance: {
    eyebrow: string;
    headline: string;
    lead: string;
    pillars: GovernancePillar[];
    note: string;
  };

  /* 11 — Final CTA */
  cta: {
    eyebrow: string;
    headline: string;
    body: string;
    primary: string;
    secondary: string;
  };

  /* 12 — Footer */
  footer: {
    blurb: string;
    infrastructure: string;
    columns: FooterColumn[];
    legalLine: string;
  };
}

/* ============================================================================
   STAGE 10.2 — CANONICAL DOMAIN & SECTOR-CITY ENTITY SCHEMA LOCK (DIGIONE V1.0)
   ============================================================================ */

/** 01. PLATFORM ENTITY */
export interface PlatformEntity {
  id: string;
  code: string;
  name: string;
  displayName: string;
  canonicalDomain: string;
  status: "ACTIVE" | "INACTIVE";
  defaultLanguage?: string;
  supportedSectors?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

/** 02. SECTOR ENTITY */
export interface SectorEntity {
  id: string;
  platformId: string;
  code: string;
  slug: string;
  name: string;
  displayName: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE" | "LIVE" | "COMING_SOON";
  icon?: IconName;
  taxonomyVersion?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

/** 03. SCHEMA.ORG IDENTITY */
export interface SchemaOrgIdentity {
  "@context": "https://schema.org";
  "@type": "Organization";
  "@id": string;
  name: string;
  url: string;
  description?: string;
  parentOrganization?: {
    "@type": "Organization";
    "@id": string;
    name?: string;
    url?: string;
  };
  knowsAbout?: string[];
  publishingPrinciples?: unknown;
}

/** 04. SECTOR CITY ENTITY */
export interface SectorCityEntity {
  id: string;
  platformId: string;
  sectorId: string;
  code: string;
  slug: string;
  name: string;
  displayName: string;
  canonicalDomain: string;
  status: "ACTIVE" | "INACTIVE" | "LIVE" | "COMING_SOON";
  schemaOrg: SchemaOrgIdentity;
  description?: string;
  branding?: {
    primaryColor: string;
    logoUrl: string;
    heroImage: string;
  };
  taxonomyVersion?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

/** 05. DOMAIN ENTITY */
export interface DomainEntity {
  id: string;
  entityType: "PLATFORM" | "SECTOR_CITY" | "COMPANY";
  entityId: string;
  hostname: string;
  url: string;
  isCanonical: boolean;
  isActive: boolean;
}

/** 06. COMPANY ENTITY */
export interface CompanyEntity {
  id: string;
  businessId?: string;
  companyId6Digit?: string;
  mwCompanyDigitalId?: string;
  primaryRegistryCode?: string;
  primaryRegistryNode?: string;
  organizationType?: OrganizationEntityType;
  lifecycleStatus?: CompanyLifecycleStatus;
  platformId: string;
  sectorId: string;
  primarySectorCategory?: string;
  secondarySectorCategories?: string[];
  primarySectorCityId: string;
  registeredSectorCity?: string;
  sectorCityIds: string[];
  participatingSectorCities?: string[];
  specializedDomains?: string[];
  countriesServed?: string[];
  regionalEditions?: string[];
  headquartersCity?: string;
  slug: string;
  legalName: string;
  displayName: string;
  description?: string;
  corporateDescription?: string;
  industry?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  websiteUrl?: string;
  registrationNumber?: string;
  foundedYear?: string | number;
  officialEmail?: string;
  officialPhone?: string;
  status: "ACTIVE" | "INACTIVE" | "DRAFT" | "PENDING_VERIFICATION" | "SUSPENDED" | "DEACTIVATED" | "ARCHIVED" | "DELETED" | string;
  activatedAt?: string | null;
  deactivatedAt?: string | null;
  createdAt: unknown;
  updatedAt: unknown;

  // Backwards compatibility fields for legacy services & UI
  brandName?: string;
  shortDescription?: string;
  logo?: string;
  coverImage?: string;
  flagshipStatement?: string;
  coverImageCaption?: string;
  heroImage?: string;
  website?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  location?: string;
  address?: string;
  verificationStatus?: "VERIFIED" | "PENDING" | "UNVERIFIED" | "SUSPENDED" | "REJECTED" | CompanyVerificationStatus | string;
  ownerId?: string;
  passwordHash?: string;
  plainPasswordDraft?: string;
  onboardingStep?: number;
  onboardingCompleted?: boolean;
  requestedPlanCode?: PlanCode | string;
  billingCycle?: "MONTHLY" | "ANNUAL";
  planDetails?: Plan;
  sectorAttributes?: Record<string, any>;
  sectorCityId?: string;
  // Ecosystem Organization Affiliation
  enrolledOrganizationId?: string;
  enrolledOrganizationName?: string;
  enrolledOrganizationCode?: string;
  enrolledOrganizationCountry?: string;
  enrolledOrganizationType?: string;
  enrolledOrganizationDiscount?: number;
  // Commercial Digital Property & Flagship / Anchor Registry Status (Portable Across Platform)
  presenceTier?: "FLAGSHIP" | "ENTERPRISE" | "STANDARD";
  isFlagship?: boolean;
  flagshipSectorCityId?: string;
  flagshipRegisteredAt?: string;
  flagshipLeaseId?: string;
  isAnchor?: boolean;
  anchorSectorCityId?: string;
  anchorRegisteredAt?: string;
  // Cloud Billing & Marketplace fields (Phase 4.15)
  cloudBillingAccountId?: string;
  cloudBillingOrganizationId?: string;
  cloudBillingContact?: string;
  googleMarketplaceEnabled?: boolean;
  stripeCustomerId?: string;
  offerings?: CompanyOffering[];
  products?: string[];
  services?: string[];
  productsList?: ProductEntity[];
  servicesList?: ServiceEntity[];
  registeredHeadquarters?: PhysicalFacility;
  physicalFacilities?: PhysicalFacility[];
  operatingCountries?: string[];
  operatingRegions?: string[];
}

/** 07. COMPANY DOMAIN ENTITY */
export interface CompanyDomainEntity {
  id: string;
  companyId: string;
  type: "COMPANY_PLATFORM" | "CUSTOM";
  hostname: string;
  url: string;
  isCanonical: boolean;
  isActive: boolean;
}

/** 08. COMPANY NODE ENTITY */
export interface CompanyNodeEntity {
  id: string;
  companyId: string;
  type: "HQ" | "REGIONAL" | "DISTRIBUTOR" | "PARTNER" | "SUPPORT" | "PRODUCTION" | "LOGISTICS";
  name: string;
  city?: string;
  country?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  isHeadquarters: boolean;
  status: "ACTIVE" | "INACTIVE" | "VERIFIED" | "PENDING";

  // Backwards compatibility fields
  nodeType?: CompanyNodeType | string;
  sectorCityId?: string;
  brandName?: string;
  description?: string;
  logo?: string;
  banner?: string;
  subdomain?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  deletedAt?: string;
}

/* ProductEntity & ServiceEntity are defined above (09 & 10) */

export type CompanyMemberRole = "OWNER" | "ADMIN" | "COMMERCIAL" | "TECHNICAL" | "MANAGER" | "OPERATIONS" | "SALES" | "MEMBER" | "VIEWER";
export type CompanyMemberStatus = "ACTIVE" | "PENDING" | "INVITED" | "SUSPENDED" | "REVOKED" | "INACTIVE";

/** 11. COMPANY MEMBER ENTITY */
export interface CompanyMemberEntity {
  userId: string;
  companyId: string;
  role: CompanyMemberRole;
  status: CompanyMemberStatus;
  displayName?: string;
  businessEmail?: string;
  jobTitle?: string;
  department?: string;
  avatar?: string;
  lastActiveAt?: string;
  invitedBy?: string;
  expiresAt?: string;
  inviteToken?: string;
  createdAt: unknown;
  updatedAt: unknown;
  uid?: string;
  businessId?: string;
}

/** USER PROFILE ENTITY FOR /users/{firebaseUid} */
export interface UserProfileEntity {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  profileStatus: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

/** BUSINESS ID REGISTRY ENTITY FOR /businessIds/{businessId} */
export interface BusinessIdRegistryEntity {
  businessId: string;
  companyId: string;
  organizationType: OrganizationEntityType | string;
  createdAt: string;
}

/** 12. CONNECT ENTITY */
export interface ConnectEntity {
  id: string;
  companyId: string;
  fromUserId?: string;
  type: "INQUIRY" | "RFQ" | "CONTACT" | "PARTNERSHIP" | "SUPPORT" | "CONNECTION_REQUEST";
  subject: string;
  message?: string;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED" | "NEW" | "WAITING" | "RESOLVED" | "ARCHIVED";
  createdAt: unknown;
  updatedAt: unknown;

  // Backwards compatibility fields
  fromCompanyId?: string;
  fromBusinessId?: string;
  toCompanyId?: string;
  companyNodeId?: string;
  source?: "COMPANY" | "PRODUCT" | "SERVICE" | "DIRECTORY" | "NETWORK";
  sourceEntityId?: string;
  productId?: string;
  productSlug?: string;
  productName?: string;
  serviceId?: string;
  serviceSlug?: string;
  serviceName?: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  notes?: string;
  resolvedAt?: string;
}

/** 13. BUSINESS TWIN ENTITY */
export interface BusinessTwinEntity {
  id: string;
  companyId: string;
  version: number;
  metrics: Record<string, unknown>;
  projections: Record<string, unknown>;
  updatedAt: unknown;
}

/** 14. METRIC EVENT ENTITY (Event-First Telemetry) */
export interface MetricEventEntity {
  id: string;
  eventType: PlatformEventType;
  companyId: string;
  companyNodeId?: string;
  sectorCityId: string;
  userId?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

/** 15. BUSINESS TWIN PROJECTION */
export interface BusinessTwinProjection {
  id: string;
  companyId: string;
  sectorCityId: string;
  overallCompleteness: number;
  verificationStatus: "VERIFIED" | "PENDING" | "UNVERIFIED" | "SUSPENDED";
  sectionCompleteness: Record<string, TwinSectionCompleteness>;
  capabilities: string[];
  publishedProducts?: string[];
  publishedServices?: string[];
  lastCalculatedAt: string;
}

/** 16. AI INTERACTION ENTITY (Audit & Context History) */
export interface AIInteractionEntity {
  id: string;
  userId: string;
  companyId: string;
  productId?: string;
  serviceId?: string;
  sectorCityId: string;
  requestType: "PERFORMANCE" | "PRODUCT_INSIGHT" | "GAP_ANALYSIS" | "DRAFT_GEN" | "PRODUCT_ADVISOR" | "SERVICE_ADVISOR";
  query: string;
  answer: string;
  sourcesUsed: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  createdAt: string;
}

/** 17. IDENTITY RESOLUTION RESULT */
export interface IdentityResolutionResult {
  identityType: "PLATFORM" | "SECTOR_CITY" | "COMPANY";
  platformId: string;
  sectorId?: string;
  sectorCityId?: string;
  companyId?: string;
  businessId?: string;
  organizationType?: OrganizationEntityType;
  domain: string;
  canonicalUrl: string;
  error?: string;
}

/* ====================================================================
   STAGE 12.0 — CANONICAL ORGANIZATIONAL DIGITAL IDENTITY CONTRACTS
   ==================================================================== */

export type OrganizationEntityType =
  | "COMPANY"
  | "ASSOCIATION"
  | "CHAMBER"
  | "FEDERATION"
  | "INSTITUTION"
  | "PUBLIC_ORGANIZATION";

export type BusinessIdLifecycleState =
  | "CREATED"
  | "PENDING_VERIFICATION"
  | "ACTIVE"
  | "SUSPENDED"
  | "DEACTIVATED";

export type PrincipalAuthorityStatus = "PENDING" | "ACTIVE" | "PENDING_TRANSFER" | "SUSPENDED" | "REVOKED";

export interface PrincipalAuthority {
  ownerUserId: string;
  authorityStatus: PrincipalAuthorityStatus;
  lastTransferredAt?: string;
  transferHistory?: Array<{
    fromUserId: string;
    toUserId: string;
    transferredAt: string;
    authorizedBy: string;
  }>;
}

export interface OrganizationDigitalIdentity {
  businessId: string;
  entityId: string;
  organizationType: OrganizationEntityType;
  slug: string;
  legalName: string;
  displayName: string;
  principalAuthority: PrincipalAuthority;
  authorizedRepresentatives: Array<{
    userId: string;
    role: CompanyMemberRole;
    title?: string;
  }>;
  verificationState: "VERIFIED" | "PENDING" | "UNVERIFIED" | "SUSPENDED";
  authenticationBinding: {
    primaryDomain: string;
    alternativeDomains: string[];
  };
  digitalPresence: {
    canonicalUrl: string;
    hostname: string;
    alternativeHostnames: string[];
  };
  schemaOrgId: string;
  lifecycleState: BusinessIdLifecycleState;
  createdAt: string;
  updatedAt: string;
}

export type DigitalActionType =
  | "CONNECT_CREATE"
  | "RFQ_SUBMIT"
  | "DATA_UPDATE"
  | "PRODUCT_PUBLICATION"
  | "SERVICE_PUBLICATION"
  | "GOVERNANCE_APPROVAL"
  | "AI_AUTHORIZED_ACTION"
  | "MEMBER_ROLE_CHANGE"
  | "COMPANY_VERIFICATION_SUBMITTED"
  | "COMPANY_VERIFICATION_APPROVED"
  | "COMPANY_VERIFICATION_REJECTED"
  | "MEMBER_INVITED"
  | "MEMBER_ACTIVATED"
  | "MEMBER_SUSPENDED"
  | "MEMBER_REVOKED"
  | "ROLE_GRANTED"
  | "ROLE_REVOKED"
  | "AUTHORITY_GRANTED"
  | "AUTHORITY_REVOKED"
  | "PRINCIPAL_AUTHORITY_ASSIGNED"
  | "PRINCIPAL_AUTHORITY_TRANSFERRED"
  | "PRINCIPAL_AUTHORITY_SUSPENDED"
  | "DOMAIN_VERIFIED"
  | "DOMAIN_VERIFICATION_FAILED"
  | "AI_ACTION_APPROVED"
  | "AI_ACTION_REJECTED";

/* ====================================================================
   STAGE 14 — CANONICAL AUDIT & ACTIVITY GOVERNANCE LEDGER CONTRACTS
   ==================================================================== */

export type AuditModuleType =
  | "IDENTITY"
  | "POSITIONING"
  | "PRESENCE"
  | "OFFERINGS"
  | "KNOWLEDGE"
  | "AI"
  | "DIGITAL_PRESENCE"
  | "PUBLISH"
  | "DIGITAL_PROPERTIES"
  | "CONNECT_RFQ"
  | "TEAM_ACCESS"
  | "TEAM"
  | "BILLING"
  | "GOVERNANCE"
  | "DATA_SPACE"
  | "SECURITY";

export type CanonicalAuditActionType =
  // 01 Identity
  | "COMPANY_CREATED"
  | "COMPANY_UPDATED"
  | "IDENTITY_UPDATED"
  | "VERIFICATION_SUBMITTED"
  | "VERIFICATION_STATUS_CHANGED"
  | "VERIFICATION_APPROVED"
  | "VERIFICATION_REJECTED"
  | "LEGAL_NAME_CHANGED"
  | "OWNERSHIP_TRANSFERRED"
  // 02 Positioning
  | "POSITIONING_UPDATED"
  | "SECTOR_CHANGED"
  | "SECTOR_CITY_CHANGED"
  | "DOMAIN_CHANGED"
  | "CAPABILITIES_UPDATED"
  // 03 Presence
  | "FACILITY_CREATED"
  | "FACILITY_UPDATED"
  | "FACILITY_DELETED"
  | "FACILITY_STATUS_CHANGED"
  | "FACILITY_VISIBILITY_CHANGED"
  | "FACILITY_ARCHIVED"
  // 04 Offerings
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_DELETED"
  | "SERVICE_CREATED"
  | "SERVICE_UPDATED"
  | "SERVICE_DELETED"
  | "OFFERING_CREATED"
  | "OFFERING_UPDATED"
  | "OFFERING_PUBLISHED"
  | "OFFERING_ARCHIVED"
  | "OFFERING_RESTORED"
  | "OFFERING_DELETED"
  | "CANONICAL_URL_CHANGED"
  // 05 Knowledge
  | "DOCUMENT_CREATED"
  | "DOCUMENT_UPDATED"
  | "DOCUMENT_PUBLISHED"
  | "DOCUMENT_ARCHIVED"
  | "DOCUMENT_DELETED"
  | "DOCUMENT_GROUNDED"
  | "DOCUMENT_UNGROUNDED"
  | "KNOWLEDGE_SOURCE_ADDED"
  | "KNOWLEDGE_SOURCE_LINKED"
  | "KNOWLEDGE_SOURCE_GROUNDED"
  | "KNOWLEDGE_SOURCE_DISABLED"
  | "KNOWLEDGE_SOURCE_ENABLED"
  | "KNOWLEDGE_SOURCE_ARCHIVED"
  | "KNOWLEDGE_SOURCE_UNLINKED"
  | "KNOWLEDGE_SOURCE_DELETED"
  | "KNOWLEDGE_CONFLICT_RESOLVED"
  | "CANONICAL_VALUE_CONFIRMED"
  | "EXTERNAL_SOURCE_CONNECTED"
  | "EXTERNAL_SOURCE_DISCONNECTED"
  // 06 AI
  | "AI_ENABLED"
  | "AI_DISABLED"
  | "AI_CONFIGURATION_UPDATED"
  | "AI_STYLE_CHANGED"
  | "AI_CAPABILITIES_CHANGED"
  | "AI_GROUNDING_UPDATED"
  | "AI_ADVISOR_CONFIGURED"
  | "AI_EXECUTIVE_ACTION_PROPOSED"
  | "AI_EXECUTIVE_ACTION_APPROVED"
  | "AI_EXECUTIVE_ACTION_REJECTED"
  | "OFFERING_AI_ACTIVATED"
  | "OFFERING_AI_DEACTIVATED"
  | "FACILITY_AI_ACTIVATED"
  | "FACILITY_AI_DEACTIVATED"
  | "AI_BOUNDARY_CHANGED"
  // 07 Digital Presence
  | "DIGITAL_PRESENCE_CONFIGURED"
  | "DIGITAL_PRESENCE_UPDATED"
  | "SEO_INDEXING_UPDATED"
  | "DOMAIN_CONNECTED"
  | "CANONICAL_DOMAIN_UPDATED"
  | "PUBLIC_IDENTITY_PUBLISHED"
  | "VISIBILITY_STATE_CHANGED"
  // 08 Publish
  | "READINESS_ACHIEVED"
  | "COMPANY_PUBLISHED"
  | "COMPANY_UNPUBLISHED"
  | "COMPANY_SUSPENDED"
  | "COMPANY_REACTIVATED"
  | "COMPANY_REINSTATED"
  | "COMPANY_ARCHIVED"
  // Digital Properties
  | "PROPERTY_INVENTORY_VIEWED"
  | "PROPERTY_HOLD_CREATED"
  | "PROPERTY_HOLD_RELEASED"
  | "PROPERTY_RESERVATION_CREATED"
  | "PROPERTY_RESERVED"
  | "PROPERTY_RESERVATION_RELEASED"
  | "PROPERTY_OFFER_CREATED"
  | "PROPERTY_OFFER_REQUESTED"
  | "PROPERTY_OFFER_ACCEPTED"
  | "PROPERTY_OFFER_DECLINED"
  | "PROPERTY_OFFER_EXPIRED"
  | "PROPERTY_AGREEMENT_CREATED"
  | "PROPERTY_PAYMENT_CONFIRMED"
  | "PROPERTY_LEASE_PAID"
  | "PROPERTY_LEASE_ACTIVATED"
  | "PROPERTY_LEASE_CANCELLED"
  | "PROPERTY_ACTIVATED"
  | "PROPERTY_SUSPENDED"
  | "PROPERTY_EXPIRED"
  | "PROPERTY_CREATIVE_SAVED"
  | "PROPERTY_CREATIVE_SUBMITTED"
  | "PROPERTY_CREATIVE_APPROVED"
  | "PROPERTY_CREATIVE_REJECTED"
  | "PROPERTY_CREATIVE_PUBLISHED"
  // Connect / RFQ
  | "INQUIRY_CREATED"
  | "INQUIRY_RECEIVED"
  | "OFFICIAL_OFFER_REQUESTED"
  | "INQUIRY_VIEWED"
  | "INQUIRY_ASSIGNMENT_CHANGED"
  | "INQUIRY_STATUS_CHANGED"
  | "INQUIRY_MESSAGE_SENT"
  | "INQUIRY_OFFICIAL_OFFER_REQUESTED"
  | "INQUIRY_OFFICIAL_OFFER_CREATED"
  | "INQUIRY_OFFICIAL_OFFER_SENT"
  | "INQUIRY_CLOSED"
  | "INQUIRY_REOPENED"
  // Team & Access
  | "MEMBER_INVITED"
  | "MEMBER_INVITATION_ACCEPTED"
  | "MEMBER_INVITATION_REVOKED"
  | "MEMBER_ROLE_CHANGED"
  | "MEMBER_SUSPENDED"
  | "MEMBER_REACTIVATED"
  | "MEMBER_REMOVED"
  | "MEMBER_REVOKED"
  | "ROLE_GRANTED"
  | "ROLE_REVOKED"
  | "OWNER_TRANSFERRED"
  // Billing & Contracts
  | "SUBSCRIPTION_CREATED"
  | "SUBSCRIPTION_PLAN_CHANGED"
  | "SUBSCRIPTION_CANCELLED"
  | "PAYMENT_METHOD_ADDED"
  | "PAYMENT_METHOD_REMOVED"
  | "BILLING_METHOD_UPDATED"
  | "BILLING_ACCOUNT_CHANGED"
  | "BILLING_PAYMENT_CONFIRMED"
  | "BILLING_PAYMENT_FAILED"
  | "BILLING_INVOICE_GENERATED"
  | "BILLING_SUBSCRIPTION_RENEWED"
  | "BILLING_ENTITLEMENT_SYNCED"
  | "INVOICE_GENERATED"
  | "INVOICE_PAID"
  | "INVOICE_PAYMENT_FAILED"
  | "PROPERTY_LEASE_BILLED"
  // Trust & Security
  | "TRUST_CHALLENGE_ISSUED"
  | "TRUST_CHALLENGE_SOLVED"
  | "RATE_LIMIT_HIT";

export interface AuditAuthorizationContext {
  authenticated: boolean;
  userRole?: CompanyMemberRole | string;
  verifiedActor?: boolean;
  details?: string;
  source?: string;
}

export interface AuditEvent {
  eventId: string;
  companyId: string;
  businessId: string;
  actorUserId: string;
  actorRole: CompanyMemberRole | string;
  actorDisplayName?: string;
  actorBusinessEmail?: string;
  actionType: CanonicalAuditActionType | string;
  module: AuditModuleType;
  entityType: string;
  entityId: string;
  timestamp: string; // ISO 8601 server-authoritative timestamp
  previousState?: Record<string, any> | null;
  newState?: Record<string, any> | null;
  reason?: string | null;
  metadata?: Record<string, any>;
  authorizationContext: AuditAuthorizationContext;
  source: string; // e.g. "STUDIO_IDENTITY", "STUDIO_OFFERINGS", "SYSTEM_WEBHOOK", "COMMERCIAL_PORTAL"
  correlationId?: string;
  requestId?: string;
}

export interface AuditQueryOptions {
  module?: AuditModuleType;
  actorUserId?: string;
  entityType?: string;
  entityId?: string;
  actionType?: string;
  limit?: number;
  startAfterTimestamp?: string;
  startDate?: string;
  endDate?: string;
}

export interface DigitalActionAttribution {
  id: string;
  actorUserId: string;
  organizationId: string;
  companyId: string;
  businessId: string;
  actionType: DigitalActionType;
  timestamp: string;
  authorizationContext:
    | {
        authenticated: boolean;
        userRole?: CompanyMemberRole;
        verifiedActor: boolean;
        details?: string;
      }
    | string;
  auditReference: string;
  target?: string;
}

export type AIPassiveAction = "AI_READ" | "AI_ANALYZE" | "AI_DRAFT" | "AI_RECOMMEND" | "AI_PREPARE";
export type AIExecutiveAction = "AI_SEND" | "AI_SUBMIT" | "AI_APPROVE" | "AI_ACCEPT" | "AI_SIGN" | "AI_EXECUTE";
export type AIAuthorityPermission = AIPassiveAction | AIExecutiveAction;

export interface AIAuthorityBoundaryConfig {
  companyId: string;
  businessId: string;
  allowedPassiveActions: AIPassiveAction[];
  allowedExecutiveActions: AIExecutiveAction[];
  humanApprovalRequired: boolean;
  dataBoundaryEnforced: boolean;
}

/* ====================================================================
   STAGE 12.1 & 3.5.1 — IDENTITY ENTRY & VISITOR ACCESS CONTEXT CONTRACTS
   ==================================================================== */

export type AccessContextType = "VISITOR" | "COMPANY" | "ECOSYSTEM_ORGANIZATION";

export type VisitorSubtype = "GUEST_VISITOR" | "PERSONAL_VISITOR";

export interface PersonalUserContext {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  emailVerified?: boolean;
  contextType: "VISITOR";
  visitorSubtype: "PERSONAL_VISITOR";
  personalWorkspaceEnabled: boolean;
}

export interface ActiveOrganizationContext {
  organizationType: OrganizationEntityType;
  companyId: string;
  organizationId: string;
  businessId: string;
  organizationName: string;
  role: CompanyMemberRole;
  verificationStatus: "VERIFIED" | "PENDING" | "UNVERIFIED" | "SUSPENDED";
  authorityState: PrincipalAuthorityStatus;
}

export interface OrganizationalMembership {
  organizationId: string;
  companyId: string;
  businessId: string;
  organizationName: string;
  organizationType: OrganizationEntityType;
  role: CompanyMemberRole;
  memberStatus: "ACTIVE" | "PENDING" | "SUSPENDED" | "INACTIVE";
  verificationStatus: "VERIFIED" | "PENDING" | "UNVERIFIED" | "SUSPENDED";
  authorityState: PrincipalAuthorityStatus;
}

export interface AccessContextCapabilities {
  canExplorePublic: boolean;
  canInitiateConnect: boolean;
  canSubmitRFQ: boolean;
  canAccessCompanyStudio: boolean;
  canAccessOrganizationPortal: boolean;
  canManageMembers: boolean;
}

export interface AccessContext {
  contextType: AccessContextType;
  visitorSubtype?: VisitorSubtype;
  authenticatedUserId: string | null;
  isAuthenticated: boolean;
  activeOrganization: ActiveOrganizationContext | null;
  availableMemberships: OrganizationalMembership[];
  capabilities: AccessContextCapabilities;
  personalUser?: PersonalUserContext | null;
}

/* ====================================================================
   STAGE 3.5.3 — PERSONAL WORKSPACE DATA & REFERENCE CONTRACTS
   ==================================================================== */

export interface SavedCompanyReference {
  userId: string;
  companyId: string;
  businessId: string;
  savedAt: string;
}

export interface SavedProductReference {
  userId: string;
  productId: string;
  companyId: string;
  businessId: string;
  savedAt: string;
}

export interface SavedServiceReference {
  userId: string;
  serviceId: string;
  companyId: string;
  businessId: string;
  savedAt: string;
}

export interface SavedCityReference {
  userId: string;
  cityId: string;
  savedAt: string;
}

export type PersonalCollectionItemType =
  | "COMPANY"
  | "PRODUCT"
  | "SERVICE"
  | "CITY"
  | "company"
  | "product"
  | "service"
  | "city";

export interface PersonalCollectionItem {
  id: string;
  type: PersonalCollectionItemType;
  referenceId: string;
  companyId: string;
  businessId?: string;
  addedAt: string;
}

export interface PersonalCollection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  items: PersonalCollectionItem[];
}

export type PersonalActivityType =
  | "VIEW_COMPANY"
  | "VIEW_PRODUCT"
  | "VIEW_SERVICE"
  | "VIEW_CITY"
  | "SAVE_COMPANY"
  | "SAVE_PRODUCT"
  | "SAVE_SERVICE"
  | "SAVE_CITY"
  | "UNSAVE_COMPANY"
  | "UNSAVE_PRODUCT"
  | "UNSAVE_SERVICE"
  | "UNSAVE_CITY"
  | "CREATE_COLLECTION"
  | "RENAME_COLLECTION"
  | "UPDATE_COLLECTION"
  | "DELETE_COLLECTION"
  | "ADD_TO_COLLECTION"
  | "REMOVE_FROM_COLLECTION"
  | "CLEAR_RECENT_ACTIVITY";

export interface PersonalActivityRecord {
  id: string;
  userId: string;
  type: PersonalActivityType;
  targetId: string;
  targetName: string;
  companyId?: string;
  businessId?: string;
  collectionId?: string;
  timestamp: string;
}

/* ====================================================================
   STAGE 12.2 — COMPANY ONBOARDING, SUBSCRIPTION & ENTITLEMENT CONTRACTS
   ==================================================================== */

export type CompanyLifecycleStatus =
  | "DRAFT"
  | "PENDING_VERIFICATION"
  | "PENDING_SUBSCRIPTION"
  | "PENDING_PAYMENT"
  | "ACTIVE"
  | "SUSPENDED"
  | "DEACTIVATED";

export type CompanyCapability =
  | "COMPANY_STUDIO"
  | "BUSINESS_TWIN"
  | "AI_ADVISOR"
  | "AI_ANALYSIS"
  | "PRODUCT_CATALOG"
  | "SERVICE_CATALOG"
  | "CONNECT"
  | "RFQ"
  | "ANALYTICS"
  | "FILE_STORAGE"
  | "EXTERNAL_CONNECTORS"
  | "FUTURE_AI_AGENTS";

export type PlanCode = "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";

export interface PlanLimits {
  maxProducts: number;
  maxServices: number;
  maxMembers: number;
  monthlyAiQueries: number;
  storageMb: number;
}

export interface Plan {
  id: string;
  code: PlanCode;
  name: string;
  tagline?: string;
  badge?: string;
  status: "ACTIVE" | "ARCHIVED" | "DEPRECATED";
  billingInterval: "MONTHLY" | "ANNUAL";
  price: number;
  annualPrice?: number;
  currency: string;
  includedCapabilities: CompanyCapability[];
  limits: PlanLimits;
  metadata?: Record<string, unknown>;
  description?: string;
  features?: string[];
  note?: string;
  ctaLabel?: string;
}

export type SubscriptionStatus =
  | "TRIAL"
  | "TRIALING"
  | "ACTIVE"
  | "INACTIVE"
  | "PAST_DUE"
  | "PAUSED"
  | "CANCELED"
  | "EXPIRED";

export interface Subscription {
  id: string;
  companyId: string;
  businessId: string;
  planId: string;
  planCode: PlanCode;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";

export type CommercialPaymentMethod =
  | "STRIPE"
  | "GOOGLE_CLOUD_MARKETPLACE"
  | "PRIVATE_OFFER";

export type CommercialPaymentState =
  | "READY"
  | "REDIRECT_REQUIRED"
  | "REQUESTED"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED";

export interface SubscriptionIntent {
  id: string;
  companyId: string;
  businessId: string;
  planId: string;
  planCode?: PlanCode | string;
  amount: number;
  catalogAmount?: number;
  discountPercentage?: number;
  enrolledOrganizationId?: string;
  enrolledOrganizationName?: string;
  enrolledOrganizationCode?: string;
  currency: string;
  billingInterval?: "MONTHLY" | "ANNUAL";
  status: PaymentStatus;
  paymentReference: string | null;
  paymentMethod?: CommercialPaymentMethod;
  paymentState?: CommercialPaymentState;
  createdAt: string;
  updatedAt: string;
}

export interface Entitlement {
  id: string;
  companyId: string;
  businessId: string;
  capability: CompanyCapability;
  grantedBySubscriptionId: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  effectiveFrom: string;
  effectiveUntil: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCompanyOnboardingRequest {
  displayName: string;
  legalName: string;
  slug: string;
  sectorId: string;
  primaryCityId: string;
  country: string;
  requestedPlanCode: PlanCode;
  creatorEmail: string;
  password?: string;
  passwordHash?: string;
  enrollmentCode?: string;
}

export interface CompanyOnboardingResult {
  companyId: string;
  businessId: string;
  lifecycleStatus: CompanyLifecycleStatus;
  principalAuthorityStatus: PrincipalAuthorityStatus;
  subscriptionIntent: SubscriptionIntent;
  plan: Plan;
  ownerUserId: string;
}

export interface EffectiveCapabilityCheck {
  capability: CompanyCapability;
  companyHasEntitlement: boolean;
  userHasRbacPermission: boolean;
  isAllowed: boolean;
  denialReason?: string;
}

/* ====================================================================
   STAGE 12.3 — AI-NATIVE COMPANY STUDIO ARCHITECTURE CONTRACTS
   ==================================================================== */

export type CompanyStudioAccessStatus =
  | "LOADING"
  | "AUTH_REQUIRED"
  | "ORGANIZATION_REQUIRED"
  | "INVALID_ORGANIZATION"
  | "MEMBERSHIP_REQUIRED"
  | "VERIFICATION_REQUIRED"
  | "SUBSCRIPTION_REQUIRED"
  | "ENTITLEMENT_REQUIRED"
  | "ROLE_FORBIDDEN"
  | "ACTIVE"
  | "SUSPENDED"
  | "ERROR";

export type StudioNavigationModule =
  | "OVERVIEW"
  | "IDENTITY"
  | "POSITIONING"
  | "PRESENCE"
  | "OFFERINGS"
  | "KNOWLEDGE"
  | "AI"
  | "DIGITAL_PRESENCE"
  | "PUBLISH"
  | "COMPANY"
  | "GOVERNANCE"
  | "TEAM"
  | "PRODUCTS"
  | "SERVICES"
  | "DOCUMENTS"
  | "FILES"
  | "EXTERNAL_SOURCES"
  | "CONNECTIONS"
  | "CONTACTS"
  | "PROPERTIES"
  | "BUSINESS_TWIN"
  | "ANALYTICS"
  | "SUBSCRIPTION"
  | "BILLING"
  | "AUDIT";

export interface StudioNavItem {
  id: StudioNavigationModule;
  label: string;
  description: string;
  iconName: string;
  requiredCapability?: CompanyCapability;
  requiredRoles: CompanyMemberRole[];
  isAllowed: boolean;
  denialReason?: string;
}

export interface StudioDocument {
  id: string;
  companyId: string;
  businessId: string;
  title: string;
  category: "CERTIFICATE" | "CONTRACT" | "MANUAL" | "POLICY" | "RECORD";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface StudioFile {
  id: string;
  companyId: string;
  businessId: string;
  fileName: string;
  fileType: "PDF" | "IMAGE" | "DRAWING" | "SPREADSHEET" | "VIDEO";
  sizeBytes: number;
  downloadUrl: string;
  updatedAt: string;
}

export interface CompanyDataSpace {
  companyId: string;
  businessId: string;
  totalDocumentsCount: number;
  totalFilesCount: number;
  totalStorageUsedMb: number;
  storageLimitMb: number;
  aiKnowledgeIndexedCount: number;
  lastSyncAt: string;
}

export interface CompanyStudioAccessResult {
  status: CompanyStudioAccessStatus;
  isAllowed: boolean;
  companyId?: string;
  businessId?: string;
  companyName?: string;
  userRole?: CompanyMemberRole;
  planCode?: PlanCode;
  verificationStatus?: string;
  denialReason?: string;
}

/* ====================================================================
   STAGE 12.4 — COMPANY DATA SPACE, DOCUMENTS, FILES & EXTERNAL SOURCE CONTRACTS
   ==================================================================== */

export type DocumentLifecycleStatus = "DRAFT" | "ACTIVE" | "ARCHIVED" | "DELETED";
export type DocumentVisibility = "PRIVATE" | "PUBLIC";
export type DocumentSourceType =
  | "MANUAL"
  | "IMPORTED"
  | "GENERATED"
  | "DESKTOP_UPLOAD"
  | "GOOGLE_DRIVE"
  | "URL_SOURCE"
  | "EXISTING_SOURCE";
export type GroundingEligibilityStatus = "NOT_INDEXED" | "INDEXING" | "GROUNDED" | "DISABLED" | "ERROR";

export interface DocumentVersion {
  versionNumber: number;
  title: string;
  summary?: string;
  updatedBy: string;
  updatedAt: string;
}

export interface DocumentEntity {
  id: string;
  companyId: string;
  businessId: string;
  title: string;
  documentType: "CERTIFICATE" | "CONTRACT" | "MANUAL" | "POLICY" | "RECORD" | "TECHNICAL_SPEC" | "PROCEDURE" | "OTHER";
  status: DocumentLifecycleStatus;
  sourceType: DocumentSourceType;
  fileReferences: string[];
  visibility: DocumentVisibility;
  productId?: string;
  serviceId?: string;
  groundingStatus: GroundingEligibilityStatus;
  groundingEligible: boolean;
  version: number;
  versionHistory: DocumentVersion[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export type FileLifecycleStatus = "ACTIVE" | "ARCHIVED" | "DELETED";
export type FileVisibility = "PRIVATE" | "PUBLIC";
export type StorageProviderType = "FIREBASE_STORAGE" | "S3" | "LOCAL_MOCK";

export interface FileEntity {
  id: string;
  companyId: string;
  businessId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  storageProvider: StorageProviderType;
  storageReference: string;
  status: FileLifecycleStatus;
  visibility: FileVisibility;
  productId?: string;
  serviceId?: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  downloadUrl?: string;
}

export type ExternalSourceProvider = "GOOGLE_DRIVE" | "GOOGLE_WORKSPACE" | "DROPBOX" | "MICROSOFT_365" | "OTHER";
export type ExternalConnectionStatus = "CONNECTED" | "DISCONNECTED" | "SYNCING" | "ERROR";

export interface ExternalSourceConnection {
  id: string;
  companyId: string;
  businessId: string;
  provider: ExternalSourceProvider;
  status: ExternalConnectionStatus;
  displayName: string;
  externalAccountReference: string;
  scopes: string[];
  connectedBy: string;
  connectedAt: string;
  lastSyncAt: string;
  syncStatus: string;
  errorState?: string;
}

export type ResourceImportStatus = "CONNECTED" | "IMPORTED";

export interface ExternalResource {
  id: string;
  connectionId: string;
  companyId: string;
  businessId: string;
  provider: ExternalSourceProvider;
  externalResourceId: string;
  resourceType: "FILE" | "FOLDER";
  name: string;
  mimeType: string;
  sourceUrl?: string;
  importStatus: ResourceImportStatus;
  syncStatus: string;
  lastSyncedAt: string;
}

export type AISourceType =
  | "COMPANY_SOURCE"
  | "PRODUCT_SOURCE"
  | "SERVICE_SOURCE"
  | "BUSINESS_TWIN_SOURCE"
  | "ANALYTICS_SOURCE"
  | "EXTERNAL_CONNECTED_SOURCE"
  | "PUBLIC_SOURCE"
  | "PLATFORM_SOURCE"
  | "PUBLIC_CATALOG"
  | "PUBLIC_PROJECTION";

export type SourceProvenanceType = "CANONICAL_SOURCE" | "DERIVED_SOURCE";

export type AIContextType = "PLATFORM_AI" | "COMPANY_AI" | "PRODUCT_AI" | "SERVICE_AI";

export interface AIContext {
  contextType: AIContextType;
  authenticatedUserId: string;
  activeOrganization: string | null;
  companyId: string | null;
  businessId: string | null;
  organizationType: string;
  role: CompanyMemberRole | "VIEWER";
  authorityState: PrincipalAuthorityStatus;
  allowedSources: AISourceType[];
  allowedProducts: string[];
  allowedServices: string[];
  allowedDocuments: string[];
  allowedFiles: string[];
  allowedExternalResources: string[];
  productId?: string;
  serviceId?: string;
  targetProductId?: string;
  targetServiceId?: string;
  isPublicOnly: boolean;
}

export interface PrivateAIResponseContract {
  answer: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  grounded: boolean;
  sources: GroundingSourceAttribution[];
  scope: AIContextType;
  limitations?: string;
  interactionId?: string;
}

export interface GroundingSourceAttribution {
  sourceType: AISourceType;
  sourceProvenance?: SourceProvenanceType;
  entityId: string;
  companyId: string;
  businessId: string;
  title: string;
  visibility: "PRIVATE" | "PUBLIC";
  productId?: string;
  serviceId?: string;
  provenance: string;
}

export interface GroundingContextQuery {
  companyId: string;
  businessId: string;
  userAuthUid: string;
  productId?: string;
  serviceId?: string;
  includePublicOnly?: boolean;
}

export interface GroundingContextResult {
  isAllowed: boolean;
  companyId: string;
  businessId: string;
  groundedDocuments: DocumentEntity[];
  groundedResources: ExternalResource[];
  attributions: GroundingSourceAttribution[];
  denialReason?: string;
}

export interface CompanyDataSpaceManifest {
  companyId: string;
  businessId: string;
  documents: DocumentEntity[];
  files: FileEntity[];
  externalConnections: ExternalSourceConnection[];
  externalResources: ExternalResource[];
  totalStorageUsedMb: number;
  storageLimitMb: number;
  aiGroundedCount: number;
  exportedAt?: string;
}

/* ====================================================================
   STAGE 12.5 — COMPANY VERIFICATION, PRINCIPAL AUTHORITY & ORGANIZATIONAL GOVERNANCE CONTRACTS
   ==================================================================== */

export type CompanyVerificationStatus =
  | "UNVERIFIED"
  | "PENDING"
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "REJECTED"
  | "VERIFICATION_REJECTED"
  | "SUSPENDED"
  | "REVERIFICATION_REQUIRED";

export type VerificationMethod =
  | "DOCUMENT_UPLOAD"
  | "DOMAIN_DNS"
  | "GOVERNMENT_REGISTRY"
  | "BANK_RECORD"
  | "MANUAL_REVIEW"
  | "OFFICIAL_EMAIL"
  | "DOMAIN_VERIFICATION"
  | "DOCUMENT_REVIEW"
  | "AUTHORIZED_REPRESENTATIVE"
  | "EXTERNAL_VERIFICATION";

export type DomainVerificationState =
  | "UNVERIFIED"
  | "PENDING"
  | "VERIFIED"
  | "FAILED";

export type AuthorityScope =
  | "COMPANY_PROFILE"
  | "PRODUCTS"
  | "SERVICES"
  | "COMMERCIAL"
  | "DOCUMENTS"
  | "AI"
  | "GOVERNANCE"
  | "BILLING"
  | "ALL";

export interface CompanyVerificationRecord {
  id: string; // 'verification-main'
  companyId: string;
  businessId: string;
  status: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
  method: VerificationMethod | string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationAuthority {
  id: string;
  companyId: string;
  businessId: string;
  userId: string;
  role: CompanyMemberRole;
  authorityState: PrincipalAuthorityStatus | "ACTIVE" | "DELEGATED" | "PENDING_VERIFICATION" | "SUSPENDED" | "REVOKED";
  scopes: AuthorityScope[];
  authorityScope?: AuthorityScope[];
  verificationState?: "UNVERIFIED" | "PENDING" | "VERIFIED";
  grantedBy: string;
  grantedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type MembershipStatus =
  | "INVITED"
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "REVOKED";

export interface VerificationEvidence {
  id: string;
  companyId: string;
  businessId: string;
  verificationId?: string;
  verificationType: VerificationMethod;
  status: "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  submittedBy: string;
  reviewedBy: string | null;
  reviewer?: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  evidenceReference: string;
  rejectionReason: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface HumanApprovalEvent {
  id: string;
  companyId: string;
  businessId: string;
  aiAction: AIExecutiveAction;
  proposedByAi: boolean;
  reviewedByUid: string;
  approvedAt: string;
  status: "APPROVED" | "REJECTED" | "PENDING";
  target: string;
}

/* ====================================================================
   STAGE 3.5.8 — HUMAN VERIFICATION & ANTI-ABUSE TRUST CONTRACTS
   ==================================================================== */

export type TrustState =
  | "UNVERIFIED"
  | "VERIFIED"
  | "CHALLENGE_REQUIRED"
  | "RATE_LIMITED"
  | "BLOCKED";

export type RiskLevel = "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK";

export type ProtectedPersonalAction =
  | "SAVE_COMPANY"
  | "SAVE_PRODUCT"
  | "SAVE_SERVICE"
  | "CREATE_COLLECTION"
  | "PUBLIC_AI"
  | "CONNECT_REQUEST"
  | "RFQ_REQUEST";

export type RiskSignalType =
  | "RAPID_NAVIGATION"
  | "RAPID_SAVE_UNSAVE"
  | "HIGH_AI_FREQUENCY"
  | "HIGH_CONNECT_ATTEMPTS"
  | "FAILED_VERIFICATION"
  | "CHALLENGE_FAILURE"
  | "RATE_LIMIT_TRIGGER";

export interface HumanVerificationChallenge {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED";
}

export interface HumanVerificationResult {
  success: boolean;
  status: "SUCCESS" | "FAILED" | "EXPIRED";
  message?: string;
  trustState: TrustState;
}

export interface UserTrustProfile {
  userId: string;
  trustState: TrustState;
  riskLevel: RiskLevel;
  humanVerificationStatus: TrustState;
  challengeFailures: number;
  lastChallengeAt?: string;
  lastVerifiedAt?: string;
}

export interface ActionEligibilityResult {
  allowed: boolean;
  reason?: "CHALLENGE_REQUIRED" | "RATE_LIMITED" | "BLOCKED" | "UNAUTHENTICATED";
  trustState: TrustState;
  riskLevel: RiskLevel;
  message?: string;
}







