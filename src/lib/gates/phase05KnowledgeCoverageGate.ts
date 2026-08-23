import {
  computeOfferingKnowledgeCoverage,
  computeCompanyKnowledgeCoverage,
} from "@/lib/services/knowledgeCoverageService";
import {
  getCompanyDocumentConflicts,
  getOfferingDocumentConflicts,
  resolveDocumentConflict,
  registerDocumentConflict,
  resetConflictRegistryForTesting,
} from "@/lib/services/knowledgeConflictService";
import type { CompanyOffering, CompanyEntity, DocumentEntity } from "@/lib/types";

export interface GateTestReport {
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

export function runPhase05KnowledgeCoverageGate(): GateTestReport {
  const details: Array<{ name: string; passed: boolean; error?: string }> = [];
  resetConflictRegistryForTesting();

  // Test 1: Conflict Resolution - KEEP_A selection and Provenance Retention
  try {
    const testCompanyId = "comp-test-marine-01";
    const conflict = registerDocumentConflict({
      conflictId: "conf-test-01",
      companyId: testCompanyId,
      offeringId: "off-rov-01",
      field: "maxDepth",
      fieldLabel: "Operational Depth Rating",
      sourceA: {
        sourceDocumentId: "doc-manual-v1",
        sourceDocumentName: "ROV Technical Manual v1.0",
        extractedAt: "2026-08-01T10:00:00Z",
        confidenceScore: 92,
        confirmationState: "AI_EXTRACTED",
        extractedValue: "3,000 meters depth rating",
        sectionOrPage: "Page 12",
      },
      sourceB: {
        sourceDocumentId: "doc-cert-dnv",
        sourceDocumentName: "DNV Type Approval 2026",
        extractedAt: "2026-08-05T14:30:00Z",
        confidenceScore: 98,
        confirmationState: "AI_EXTRACTED",
        extractedValue: "3,500 meters rated with titanium housing",
        sectionOrPage: "Clause 4.1",
      },
    });

    // Resolve by keeping B
    const resolved = resolveDocumentConflict({
      conflictId: "conf-test-01",
      companyId: testCompanyId,
      choice: "KEEP_B",
      confirmedBy: "Lead Systems Engineer",
    });

    if (
      resolved.status === "RESOLVED" &&
      resolved.resolvedValue === "3,500 meters rated with titanium housing" &&
      resolved.resolvedSource === "SOURCE_B" &&
      resolved.confirmedBy === "Lead Systems Engineer" &&
      resolved.confirmedAt &&
      resolved.sourceA.extractedValue === "3,000 meters depth rating" &&
      resolved.sourceB.extractedValue === "3,500 meters rated with titanium housing"
    ) {
      details.push({ name: "Conflict Resolution KEEP_B & Full Provenance Retention", passed: true });
    } else {
      details.push({
        name: "Conflict Resolution KEEP_B & Full Provenance Retention",
        passed: false,
        error: "Resolved structure missing provenance or canonical value.",
      });
    }
  } catch (err: any) {
    details.push({ name: "Conflict Resolution KEEP_B & Full Provenance Retention", passed: false, error: err.message });
  }

  // Test 2: Conflict Resolution - Manual Override with Rationale
  try {
    const testCompanyId = "comp-test-marine-01";
    registerDocumentConflict({
      conflictId: "conf-test-02",
      companyId: testCompanyId,
      offeringId: "off-rov-01",
      field: "warrantyPeriod",
      fieldLabel: "Manufacturer Warranty",
      sourceA: {
        sourceDocumentId: "doc-proposal",
        sourceDocumentName: "Commercial Proposal",
        extractedAt: "2026-08-01T10:00:00Z",
        confidenceScore: 80,
        confirmationState: "AI_EXTRACTED",
        extractedValue: "12 months standard",
      },
      sourceB: {
        sourceDocumentId: "doc-sla",
        sourceDocumentName: "Service Level Agreement",
        extractedAt: "2026-08-05T14:30:00Z",
        confidenceScore: 85,
        confirmationState: "AI_EXTRACTED",
        extractedValue: "24 months with preventative maintenance package",
      },
    });

    const manualResolved = resolveDocumentConflict({
      conflictId: "conf-test-02",
      companyId: testCompanyId,
      choice: "MANUAL",
      manualValue: "24 months global coverage including all hull thrusters",
      manualRationale: "Confirmed by Vice President of Commercial Operations",
      confirmedBy: "Commercial Director",
    });

    if (
      manualResolved.status === "RESOLVED" &&
      manualResolved.resolvedValue === "24 months global coverage including all hull thrusters" &&
      manualResolved.resolvedSource === "MANUAL" &&
      manualResolved.manualRationale === "Confirmed by Vice President of Commercial Operations"
    ) {
      details.push({ name: "Manual Operator Override with Provenance", passed: true });
    } else {
      details.push({
        name: "Manual Operator Override with Provenance",
        passed: false,
        error: "Manual resolution values did not match.",
      });
    }
  } catch (err: any) {
    details.push({ name: "Manual Operator Override with Provenance", passed: false, error: err.message });
  }

  // Test 3: Cross-Company Tenant Isolation in Conflict Resolution
  try {
    let isolationBlocked = false;
    try {
      resolveDocumentConflict({
        conflictId: "conf-test-01",
        companyId: "comp-DIFFERENT-tenant",
        choice: "KEEP_A",
      });
    } catch {
      isolationBlocked = true;
    }

    if (isolationBlocked) {
      details.push({ name: "Conflict Resolution Cross-Tenant Isolation", passed: true });
    } else {
      details.push({
        name: "Conflict Resolution Cross-Tenant Isolation",
        passed: false,
        error: "Cross-tenant conflict mutation was not blocked.",
      });
    }
  } catch (err: any) {
    details.push({ name: "Conflict Resolution Cross-Tenant Isolation", passed: false, error: err.message });
  }

  // Test 4: Deterministic Offering Knowledge Coverage - Complete Offering
  try {
    const completeOffering: Partial<CompanyOffering> = {
      id: "off-complete-01",
      companyId: "comp-test-01",
      name: "Argento High-Resolution Multibeam Sonar",
      category: "Hydrographic Survey",
      type: "product",
      shortDescription: "Ultra-high resolution dual-swath survey sonar for subsea bathymetry.",
      detailedDescription: "Comprehensive multibeam echo sounder engineered for deepwater hydrographic and geophysical surveys.",
      specifications: {
        Frequency: "200 kHz - 400 kHz broadband",
        SwathCoverage: "140 degrees standard",
        DepthRating: "6000 meters",
        BeamCount: "512 high-density beams",
      },
      applications: ["Offshore Wind Site Survey", "Pipeline Route Inspection", "Port Hydrography"],
      certifications: ["IHO Special Order compliant", "DNV Certified"],
      commercialInformation: {
        leadTime: "6 weeks from order confirmation",
        pricingGuidance: "CAPEX with optional support SLA",
      },
      groundingSources: [
        {
          id: "src-spec-01",
          title: "Multibeam Datasheet 2026",
          sourceConfidence: 95,
        },
      ],
    };

    const coverage = computeOfferingKnowledgeCoverage(completeOffering);

    if (
      coverage.status === "GROUNDED" &&
      coverage.aiReadiness === "AI ADVISOR READY" &&
      coverage.coveragePercent >= 80 &&
      coverage.approvedSourcesCount >= 1 &&
      coverage.verifiedFactsCount >= 8
    ) {
      details.push({ name: "Deterministic Complete Offering Knowledge Coverage & AI Readiness", passed: true });
    } else {
      details.push({
        name: "Deterministic Complete Offering Knowledge Coverage & AI Readiness",
        passed: false,
        error: `Expected GROUNDED / AI ADVISOR READY but received ${coverage.status} (${coverage.coveragePercent}%)`,
      });
    }
  } catch (err: any) {
    details.push({ name: "Deterministic Complete Offering Knowledge Coverage & AI Readiness", passed: false, error: err.message });
  }

  // Test 5: Deterministic Offering Knowledge Coverage - Incomplete Offering
  try {
    const incompleteOffering: Partial<CompanyOffering> = {
      id: "off-incomplete-01",
      name: "Draft Marine Pump",
      category: "Propulsion",
      type: "product",
      // No description, no specs, no sources
    };

    const coverage = computeOfferingKnowledgeCoverage(incompleteOffering);

    if (
      coverage.status === "INCOMPLETE" &&
      coverage.aiReadiness === "AI ADVISOR NOT READY" &&
      coverage.coveragePercent < 65 &&
      coverage.missingRequirements.length > 0
    ) {
      details.push({ name: "Deterministic Incomplete Offering Knowledge Coverage Rejection", passed: true });
    } else {
      details.push({
        name: "Deterministic Incomplete Offering Knowledge Coverage Rejection",
        passed: false,
        error: "Incomplete offering was incorrectly marked ready.",
      });
    }
  } catch (err: any) {
    details.push({ name: "Deterministic Incomplete Offering Knowledge Coverage Rejection", passed: false, error: err.message });
  }

  // Test 6: Deterministic Company Knowledge Coverage
  try {
    const testCompany: Partial<CompanyEntity> = {
      id: "comp-argento-01",
      displayName: "Argento Marine Subsea Systems",
      legalName: "Argento Subsea Technologies Inc.",
      businessId: "MW-ARG-2026",
      industry: "Naval Subsea Robotics & Hydrography",
      primarySectorCategory: "Maritime Technology",
      shortDescription: "Specialized manufacturer of deepwater robotic systems.",
      registeredHeadquarters: {
        id: "hq-01",
        companyId: "comp-argento-01",
        facilityName: "Argento Marine Technical Headquarters",
        facilityType: "Headquarters",
        city: "Bergen",
        country: "Norway",
        address: "Havnegata 12, 5003 Bergen",
        description: "Primary marine robotics R&D and manufacturing facility",
        contactEmail: "hq@argento-marine.com",
        status: "ACTIVE",
        visibility: "PUBLIC",
        isHeadquarters: true,
      },
    };

    const groundedCompanyDoc: DocumentEntity = {
      id: "doc-corp-01",
      companyId: "comp-argento-01",
      businessId: "MW-ARG-2026",
      title: "Argento Marine Corporate Profile & Class Accreditations",
      documentType: "POLICY",
      status: "ACTIVE",
      sourceType: "IMPORTED",
      fileReferences: ["f-01"],
      visibility: "PUBLIC",
      groundingStatus: "GROUNDED",
      groundingEligible: true,
      version: 1,
      versionHistory: [],
      createdBy: "admin",
      updatedBy: "admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const companyCoverage = computeCompanyKnowledgeCoverage(testCompany, [groundedCompanyDoc]);

    if (
      companyCoverage.status === "GROUNDED" &&
      companyCoverage.aiReadiness === "AI ADVISOR READY" &&
      companyCoverage.groundedSourcesCount === 1
    ) {
      details.push({ name: "Deterministic Company Knowledge Coverage Calculation", passed: true });
    } else {
      details.push({
        name: "Deterministic Company Knowledge Coverage Calculation",
        passed: false,
        error: `Expected GROUNDED company coverage but received ${companyCoverage.status}`,
      });
    }
  } catch (err: any) {
    details.push({ name: "Deterministic Company Knowledge Coverage Calculation", passed: false, error: err.message });
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
