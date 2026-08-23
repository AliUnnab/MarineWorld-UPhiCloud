import type { CompanyOffering, CompanyProfile } from "@/lib/types";
import { UnifiedOfferingCard } from "./UnifiedOfferingCard";

export function CompanyOfferingCard({
  offering,
  company,
  onOpenModal,
  isFeatured = false,
  index = 0,
}: {
  offering: CompanyOffering;
  company: CompanyProfile;
  onOpenModal?: (offering: CompanyOffering) => void;
  isFeatured?: boolean;
  key?: string;
  index?: number;
}) {
  return (
    <UnifiedOfferingCard
      offering={offering}
      company={company}
      isFeatured={isFeatured}
      onClick={() => onOpenModal?.(offering)}
      index={index}
    />
  );
}
