import type { AIInteractionEntity } from "@/lib/types";

/**
 * Stage 10.6 — AI Interaction Repository
 * Data Access Layer for /aiInteractions/{interactionId}
 */

const aiInteractionStore = new Map<string, AIInteractionEntity>();

export async function findAIInteractionById(id: string): Promise<AIInteractionEntity | null> {
  return aiInteractionStore.get(id) || null;
}

export async function findAIInteractionsByCompany(companyId: string): Promise<AIInteractionEntity[]> {
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
  return interaction;
}
