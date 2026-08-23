import type { CompanyNodeEntity } from "@/lib/types";
import {
  findNodeById,
  findNodesByCompany,
  saveNode,
  deleteNodeRecord,
} from "@/lib/repositories/nodeRepository";

/**
 * Stage 10.6 — Company Operational Node Service
 * Domain Service for Company Nodes (/companies/{companyId}/nodes/{nodeId})
 */

export async function getNode(companyId: string, nodeId: string): Promise<CompanyNodeEntity | null> {
  return findNodeById(companyId, nodeId);
}

export async function listNodes(companyId: string): Promise<CompanyNodeEntity[]> {
  return findNodesByCompany(companyId);
}

export async function createNode(node: CompanyNodeEntity): Promise<CompanyNodeEntity> {
  if (!node.companyId || !node.id) {
    throw new Error("INVALID_ENTITY: Node requires companyId and id.");
  }
  return saveNode(node);
}

export async function updateNode(node: CompanyNodeEntity): Promise<CompanyNodeEntity> {
  const existing = await findNodeById(node.companyId, node.id);
  if (!existing) {
    throw new Error("ENTITY_NOT_FOUND: Node not found.");
  }
  return saveNode(node);
}

export async function deleteNode(companyId: string, nodeId: string): Promise<boolean> {
  return deleteNodeRecord(companyId, nodeId);
}
