import React, { useState } from "react";
import { FolderPlus } from "lucide-react";
import { AddToCollectionModal } from "./AddToCollectionModal";

export interface AddToCollectionButtonProps {
  type: "company" | "product" | "service";
  id: string;
  companyId?: string;
  businessId?: string;
  entityName?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "button" | "icon";
}

export function AddToCollectionButton({
  type,
  id,
  companyId,
  businessId,
  entityName,
  className = "",
  size = "sm",
  variant = "button",
}: AddToCollectionButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const buttonId = `btn-add-collection-${type}-${id}`;

  if (variant === "icon") {
    return (
      <>
        <button
          type="button"
          id={buttonId}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsModalOpen(true);
          }}
          title="Add to collection"
          className={`p-1.5 rounded-lg border border-line bg-white text-stone hover:text-royal hover:border-royal/40 transition cursor-pointer ${className}`}
        >
          <FolderPlus className="w-4 h-4" />
        </button>
        <AddToCollectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          entityType={type}
          entityId={id}
          companyId={companyId}
          businessId={businessId}
          entityName={entityName}
        />
      </>
    );
  }

  const sizeClasses =
    size === "sm"
      ? "px-3 py-1.5 text-xs"
      : size === "lg"
      ? "px-5 py-2.5 text-sm"
      : "px-4 py-2 text-xs";

  return (
    <>
      <button
        type="button"
        id={buttonId}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsModalOpen(true);
        }}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-line bg-white text-graphite hover:bg-slate-50 hover:border-slate-300 font-semibold uppercase tracking-wider transition cursor-pointer ${sizeClasses} ${className}`}
      >
        <FolderPlus className="w-3.5 h-3.5 text-stone" />
        <span>COLLECTION</span>
      </button>
      <AddToCollectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        entityType={type}
        entityId={id}
        companyId={companyId}
        businessId={businessId}
        entityName={entityName}
      />
    </>
  );
}
