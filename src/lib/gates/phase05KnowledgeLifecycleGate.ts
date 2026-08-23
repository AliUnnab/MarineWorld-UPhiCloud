import {
  getKnowledgeSources,
  getSourceById,
  changeSourceScope,
  disableGrounding,
  enableGrounding,
  archiveSource,
  unarchiveSource,
  removeSourceLink,
  checkSourceDependencies,
  deleteSourceSafely,
  linkExistingSource,
  getKnowledgeAuditLogs,
  resolveActiveAIRetrievalSources,
  resetKnowledgeStoreForTesting,
  registerIngestedSource,
} from "@/lib/services/knowledgeLifecycleService";
import type { DocumentEntity } from "@/lib/types";

export interface LifecycleGateTestReport {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  details: Array<{
    name: string;
    passed: boolean;
    error?: string;
  }>;
}

export function runPhase05KnowledgeLifecycleGate(): LifecycleGateTestReport {
  const details: Array<{ name: string; passed: boolean; error?: string }> = [];
  resetKnowledgeStoreForTesting();

  const mockCompanyId = "comp-argento-test";

  // Test 1: Seed & Retrieval
  try {
    const sources = getKnowledgeSources(mockCompanyId);
    if (sources.length >= 4) {
      details.push({ name: "KNOWLEDGE REPOSITORY INITIALIZATION & SEEDING", passed: true });
    } else {
      details.push({
        name: "KNOWLEDGE REPOSITORY INITIALIZATION & SEEDING",
        passed: false,
        error: `Expected at least 4 seeded docs, got ${sources.length}`,
      });
    }
  } catch (err: any) {
    details.push({ name: "KNOWLEDGE REPOSITORY INITIALIZATION & SEEDING", passed: false, error: err.message });
  }

  // Test 2: Change AI Scope (Company AI -> Offering AI)
  try {
    const docId = `doc-${mockCompanyId}-01`;
    const res = changeSourceScope({
      companyId: mockCompanyId,
      docId,
      scopeType: "OFFERING",
      offeringId: "prod-rov-01",
      actorId: "test-operator",
    });

    const updated = getSourceById(mockCompanyId, docId);
    const audits = getKnowledgeAuditLogs(mockCompanyId, docId);
    const scopeAudit = audits.find((a) => a.action === "SOURCE_SCOPE_CHANGED");

    if (
      res.success &&
      updated?.productId === "prod-rov-01" &&
      (updated?.metadata as any)?.scope === "OFFERING" &&
      updated?.version === 2 &&
      scopeAudit !== undefined
    ) {
      details.push({ name: "AI SCOPE MODIFICATION & VERSION BUMP", passed: true });
    } else {
      details.push({
        name: "AI SCOPE MODIFICATION & VERSION BUMP",
        passed: false,
        error: `Scope update failed or audit log missing: ${JSON.stringify(updated)}`,
      });
    }
  } catch (err: any) {
    details.push({ name: "AI SCOPE MODIFICATION & VERSION BUMP", passed: false, error: err.message });
  }

  // Test 3: Disable Grounding (Retains document in repository, removes from active retrieval)
  try {
    const docId = `doc-${mockCompanyId}-01`;
    const disableRes = disableGrounding(mockCompanyId, docId, "test-operator", "Under engineering revision");
    const updated = getSourceById(mockCompanyId, docId);

    // AI retrieval should now exclude this document
    const activeRetrievalDocs = resolveActiveAIRetrievalSources({
      companyId: mockCompanyId,
      offeringId: "prod-rov-01",
    });
    const isRetrievable = activeRetrievalDocs.some((d) => d.id === docId);

    if (
      disableRes.success &&
      updated?.groundingStatus === "DISABLED" &&
      updated?.groundingEligible === false &&
      updated?.status === "ACTIVE" && // Document entity remains stored
      !isRetrievable
    ) {
      details.push({ name: "DISABLE GROUNDING & AI RETRIEVAL EXCLUSION", passed: true });
    } else {
      details.push({
        name: "DISABLE GROUNDING & AI RETRIEVAL EXCLUSION",
        passed: false,
        error: `Disable grounding failed or still retrievable: status=${updated?.groundingStatus}, isRetrievable=${isRetrievable}`,
      });
    }
  } catch (err: any) {
    details.push({ name: "DISABLE GROUNDING & AI RETRIEVAL EXCLUSION", passed: false, error: err.message });
  }

  // Test 4: Re-enable Grounding
  try {
    const docId = `doc-${mockCompanyId}-01`;
    const enableRes = enableGrounding(mockCompanyId, docId, "test-operator");
    const updated = getSourceById(mockCompanyId, docId);

    const activeRetrievalDocs = resolveActiveAIRetrievalSources({
      companyId: mockCompanyId,
      offeringId: "prod-rov-01",
    });
    const isRetrievable = activeRetrievalDocs.some((d) => d.id === docId);

    if (
      enableRes.success &&
      updated?.groundingStatus === "GROUNDED" &&
      updated?.groundingEligible === true &&
      isRetrievable
    ) {
      details.push({ name: "ENABLE GROUNDING & RESTORATION", passed: true });
    } else {
      details.push({
        name: "ENABLE GROUNDING & RESTORATION",
        passed: false,
        error: `Enable grounding failed: status=${updated?.groundingStatus}`,
      });
    }
  } catch (err: any) {
    details.push({ name: "ENABLE GROUNDING & RESTORATION", passed: false, error: err.message });
  }

  // Test 5: Archive & Unarchive Source
  try {
    const docId = `doc-${mockCompanyId}-04`;
    const archiveRes = archiveSource(mockCompanyId, docId, "test-operator", "Superseded by 2026 revision");
    const archivedDoc = getSourceById(mockCompanyId, docId);

    const activeRetrievalDocs = resolveActiveAIRetrievalSources({ companyId: mockCompanyId });
    const isRetrievable = activeRetrievalDocs.some((d) => d.id === docId);

    // Unarchive
    const unarchiveRes = unarchiveSource(mockCompanyId, docId, "test-operator");
    const restoredDoc = getSourceById(mockCompanyId, docId);

    if (
      archiveRes.success &&
      archivedDoc?.status === "ARCHIVED" &&
      archivedDoc?.groundingStatus === "DISABLED" &&
      !isRetrievable &&
      unarchiveRes.success &&
      restoredDoc?.status === "ACTIVE"
    ) {
      details.push({ name: "SOURCE ARCHIVE & UNARCHIVE LIFECYCLE", passed: true });
    } else {
      details.push({
        name: "SOURCE ARCHIVE & UNARCHIVE LIFECYCLE",
        passed: false,
        error: `Archive/unarchive failed: archivedStatus=${archivedDoc?.status}, restoredStatus=${restoredDoc?.status}`,
      });
    }
  } catch (err: any) {
    details.push({ name: "SOURCE ARCHIVE & UNARCHIVE LIFECYCLE", passed: false, error: err.message });
  }

  // Test 6: Remove Relationship Link (NEVER Deletes Document Entity)
  try {
    const docId = `doc-${mockCompanyId}-02`; // Seeded with productId: "prod-argento-01"
    const unbindRes = removeSourceLink(mockCompanyId, docId, "test-operator");
    const updatedDoc = getSourceById(mockCompanyId, docId);
    const audits = getKnowledgeAuditLogs(mockCompanyId, docId);
    const unbindAudit = audits.find((a) => a.action === "SOURCE_UNLINKED");

    if (
      unbindRes.success &&
      updatedDoc !== null && // Document entity IS NOT DELETED
      updatedDoc.productId === undefined &&
      updatedDoc.serviceId === undefined &&
      (updatedDoc.metadata as any)?.scope === "COMPANY" &&
      unbindAudit !== undefined
    ) {
      details.push({ name: "REMOVE RELATIONSHIP LINK (ENTITY PRESERVED)", passed: true });
    } else {
      details.push({
        name: "REMOVE RELATIONSHIP LINK (ENTITY PRESERVED)",
        passed: false,
        error: `Remove link failed or deleted doc: ${JSON.stringify(updatedDoc)}`,
      });
    }
  } catch (err: any) {
    details.push({ name: "REMOVE RELATIONSHIP LINK (ENTITY PRESERVED)", passed: false, error: err.message });
  }

  // Test 7: Safe Deletion Dependency Protection (Blocks deletion when in use)
  try {
    const docId = `doc-${mockCompanyId}-03`; // Seeded as ACTIVE + GROUNDED + serviceId: "serv-argento-01"
    const depCheck = checkSourceDependencies(mockCompanyId, docId);
    const deleteAttemptRes = deleteSourceSafely(mockCompanyId, docId, "test-operator");

    if (
      !depCheck.canDelete &&
      depCheck.dependencies.length > 0 &&
      !deleteAttemptRes.success &&
      deleteAttemptRes.blockedReason !== undefined
    ) {
      details.push({ name: "SAFE DELETION DEPENDENCY PROTECTION", passed: true });
    } else {
      details.push({
        name: "SAFE DELETION DEPENDENCY PROTECTION",
        passed: false,
        error: `Expected deletion to be blocked: canDelete=${depCheck.canDelete}, deleteSuccess=${deleteAttemptRes.success}`,
      });
    }
  } catch (err: any) {
    details.push({ name: "SAFE DELETION DEPENDENCY PROTECTION", passed: false, error: err.message });
  }

  // Test 8: Safe Deletion Execution (Permitted when dependencies are cleared)
  try {
    // Create an isolated ungrounded document
    const tempDoc: DocumentEntity = {
      id: `doc-${mockCompanyId}-isolated-temp`,
      companyId: mockCompanyId,
      businessId: `MW-BUS-${mockCompanyId.toUpperCase()}`,
      title: "Temporary Scratch Notes",
      documentType: "MANUAL",
      status: "ACTIVE",
      sourceType: "MANUAL",
      fileReferences: [],
      visibility: "PRIVATE",
      groundingStatus: "DISABLED",
      groundingEligible: false,
      version: 1,
      versionHistory: [],
      createdBy: "test-operator",
      updatedBy: "test-operator",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    registerIngestedSource(tempDoc, "test-operator");

    const depCheck = checkSourceDependencies(mockCompanyId, tempDoc.id);
    const deleteRes = deleteSourceSafely(mockCompanyId, tempDoc.id, "test-operator");
    const retrievedAfterDelete = getSourceById(mockCompanyId, tempDoc.id);
    const audits = getKnowledgeAuditLogs(mockCompanyId, tempDoc.id);
    const deleteAudit = audits.find((a) => a.action === "SOURCE_DELETED");

    if (
      depCheck.canDelete &&
      deleteRes.success &&
      retrievedAfterDelete === null &&
      deleteAudit !== undefined
    ) {
      details.push({ name: "SAFE DELETION EXECUTION & AUDIT", passed: true });
    } else {
      details.push({
        name: "SAFE DELETION EXECUTION & AUDIT",
        passed: false,
        error: `Safe delete execution failed: canDelete=${depCheck.canDelete}, deleteSuccess=${deleteRes.success}`,
      });
    }
  } catch (err: any) {
    details.push({ name: "SAFE DELETION EXECUTION & AUDIT", passed: false, error: err.message });
  }

  // Test 9: Tenant Isolation in AI Retrieval
  try {
    const compA = "comp-tenant-alpha";
    const compB = "comp-tenant-beta";

    const docA: DocumentEntity = {
      id: `doc-${compA}-confidential`,
      companyId: compA,
      businessId: "MW-BUS-ALPHA",
      title: "Confidential Alpha Hydrodynamics",
      documentType: "TECHNICAL_SPEC",
      status: "ACTIVE",
      sourceType: "IMPORTED",
      fileReferences: ["file-alpha-1"],
      visibility: "PRIVATE",
      groundingStatus: "GROUNDED",
      groundingEligible: true,
      version: 1,
      versionHistory: [],
      createdBy: "usr-alpha",
      updatedBy: "usr-alpha",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    registerIngestedSource(docA, "usr-alpha");

    const alphaRetrieval = resolveActiveAIRetrievalSources({ companyId: compA });
    const betaRetrieval = resolveActiveAIRetrievalSources({ companyId: compB });

    const alphaHasDoc = alphaRetrieval.some((d) => d.id === docA.id);
    const betaHasDoc = betaRetrieval.some((d) => d.id === docA.id);

    if (alphaHasDoc && !betaHasDoc) {
      details.push({ name: "STRICT TENANT ISOLATION IN AI RETRIEVAL", passed: true });
    } else {
      details.push({
        name: "STRICT TENANT ISOLATION IN AI RETRIEVAL",
        passed: false,
        error: `Tenant isolation failed: alphaHasDoc=${alphaHasDoc}, betaHasDoc=${betaHasDoc}`,
      });
    }
  } catch (err: any) {
    details.push({ name: "STRICT TENANT ISOLATION IN AI RETRIEVAL", passed: false, error: err.message });
  }

  const passedTests = details.filter((d) => d.passed).length;
  const totalTests = details.length;

  return {
    passed: passedTests === totalTests,
    totalTests,
    passedTests,
    failedTests: totalTests - passedTests,
    details,
  };
}
