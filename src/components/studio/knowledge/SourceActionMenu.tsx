import React, { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  Eye,
  Layers,
  PowerOff,
  Power,
  Archive,
  ArchiveRestore,
  Unlink,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import type { DocumentEntity } from "@/lib/types";

interface SourceActionMenuProps {
  document: DocumentEntity;
  onView: () => void;
  onChangeScope: () => void;
  onToggleGrounding: () => void;
  onToggleArchive: () => void;
  onRemoveLink?: () => void;
  onDelete: () => void;
}

export const SourceActionMenu: React.FC<SourceActionMenuProps> = ({
  document,
  onView,
  onChangeScope,
  onToggleGrounding,
  onToggleArchive,
  onRemoveLink,
  onDelete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isGrounded = document.groundingStatus === "GROUNDED";
  const isArchived = document.status === "ARCHIVED";
  const hasOfferingOrFacilityLink = Boolean(
    document.productId || document.serviceId || document.metadata?.facilityId
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        id={`btn-source-menu-${document.id}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Source options"
        className="w-8 h-8 rounded-lg border border-line bg-white hover:bg-mist text-stone hover:text-graphite flex items-center justify-center transition shadow-2xs"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-1.5 w-56 rounded-xl bg-white border border-line shadow-lg py-1.5 z-40 focus:outline-none animate-fade-in"
          role="menu"
        >
          {/* View Source */}
          <button
            type="button"
            id={`menu-item-view-${document.id}`}
            onClick={() => {
              setIsOpen(false);
              onView();
            }}
            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-graphite hover:bg-mist flex items-center gap-2.5 transition"
            role="menuitem"
          >
            <Eye className="w-3.5 h-3.5 text-royal" />
            <span>View Source Details</span>
          </button>

          {/* Change AI Scope */}
          <button
            type="button"
            id={`menu-item-scope-${document.id}`}
            onClick={() => {
              setIsOpen(false);
              onChangeScope();
            }}
            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-graphite hover:bg-mist flex items-center gap-2.5 transition"
            role="menuitem"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Change AI Scope</span>
          </button>

          <div className="my-1 border-t border-line/60" />

          {/* Disable / Enable Grounding */}
          {!isArchived && (
            <button
              type="button"
              id={`menu-item-grounding-${document.id}`}
              onClick={() => {
                setIsOpen(false);
                onToggleGrounding();
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-graphite hover:bg-mist flex items-center gap-2.5 transition"
              role="menuitem"
            >
              {isGrounded ? (
                <>
                  <PowerOff className="w-3.5 h-3.5 text-amber-600" />
                  <span>Disable Grounding</span>
                </>
              ) : (
                <>
                  <Power className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Enable Grounding</span>
                </>
              )}
            </button>
          )}

          {/* Archive / Unarchive */}
          <button
            type="button"
            id={`menu-item-archive-${document.id}`}
            onClick={() => {
              setIsOpen(false);
              onToggleArchive();
            }}
            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-graphite hover:bg-mist flex items-center gap-2.5 transition"
            role="menuitem"
          >
            {isArchived ? (
              <>
                <ArchiveRestore className="w-3.5 h-3.5 text-royal" />
                <span>Unarchive Source</span>
              </>
            ) : (
              <>
                <Archive className="w-3.5 h-3.5 text-stone" />
                <span>Archive Source</span>
              </>
            )}
          </button>

          {/* Remove Link (Only if attached to offering or facility) */}
          {hasOfferingOrFacilityLink && onRemoveLink && (
            <button
              type="button"
              id={`menu-item-remove-link-${document.id}`}
              onClick={() => {
                setIsOpen(false);
                onRemoveLink();
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-graphite hover:bg-mist flex items-center gap-2.5 transition"
              role="menuitem"
            >
              <Unlink className="w-3.5 h-3.5 text-orange-600" />
              <span>Remove Relationship Link</span>
            </button>
          )}

          <div className="my-1 border-t border-line/60" />

          {/* Safe Delete */}
          <button
            type="button"
            id={`menu-item-delete-${document.id}`}
            onClick={() => {
              setIsOpen(false);
              onDelete();
            }}
            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition"
            role="menuitem"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            <span>Delete Source...</span>
          </button>
        </div>
      )}
    </div>
  );
};
