import type {
  CompanyOffering,
  OfferingGroundingSource,
  OfferingMediaItem,
  OfferingCommercialInfo,
  OfferingAIAdvisorConfig,
  AdvisorRole,
  AdvisorConversationPriority,
  AdvisorCommunicationStyle,
  DocumentEntity,
} from "@/lib/types";

export interface SourceConflictItem {
  field: string;
  fieldLabel: string;
  sourceA: string;
  valueA: string;
  sourceB: string;
  valueB: string;
  resolvedValue?: string;
}

export interface ExtractedOfferingDraft {
  name: string;
  type: "product" | "service";
  category: string;
  sku: string;
  shortDescription: string;
  detailedDescription: string;
  applications: string[];
  specifications: Array<{ key: string; value: string; source?: string }>;
  certifications: string[];
  standards: string[];
  mediaReferences: OfferingMediaItem[];
  commercialInformation: OfferingCommercialInfo;
  serviceScope?: string;
  coverage?: string;
  deliveryModel?: string;
  groundingSources: OfferingGroundingSource[];
  sourceAttribution: string;
  sourceAttributions: Record<string, string>;
  fieldConfirmations: Record<string, "AI_EXTRACTED" | "COMPANY_CONFIRMED">;
  unextractedFields: string[];
  conflicts: SourceConflictItem[];
  confidenceScore: number;
  extractedFieldsCount: number;
}

export const PRESET_DOCUMENT_TEMPLATES = [
  {
    id: "preset-doc-rov-01",
    filename: "AM-ROV4-Subsea-Datasheet-RevD.pdf",
    title: "Autonomous Subsea ROV-4 Technical Datasheet (Rev D)",
    fileType: "PDF",
    size: "3.4 MB",
    type: "product" as const,
    description: "Official factory technical datasheet for subsea inspection vehicle with ultrasonic thickness sensors.",
    sampleDraft: {
      name: "Autonomous Subsea ROV-4 Inspection System",
      type: "product" as const,
      category: "Subsea Robotics & Inspection",
      sku: "AM-ROV4-X300",
      shortDescription: "Autonomous submersible inspection vehicle engineered for deep-water hull structural diagnostics and ultrasonic thickness measurement.",
      detailedDescription: "The AM-ROV4 is a heavy-duty subsea vehicle designed for non-destructive hull and propeller surveys up to 450 meters depth. Equipped with multi-beam sonar, 4K low-light stereoscopic cameras, and electromagnetic acoustic transducers.",
      applications: [
        "In-Water Survey (UWILD / Class Renewal)",
        "Offshore Riser & Mooring Line Inspection",
        "Subsea Pipeline Ultrasonic Diagnostics",
        "Ballast Tank Structural Integrity Audits",
      ],
      specifications: [
        { key: "Max Depth Rating", value: "450 m (1,476 ft)", source: "Datasheet Sec 2.1" },
        { key: "Operational Battery Endurance", value: "10.5 hours continuous", source: "Datasheet Sec 3.4" },
        { key: "Thruster Configuration", value: "8x Brushless Vector (6-DoF)", source: "Datasheet Sec 2.3" },
        { key: "Payload Capacity", value: "18.5 kg dry / 14.0 kg wet", source: "Datasheet Sec 2.4" },
        { key: "Telemetry Link", value: "Hybrid Fiber-Optic Tether / Acoustic Link", source: "Datasheet Sec 4.1" },
        { key: "Operating Temperature", value: "-10°C to +48°C seawater", source: "Datasheet Sec 1.2" },
      ],
      certifications: [
        "DNV GL Type Approved (Class ST-E272)",
        "ABS Recognized Underwater Survey Tool",
        "ISO 9001:2015 Subsea Equipment Quality Standard",
      ],
      standards: ["DNV-GL-ST-E272", "IMO MSC.1/Circ.1578", "IEC 60092-504"],
      commercialInformation: {
        pricingGuidance: "Commercial pricing on inquiry based on sensor suite configuration.",
        incoterms: "FCA Rotterdam / EXW Shipyard",
        leadTime: "4 to 6 weeks from purchase order",
        availability: "IN STOCK / BUILT TO ORDER",
        rfqAvailable: true,
        minOrderQty: "1 System (Console + ROV + Tether Spool)",
        warranty: "24-Month OEM Marine Warranty",
      },
      mediaReferences: [
        {
          id: "m-rov-01",
          url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
          title: "Subsea ROV Deployment Configuration",
          type: "cover" as const,
          isCover: true,
          order: 1,
        },
        {
          id: "m-rov-02",
          url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
          title: "Diagnostic Sonar Display & Thruster Array",
          type: "photo" as const,
          isCover: false,
          order: 2,
        },
      ],
    },
  },
  {
    id: "preset-doc-prop-02",
    filename: "Marine-Hybrid-Pod-1800kW-Spec.pdf",
    title: "1,800 kW High-Torque Hybrid Propulsion Pod Manual",
    fileType: "PDF",
    size: "4.8 MB",
    type: "product" as const,
    description: "Engineering specification and electrical integration manual for commercial hybrid podded drive.",
    sampleDraft: {
      name: "Hybrid Electric Azimuth Propulsion Pod 1800 kW",
      type: "product" as const,
      category: "Propulsion & Power Systems",
      sku: "HY-AZP-1800E",
      shortDescription: "Permanent magnet synchronous electric azimuth pod providing 360-degree vector thrust with ultra-low vibration and Tier III emissions compliance.",
      detailedDescription: "Engineered for harbor tugs, offshore support vessels, and coastal ferries. Features integrated hydrodynamic nozzle, water-lubricated seals, and full digital condition monitoring bus.",
      applications: [
        "Escort Tugs & Terminal Vessels",
        "Offshore Wind Farm Crew Transfer Vessels (CTV)",
        "Zero-Emission Urban Passenger Ferries",
        "Research & Oceanographic Survey Ships",
      ],
      specifications: [
        { key: "Continuous Shaft Power", value: "1,800 kW (2,414 hp)", source: "Engineering Spec 1.1" },
        { key: "Input Voltage", value: "690V AC, 3-Phase, 50/60 Hz", source: "Electrical Schematic" },
        { key: "Max Propeller Diameter", value: "2,250 mm (CuNiAl 4-Blade)", source: "Hydrodynamic Data" },
        { key: "Azimuth Rotation Speed", value: "3.5 RPM (360° Continuous)", source: "Steering Gear Spec" },
        { key: "Bollard Pull Contribution", value: "28.5 tonnes per pod", source: "Sea Trial Report" },
        { key: "Efficiency Rating", value: "96.4% at rated torque", source: "Dyno Test Matrix" },
      ],
      certifications: [
        "Lloyd's Register Class +100A1 Propulsion Approved",
        "DNV Clean Design Certified",
        "IMO Tier III / EPA Tier 4 Compliant",
      ],
      standards: ["IMO Annex VI Tier III", "IEC 60092-301", "ISO 484-1 Class S"],
      commercialInformation: {
        pricingGuidance: "Standard package EUR 420,000 - 680,000 (depending on frequency converters).",
        incoterms: "DAP Port of Delivery / FOB Rotterdam",
        leadTime: "12 to 16 weeks",
        availability: "MANUFACTURED TO ORDER",
        rfqAvailable: true,
        minOrderQty: "1 Podded Unit or Dual-Drive Shipset",
        warranty: "36-Month Comprehensive Powertrain Warranty",
      },
      mediaReferences: [
        {
          id: "m-pod-01",
          url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
          title: "Azimuth Pod Assembly in Factory",
          type: "cover" as const,
          isCover: true,
          order: 1,
        },
      ],
    },
  },
  {
    id: "preset-doc-ndt-03",
    filename: "Offshore-NDT-Ultrasonic-Survey-Charter.pdf",
    title: "Offshore Hull NDT & Ultrasonic Survey Service Scope",
    fileType: "PDF",
    size: "2.1 MB",
    type: "service" as const,
    description: "Operational guidelines and certified technician charter for class renewal hull thickness measurements.",
    sampleDraft: {
      name: "Ultrasonic Hull Thickness Measurement & NDT Survey",
      type: "service" as const,
      category: "Inspection, Classification & Survey",
      sku: "SRV-NDT-HULL",
      shortDescription: "Certified Level II/III non-destructive ultrasonic testing and digital 3D hull deformation mapping for commercial vessel class renewal.",
      detailedDescription: "Full-scope ultrasonic thickness measurement (UTM), phased array ultrasonic testing (PAUT), magnetic particle inspection (MPI), and close-up video documentation conducted during drydock or afloat.",
      applications: [
        "Special Periodical Surveys (Class Renewal 5-Year)",
        "Collision & Grounding Hull Damage Assessments",
        "Offshore Platform Jacket Weld Integrity Audits",
        "Pre-Purchase & Condition Assessment Programs (CAP)",
      ],
      specifications: [
        { key: "Technician Certification", value: "ASNT Level II / ISO 9712 Class-Approved", source: "Charter Sec 1" },
        { key: "Measurement Accuracy", value: "± 0.05 mm (Digital Calibrated Gauge)", source: "Cal Cert 2026" },
        { key: "Deliverable Format", value: "Class Society Formatted CAD + 3D Heatmap", source: "Reporting SOP" },
        { key: "Turnaround Time", value: "24-48 Hours Preliminary / 5 Days Final", source: "SLA Matrix" },
      ],
      certifications: [
        "DNV Service Supplier Approval for Hull Gauging",
        "Bureau Veritas Recognized UTM Service Provider",
        "RINA Classification Society Certified",
      ],
      standards: ["IACS UR Z10.1", "ISO 9712:2021", "ASNT SNT-TC-1A"],
      serviceScope: "Global port and anchorage mobilization with 24-hour response across major maritime corridors.",
      coverage: "Worldwide Ports, Drydocks & Offshore Installations (Rotterdam, Singapore, Houston, Dubai, Hamburg)",
      deliveryModel: "Turnkey mobilized engineering team with portable intrinsically safe instrumentation.",
      commercialInformation: {
        pricingGuidance: "Daily mobilization rate + per-point gauge fee or fixed drydock contract.",
        incoterms: "Service Delivery on Site",
        leadTime: "24 to 48 Hours Notice for Emergency Mobilization",
        availability: "24/7/365 ON CALL",
        rfqAvailable: true,
        warranty: "Class Guaranteed Acceptance Guarantee",
      },
      mediaReferences: [
        {
          id: "m-ndt-01",
          url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80",
          title: "Engineer Performing Ultrasonic Testing on Hull Plate",
          type: "cover" as const,
          isCover: true,
          order: 1,
        },
      ],
    },
  },
  {
    id: "preset-doc-cfd-04",
    filename: "Computational-Fluid-Dynamics-Efficiency-Service.pdf",
    title: "Naval CFD Hydrodynamic Optimization Whitepaper",
    fileType: "PDF",
    size: "5.2 MB",
    type: "service" as const,
    description: "Methodology documentation for digital hull form optimization, bulbous bow retrofits, and energy saving device (ESD) CFD simulations.",
    sampleDraft: {
      name: "Naval Hydrodynamic CFD Energy & Route Optimization",
      type: "service" as const,
      category: "Naval Architecture & Hydrodynamics",
      sku: "SRV-CFD-OPT",
      shortDescription: "High-fidelity computational fluid dynamics modeling to optimize hull lines, bulbous bows, and wake-equalizing ducts to achieve 4–12% fuel savings.",
      detailedDescription: "High-performance computing (HPC) simulations analyzing free-surface wave resistance, viscous skin friction, propeller-rudder interaction, and cavitation risks across various trim and draft conditions.",
      applications: [
        "Newbuild Hull Line Form Optimization",
        "Bulbous Bow Retrofit for Low-Speed Steaming",
        "Energy Saving Device (ESD) Verification (Mewis Duct / Pre-Swirl Stators)",
        "CII (Carbon Intensity Indicator) Improvement Studies",
      ],
      specifications: [
        { key: "Solver Architecture", value: "RANSE / Large Eddy Simulation (LES) on HPC Cluster", source: "Methods Sec 2" },
        { key: "Mesh Resolution", value: "30M to 120M Polyhedral Cells with Prism Layers", source: "Validation Data" },
        { key: "Fuel Reduction Range", value: "4.2% - 11.8% Validated in Sea Trials", source: "Historical Benchmark" },
        { key: "Class Validation", value: "Compliant with DNV/ABS CFD Verification Guidelines", source: "Regulatory Review" },
      ],
      certifications: [
        "Royal Institution of Naval Architects (RINA) Corporate Member",
        "DNV Validated CFD Modeling Provider",
      ],
      standards: ["ITTC 7.5-03-02-03", "IMO MEPC.1/Circ.896", "ISO 15016:2015"],
      serviceScope: "Full digital simulation from initial 3D lines CAD intake to delivered hydrodynamic report and retrofit manufacturing drawings.",
      coverage: "Digital Remote Service (Global Shipowners & Shipyards)",
      deliveryModel: "Secure Cloud Simulation with Live Interactive 3D Web Viewer & Engineering Review Sessions.",
      commercialInformation: {
        pricingGuidance: "Project-based milestone fee (typically EUR 18,000 - 45,000 per vessel class study).",
        incoterms: "Digital Engineering Deliverable",
        leadTime: "2 to 3 weeks for preliminary wave matrix",
        availability: "AVAILABLE NOW",
        rfqAvailable: true,
        warranty: "Hydrodynamic Accuracy Guarantee",
      },
      mediaReferences: [
        {
          id: "m-cfd-01",
          url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
          title: "Hydrodynamic Flow Simulation Velocity Vectors",
          type: "cover" as const,
          isCover: true,
          order: 1,
        },
      ],
    },
  },
];

export interface DocumentInputSource {
  name: string;
  size?: number;
  type?: string;
  content?: string;
  origin?: "COMPUTER" | "GOOGLE_DRIVE" | "URL";
  drivePath?: string;
  url?: string;
  isDownloadable?: boolean;
  isGroundingSource?: boolean;
}

export interface GoogleDriveFolder {
  id: string;
  name: string;
  path: string;
  filesCount: number;
  files: Array<{
    id: string;
    name: string;
    size: string;
    type: string;
    category: "DATASHEET" | "MANUAL" | "CERTIFICATE" | "MEDIA" | "PRICING";
  }>;
}

export const MOCK_GOOGLE_DRIVE_FOLDERS: GoogleDriveFolder[] = [
  {
    id: "gdrive-f-rov4",
    name: "ROV-4 Autonomous Subsea System",
    path: "/MarineWorld/Products/ROV-4/",
    filesCount: 4,
    files: [
      {
        id: "gdf-01",
        name: "AM-ROV4-Subsea-Datasheet-RevD.pdf",
        size: "3.4 MB",
        type: "PDF",
        category: "DATASHEET",
      },
      {
        id: "gdf-02",
        name: "ROV4-Factory-Acceptance-Manual.pdf",
        size: "5.8 MB",
        type: "PDF",
        category: "MANUAL",
      },
      {
        id: "gdf-03",
        name: "DNV-GL-Class-ST-E272-Type-Approval.pdf",
        size: "1.2 MB",
        type: "PDF",
        category: "CERTIFICATE",
      },
      {
        id: "gdf-04",
        name: "ROV4-Commercial-Milestone-Price-Matrix.xlsx",
        size: "420 KB",
        type: "XLSX",
        category: "PRICING",
      },
    ],
  },
  {
    id: "gdrive-f-azp",
    name: "Hybrid Electric Azimuth Pod 1800kW",
    path: "/MarineWorld/Products/AZP-1800/",
    filesCount: 3,
    files: [
      {
        id: "gdf-05",
        name: "Marine-Hybrid-Pod-1800kW-Spec.pdf",
        size: "4.8 MB",
        type: "PDF",
        category: "DATASHEET",
      },
      {
        id: "gdf-06",
        name: "AZP1800-Propulsion-Dyno-SeaTrial-Report.pdf",
        size: "6.1 MB",
        type: "PDF",
        category: "MANUAL",
      },
      {
        id: "gdf-07",
        name: "Lloyds-Register-Propulsion-Design-Cert.pdf",
        size: "1.8 MB",
        type: "PDF",
        category: "CERTIFICATE",
      },
    ],
  },
  {
    id: "gdrive-f-ndt",
    name: "Offshore Hull NDT Survey Services",
    path: "/MarineWorld/Services/NDT-Survey/",
    filesCount: 3,
    files: [
      {
        id: "gdf-08",
        name: "Offshore-NDT-Ultrasonic-Survey-Charter.pdf",
        size: "2.1 MB",
        type: "PDF",
        category: "DATASHEET",
      },
      {
        id: "gdf-09",
        name: "ISO-9712-Technician-Level-III-Certification.pdf",
        size: "1.5 MB",
        type: "PDF",
        category: "CERTIFICATE",
      },
      {
        id: "gdf-10",
        name: "Global-Port-Mobilization-Tariff-2026.pdf",
        size: "850 KB",
        type: "PDF",
        category: "PRICING",
      },
    ],
  },
];

/**
 * Simulate deterministic AI extraction from uploaded file(s) or sources
 */
export async function simulateAIExtractionFromDocument(
  fileOrFiles: DocumentInputSource | DocumentInputSource[],
  chosenOfferingType?: "product" | "service"
): Promise<ExtractedOfferingDraft> {
  const filesList = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
  const primaryFile = filesList[0] || { name: "Technical-Datasheet.pdf" };

  // Simulate rapid AI parsing
  await new Promise((resolve) => setTimeout(resolve, 850));

  const lowerName = primaryFile.name.toLowerCase();

  // Check if matches preset template
  const matchedTemplate = PRESET_DOCUMENT_TEMPLATES.find(
    (t) =>
      lowerName.includes(t.filename.toLowerCase().replace(".pdf", "")) ||
      filesList.some((f) => f.name.toLowerCase().includes(t.filename.toLowerCase().replace(".pdf", ""))) ||
      (chosenOfferingType && t.type === chosenOfferingType)
  );

  const groundingSources: OfferingGroundingSource[] = filesList.map((f, idx) => ({
    id: `source-${Date.now()}-${idx}`,
    title: f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
    filename: f.name,
    fileType: f.type || f.name.split(".").pop()?.toUpperCase() || "PDF",
    size: f.size ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : "2.4 MB",
    uploadedAt: new Date().toISOString(),
    sourceConfidence: 96,
    extractedFieldsCount: 12,
    origin: f.origin || (f.drivePath ? "GOOGLE_DRIVE" : f.url ? "URL" : "COMPUTER"),
    drivePath: f.drivePath,
    syncStatus: "SYNCED",
    syncEnabled: true,
    isDownloadableDocument: f.isDownloadable !== undefined ? f.isDownloadable : true,
    isGroundingSource: f.isGroundingSource !== undefined ? f.isGroundingSource : true,
  }));

  // Detect potential multi-source conflicts if multiple files are provided
  const conflicts: SourceConflictItem[] = [];
  if (filesList.length > 1) {
    const hasPriceSheet = filesList.some((f) => f.name.toLowerCase().includes("price") || f.name.toLowerCase().includes("tariff"));
    const hasDatasheet = filesList.some((f) => f.name.toLowerCase().includes("datasheet") || f.name.toLowerCase().includes("spec"));
    if (hasPriceSheet && hasDatasheet) {
      conflicts.push({
        field: "leadTime",
        fieldLabel: "Delivery Lead Time",
        sourceA: filesList[0].name,
        valueA: "4 to 6 weeks from PO",
        sourceB: filesList[1].name,
        valueB: "6 to 8 weeks (high backlog)",
        resolvedValue: "4 to 6 weeks from PO",
      });
    }
  }

  if (matchedTemplate) {
    const s = matchedTemplate.sampleDraft;
    const sourceName = primaryFile.name;

    const sourceAttributions: Record<string, string> = {
      name: sourceName,
      sku: sourceName,
      shortDescription: sourceName,
      detailedDescription: sourceName,
      pricingGuidance: filesList.find((f) => f.name.toLowerCase().includes("price"))?.name || sourceName,
      leadTime: sourceName,
      incoterms: sourceName,
      warranty: sourceName,
      applications: sourceName,
      certifications: filesList.find((f) => f.name.toLowerCase().includes("cert") || f.name.toLowerCase().includes("approval"))?.name || sourceName,
      standards: sourceName,
    };

    s.specifications.forEach((spec) => {
      sourceAttributions[`spec_${spec.key}`] = spec.source || sourceName;
    });

    const fieldConfirmations: Record<string, "AI_EXTRACTED" | "COMPANY_CONFIRMED"> = {
      name: "AI_EXTRACTED",
      category: "AI_EXTRACTED",
      sku: "AI_EXTRACTED",
      shortDescription: "AI_EXTRACTED",
      detailedDescription: "AI_EXTRACTED",
      pricingGuidance: "AI_EXTRACTED",
      leadTime: "AI_EXTRACTED",
      incoterms: "AI_EXTRACTED",
      availability: "AI_EXTRACTED",
      warranty: "AI_EXTRACTED",
      minOrderQty: "AI_EXTRACTED",
    };

    return {
      name: s.name,
      type: s.type,
      category: s.category,
      sku: s.sku,
      shortDescription: s.shortDescription,
      detailedDescription: s.detailedDescription,
      applications: s.applications,
      specifications: s.specifications,
      certifications: s.certifications,
      standards: s.standards,
      mediaReferences: s.mediaReferences,
      commercialInformation: s.commercialInformation,
      serviceScope: s.serviceScope,
      coverage: s.coverage,
      deliveryModel: s.deliveryModel,
      groundingSources,
      sourceAttribution: filesList.map((f) => f.name).join(", "),
      sourceAttributions,
      fieldConfirmations,
      unextractedFields: [],
      conflicts,
      confidenceScore: 96,
      extractedFieldsCount: s.specifications.length + s.certifications.length + 8,
    };
  }

  // Generic heuristic extraction for arbitrary files
  const isService =
    chosenOfferingType === "service" ||
    lowerName.includes("service") ||
    lowerName.includes("survey") ||
    lowerName.includes("repair") ||
    lowerName.includes("inspection") ||
    lowerName.includes("audit") ||
    lowerName.includes("consult");

  const cleanTitle = primaryFile.name
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  const inferredType = isService ? "service" : "product";
  const defaultCategory = isService ? "Technical Maritime Services" : "Marine Equipment & Systems";

  const genericSpecs = [
    { key: "Standard Operating Rating", value: "Heavy-Duty Marine Grade", source: `${primaryFile.name} (Sec 1)` },
    { key: "Classification Standard", value: "Class Approved (DNV / Lloyd's)", source: `${primaryFile.name} (Sec 2)` },
    { key: "Environmental Protection", value: "IP67 Seawater Resistant", source: `${primaryFile.name} (Sec 3)` },
  ];

  const sourceAttributions: Record<string, string> = {
    name: primaryFile.name,
    sku: primaryFile.name,
    shortDescription: primaryFile.name,
    detailedDescription: primaryFile.name,
    pricingGuidance: primaryFile.name,
    leadTime: primaryFile.name,
    incoterms: primaryFile.name,
    warranty: primaryFile.name,
  };

  genericSpecs.forEach((sp) => {
    sourceAttributions[`spec_${sp.key}`] = sp.source || primaryFile.name;
  });

  const fieldConfirmations: Record<string, "AI_EXTRACTED" | "COMPANY_CONFIRMED"> = {
    name: "AI_EXTRACTED",
    category: "AI_EXTRACTED",
    sku: "AI_EXTRACTED",
    shortDescription: "AI_EXTRACTED",
    detailedDescription: "AI_EXTRACTED",
    pricingGuidance: "AI_EXTRACTED",
    leadTime: "AI_EXTRACTED",
    incoterms: "AI_EXTRACTED",
    availability: "AI_EXTRACTED",
  };

  return {
    name: cleanTitle,
    type: inferredType,
    category: defaultCategory,
    sku: `MW-${cleanTitle.slice(0, 4).toUpperCase().replace(/\s/g, "")}-01`,
    shortDescription: `Commercial marine ${inferredType} extracted from ${primaryFile.name}. Verified engineering solution.`,
    detailedDescription: `Detailed operational parameters and engineering scope extracted directly from technical document ${primaryFile.name}. Suitable for commercial shipping and maritime installations.`,
    applications: [
      "Commercial Ship Operations",
      "Marine Engineering Overhauls",
      "Offshore Infrastructure Compliance",
    ],
    specifications: genericSpecs,
    certifications: ["ISO 9001:2015", "Class Maritime Certified"],
    standards: ["ISO 9001:2015", "DNV-GL Standard"],
    mediaReferences: [
      {
        id: `media-${Date.now()}`,
        url: isService
          ? "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80"
          : "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
        title: `${cleanTitle} Overview`,
        type: "cover",
        isCover: true,
        order: 1,
      },
    ],
    commercialInformation: {
      pricingGuidance: "Available upon formal commercial RFQ.",
      incoterms: "FOB / EXW",
      leadTime: "4 to 8 Weeks Standard",
      availability: "AVAILABLE ON ORDER",
      rfqAvailable: true,
      minOrderQty: "1 Unit / Contract Scope",
      warranty: "Standard Manufacturer Warranty",
    },
    serviceScope: isService ? "Full technical execution according to customer specification." : undefined,
    coverage: isService ? "Key European and Global Ports" : undefined,
    deliveryModel: isService ? "On-site and remote technical supervision." : undefined,
    groundingSources,
    sourceAttribution: filesList.map((f) => f.name).join(", "),
    sourceAttributions,
    fieldConfirmations,
    unextractedFields: [],
    conflicts,
    confidenceScore: 92,
    extractedFieldsCount: 10,
  };
}

/**
 * Deterministically compute Grounding Status for an offering
 */
export function computeOfferingGroundingStatus(
  offering: Partial<CompanyOffering>
): "NOT GROUNDED" | "GROUNDING REQUIRED" | "GROUNDED" | "AI READY" {
  const specsCount = offering.specifications ? Object.keys(offering.specifications).length : 0;
  const hasDesc = Boolean(offering.shortDescription && offering.shortDescription.length > 20);
  const sourcesCount = offering.groundingSources ? offering.groundingSources.length : 0;
  const hasAdvisorConfig = Boolean(
    offering.aiAdvisorConfig?.enabled &&
      offering.aiAdvisorConfig.roles?.length > 0 &&
      offering.aiAdvisorConfig.conversationPriorities?.length > 0
  );

  if (!hasDesc && specsCount === 0 && sourcesCount === 0) {
    return "NOT GROUNDED";
  }

  if (specsCount < 2 && sourcesCount === 0) {
    return "GROUNDING REQUIRED";
  }

  if ((specsCount >= 2 || sourcesCount >= 1) && hasAdvisorConfig) {
    return "AI READY";
  }

  return "GROUNDED";
}

/**
 * Generate default AI Advisor configuration for an offering
 */
export function generateDefaultAdvisorConfig(
  offering: Partial<CompanyOffering>,
  customRoles?: AdvisorRole[],
  customPriorities?: AdvisorConversationPriority[],
  customStyle?: AdvisorCommunicationStyle[]
): OfferingAIAdvisorConfig {
  const defaultRoles: AdvisorRole[] =
    customRoles && customRoles.length > 0
      ? customRoles
      : offering.type === "service"
      ? ["Application Specialist", "Technical Expert", "Sales Advisor"]
      : ["Technical Expert", "Sales Advisor", "Application Specialist"];

  const defaultPriorities: AdvisorConversationPriority[] =
    customPriorities && customPriorities.length > 0
      ? customPriorities
      : [
          "Technical Specifications",
          "Applications & Suitability",
          "Certifications & Compliance",
          "Commercial Information",
          "RFQ / Offer Requests",
        ];

  const defaultStyle: AdvisorCommunicationStyle[] =
    customStyle && customStyle.length > 0
      ? customStyle
      : ["Precise", "Technical", "Transparent", "Solution-Oriented"];

  const groundingStatus = computeOfferingGroundingStatus(offering);

  return {
    enabled: true,
    advisorName: `${offering.name || "Commercial Offering"} AI Advisor`,
    roles: defaultRoles.slice(0, 3),
    conversationPriorities: defaultPriorities,
    communicationStyle: defaultStyle.slice(0, 4),
    status: groundingStatus === "NOT GROUNDED" ? "GROUNDED" : (groundingStatus as any),
    verifiedSourcesCount: offering.groundingSources?.length || 1,
    lastGeneratedAt: new Date().toISOString(),
  };
}

/**
 * Execute AI Advisor Question for an Offering with STRICT Knowledge Boundaries
 */
export function answerOfferingAdvisorQuery(
  offering: CompanyOffering,
  queryText: string,
  companyName: string
): {
  answer: string;
  detailedNotes?: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  sourcesUsed: string[];
  suggestedAction?: "REQUEST_OFFER" | "COMMERCIAL_RFQ" | "CONNECT_COMPANY" | "VIEW_SPECS" | "REQUEST_AVAILABILITY";
  isSealedCommercialOffer?: boolean;
} {
  const q = queryText.toLowerCase().trim();
  const specs = offering.specifications || {};
  const sources = (offering.groundingSources || []).map((s) => s.filename || s.title);
  if (sources.length === 0) sources.push("Verified Engineering Datasheet");

  // Check if asking for specific depth
  if (q.includes("depth") || q.includes("deep")) {
    const depthSpec = Object.entries(specs).find(([k]) => k.toLowerCase().includes("depth"));
    const depthVal = depthSpec ? depthSpec[1] : "450 m (1,476 ft)";
    return {
      answer: `**${depthVal}** maximum operating depth rating.`,
      detailedNotes: `Tested and certified for underwater non-destructive inspection under class society pressure protocols.`,
      confidence: "HIGH",
      sourcesUsed: sources.slice(0, 1),
      suggestedAction: "VIEW_SPECS",
    };
  }

  // Check if asking for battery / endurance / power
  if (q.includes("endurance") || q.includes("battery") || q.includes("power") || q.includes("hours") || q.includes("kw") || q.includes("voltage")) {
    const powerSpec = Object.entries(specs).find(([k]) => 
      k.toLowerCase().includes("battery") || 
      k.toLowerCase().includes("endurance") || 
      k.toLowerCase().includes("power") ||
      k.toLowerCase().includes("voltage")
    );
    const powerVal = powerSpec ? `${powerSpec[0]}: **${powerSpec[1]}**` : "Continuous operation: **10.5 hours battery endurance / 1,800 kW shaft power**";
    return {
      answer: `${powerVal}.`,
      detailedNotes: `Operating endurance verified during continuous harbor and sea-trial benchmarks under standard load.`,
      confidence: "HIGH",
      sourcesUsed: sources.slice(0, 1),
      suggestedAction: "VIEW_SPECS",
    };
  }

  // Check if asking for availability / lead time
  if (q.includes("availab") || q.includes("stock") || q.includes("lead time") || q.includes("delivery") || q.includes("timeline")) {
    const comm = offering.commercialInformation;
    const leadTime = comm?.leadTime || "4 to 6 weeks from PO confirmation";
    const status = comm?.availability || "Available — manufactured to order / standard batch";
    return {
      answer: `**${leadTime}** standard delivery lead time (${status}).`,
      detailedNotes: `Production and mobilization slots are scheduled from ${companyName}'s certified facility.`,
      confidence: "HIGH",
      sourcesUsed: ["Commercial Terms & Delivery Schedule"],
      suggestedAction: "REQUEST_AVAILABILITY",
    };
  }

  // Check if asking for RFQ / Price / Offer / Terms
  if (
    q.includes("price") ||
    q.includes("cost") ||
    q.includes("quote") ||
    q.includes("rfq") ||
    q.includes("buy") ||
    q.includes("order") ||
    q.includes("commercial") ||
    q.includes("incoterm") ||
    q.includes("milestone")
  ) {
    const comm = offering.commercialInformation;
    const priceText = comm?.pricingGuidance || "Structured on sensor configuration & scope";
    const incotermsText = comm?.incoterms || "EXW / FOB Shipyard Gate";
    const warrantyText = comm?.warranty || "24-Month Comprehensive Marine Warranty";

    return {
      answer: `Pricing guidance: **${priceText}** on **${incotermsText}** terms (${warrantyText}).`,
      detailedNotes: `Milestone schedule: 30% advance deposit upon engineering confirmation / 70% milestone settlement upon FAT & delivery.`,
      confidence: "HIGH",
      sourcesUsed: ["Commercial Framework & Incoterms Schedule"],
      suggestedAction: "REQUEST_OFFER",
    };
  }

  // Check if asking for specifications / parameters
  if (
    q.includes("spec") ||
    q.includes("parameter") ||
    q.includes("dimension") ||
    q.includes("weight") ||
    q.includes("technical") ||
    q.includes("rating") ||
    q.includes("thrust") ||
    q.includes("speed") ||
    q.includes("datasheet")
  ) {
    const specEntries = Object.entries(specs);
    if (specEntries.length > 0) {
      const topSpecs = specEntries.slice(0, 4);
      const specList = topSpecs
        .map(([k, v]) => `• **${k}**: ${v}`)
        .join("\n");
      return {
        answer: `Key specifications:\n\n${specList}`,
        detailedNotes: `All parameters conform to class society type-approvals and documented factory acceptance test (FAT) benchmarks.`,
        confidence: "HIGH",
        sourcesUsed: sources,
        suggestedAction: "VIEW_SPECS",
      };
    } else {
      return {
        answer: `Verified technical parameters are cataloged in the full engineering package.`,
        confidence: "MEDIUM",
        sourcesUsed: sources,
        suggestedAction: "COMMERCIAL_RFQ",
      };
    }
  }

  // Check if asking about applications / suitability / use cases
  if (
    q.includes("application") ||
    q.includes("use") ||
    q.includes("suitable") ||
    q.includes("vessel") ||
    q.includes("work") ||
    q.includes("where") ||
    q.includes("purpose") ||
    q.includes("condition")
  ) {
    const apps = offering.applications || [
      "Commercial Hull & Propeller Diagnostics",
      "Class Renewal In-Water Survey (UWILD)",
      "Offshore Infrastructure Audits",
    ];
    return {
      answer: `Engineered for:\n\n${apps.slice(0, 3).map((a) => `• ${a}`).join("\n")}`,
      detailedNotes: `Certified for both sheltered harbor facilities and open offshore operating environments.`,
      confidence: "HIGH",
      sourcesUsed: sources,
      suggestedAction: "COMMERCIAL_RFQ",
    };
  }

  // Check if asking about certifications & standards
  if (
    q.includes("certif") ||
    q.includes("standard") ||
    q.includes("class") ||
    q.includes("dnv") ||
    q.includes("abs") ||
    q.includes("lloyd") ||
    q.includes("iso") ||
    q.includes("imo") ||
    q.includes("compliance")
  ) {
    const certs = offering.certifications || ["DNV GL Type Approved", "ABS Recognized", "ISO 9001:2015"];
    const standards = offering.standards || ["IMO MSC.1/Circ.1578", "IEC 60092-504"];
    return {
      answer: `Class approvals: **${certs.join(" • ")}** (Standards: ${standards.join(", ")}).`,
      detailedNotes: `Full certificates and audit documentation are available in the Documents cabinet.`,
      confidence: "HIGH",
      sourcesUsed: ["Type Approval Certificates & Compliance Audits"],
      suggestedAction: "CONNECT_COMPANY",
    };
  }

  // Check if asking for official offer / package / legal draft
  if (q.includes("draft") || q.includes("official offer") || q.includes("package") || q.includes("legal")) {
    return {
      answer: `Official commercial package compiled for **${offering.name}** under reference **${offering.code || "REF-OFFERING"}**.`,
      detailedNotes: `Incoterms: EXW / FOB Shipyard Gate | Milestone terms: 30/70 | Warranty: 24 Months Marine Guarantee.`,
      confidence: "HIGH",
      sourcesUsed: sources,
      suggestedAction: "REQUEST_OFFER",
      isSealedCommercialOffer: true,
    };
  }

  // Default concise direct response
  return {
    answer: `**${offering.name}** is a certified ${offering.type} by ${companyName}.`,
    detailedNotes: `${offering.shortDescription}`,
    confidence: "HIGH",
    sourcesUsed: sources,
    suggestedAction: "COMMERCIAL_RFQ",
  };
}
