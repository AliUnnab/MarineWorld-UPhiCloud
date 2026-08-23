/**
 * Stage Phase 2 — Core Persistence Mode Switch
 * Explicit switch between IN_MEMORY and FIRESTORE modes.
 */

import { isFirebaseConfigured } from "@/lib/auth/firebaseAuth";

export type PersistenceMode = "IN_MEMORY" | "FIRESTORE";

let currentPersistenceMode: PersistenceMode = "FIRESTORE";

export function getPersistenceMode(): PersistenceMode {
  if (currentPersistenceMode === "FIRESTORE" && !isFirebaseConfigured()) {
    return "IN_MEMORY";
  }
  return currentPersistenceMode;
}

export function setPersistenceMode(mode: PersistenceMode): void {
  currentPersistenceMode = mode;
}

export function isFirestoreMode(): boolean {
  return getPersistenceMode() === "FIRESTORE";
}
