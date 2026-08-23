import React, { useState, useEffect } from "react";
import { Plus, Check, FolderPlus, X } from "lucide-react";
import { getCurrentAuthSession } from "@/lib/services/securityService";
import {
  getUserCollections,
  createCollection,
  addItemToCollection,
  removeItemFromCollection,
  subscribeToPersonalWorkspace,
} from "@/lib/services/personalWorkspaceService";
import type { PersonalCollection } from "@/lib/types";
import { GuestSavePromptModal } from "./GuestSavePromptModal";

export interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: "company" | "product" | "service";
  entityId: string;
  companyId?: string;
  businessId?: string;
  entityName?: string;
}

export function AddToCollectionModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  companyId,
  businessId,
  entityName,
}: AddToCollectionModalProps) {
  const [authSession, setAuthSession] = useState(() => getCurrentAuthSession());
  const [collections, setCollections] = useState<PersonalCollection[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColDesc, setNewColDesc] = useState("");
  const [showGuestModal, setShowGuestModal] = useState(false);

  const loadData = () => {
    const session = getCurrentAuthSession();
    setAuthSession(session);
    if (session.uid) {
      setCollections(getUserCollections(session.uid));
    } else {
      setCollections([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    const unsubscribe = subscribeToPersonalWorkspace(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  if (!authSession.uid) {
    return (
      <GuestSavePromptModal
        isOpen={isOpen}
        onClose={onClose}
        entityType={entityType}
      />
    );
  }

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleToggleCollectionItem = async (col: PersonalCollection) => {
    if (!authSession.uid) return;
    setErrorMessage(null);
    try {
      const existing = col.items.find(
        (i) =>
          i.type.toLowerCase() === entityType.toLowerCase() &&
          i.referenceId === entityId
      );

      if (existing) {
        removeItemFromCollection(authSession.uid, col.id, existing.id);
      } else {
        await addItemToCollection(authSession.uid, col.id, {
          type: entityType,
          referenceId: entityId,
          companyId: companyId || entityId,
          businessId: businessId,
        });
      }
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update collection");
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authSession.uid || !newColName.trim()) return;
    setErrorMessage(null);

    try {
      const newCol = createCollection(authSession.uid, newColName, newColDesc);
      await addItemToCollection(authSession.uid, newCol.id, {
        type: entityType,
        referenceId: entityId,
        companyId: companyId || entityId,
        businessId: businessId,
      });

      setNewColName("");
      setNewColDesc("");
      setIsCreating(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create collection");
    }
  };

  return (
    <div
      id="modal-add-to-collection-backdrop"
      className="fixed inset-0 z-50 bg-graphite/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        id="modal-add-to-collection"
        className="bg-white border border-line rounded-2xl p-6 max-w-md w-full shadow-xl space-y-5 animate-in fade-in"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-graphite uppercase tracking-tight">
              Add to Curated Collection
            </h3>
            <p className="text-xs text-stone">
              Organize <span className="font-semibold text-graphite">{entityName || entityId}</span> into custom procurement collections.
            </p>
          </div>
          <button
            id="btn-close-add-collection-modal"
            onClick={onClose}
            className="text-stone hover:text-graphite transition p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* Existing Collections List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {collections.length === 0 && !isCreating ? (
            <div className="p-4 bg-slate-50 border border-line rounded-xl text-center space-y-2 text-xs text-stone">
              <FolderPlus className="w-6 h-6 mx-auto text-stone/50" />
              <p>You have not created any collections yet.</p>
            </div>
          ) : (
            collections.map((col) => {
              const isItemInCol = col.items.some(
                (i) => i.type === entityType && i.referenceId === entityId
              );

              return (
                <button
                  type="button"
                  key={col.id}
                  id={`btn-toggle-col-${col.id}`}
                  onClick={() => handleToggleCollectionItem(col)}
                  className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition cursor-pointer ${
                    isItemInCol
                      ? "bg-royal/5 border-royal text-royal"
                      : "bg-white border-line hover:border-slate-300 text-graphite"
                  }`}
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="font-bold text-xs">{col.name}</div>
                    {col.description && (
                      <p className="text-[11px] text-stone line-clamp-1">
                        {col.description}
                      </p>
                    )}
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                      isItemInCol
                        ? "bg-royal border-royal text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isItemInCol && <Check className="w-3.5 h-3.5" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Create Collection Inline Form */}
        {isCreating ? (
          <form
            id="form-modal-create-collection"
            onSubmit={handleCreateAndAdd}
            className="p-3.5 bg-slate-50 border border-line rounded-xl space-y-3 animate-in fade-in"
          >
            <div className="font-bold text-xs text-graphite uppercase">New Collection</div>
            <div className="space-y-2">
              <input
                type="text"
                id="input-modal-col-name"
                required
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="Collection name (e.g. 2026 Fleet Propulsion)"
                className="w-full px-3 py-1.5 border border-line rounded-lg text-xs bg-white text-graphite outline-none focus:border-royal"
              />
              <input
                type="text"
                id="input-modal-col-desc"
                value={newColDesc}
                onChange={(e) => setNewColDesc(e.target.value)}
                placeholder="Optional description"
                className="w-full px-3 py-1.5 border border-line rounded-lg text-xs bg-white text-graphite outline-none focus:border-royal"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-2.5 py-1 text-xs text-stone hover:text-graphite cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-modal-create-col-submit"
                className="px-3 py-1.5 bg-royal text-white rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-royal-dark transition cursor-pointer"
              >
                Create & Add
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            id="btn-modal-start-create-col"
            onClick={() => setIsCreating(true)}
            className="w-full py-2 px-3 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-royal hover:bg-slate-50 flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Collection</span>
          </button>
        )}

        <div className="pt-2 border-t border-line flex justify-end">
          <button
            type="button"
            id="btn-modal-done-collection"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-black transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
