import { useState, useEffect, type MouseEvent } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { getCurrentAuthSession } from "@/lib/services/securityService";
import {
  isCompanySaved,
  saveCompanyReference,
  removeSavedCompanyReference,
  isProductSaved,
  saveProductReference,
  removeSavedProductReference,
  isServiceSaved,
  saveServiceReference,
  removeSavedServiceReference,
  isCitySaved,
  saveCityReference,
  removeSavedCityReference,
  subscribeToPersonalWorkspace,
} from "@/lib/services/personalWorkspaceService";
import { GuestSavePromptModal } from "./GuestSavePromptModal";

export interface SaveEntityButtonProps {
  type: "company" | "product" | "service" | "city";
  id: string;
  companyId?: string;
  businessId?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "button" | "icon" | "pill";
  label?: string;
  savedLabel?: string;
}

export function SaveEntityButton({
  type,
  id,
  companyId,
  businessId,
  className = "",
  size = "sm",
  variant = "button",
  label,
  savedLabel = "SAVED",
}: SaveEntityButtonProps) {
  const [authSession, setAuthSession] = useState(() => getCurrentAuthSession());
  const [showGuestModal, setShowGuestModal] = useState(false);

  const checkIsSaved = (uid?: string): boolean => {
    if (!uid || !id) return false;
    if (type === "company") return isCompanySaved(uid, id);
    if (type === "product") return isProductSaved(uid, id);
    if (type === "service") return isServiceSaved(uid, id);
    if (type === "city") return isCitySaved(uid, id);
    return false;
  };

  const [saved, setSaved] = useState(() => checkIsSaved(authSession.uid));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const session = getCurrentAuthSession();
    setAuthSession(session);
    setSaved(checkIsSaved(session.uid));

    const unsubscribe = subscribeToPersonalWorkspace(() => {
      const current = getCurrentAuthSession();
      setAuthSession(current);
      setSaved(checkIsSaved(current.uid));
    });

    return () => unsubscribe();
  }, [type, id]);

  const defaultLabel =
    label ||
    (type === "company"
      ? "SAVE COMPANY"
      : type === "product"
      ? "SAVE PRODUCT"
      : type === "service"
      ? "SAVE SERVICE"
      : "SAVE SECTOR CITY");

  const handleToggleSave = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!authSession.uid) {
      setShowGuestModal(true);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      if (saved) {
        if (type === "company") {
          await removeSavedCompanyReference(authSession.uid, id);
        } else if (type === "product") {
          await removeSavedProductReference(authSession.uid, id);
        } else if (type === "service") {
          await removeSavedServiceReference(authSession.uid, id);
        } else if (type === "city") {
          await removeSavedCityReference(authSession.uid, id);
        }
        setSaved(false);
      } else {
        if (type === "company") {
          await saveCompanyReference(authSession.uid, id, businessId);
        } else if (type === "product") {
          const cId = companyId || id;
          await saveProductReference(authSession.uid, id, cId, businessId);
        } else if (type === "service") {
          const cId = companyId || id;
          await saveServiceReference(authSession.uid, id, cId, businessId);
        } else if (type === "city") {
          await saveCityReference(authSession.uid, id);
        }
        setSaved(true);
      }
    } catch (err: any) {
      console.warn("[SaveEntityButton] Save toggle error:", err);
      setSaveError(err?.message || "Failed to save item");
    } finally {
      setIsSaving(false);
    }
  };

  const buttonId = `btn-save-${type}-${id}`;

  if (variant === "icon") {
    return (
      <>
        <button
          type="button"
          id={buttonId}
          onClick={handleToggleSave}
          title={saved ? "Saved to workspace" : `Save ${type} to workspace`}
          className={`p-1.5 rounded-lg border transition cursor-pointer ${
            saved
              ? "bg-royal text-white border-royal shadow-xs"
              : "bg-white text-stone border-line hover:text-royal hover:border-royal/40"
          } ${className}`}
        >
          {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>
        <GuestSavePromptModal
          isOpen={showGuestModal}
          onClose={() => setShowGuestModal(false)}
          entityType={type === "city" ? "company" : type}
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
        onClick={handleToggleSave}
        className={`inline-flex items-center gap-1.5 rounded-lg border font-semibold uppercase tracking-wider transition cursor-pointer ${sizeClasses} ${
          saved
            ? "bg-royal text-white border-royal shadow-xs"
            : "bg-white text-graphite border-line hover:bg-slate-50 hover:border-slate-300"
        } ${className}`}
      >
        {saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
        <span>{saved ? savedLabel : defaultLabel}</span>
      </button>
      <GuestSavePromptModal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        entityType={type === "city" ? "company" : type}
      />
    </>
  );
}
