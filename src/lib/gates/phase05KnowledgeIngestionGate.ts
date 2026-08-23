import {
  processSourceIngestion,
  finalizeKnowledgeGrounding,
  type IngestionSourcePayload,
  type ExtractedStructuredFact,
} from "@/lib/services/knowledgeIngestionService";
import {
  computeOfferingKnowledgeCoverage,
  computeCompanyKnowledgeCoverage,
} from "@/lib/services/knowledgeCoverageService";
import {
  registerDocumentConflict,
  getCompanyDocumentConflicts,
  resetConflictRegistryForTesting,
} from "@/lib/services/knowledgeConflictService";
import type { CompanyOffering, CompanyEntity, DocumentEntity } from "@/lib/types";

export interface IngestionGateTestReport {
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

export function runPhase05KnowledgeIngestionGate(): IngestionGateTestReport {
  const details: Array<{ name: string; passed: boolean; error?: string }> = [];
  resetConflictRegistryForTesting();

  const mockCompanyId = "comp-argento-marine";
  const mockBusinessId = "MW-BUS-ARGENTO";

  const mockOfferings: CompanyOffering[] = [
    {
      id: "prod-rov-01",
      companyId: mockCompanyId,
      name: "Autonomous Subsea ROV-4 Inspection System",
      category: "Robotic Systems",
      type: "product",
      shortDescription: "Ultra-deepwater robotic inspection platform for subsea structures.",
      detailedDescription: "High-spec autonomous ROV system with titanium pressure housing and optical fiber telemetry.",
      specifications: {
        maxDepth: "3,000 meters",
        power: "400 VAC 3-Phase 15kW",
      },
      applications: ["Subsea Pipeline Inspection", "Offshore Wind Substructure Survey"],
      certifications: ["DNV Class I Subsea"],
      commercialInformation: {
        leadTime: "6 weeks",
        pricingGuidance: "CAPEX with SLA",
      },
    },
    {
      id: "serv-survey-01",
      companyId: mockCompanyId,
      name: "Subsea Hydrographic Bathymetry Survey Service",
      category: "Survey & Inspection",
      type: "service",
      shortDescription: "Comprehensive deepwater bathymetric survey and seabed mapping service.",
      detailedDescription: "Turnkey marine hydrographic surveys deploying multibeam sonar arrays and acoustic positioning.",
      specifications: {
        surveySwath: "140 degrees broadband",
        resolution: "Centimeter-accurate DTM",
      },
      applications: ["Cabling Route Selection", "Harbor Dredging Compliance"],
      certifications: ["IHO Special Order"],
    },
  ];

  // Test 1: Desktop Upload Source Ingestion
  try {
    const payload: IngestionSourcePayload = {
      sourceType: "DESKTOP_UPLOAD",
      fileName: "DNV_GL_Type_Approval_ROV4.pdf",
      fileSize: 3400000,
    };
    const extraction = processSourceIngestion(mockCompanyId, payload, mockOfferings);

    if (
      extraction.sourceType === "DESKTOP_UPLOAD" &&
      extraction.detectedClassification === "CERTIFICATION" &&
      extraction.confidenceScore >= 90 &&
      extraction.extractedFactsCount >= 3 &&
      extraction.structuredFacts.length > 0
    ) {
      details.push({ name: "DESKTOP UPLOAD INGESTION & EXTRACTION", passed: true });
    } else {
      details.push({
        name: "DESKTOP UPLOAD INGESTION & EXTRACTION",
        passed: false,
        error: `Unexpected extraction result: ${JSON.stringify(extraction)}`,
      });
    }
  } catch (err: any) {
    details.push({ name: "DESKTOP UPLOAD INGESTION & EXTRACTION", passed: false, error: err.message });
  }

  // Test 2: Google Drive Ingestion (Files & Folders)
  try {
    const drivePayload: IngestionSourcePayload = {
      sourceType: "GOOGLE_DRIVE",
      googleDrivePath: "/MarineWorld-Corporate-Knowledge/Commercial/Commercial_Tariff_Schedule_2026.xlsx",
      fileName: "Commercial_Tariff_Schedule_2026.xlsx",
      fileSize: 850000,
    };
    const driveExtraction = processSourceIngestion(mockCompanyId, drivePayload, mockOfferings);

    if (
      driveExtraction.sourceType === "GOOGLE_DRIVE" &&
      driveExtraction.detectedClassification === "COMMERCIAL" &&
      driveExtraction.commercialParametersCount >= 2
    ) {
      details.push({ name: "GOOGLE DRIVE INGESTION & COMMERCIAL PARSING", passed: true });
    } else {
      details.push({
        name: "GOOGLE DRIVE INGESTION & COMMERCIAL PARSING",
        passed: false,
        error: `Drive extraction mismatch: ${driveExtraction.detectedClassification}`,
      });
    }
  } catch (err: any) {
    details.push({ name: "GOOGLE DRIVE INGESTION & COMMERCIAL PARSING", passed: false, error: err.message });
  }

  // Test 3: URL Source Ingestion
  try {
    const urlPayload: IngestionSourcePayload = {
      sourceType: "URL_SOURCE",
      url: "https://dnv.com/certificates/subsea-robotics-2026",
      customTitle: "DNV Official Registry Listing",
    };
    const urlExtraction = processSourceIngestion(mockCompanyId, urlPayload, mockOfferings);

    if (
      urlExtraction.sourceType === "URL_SOURCE" &&
      urlExtraction.sourceReference.includes("https://dnv.com") &&
      urlExtraction.confidenceScore > 85
    ) {
      details.push({ name: "URL INGESTION & METADATA PRESERVATION", passed: true });
    } else {
      details.push({
        name: "URL INGESTION & METADATA PRESERVATION",
        passed: false,
        error: "URL extraction failed to preserve reference.",
      });
    }
  } catch (err: any) {
    details.push({ name: "URL INGESTION & METADATA PRESERVATION", passed: false, error: err.message });
  }

  // Test 4: Existing Source Linkage (No Duplication)
  try {
    const existingDocId = "doc-argento-01";
    const existingPayload: IngestionSourcePayload = {
      sourceType: "EXISTING_SOURCE",
      existingSourceDocumentId: existingDocId,
      customTitle: "DNV-GL Naval Composite Structural Compliance Certificate",
    };
    const linkExtraction = processSourceIngestion(mockCompanyId, existingPayload, mockOfferings);

    if (
      linkExtraction.sourceType === "EXISTING_SOURCE" &&
      linkExtraction.sourceReference === existingDocId
    ) {
      details.push({ name: "EXISTING SOURCE LINK WITHOUT FILE DUPLICATION", passed: true });
    } else {
      details.push({
        name: "EXISTING SOURCE LINK WITHOUT FILE DUPLICATION",
        passed: false,
        error: "Existing source reference was not retained.",
      });
    }
  } catch (err: any) {
    details.push({ name: "EXISTING SOURCE LINK WITHOUT FILE DUPLICATION", passed: false, error: err.message });
  }

  // Test 5: Offering Auto-Match & Scope Handling
  try {
    const techPayload: IngestionSourcePayload = {
      sourceType: "DESKTOP_UPLOAD",
      fileName: "Autonomous_ROV_Technical_Datasheet_v4.pdf",
    };
    const techExtraction = processSourceIngestion(mockCompanyId, techPayload, mockOfferings);

    if (
      techExtraction.detectedOfferingId === "prod-rov-01" &&
      techExtraction.detectedScope === "OFFERING" &&
      techExtraction.detectedOfferingName?.includes("ROV")
    ) {
      details.push({ name: "OFFERING AUTO-MATCH AND SCOPE PRESELECTION", passed: true });
    } else {
      details.push({
        name: "OFFERING AUTO-MATCH AND SCOPE PRESELECTION",
        passed: false,
        error: `Auto-match failed: ${techExtraction.detectedOfferingId}`,
      });
    }
  } catch (err: any) {
    details.push({ name: "OFFERING AUTO-MATCH AND SCOPE PRESELECTION", passed: false, error: err.message });
  }

  // Test 6: Manual Operator Fact Modification & COMPANY_CONFIRMED Tracking
  try {
    const payload: IngestionSourcePayload = {
      sourceType: "DESKTOP_UPLOAD",
      fileName: "Subsea_Robotics_Spec.pdf",
    };
    const extraction = processSourceIngestion(mockCompanyId, payload, mockOfferings);

    // Operator edits canonical value
    const confirmedFacts: ExtractedStructuredFact[] = extraction.structuredFacts.map((f, i) => {
      if (i === 0) {
        return {
          ...f,
          canonicalValue: "3,500 meters operational depth with titanium reinforcement",
          confirmationState: "COMPANY_CONFIRMED" as const,
        };
      }
      return f;
    });

    const { document } = finalizeKnowledgeGrounding({
      companyId: mockCompanyId,
      businessId: mockBusinessId,
      extraction,
      finalTitle: "Autonomous ROV Technical Specification v4.2",
      finalClassification: "TECHNICAL",
      finalScope: "OFFERING",
      finalOfferingId: "prod-rov-01",
      finalVisibility: "PUBLIC",
      confirmedFacts,
      currentUser: "Chief Engineer",
    });

    const metadataFacts = (document.metadata?.extractedFacts as ExtractedStructuredFact[]) || [];
    const modifiedFact = metadataFacts.find((f) => f.confirmationState === "COMPANY_CONFIRMED");

    if (
      document.groundingStatus === "GROUNDED" &&
      document.productId === "prod-rov-01" &&
      modifiedFact &&
      modifiedFact.canonicalValue.includes("titanium reinforcement")
    ) {
      details.push({ name: "MANUAL OPERATOR FACT EDIT & COMPANY_CONFIRMED RETENTION", passed: true });
    } else {
      details.push({
        name: "MANUAL OPERATOR FACT EDIT & COMPANY_CONFIRMED RETENTION",
        passed: false,
        error: "Confirmed fact state did not persist in canonical grounding record.",
      });
    }
  } catch (err: any) {
    details.push({ name: "MANUAL OPERATOR FACT EDIT & COMPANY_CONFIRMED RETENTION", passed: false, error: err.message });
  }

  // Test 7: Grounding Confirmation vs Draft Saving
  try {
    const payload: IngestionSourcePayload = {
      sourceType: "DESKTOP_UPLOAD",
      fileName: "Draft_Internal_Policy.docx",
    };
    const extraction = processSourceIngestion(mockCompanyId, payload, mockOfferings);

    const { document: draftDoc } = finalizeKnowledgeGrounding({
      companyId: mockCompanyId,
      businessId: mockBusinessId,
      extraction,
      finalTitle: "Internal Operations Policy Draft",
      finalClassification: "GENERAL_CORPORATE",
      finalScope: "COMPANY",
      finalVisibility: "PRIVATE",
      confirmedFacts: extraction.structuredFacts,
      asDraft: true,
    });

    if (
      draftDoc.groundingStatus === "NOT_INDEXED" &&
      draftDoc.groundingEligible === false &&
      draftDoc.visibility === "PRIVATE"
    ) {
      details.push({ name: "DRAFT SAVE SAFETY & CONFIDENTIALITY DEFAULT", passed: true });
    } else {
      details.push({
        name: "DRAFT SAVE SAFETY & CONFIDENTIALITY DEFAULT",
        passed: false,
        error: `Draft document has incorrect grounding status: ${draftDoc.groundingStatus}`,
      });
    }
  } catch (err: any) {
    details.push({ name: "DRAFT SAVE SAFETY & CONFIDENTIALITY DEFAULT", passed: false, error: err.message });
  }

  // Test 8: Deterministic Coverage Update After Grounding
  try {
    const testOffering: CompanyOffering = {
      ...mockOfferings[0],
      groundingSources: [],
    };

    const initialCoverage = computeOfferingKnowledgeCoverage(testOffering);

    const newlyGroundedDoc: DocumentEntity = {
      id: "doc-new-grounded-01",
      companyId: mockCompanyId,
      businessId: mockBusinessId,
      title: "Autonomous ROV Technical Specification v4.2",
      documentType: "TECHNICAL_SPEC",
      status: "ACTIVE",
      sourceType: "IMPORTED",
      fileReferences: ["f-01"],
      visibility: "PUBLIC",
      productId: "prod-rov-01",
      groundingStatus: "GROUNDED",
      groundingEligible: true,
      version: 1,
      versionHistory: [],
      createdBy: "admin",
      updatedBy: "admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedCoverage = computeOfferingKnowledgeCoverage(testOffering, [newlyGroundedDoc]);

    if (
      updatedCoverage.status === "GROUNDED" &&
      updatedCoverage.aiReadiness === "AI ADVISOR READY" &&
      updatedCoverage.breakdown.approvedSourcesCount >= 1
    ) {
      details.push({ name: "DETERMINISTIC COVERAGE AUTO-UPDATE ON GROUNDING", passed: true });
    } else {
      details.push({
        name: "DETERMINISTIC COVERAGE AUTO-UPDATE ON GROUNDING",
        passed: false,
        error: `Coverage update failed: status ${updatedCoverage.status}`,
      });
    }
  } catch (err: any) {
    details.push({ name: "DETERMINISTIC COVERAGE AUTO-UPDATE ON GROUNDING", passed: false, error: err.message });
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
