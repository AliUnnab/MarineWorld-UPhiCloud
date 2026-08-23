import type { CompanyOffering, CompanyProfile } from "@/lib/types";
import { UnifiedOfferingCard } from "./UnifiedOfferingCard";

export function ProductShowroomCard({
  offering,
  company,
  onClick,
  variant = "gallery",
  index = 0,
}: {
  offering: CompanyOffering;
  company: CompanyProfile;
  onClick: () => void;
  onTalkToAI?: () => void;
  onQuote?: () => void;
  key?: string;
  variant?: "featured" | "gallery" | "spotlight";
  index?: number;
}) {
  return (
    <UnifiedOfferingCard
      offering={offering}
      company={company}
      isFeatured={variant === "featured"}
      onClick={onClick}
      index={index}
    />
  );
}
