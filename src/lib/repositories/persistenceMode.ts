/**
 * Stage Phase 2 — Core Persistence Mode Switch
 * Explicitly locked to 100% FIRESTORE mode.
 */

export type PersistenceMode = "FIRESTORE" | "IN_MEMORY";

export function getPersistenceMode(): PersistenceMode {
  return "FIRESTORE";
}

export function setPersistenceMode(_mode: PersistenceMode): void {
  // Always FIRESTORE
}

export function isFirestoreMode(): boolean {
  return true;
}


