import type { AIInteractionEntity } from "@/lib/types";
import { db } from "@/lib/firebase";
import { isFirestoreMode } from "./persistenceMode";
import { doc, getDoc, setDoc, getDocs, collection, query, where } from "firebase/firestore";

/**
 * Stage 10.6 — AI Interaction Repository
 * Data Access Layer for /aiInteractions/{interactionId}
 */

const aiInteractionStore = new Map<string, AIInteractionEntity>();

export async function findAIInteractionById(id: string): Promise<AIInteractionEntity | null> {
  if (isFirestoreMode() && id) {
    try {
      const docRef = doc(db, "aiInteractions", id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const item = snap.data() as AIInteractionEntity;
        aiInteractionStore.set(id, item);
        return item;
      }
    } catch (err) {
      console.warn(`[AIInteractionRepo] Firestore findAIInteractionById fallback for ${id}:`, err);
    }
  }
  return aiInteractionStore.get(id) || null;
}

export async function findAIInteractionsByCompany(companyId: string): Promise<AIInteractionEntity[]> {
  if (isFirestoreMode() && companyId) {
    try {
      const q = query(collection(db, "aiInteractions"), where("companyId", "==", companyId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as AIInteractionEntity);
      }
    } catch (err) {
      console.warn(`[AIInteractionRepo] Firestore findAIInteractionsByCompany fallback for ${companyId}:`, err);
    }
  }
  const interactions = Array.from(aiInteractionStore.values());
  return interactions.filter((i) => i.companyId === companyId);
}

export function getAIInteractionsByCompany(companyId: string): AIInteractionEntity[] {
  const interactions = Array.from(aiInteractionStore.values());
  return interactions.filter((i) => i.companyId === companyId);
}

export function clearAIInteractionRepository(): void {
  aiInteractionStore.clear();
}

export async function saveAIInteraction(interaction: AIInteractionEntity): Promise<AIInteractionEntity> {
  aiInteractionStore.set(interaction.id, interaction);
  if (isFirestoreMode() && interaction.id) {
    try {
      const docRef = doc(db, "aiInteractions", interaction.id);
      await setDoc(docRef, { ...interaction }, { merge: true });
    } catch (err) {
      console.warn(`[AIInteractionRepo] Firestore saveAIInteraction error for ${interaction.id}:`, err);
    }
  }
  return interaction;
}
