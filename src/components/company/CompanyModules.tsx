import type { CompanyProfile, SectorCity, IndustryDomainEntity } from "@/lib/types";
import { Icon } from "@/components/digione/icons";
import { DigiBadge, DigiButton, DigiIconContainer } from "@/components/digione/primitives";
import { EmptyState } from "@/components/foundation/EmptyState";

export { CompanyPresenceModule, CompanyPresenceSkeleton } from "./CompanyPresenceModule";
export { CompanyCorporateModule, CompanyCorporateSkeleton } from "./CompanyCorporateModule";
export { CompanyGovernanceModule, CompanyGovernanceSkeleton } from "./CompanyGovernanceModule";
export { CompanyProductsModule, CompanyProductsSkeleton } from "./CompanyProductsModule";
export { CompanyServicesModule, CompanyServicesSkeleton } from "./CompanyServicesModule";
export { CompanyConnectModule, CompanyConnectSkeleton } from "./CompanyConnectModule";
export { CompanyMetricsModule, CompanyMetricsSkeleton } from "./CompanyMetricsModule";

export { CompanyBusinessTwinModule, CompanyBusinessTwinSkeleton } from "./CompanyBusinessTwinModule";

export { CompanyAIModule, CompanyAISkeleton, CompanyAIModule as CompanyChatModule } from "./CompanyAIModule";
