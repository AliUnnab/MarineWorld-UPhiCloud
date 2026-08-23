import type { CompanyNodeEntity } from "@/lib/types";

/**
 * Stage 10.6 — Company Node Repository
 * Data Access Layer for /companies/{companyId}/nodes/{nodeId}
 */

const nodeStore = new Map<string, CompanyNodeEntity[]>();

export async function findNodeById(companyId: string, nodeId: string): Promise<CompanyNodeEntity | null> {
  const nodes = nodeStore.get(companyId) || [];
  return nodes.find((n) => n.id === nodeId) || null;
}

export async function findNodesByCompany(companyId: string): Promise<CompanyNodeEntity[]> {
  return nodeStore.get(companyId) || [];
}

export async function saveNode(node: CompanyNodeEntity): Promise<CompanyNodeEntity> {
  const existing = nodeStore.get(node.companyId) || [];
  const idx = existing.findIndex((n) => n.id === node.id);
  if (idx >= 0) {
    existing[idx] = node;
  } else {
    existing.push(node);
  }
  nodeStore.set(node.companyId, existing);
  return node;
}

export async function deleteNodeRecord(companyId: string, nodeId: string): Promise<boolean> {
  const existing = nodeStore.get(companyId) || [];
  const filtered = existing.filter((n) => n.id !== nodeId);
  nodeStore.set(companyId, filtered);
  return filtered.length < existing.length;
}
