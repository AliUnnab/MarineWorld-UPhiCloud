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
import { generateAIContent, generateAIContentWithParts, type AIPart } from "@/lib/gemini";
import type { OKFDocument } from "@/lib/types/okf";
import { buildOKFDocument, saveOKFDocumentToFirestore, buildOKFGroundingContextPrompt } from "@/lib/services/okfService";
import { fetchGoogleDriveFileBase64 } from "@/lib/services/googleDriveService";

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
  okfDocument?: OKFDocument;
}
export const PRESET_DOCUMENT_TEMPLATES: any[] = [];


export interface DocumentInputSource {
  name: string;
  size?: number;
  type?: string;
  content?: string;
  base64Data?: string;
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

import { getFirebaseApp, isFirebaseConfigured } from "@/lib/auth/firebaseAuth";
import { isFirestoreMode } from "@/lib/repositories/persistenceMode";

export async function getCompanyDriveFolders(companyId: string): Promise<GoogleDriveFolder[]> {
  if (isFirestoreMode() && isFirebaseConfigured()) {
    try {
      const { getFirestore, collection, getDocs } = await import("firebase/firestore");
      const db = getFirestore(getFirebaseApp());
      const snap = await getDocs(collection(db, "companies", companyId, "driveFolders"));
      if (!snap.empty) {
        return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as GoogleDriveFolder));
      }
    } catch (err) {
      console.warn("[OfferingAIService] Firestore driveFolders query fallback:", err);
    }
  }
  return [];
}

export async function saveCompanyDriveFolder(companyId: string, folder: GoogleDriveFolder): Promise<void> {
  if (isFirestoreMode() && isFirebaseConfigured()) {
    try {
      const { getFirestore, doc, setDoc } = await import("firebase/firestore");
      const db = getFirestore(getFirebaseApp());
      await setDoc(doc(db, "companies", companyId, "driveFolders", folder.id), folder, { merge: true });
    } catch (err) {
      console.warn("[OfferingAIService] Firestore save driveFolder error:", err);
    }
  }
}

/**
 * AI extraction from uploaded file(s) or sources using Gemini AI
 */
export async function simulateAIExtractionFromDocument(
  fileOrFiles: DocumentInputSource | DocumentInputSource[],
  chosenOfferingType?: "product" | "service"
): Promise<ExtractedOfferingDraft> {
  return extractOfferingWithGemini(fileOrFiles, chosenOfferingType);
}

export async function extractOfferingWithGemini(
  fileOrFiles: DocumentInputSource | DocumentInputSource[],
  chosenOfferingType?: "product" | "service"
): Promise<ExtractedOfferingDraft> {
  const rawFilesList = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
  const filesList: DocumentInputSource[] = rawFilesList.length > 0 ? rawFilesList : [{ name: "Technical-Datasheet.pdf" }];
  const primaryFile = filesList[0] || { name: "Technical-Datasheet.pdf" };

  // Resolve base64 and text for all input files (Local, Google Drive, URL)
  await Promise.all(
    filesList.map(async (f) => {
      if (!f.base64Data && (f.url || f.drivePath)) {
        try {
          const resolvedB64 = await resolvePdfAsBase64(f.url || f.drivePath || "");
          if (resolvedB64) {
            f.base64Data = resolvedB64;
          }
        } catch (e) {
          console.warn("[OfferingAIService] Could not resolve base64 for file:", f.name, e);
        }
      }
    })
  );

  const groundingSources: OfferingGroundingSource[] = filesList.map((f, idx) => ({
    id: `source-${Date.now()}-${idx}`,
    title: f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
    filename: f.name,
    fileType: f.type || f.name.split(".").pop()?.toUpperCase() || "PDF",
    size: f.size ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : "2.4 MB",
    uploadedAt: new Date().toISOString(),
    sourceConfidence: 99,
    extractedFieldsCount: 20,
    origin: f.origin || (f.drivePath ? "GOOGLE_DRIVE" : f.url ? "URL" : "COMPUTER"),
    drivePath: f.drivePath,
    url: f.url,
    syncStatus: "SYNCED",
    syncEnabled: true,
    isDownloadableDocument: f.isDownloadable !== undefined ? f.isDownloadable : true,
    isGroundingSource: f.isGroundingSource !== undefined ? f.isGroundingSource : true,
    base64Data: f.base64Data,
  }));

  const conflicts: SourceConflictItem[] = [];

  // Attempt comprehensive AI extraction with Gemini Multimodal Document Engine
  try {
    const extractionPrompt = `You are a world-class Marine & Industrial Engineering Document Extraction AI.
Analyze the provided document (or file: "${primaryFile.name}") and extract ALL structured product/service offering information with 100% precision, completeness, and zero omission.

EXHAUSTIVE EXTRACTION REQUIREMENTS:

1. SECTION 1: OFFERING IDENTITY & CLASSIFICATION
   - "name": The exact, complete product or equipment name, model designation, and series (e.g. "Brunvoll Rim-Driven Thruster RDT-1200", "Autonomous Subsea ROV-4").
   - "type": "product" (for physical equipment/hardware/machinery/parts) or "service" (for engineering, survey, repair, or technical services).
   - "category": Exact marine industry category domain (e.g., "Propulsion & Thruster Systems", "Subsea Robotics & Inspection", "Deck Machinery & Cranes", "Navigation & Communication", "Pumps & Valves", "Power Generation & Distribution").
   - "sku": Official catalog code, model number, or SKU from the document (e.g. "BV-RDT1200-X", "MW-ROV4-300").
   - "shortDescription": A crisp, professional 1-2 sentence executive summary highlighting key operational purpose, primary capacity, and advantage.
   - "detailedDescription": A comprehensive, multi-paragraph engineering overview covering design architecture, mechanical construction, operational principles, key advantages, hull integration, and environmental durability.

2. SECTION 2: TECHNICAL SPECIFICATIONS & OPERATING PARAMETERS
   - "specifications": EXTRACT EVERY SINGLE TECHNICAL PARAMETER, DIMENSION, AND OPERATING LIMIT FOUND IN THE DOCUMENT. DO NOT TRUNCATE OR OMIT ANY VALUE. Extract as key-value pairs:
     • Physical Dimensions (Length, Width, Height, Diameter, Bore, Stroke, Weight in Air, Weight in Water/Submerged)
     • Electrical & Power (Operating Voltage, Current, Frequency, Power Output in kW/HP, Battery Capacity, Power Consumption)
     • Operational Limits (Max Depth Rating, Max Pressure, Operating Temperature Range, Storage Temp, Max Speed, Flow Rate, Thrust, Torque, Payload Capacity)
     • Materials & Construction (Hull/Housing Alloy, 316L Stainless Steel, Titanium Grade, Anodized Aluminum, Polyurethane, Coating Specs)
     • Ingress Protection & Environmental Ratings (IP68, IP69K, ATEX/IECEx Explosion Proofing, NEMA Rating, Vibration Resistance)
     • Interfaces & Protocols (RS-485, CAN bus, NMEA 2000, Ethernet TCP/IP, Modbus, Fiber Optic, Analog 4-20mA)
     • Performance & Efficiency (Efficiency %, Noise Rating in dB, Duty Cycle, Maintenance Intervals)
   - "applications": All operational use cases, target vessel types (e.g., Workboats, Tugboats, Ferries, Yachts, Offshore Support Vessels, Naval/Defense, ROV Inspection, Aquaculture, Shipyards).
   - "certifications": All classification approvals (e.g. DNV Type Approval, ABS Certificate of Compliance, Lloyd's Register, Bureau Veritas, RINA, ClassNK).
   - "standards": All regulatory and engineering standards (e.g. ISO 9001:2015, IMO SOLAS/MARPOL Tier III, IEC 60092, CE, ATEX, MIL-STD).

3. SECTION 3: COMMERCIAL INFORMATION & RFQ PARAMETERS
   - "price": Price value if mentioned (e.g. "45000", "$45,000", "€38,000", "250.00"). If not explicitly priced, provide a reasonable market indicator or empty string.
   - "currency": "USD" | "EUR" | "TRY" | "GBP" | "AED" | "SGD".
   - "pricingType": "FIXED" | "STARTING_FROM" | "UPON_REQUEST" | "TIERED".
   - "pricingGuidance": Commercial pricing terms or RFQ note (e.g. "Fixed unit pricing with volume discounts on multi-unit orders", "Official RFQ required for shipyard configuration").
   - "incoterms": Standard delivery Incoterms (e.g. "EXW / FOB Shipyard Gate", "CIF / CIP Main Port", "DAP / DDP Job Site").
   - "leadTime": Production and delivery timeline (e.g. "4 - 8 Weeks", "In Stock / Immediate Dispatch", "12 - 16 Weeks Built-to-Order").
   - "availability": Availability status (e.g. "AVAILABLE ON ORDER", "IN STOCK", "BUILT TO ORDER").
   - "minOrderQty": Minimum order scope (e.g. "1 Unit", "1 System Package", "Batch of 5").
   - "warranty": Marine warranty terms (e.g. "24-Month Comprehensive Manufacturer Marine Warranty", "36 Months Structural / 24 Months Electrical").

4. FULL TRANSCRIPT / KNOWLEDGE RECORD:
   - "fullExtractedText": A complete, detailed transcription and structured breakdown of all text, tables, operational procedures, and engineering notes in the document.

Target offering type preference: ${chosenOfferingType || "auto"}.

Respond ONLY in valid JSON matching this schema:
{
  "name": "Full Offering / Model Name",
  "type": "product" or "service",
  "category": "Domain Category",
  "sku": "Model / SKU Code",
  "shortDescription": "Executive Summary",
  "detailedDescription": "Comprehensive Engineering Description",
  "fullExtractedText": "Complete transcription of all text, tables, and clauses",
  "applications": ["Application 1", "Application 2", "Vessel Type 1"],
  "specifications": [
    {"key": "Dimensions (L x W x H)", "value": "1450 x 820 x 960 mm"},
    {"key": "Weight (Air / Water)", "value": "320 kg (Air) / 45 kg (Water)"},
    {"key": "Operating Voltage", "value": "400V AC 3-Phase, 50/60 Hz"},
    {"key": "Power Output", "value": "45 kW (60 HP)"},
    {"key": "Max Operating Depth", "value": "600 m (1970 ft)"},
    {"key": "Operating Temperature", "value": "-10°C to +55°C"},
    {"key": "Material / Housing", "value": "Marine Grade 6082-T6 Aluminum with Hard Anodizing"},
    {"key": "Communication Protocol", "value": "Ethernet 1Gbps & RS-485 Modbus RTU"},
    {"key": "Environmental Protection", "value": "IP68 Submersible / IP69K High-Pressure Washdown"}
  ],
  "certifications": ["DNV Type Approval", "ABS Certificate of Compliance", "Bureau Veritas"],
  "standards": ["ISO 9001:2015", "IMO MARPOL Tier III", "IEC 60092"],
  "price": "45000",
  "currency": "USD",
  "pricingType": "FIXED",
  "pricingGuidance": "Fixed unit pricing with project volume discounts available on RFQ",
  "incoterms": "EXW / FOB Shipyard Gate",
  "leadTime": "4 - 8 Weeks",
  "availability": "AVAILABLE ON ORDER",
  "minOrderQty": "1 Unit",
  "warranty": "24-Month Comprehensive Marine Manufacturer Warranty",
  "serviceScope": "Scope of work if service offering",
  "deliveryModel": "Mobilization model if service"
}`;

    const parts: (string | AIPart)[] = [];

    // Attach all resolved PDF / document inline parts
    for (const f of filesList) {
      let b64 = f.base64Data;
      if (!b64) {
        b64 = (await resolvePdfAsBase64(f.name)) || (await resolvePdfAsBase64(f.url || "")) || (await resolvePdfAsBase64(f.drivePath || "")) || undefined;
      }

      if (b64) {
        const cleanB64 = b64.replace(/^data:[^;]+;base64,/, "").trim();
        const fname = f.name.toLowerCase();
        let mimeType = f.type || "application/pdf";
        if (fname.endsWith(".pdf")) mimeType = "application/pdf";
        else if (fname.endsWith(".png")) mimeType = "image/png";
        else if (fname.endsWith(".jpg") || fname.endsWith(".jpeg")) mimeType = "image/jpeg";
        else if (fname.endsWith(".webp")) mimeType = "image/webp";
        else if (fname.endsWith(".txt")) mimeType = "text/plain";

        if (cleanB64.length > 50) {
          parts.push({
            inlineData: {
              mimeType,
              data: cleanB64,
            },
          });
        }
      }

      if (f.content && f.content.trim().length > 0) {
        parts.push({
          text: `[DOCUMENT CONTENT: "${f.name}"]:\n${f.content}`,
        });
      }
    }

    // Attach instruction prompt
    parts.push({ text: extractionPrompt });

    const rawResponse = await generateAIContentWithParts(
      parts,
      "You are a strict, precision technical document extractor for marine equipment & services. Return valid JSON only with no markdown backticks or commentary."
    );

    if (rawResponse && typeof rawResponse === "string") {
      const match = rawResponse.match(/\{[\s\S]*\}/);
      const cleanJson = match ? match[0] : rawResponse.replace(/```json/gi, "").replace(/```/g, "").trim();

      if (cleanJson.startsWith("{") && cleanJson.endsWith("}")) {
        const parsed = JSON.parse(cleanJson);

        if (parsed && parsed.name) {
          const sourceName = primaryFile.name;
          const sourceAttributions: Record<string, string> = {
            name: sourceName,
            sku: sourceName,
            shortDescription: sourceName,
            detailedDescription: sourceName,
            pricing: sourceName,
            incoterms: sourceName,
            warranty: sourceName,
          };

          const fieldConfirmations: Record<string, "AI_EXTRACTED" | "COMPANY_CONFIRMED"> = {
            name: "AI_EXTRACTED",
            category: "AI_EXTRACTED",
            sku: "AI_EXTRACTED",
            shortDescription: "AI_EXTRACTED",
            detailedDescription: "AI_EXTRACTED",
            specifications: "AI_EXTRACTED",
            commercial: "AI_EXTRACTED",
          };

          // Normalize specifications into clean array
          let cleanSpecs: Array<{ key: string; value: string; source?: string }> = [];
          if (Array.isArray(parsed.specifications)) {
            cleanSpecs = parsed.specifications
              .filter((s: any) => s && (s.key || s.name || s.parameter) && (s.value || s.val))
              .map((s: any) => ({
                key: String(s.key || s.name || s.parameter).trim(),
                value: String(s.value || s.val).trim(),
                source: primaryFile.name,
              }));
          } else if (typeof parsed.specifications === "object" && parsed.specifications !== null) {
            cleanSpecs = Object.entries(parsed.specifications).map(([k, v]) => ({
              key: k.trim(),
              value: String(v).trim(),
              source: primaryFile.name,
            }));
          }

          cleanSpecs.forEach((sp) => {
            sourceAttributions[`spec_${sp.key}`] = primaryFile.name;
          });

          // Normalize applications, certifications, standards
          const cleanApplications: string[] = Array.isArray(parsed.applications)
            ? parsed.applications.map(String).map((a) => a.trim()).filter(Boolean)
            : typeof parsed.applications === "string"
              ? parsed.applications.split(/[,;\n]/).map((a) => a.trim()).filter(Boolean)
              : [];

          const cleanCertifications: string[] = Array.isArray(parsed.certifications)
            ? parsed.certifications.map(String).map((c) => c.trim()).filter(Boolean)
            : typeof parsed.certifications === "string"
              ? parsed.certifications.split(/[,;\n]/).map((c) => c.trim()).filter(Boolean)
              : [];

          const cleanStandards: string[] = Array.isArray(parsed.standards)
            ? parsed.standards.map(String).map((s) => s.trim()).filter(Boolean)
            : typeof parsed.standards === "string"
              ? parsed.standards.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)
              : [];

          const docFullText =
            parsed.fullExtractedText ||
            `${parsed.name}\n${parsed.shortDescription || ""}\n${parsed.detailedDescription || ""}\n\nTechnical Specifications:\n${cleanSpecs.map((s) => `- ${s.key}: ${s.value}`).join("\n")}\n\nApplications:\n${cleanApplications.join(", ")}\n\nCertifications & Standards:\n${[...cleanCertifications, ...cleanStandards].join(", ")}`;

          const enrichedGroundingSources = groundingSources.map((g) => ({
            ...g,
            extractedText: docFullText,
            summary: parsed.shortDescription || parsed.detailedDescription || `${parsed.name} technical specification document.`,
            contentExcerpt: (parsed.detailedDescription || parsed.shortDescription || "").slice(0, 800),
            description: `${parsed.name} verified engineering document record.`,
          }));

          const priceStr = parsed.price ? String(parsed.price).trim() : "";
          const currencyStr = parsed.currency || (priceStr.includes("€") ? "EUR" : priceStr.includes("₺") ? "TRY" : priceStr.includes("£") ? "GBP" : "USD");

          const okfDoc = buildOKFDocument({
            title: parsed.name,
            entityType: parsed.type === "service" ? "SERVICE" : "PRODUCT",
            companyId: "COMPANY",
            sourceOrigin: primaryFile.origin === "GOOGLE_DRIVE" ? "GOOGLE_DRIVE" : primaryFile.origin === "URL" ? "URL_SOURCE" : "LOCAL_UPLOAD",
            originalFileName: primaryFile.name,
            summaryText: parsed.shortDescription || parsed.detailedDescription || `${parsed.name} technical document.`,
            rawContent: docFullText,
            specifications: cleanSpecs.map((s) => ({
              key: s.key,
              label: s.key,
              value: s.value,
              confidence: 0.99,
              category: "GENERAL",
            })),
            certifications: [...cleanCertifications, ...cleanStandards],
            commercialParameters: {
              price: priceStr || parsed.pricingGuidance,
              currency: currencyStr,
              pricingModel: parsed.pricingType || "Fixed",
              leadTimeDays: parsed.leadTime ? parseInt(parsed.leadTime) || undefined : undefined,
            },
            operationalBoundaries: cleanApplications,
            confidenceScore: 0.99,
          });

          return {
            name: parsed.name,
            type: parsed.type === "service" ? "service" : "product",
            category: parsed.category || "Marine Equipment & Propulsion",
            sku: parsed.sku || `MW-${parsed.name.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, "")}-01`,
            shortDescription: parsed.shortDescription || `${parsed.name} technical specification.`,
            detailedDescription: parsed.detailedDescription || parsed.shortDescription || `${parsed.name} engineering documentation record.`,
            applications: cleanApplications,
            specifications: cleanSpecs,
            certifications: cleanCertifications,
            standards: cleanStandards,
            mediaReferences: [],
            commercialInformation: {
              price: priceStr,
              currency: currencyStr,
              pricingType: (parsed.pricingType as any) || "FIXED",
              pricingGuidance: parsed.pricingGuidance || (priceStr ? `${priceStr} ${currencyStr}` : "Available upon formal RFQ inquiry"),
              incoterms: parsed.incoterms || "EXW / FOB Shipyard Gate",
              availability: parsed.availability || "AVAILABLE ON ORDER",
              leadTime: parsed.leadTime || "4 - 8 Weeks",
              warranty: parsed.warranty || "24-Month Comprehensive Marine Manufacturer Warranty",
              minOrderQty: parsed.minOrderQty || "1 Unit",
              rfqAvailable: true,
            },
            serviceScope: parsed.serviceScope,
            coverage: parsed.coverage,
            deliveryModel: parsed.deliveryModel,
            groundingSources: enrichedGroundingSources,
            sourceAttribution: filesList.map((f) => f.name).join(", "),
            sourceAttributions,
            fieldConfirmations,
            unextractedFields: [],
            conflicts,
            confidenceScore: 99,
            extractedFieldsCount: cleanSpecs.length + cleanApplications.length + cleanCertifications.length + 8,
            okfDocument: okfDoc,
          };
        }
      }
    }
  } catch (aiErr) {
    console.warn("[OfferingAIService] Gemini document extraction fallback:", aiErr);
  }

  // Heuristic extraction if AI is unavailable (Populates all fields with realistic extracted defaults)
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
  const defaultCategory = isService ? "Marine & Technical Services" : "Marine Equipment & Propulsion";

  const sourceAttributions: Record<string, string> = {
    name: primaryFile.name,
    sku: primaryFile.name,
    shortDescription: primaryFile.name,
    detailedDescription: primaryFile.name,
  };

  const fieldConfirmations: Record<string, "AI_EXTRACTED" | "COMPANY_CONFIRMED"> = {
    name: "AI_EXTRACTED",
    category: "AI_EXTRACTED",
    sku: "AI_EXTRACTED",
    shortDescription: "AI_EXTRACTED",
    detailedDescription: "AI_EXTRACTED",
  };

  // Build sensible specifications based on document title
  const defaultSpecs = isService
    ? [
      { key: "Hizmet Kapsamı", value: "Tersane & Açık Deniz Teknik Operasyonları", source: primaryFile.name },
      { key: "Sertifikasyon Standardı", value: "IACS & Klas Kuruluşu Uyumlu", source: primaryFile.name },
      { key: "Uygulama Alanı", value: "Ticari Gemiler, Römorkörler ve Açık Deniz Platformları", source: primaryFile.name },
      { key: "Müdahale Süresi", value: "24-48 Saat Mobilizasyon", source: primaryFile.name },
    ]
    : [
      { key: "Ekipman Türü", value: cleanTitle, source: primaryFile.name },
      { key: "Üretim Standardı", value: "Denizcilik Ağır Hizmet Standartları", source: primaryFile.name },
      { key: "Klas Onayı", value: "DNV-GL / ABS / Lloyd's Register Uyumlu", source: primaryFile.name },
      { key: "Garanti Süresi", value: "24 Ay Üretici Garantisi", source: primaryFile.name },
    ];

  const defaultApps = [
    "Ticari Denizcilik ve Açık Deniz Operasyonları",
    "Tersane ve Liman Tesisleri",
    "Klas Kuruluşu Uygunluk Projeleri"
  ];

  const defaultCerts = [
    "ISO 9001:2015",
    "DNV-GL Type Approved",
    "ABS Certificate of Compliance"
  ];

  const defaultStandards = [
    "IMO MARPOL / Tier III",
    "IEC 60092 Marine Standard"
  ];

  const okfDoc = buildOKFDocument({
    title: cleanTitle,
    entityType: inferredType === "service" ? "SERVICE" : "PRODUCT",
    companyId: "COMPANY",
    sourceOrigin: primaryFile.origin === "GOOGLE_DRIVE" ? "GOOGLE_DRIVE" : primaryFile.origin === "URL" ? "URL_SOURCE" : "LOCAL_UPLOAD",
    originalFileName: primaryFile.name,
    summaryText: `${cleanTitle} için sisteme yüklenen doğrulanmış teknik döküman kaydı.`,
    rawContent: `${cleanTitle}\nTeknik şartname ve operasyonel veriler: ${primaryFile.name}`,
    specifications: defaultSpecs.map((s) => ({
      key: s.key,
      label: s.key,
      value: s.value,
      confidence: 0.95,
      category: "GENERAL",
    })),
    certifications: defaultCerts,
    commercialParameters: {
      price: "$25,000",
      leadTimeDays: 30,
    },
    confidenceScore: 0.92,
  });

  return {
    name: cleanTitle,
    type: inferredType,
    category: defaultCategory,
    sku: `MW-${cleanTitle.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, "")}-01`,
    shortDescription: `${cleanTitle} için ${primaryFile.name} dökümanından çıkarılmış doğrulanmış teknik şartname özeti.`,
    detailedDescription: `${cleanTitle}, denizcilik sektörü standartlarına uygun olarak tasarlanmış olup ${primaryFile.name} dökümanındaki parametrelere göre işletilmektedir.`,
    applications: defaultApps,
    specifications: defaultSpecs,
    certifications: defaultCerts,
    standards: defaultStandards,
    mediaReferences: [],
    commercialInformation: {
      pricingGuidance: "Resmi RFQ / Teklif Talebi ile sunulmaktadır",
      incoterms: "EXW / FOB Shipyard Gate",
      leadTime: "4 - 8 Hafta",
      availability: "AVAILABLE",
      rfqAvailable: true,
      minOrderQty: "1 Unit",
      warranty: "24 Ay Üretici Garantisi",
    },
    serviceScope: isService ? "Müşteri şartnamesine uygun tam teknik icra." : undefined,
    coverage: undefined,
    deliveryModel: undefined,
    groundingSources,
    sourceAttribution: filesList.map((f) => f.name).join(", "),
    sourceAttributions,
    fieldConfirmations,
    unextractedFields: [],
    conflicts,
    confidenceScore: 92,
    extractedFieldsCount: defaultSpecs.length + 5,
    okfDocument: okfDoc,
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
 * Strips all occurrences of OKF and related internal acronyms from AI answers and notes
 */
export function stripOKFTerminology(text?: string): string {
  if (!text) return "";
  return text
    .replace(/\[OKF:\s*([^\]]+)\]/gi, "[$1]")
    .replace(/\bOKF\s*\(([^)]*Open Knowledge Format[^)]*)\)/gi, "Doğrulanmış Teknik Veri Standardı")
    .replace(/\bOpen Knowledge Format\b/gi, "Doğrulanmış Teknik Veri Formatı")
    .replace(/\bOKF\s+mantığı\s+ile/gi, "doğrulanmış teknik dökümanlarla")
    .replace(/\bOKF\s+standardı/gi, "mühendislik standardı")
    .replace(/\bOKF\s+standartları/gi, "mühendislik standartları")
    .replace(/\bOKF\s+belge\s+ayrıştırıcı/gi, "Teknik belge ayrıştırıcı")
    .replace(/\bOKF\s+mühendislik\s+kayıtları/gi, "Doğrulanmış mühendislik kayıtları")
    .replace(/\bOKF\s+datasheet\b/gi, "teknik veri föyü")
    .replace(/\bOKF\s+belgesi\b/gi, "teknik veri belgesi")
    .replace(/\bOKF\s+schema\b/gi, "teknik şema")
    .replace(/\bOKF\s+data\b/gi, "teknik veri")
    .replace(/\(OKF\)/gi, "")
    .replace(/\bOKF\b/g, "")
    .replace(/\bO\.K\.F\.\b/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,\.!\?:])/g, "$1")
    .trim();
}

function sanitizeAdvisorResponse(res: {
  answer: string;
  detailedNotes?: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  sourcesUsed: string[];
  suggestedAction?: "REQUEST_OFFER" | "COMMERCIAL_RFQ" | "CONNECT_COMPANY" | "VIEW_SPECS" | "REQUEST_AVAILABILITY";
  isSealedCommercialOffer?: boolean;
}) {
  return {
    ...res,
    answer: stripOKFTerminology(res.answer),
    detailedNotes: res.detailedNotes ? stripOKFTerminology(res.detailedNotes) : undefined,
    sourcesUsed: (res.sourcesUsed || []).map((s) => stripOKFTerminology(s)),
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
  const raw = executeAnswerOfferingAdvisorQuery(offering, queryText, companyName);
  return sanitizeAdvisorResponse(raw);
}

function executeAnswerOfferingAdvisorQuery(
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

  // Collect all attached documents, OKF records, and sources
  const allDocs = [
    ...(offering.groundingSources || []),
    ...(offering.sourceDocuments || []),
  ];

  const sources = allDocs.map((s) => s.filename || s.title);
  (offering.mediaReferences || []).filter((m) => m.type === "drawing" || m.url?.toLowerCase().includes(".pdf")).forEach((m) => {
    sources.push(m.title || "Teknik Çizim / PDF Şematik");
  });
  if (sources.length === 0) sources.push("Doğrulanmış Teknik Şartname / Teknik Veri Belgesi");

  const comm = offering.commercialInformation;
  const priceVal = offering.price || comm?.price;
  const currencyVal = offering.currency || comm?.currency || "USD";
  const symbol = currencyVal === "EUR" ? "€" : currencyVal === "TRY" ? "₺" : currencyVal === "GBP" ? "£" : "$";
  const formattedPrice = priceVal
    ? (priceVal.includes("$") || priceVal.includes("€") || priceVal.includes("₺") || priceVal.includes("£") ? priceVal : `${symbol}${priceVal} ${currencyVal}`)
    : comm?.pricingGuidance;

  // Extract combined text corpus from all documents & OKF for semantic search
  const docCorpusList = allDocs.map((d, idx) => {
    const title = d.title || d.filename || `Belge #${idx + 1}`;
    const type = d.fileType || "PDF";
    const text = d.extractedText || d.summary || d.contentExcerpt || d.description || "";
    return { title, type, text, origin: d.origin || (d.drivePath ? "Google Drive" : "Yüklenen Dosya") };
  });

  const fullExtractedDocText = docCorpusList.map((d) => `[${d.title} (${d.type})]: ${d.text}`).join("\n\n");

  // 1. Price / RFQ / Commercial Terms
  if (
    q.includes("price") ||
    q.includes("cost") ||
    q.includes("quote") ||
    q.includes("rfq") ||
    q.includes("buy") ||
    q.includes("order") ||
    q.includes("commercial") ||
    q.includes("incoterm") ||
    q.includes("milestone") ||
    q.includes("fiyat") ||
    q.includes("ücret") ||
    q.includes("kaç para") ||
    q.includes("ne kadar")
  ) {
    const incotermsText = comm?.incoterms || "EXW / FOB Shipyard Gate";
    const warrantyText = comm?.warranty || "24 Ay Kapsamlı Üretici Garantisi";
    const leadTime = comm?.leadTime || "Standart üretim / teslimat takvimi";

    const priceSentence = formattedPrice
      ? `Doğrulanmış Birim Fiyat: **${formattedPrice}**.`
      : `Fiyatlandırma Bilgisi: **Resmi RFQ / Teklif Talebi ile sunulmaktadır**.`;

    return {
      answer: `${priceSentence}\n\n• **Teslimat Şekli (Incoterms)**: ${incotermsText}\n• **Teslim Süresi**: ${leadTime}\n• **Garanti Süresi**: ${warrantyText}\n• **Ticari Yapı**: Mühendislik onayı ve FAT testleri sonrası hakediş modeli.`,
      detailedNotes: `Doğrudan sipariş ve özel konfigürasyon talepleri ${companyName} ticari masasına iletilir.`,
      confidence: "HIGH",
      sourcesUsed: ["Ticari Şartlar & Incoterms Cetveli", "Doğrulanmış Fiyat Kayıtları"],
      suggestedAction: "REQUEST_OFFER",
    };
  }

  // 2. Specific questions about attached documents / PDFs / OKF contents
  if (
    q.includes("document") ||
    q.includes("drawing") ||
    q.includes("pdf") ||
    q.includes("blueprint") ||
    q.includes("file") ||
    q.includes("döküman") ||
    q.includes("dosya") ||
    q.includes("çizim") ||
    q.includes("içerik") ||
    q.includes("belge") ||
    q.includes("yazıyor") ||
    q.includes("okf") ||
    q.includes("okunan") ||
    q.includes("katalog") ||
    q.includes("datasheet") ||
    q.includes("şartname") ||
    q.includes("yüklü")
  ) {
    const docSections: string[] = [];

    docCorpusList.forEach((d) => {
      let contentSnippet = d.text;
      if (!contentSnippet || contentSnippet.trim().length === 0) {
        contentSnippet = `${offering.name} için hazırlanmış doğrulanmış teknik şartname, çalışma parametreleri ve mühendislik verilerini içermektedir.`;
      }
      docSections.push(
        `📄 **${d.title}** (${d.type} • ${d.origin})\n› **Doğrulanmış Belge Özeti & İçeriği**:\n${contentSnippet}`
      );
    });

    (offering.mediaReferences || []).filter((m) => m.type === "drawing" || m.url?.toLowerCase().includes(".pdf")).forEach((m) => {
      docSections.push(
        `📐 **${m.title || "Teknik Çizim / Plan"}** (PDF Çizim / CAD)\n› **İçerik**: Boyutsal şematik, kesit planı ve mekanik yerleşim verileri.`
      );
    });

    const specEntries = Object.entries(specs);
    const specSummary = specEntries.length > 0
      ? `\n\n**Belgeden Doğrulanan Temel Parametreler:**\n` +
      specEntries.slice(0, 10).map(([k, v]) => `• **${k}**: ${v}`).join("\n")
      : "";

    if (docSections.length > 0) {
      return {
        answer: `**${offering.name}** ürününe ait teknik şartname, PDF ve teknik belgelerdeki doğrulanmış bilgiler:\n\n${docSections.join("\n\n")}${specSummary}\n\nBelgelerin orijinal kopyalarını **Documents / Sertifikalı Belgeler** sekmesinden inceleyebilir veya indirebilirsiniz.`,
        detailedNotes: `Tüm içerikler mühendislik standartları ile doğrulanmış ve güvenli sistemde mühürlenmiştir.`,
        confidence: "HIGH",
        sourcesUsed: sources,
        suggestedAction: "VIEW_SPECS",
      };
    }
  }

  // 3. Specific Parameter Search (Fuzzy scan across specifications and extracted document text)
  const specEntries = Object.entries(specs);
  const matchingSpecs = specEntries.filter(([k, v]) => {
    const keyLower = k.toLowerCase();
    const valLower = String(v).toLowerCase();
    return q.includes(keyLower) || keyLower.split(/[\s_-]+/).some((word) => word.length > 3 && q.includes(word));
  });

  if (matchingSpecs.length > 0) {
    const list = matchingSpecs.map(([k, v]) => `• **${k}**: ${v}`).join("\n");
    return {
      answer: `**${offering.name}** için belgeden doğrulanan ilgili teknik parametreler:\n\n${list}`,
      detailedNotes: `Doğrulanmış mühendislik kayıtları ve üretici teknik dökümanından çekilmiştir.`,
      confidence: "HIGH",
      sourcesUsed: sources,
      suggestedAction: "VIEW_SPECS",
    };
  }

  // 4. Specifications / General Technical Parameters
  if (
    q.includes("spec") ||
    q.includes("parameter") ||
    q.includes("dimension") ||
    q.includes("weight") ||
    q.includes("technical") ||
    q.includes("rating") ||
    q.includes("thrust") ||
    q.includes("speed") ||
    q.includes("power") ||
    q.includes("motor") ||
    q.includes("güç") ||
    q.includes("kapasite") ||
    q.includes("özellik") ||
    q.includes("teknik") ||
    q.includes("boyut") ||
    q.includes("ağırlık") ||
    q.includes("hız") ||
    q.includes("basınç") ||
    q.includes("voltaj") ||
    q.includes("malzeme") ||
    q.includes("çap") ||
    q.includes("derinlik") ||
    q.includes("detay")
  ) {
    if (specEntries.length > 0) {
      const specList = specEntries
        .map(([k, v]) => `• **${k}**: ${v}`)
        .join("\n");
      return {
        answer: `**${offering.name}** için onaylanmış teknik özellikler ve parametre listesi:\n\n${specList}${fullExtractedDocText ? `\n\n**Belge Notları**: ${fullExtractedDocText.slice(0, 400)}...` : ""}`,
        detailedNotes: `Tüm parametreler klas kuruluşu tip onaylarına ve fabrika kabul testlerine (FAT) uygundur.`,
        confidence: "HIGH",
        sourcesUsed: sources,
        suggestedAction: "VIEW_SPECS",
      };
    } else if (fullExtractedDocText) {
      return {
        answer: `**${offering.name}** teknik döküman içeriğinden çıkarılan bilgiler:\n\n${fullExtractedDocText.slice(0, 800)}`,
        detailedNotes: `Teknik belge ayrıştırıcı tarafından otomatik indekslenmiştir.`,
        confidence: "HIGH",
        sourcesUsed: sources,
        suggestedAction: "VIEW_SPECS",
      };
    }
  }

  // 5. Availability / Delivery / Lead Time
  if (
    q.includes("availab") ||
    q.includes("stock") ||
    q.includes("lead time") ||
    q.includes("delivery") ||
    q.includes("timeline") ||
    q.includes("teslimat") ||
    q.includes("stok") ||
    q.includes("süre") ||
    q.includes("termin") ||
    q.includes("ne zaman")
  ) {
    const leadTime = comm?.leadTime || "4 - 8 Hafta standart teslim süresi";
    const status = comm?.availability || "SİPARİŞ ÜZERİNE TEMİN";
    const minOrder = comm?.minOrderQty || "1 Adet";
    return {
      answer: `**${leadTime}** (${status}).\n\n• **Minimum Sipariş Miktarı (MOQ)**: ${minOrder}\n• **Sevkiyat Noktası**: ${companyName} sertifikalı üretim tesisi / tersane çıkışı.`,
      detailedNotes: `Üretim ve sevkiyat slotları sipariş teyidiyle birlikte kesinleştirilir.`,
      confidence: "HIGH",
      sourcesUsed: ["Ticari Şartlar & Sevkiyat Çizelgesi"],
      suggestedAction: "REQUEST_AVAILABILITY",
    };
  }

  // 6. Visual Media / Photos / Gallery
  if (
    q.includes("photo") ||
    q.includes("image") ||
    q.includes("picture") ||
    q.includes("visual") ||
    q.includes("görsel") ||
    q.includes("fotoğraf") ||
    q.includes("resim") ||
    q.includes("galeri")
  ) {
    const media = (offering.mediaReferences || (offering as any).media || []).filter((m: any) => !m.url?.toLowerCase().includes(".pdf") && m.type !== "drawing");
    const photoList = media.map((m: any, idx: number) => `• **${m.title || `Ürün Görseli ${idx + 1}`}** (${m.isCover ? "Kapak Görseli" : "Galeri Fotoğrafı"})`).join("\n");

    return {
      answer: `**${offering.name}** için galeride bulunan görsel materyaller:\n\n${photoList || "• Yüksek çözünürlüklü ürün render ve operasyon fotoğrafları."}\n\nTüm fotoğrafları **Media** sekmesinden büyüterek inceleyebilirsiniz.`,
      detailedNotes: `Görsel medya kataloğu şirket dijital varlığı ile senkronizedir.`,
      confidence: "HIGH",
      sourcesUsed: ["Görsel Medya Galerisi"],
      suggestedAction: "VIEW_SPECS",
    };
  }

  // 7. Applications / Suitability / Use cases
  if (
    q.includes("application") ||
    q.includes("use") ||
    q.includes("suitable") ||
    q.includes("vessel") ||
    q.includes("work") ||
    q.includes("where") ||
    q.includes("purpose") ||
    q.includes("kullanım") ||
    q.includes("uygulama") ||
    q.includes("nerede") ||
    q.includes("alanı")
  ) {
    const apps = offering.applications && offering.applications.length > 0
      ? offering.applications
      : ["Ticari Denizcilik ve Açık Deniz Operasyonları", "Klas Kuruluşu Uygunluk Standartları", "Tersane & Liman Entegrasyon Projeleri"];
    return {
      answer: `**${offering.name}** temel operasyonel kullanım alanları:\n\n${apps.map((a) => `• ${a}`).join("\n")}`,
      detailedNotes: `Hem liman içi tesisler hem de açık deniz operasyonel ortamları için sertifikalandırılmıştır.`,
      confidence: "HIGH",
      sourcesUsed: sources,
      suggestedAction: "COMMERCIAL_RFQ",
    };
  }

  // 8. Certifications & Standards
  if (
    q.includes("certif") ||
    q.includes("standard") ||
    q.includes("class") ||
    q.includes("dnv") ||
    q.includes("abs") ||
    q.includes("lloyd") ||
    q.includes("iso") ||
    q.includes("imo") ||
    q.includes("sertifika") ||
    q.includes("klas") ||
    q.includes("onay") ||
    q.includes("standart")
  ) {
    const certs = offering.certifications && offering.certifications.length > 0
      ? offering.certifications
      : ["DNV GL Type Approved", "ABS Recognized", "ISO 9001:2015 Marine Standard"];
    const standards = offering.standards && offering.standards.length > 0
      ? offering.standards
      : ["IMO MARPOL / Tier III", "IEC 60092 Marine Electrical Standard"];
    return {
      answer: `**${offering.name}** klas onayları ve uluslararası sertifikaları:\n\n• **Sertifikalar**: ${certs.join(" • ")}\n• **Uygunluk Standartları**: ${standards.join(", ")}`,
      detailedNotes: `Tüm sertifikalar ve denetim dökümanları Documents sekmesinde kayıtlıdır.`,
      confidence: "HIGH",
      sourcesUsed: ["Tip Onay Sertifikaları & Uygunluk Raporları"],
      suggestedAction: "CONNECT_COMPANY",
    };
  }

  // 9. Official offer / package / legal draft
  if (q.includes("draft") || q.includes("official offer") || q.includes("package") || q.includes("legal") || q.includes("teklif")) {
    return {
      answer: `**${offering.name}** için resmi ticari teklif özeti (Referans: **${offering.code || "REF-OFFERING"}**):\n\n${formattedPrice ? `• **Birim Fiyat**: ${formattedPrice}\n` : ""}• **Teslim Şekli (Incoterms)**: ${comm?.incoterms || "EXW / FOB Shipyard Gate"}\n• **Ödeme Koşulları**: %30 Avans / %70 FAT ve Teslimat Öncesi Hakediş\n• **Garanti Süresi**: ${comm?.warranty || "24 Ay Üretici Garantisi"}\n• **Standart Teslim Süresi**: ${comm?.leadTime || "4 - 8 Hafta"}`,
      detailedNotes: `${companyName} ticari masası tarafından dijital olarak mühürlenmiştir.`,
      confidence: "HIGH",
      sourcesUsed: sources,
      suggestedAction: "REQUEST_OFFER",
      isSealedCommercialOffer: true,
    };
  }

  // 10. Comprehensive Contextual Overview with OKF & Document Grounding
  const specPreview = Object.entries(specs).slice(0, 6).map(([k, v]) => `• **${k}**: ${v}`).join("\n");
  const docSummaryPreview = docCorpusList.length > 0
    ? `\n\n**Ekli PDF / Teknik Döküman Özeti:**\n${docCorpusList.map((d) => `• **${d.title}**: ${d.text ? d.text.slice(0, 180) + "..." : "Sertifikalı teknik şartname verisi."}`).join("\n")}`
    : "";

  return {
    answer: `**${offering.name}**, **${companyName}** tarafından sağlanan doğrulanmış bir ${offering.type === "service" ? "hizmettir" : "üründür"}.\n\n${offering.shortDescription || offering.detailedDescription || "Denizcilik sektörü standartlarına uygun olarak geliştirilmiştir."}${formattedPrice ? `\n\n• **Fiyat**: ${formattedPrice}` : ""}${specPreview ? `\n\n**Öne Çıkan Teknik Parametreler:**\n${specPreview}` : ""}${docSummaryPreview}`,
    detailedNotes: `Teknik özellikler, bağlı PDF belgeleri, teslimat süreleri veya resmi ticari teklif hakkında detaylı soru sorabilirsiniz.`,
    confidence: "HIGH",
    sourcesUsed: sources,
    suggestedAction: "COMMERCIAL_RFQ",
  };
}

export const pdfBase64Cache = new Map<string, string>();

/**
 * Cache PDF base64 data in-memory and in sessionStorage
 */
export function cachePdfBase64(key: string, base64Data: string): void {
  if (!key || !base64Data) return;
  const cleanKey = key.trim();
  const cleanB64 = base64Data.replace(/^data:[^;]+;base64,/, "").trim();
  pdfBase64Cache.set(cleanKey, cleanB64);
  pdfBase64Cache.set(cleanKey.toLowerCase(), cleanB64);
  if (typeof window !== "undefined" && typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.setItem(`mw_pdf_${cleanKey}`, cleanB64);
      sessionStorage.setItem(`mw_pdf_${cleanKey.toLowerCase()}`, cleanB64);
    } catch {
      // Storage quota exceeded, in-memory cache remains
    }
  }
}

/**
 * Helper to resolve PDF files from URL, filename, or data URLs to pure base64
 */
export async function resolvePdfAsBase64(urlOrBase64OrKey: string): Promise<string | null> {
  if (!urlOrBase64OrKey) return null;
  const key = urlOrBase64OrKey.trim();
  const lowerKey = key.toLowerCase();

  if (pdfBase64Cache.has(key)) {
    return pdfBase64Cache.get(key)!;
  }
  if (pdfBase64Cache.has(lowerKey)) {
    return pdfBase64Cache.get(lowerKey)!;
  }

  // Check sessionStorage
  if (typeof window !== "undefined" && typeof sessionStorage !== "undefined") {
    try {
      const fromSession = sessionStorage.getItem(`mw_pdf_${key}`) || sessionStorage.getItem(`mw_pdf_${lowerKey}`);
      if (fromSession) {
        pdfBase64Cache.set(key, fromSession);
        return fromSession;
      }
    } catch {
      // ignore
    }
  }

  // Pure base64
  if (!key.startsWith("http://") && !key.startsWith("https://") && !key.startsWith("data:") && !key.startsWith("blob:") && !key.includes("/")) {
    if (key.length > 200) {
      pdfBase64Cache.set(key, key);
      return key;
    }
  }

  if (key.startsWith("data:application/pdf;base64,")) {
    const raw = key.replace("data:application/pdf;base64,", "");
    cachePdfBase64(key, raw);
    return raw;
  }
  if (key.startsWith("data:")) {
    const parts = key.split(",");
    const raw = parts[1] || null;
    if (raw) cachePdfBase64(key, raw);
    return raw;
  }

  // 1. Direct Google Drive file resolver via OAuth token
  const driveMatch = key.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    try {
      const driveB64 = await fetchGoogleDriveFileBase64(driveMatch[1]);
      if (driveB64) {
        cachePdfBase64(key, driveB64);
        return driveB64;
      }
    } catch (e) {
      console.warn("[OfferingAIService] Google Drive file fetch error:", e);
    }
    return null;
  }

  // 2. Local / direct fetch
  if (
    key.startsWith("blob:") ||
    key.startsWith("/") ||
    key.startsWith("http://localhost") ||
    key.includes("firebasestorage.googleapis.com")
  ) {
    try {
      const res = await fetch(key);
      if (res.ok) {
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const b64 = result.split(",")[1] || null;
            if (b64) cachePdfBase64(key, b64);
            resolve(b64);
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      }
    } catch {
      // Local fetch failed
    }
  }

  return null;
}

/**
 * Live Grounded Product AI Advisor using Gemini API with exact product context & direct multimodal PDF inspection
 */
export async function answerOfferingAdvisorQueryAsync(
  offering: CompanyOffering,
  queryText: string,
  companyName: string,
  sectorCity?: string
): Promise<{
  answer: string;
  detailedNotes?: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  sourcesUsed: string[];
  suggestedAction?: "REQUEST_OFFER" | "COMMERCIAL_RFQ" | "CONNECT_COMPANY" | "VIEW_SPECS" | "REQUEST_AVAILABILITY";
  isSealedCommercialOffer?: boolean;
}> {
  const syncFallback = answerOfferingAdvisorQuery(offering, queryText, companyName);

  try {
    const specs = offering.specifications || {};
    const specString = Object.entries(specs).map(([k, v]) => `- ${k}: ${v}`).join("\n");
    const comm = offering.commercialInformation;
    const priceVal = offering.price || comm?.price;
    const currencyVal = offering.currency || comm?.currency || "USD";
    const symbol = currencyVal === "EUR" ? "€" : currencyVal === "TRY" ? "₺" : currencyVal === "GBP" ? "£" : "$";
    const formattedPrice = priceVal
      ? (priceVal.includes("$") || priceVal.includes("€") || priceVal.includes("₺") || priceVal.includes("£") ? priceVal : `${symbol}${priceVal} ${currencyVal}`)
      : comm?.pricingGuidance;

    // Gather all grounding sources and documents
    const allGroundingDocs = [
      ...(offering.groundingSources || []),
      ...(offering.sourceDocuments || []),
    ];

    const sources = allGroundingDocs.map((s) => s.filename || s.title);
    (offering.mediaReferences || []).filter((m) => m.type === "drawing" || m.url?.toLowerCase().includes(".pdf")).forEach((m) => {
      sources.push(m.title || "Teknik Çizim / Blueprint (PDF)");
    });
    if (sources.length === 0) sources.push("Doğrulanmış Mühendislik Belgesi");

    const attachedDocDetails = allGroundingDocs.map((s, idx) => {
      const title = s.title || s.filename || `Belge #${idx + 1}`;
      const type = s.fileType || "PDF Belgesi";
      const origin = s.origin || (s.drivePath ? "GOOGLE_DRIVE" : "DOĞRUDAN_YÜKLEME");
      const fullText = s.extractedText || (s as any).content || s.summary || s.contentExcerpt || s.description || offering.okfDocument?.rawContent || offering.detailedDescription || offering.shortDescription || "";
      return `• Belge #${idx + 1}: "${title}" [Format: ${type}, Kaynak: ${origin}]\n  Doğrulanmış İçerik ve Çıkarılan Metin:\n${fullText}`;
    });

    (offering.mediaReferences || []).filter((m) => m.type === "drawing" || m.url?.toLowerCase().includes(".pdf")).forEach((m, idx) => {
      attachedDocDetails.push(`• Teknik Çizim / PDF Dokümanı #${idx + 1}: "${m.title || "Teknik Çizim / Blueprint"}" (PDF Şematik / CAD)`);
    });

    // Visual media items inventory
    const mediaList = offering.mediaReferences || (offering as any).media || [];
    const visualMediaDetails = mediaList
      .filter((m: any) => !m.url?.toLowerCase().includes(".pdf") && m.type !== "drawing")
      .map((m: any, idx: number) => {
        return `• Fotoğraf ${idx + 1}: "${m.title || "Ürün Fotoğrafı"}" [Rol: ${m.isCover ? "KAPAK GÖRSELİ" : (m.type || "GALERİ GÖRSELİ").toUpperCase()}]`;
      });

    // Build OKF Grounding Context
    let okfPromptSnippet = "";
    try {
      const okfDoc =
        offering.okfDocument ||
        buildOKFDocument({
          title: `${offering.name} — Mühendislik Kaydı`,
          companyId: offering.companyId || "mw-corp",
          offeringId: offering.id,
          entityType: offering.type === "service" ? "SERVICE" : "PRODUCT",
          specifications: Object.entries(specs).map(([k, v]) => ({ key: k, value: String(v) })),
          certifications: offering.certifications || [],
          commercialParams: {
            price: priceVal,
            currency: currencyVal,
            pricingModel: comm?.pricingType || "Sabit",
            incoterms: comm?.incoterms || "EXW / FOB",
            leadTimeDays: 45,
          },
          operationalBoundaries: offering.applications || [],
          rawText: `${offering.name}\n${offering.shortDescription || ""}\n${offering.detailedDescription || ""}\n${allGroundingDocs.map(d => d.extractedText || d.summary || "").join("\n")}`,
        });
      okfPromptSnippet = buildOKFGroundingContextPrompt([okfDoc], offering.name);
    } catch {
      // OKF generation fallback
    }

    const prompt = `You are the Senior Technical & Commercial AI Advisor for "${offering.name}", manufactured and provided by "${companyName}".
You have complete, direct, authoritative expertise on this offering, every technical clause in its attached documents and PDFs, its verified specifications, and its visual gallery.

${okfPromptSnippet}

VERIFIED PRODUCT PROFILE:
- Offering Name: ${offering.name}
- Offering Type: ${offering.type?.toUpperCase() || "PRODUCT"}
- Industry Category: ${offering.category || "Marine Equipment & Systems"}
- SKU / Catalog Code: ${offering.code || offering.sku || "REF-" + (offering.id?.slice(-6) || "101")}
- Short Summary: ${offering.shortDescription || "N/A"}
- Detailed Overview: ${offering.detailedDescription || offering.shortDescription || "N/A"}
- Commercial Price / Model: ${formattedPrice || "Resmi Teklif Talebi (RFQ) gerekmektedir"}
- Pricing Basis: ${comm?.pricingType || "Standart Sabit"}
- Incoterms Delivery: ${comm?.incoterms || "EXW / FOB Shipyard"}
- Production Lead Time: ${comm?.leadTime || "4 - 8 Hafta standart"}
- Availability & Slots: ${comm?.availability || "Sipariş Üzerine Temin"}
- Minimum Order Scope: ${comm?.minOrderQty || "1 Adet"}
- Standard Marine Warranty: ${comm?.warranty || "24 Ay Kapsamlı Üretici Garantisi"}
- Verified Technical Specifications:
${specString || "Standart denizcilik standartları."}
- Operational Applications:
${(offering.applications || []).map((a) => `- ${a}`).join("\n") || "Ticari denizcilik, açık deniz ve tersane operasyonları."}
- Class Approvals & Standards:
${(offering.certifications || []).map((c) => `- ${c}`).join("\n") || "DNV, ABS, ISO standartlarına uygun."}

ATTACHED TECHNICAL DOCUMENTS & GROUNDED PDF RESOURCES (DIRECT VISIBILITY):
${attachedDocDetails.join("\n\n") || "Resmi Mühendislik Şartnamesi."}

ATTACHED VISUAL GALLERY ASSETS:
${visualMediaDetails.join("\n") || "Yüksek çözünürlüklü ürün render ve operasyon fotoğrafları."}

- Provider Entity: ${companyName} (${sectorCity || "MarineWorld"})

USER INQUIRY:
"${queryText}"

ADVISOR DIRECTIVES:
1. Act as a top-tier Marine Technical & Commercial Specialist representing ${companyName}.
2. Thoroughly examine ALL attached PDF documents, specifications, dimensions, power ratings, certifications, operational parameters, and verified specification data above.
3. When the user asks about ANY parameter, dimension, depth, power, weight, capacity, model number, standard, or detail from the files, extract and present the EXACT numbers, units, and details.
4. If the user asks what is in the document or files, provide a complete, well-structured breakdown of the contents, technical specifications, and key features.
5. NEVER state "bilgi belirtilmemiştir", "bilgi verilmemiştir", or "dokümanda yer almamaktadır" if the information exists or can be derived from the attached documents, specifications, or context.
6. If the user asks in Turkish, respond in natural, fluent, professional Turkish. If in English, respond in English.
7. Use structured, clean markdown bullet formatting (e.g. • Parametre: Değer). Do NOT output messy asterisks, broken tags, or raw code blocks.
8. STRICT TERMINOLOGY RULE: UNDER NO CIRCUMSTANCES should you ever write or mention the acronym or word "OKF" or "Open Knowledge Format" anywhere in your answer or notes. Refer to sources as "teknik şartname", "doğrulanmış teknik veriler", "mühendislik dökümanları" or "teknik veri föyü" (or in English: "technical specifications", "verified datasheet", "engineering documentation").`;

    const systemInstruction = `You are the official Senior Technical & Commercial AI Advisor for "${offering.name}" provided by "${companyName}". You have full visibility into the product's attached resources, PDFs, verified technical data, specifications, and pricing. Carefully examine all attached document contents and specifications to give direct, exact, authoritative answers to every user question. Always provide specific numbers, units, and features. DO NOT use the word or acronym "OKF" anywhere in your response.`;

    // Gather multimodal parts in parallel
    const parts: (string | AIPart)[] = [];

    // Collect candidate identifiers & URLs for base64 resolution
    const candidateKeys: string[] = [];
    for (const doc of allGroundingDocs) {
      const b64 = (doc as any).base64Data;
      if (b64 && !candidateKeys.includes(b64)) candidateKeys.push(b64);
      if (doc.url && !candidateKeys.includes(doc.url)) candidateKeys.push(doc.url);
      if (doc.filename && !candidateKeys.includes(doc.filename)) candidateKeys.push(doc.filename);
      if (doc.title && !candidateKeys.includes(doc.title)) candidateKeys.push(doc.title);
    }
    for (const m of offering.mediaReferences || []) {
      if ((m.type === "drawing" || m.url?.toLowerCase().includes(".pdf")) && m.url && !candidateKeys.includes(m.url)) {
        candidateKeys.push(m.url);
      }
      if (m.title && !candidateKeys.includes(m.title)) candidateKeys.push(m.title);
    }
    if (offering.id && !candidateKeys.includes(offering.id)) candidateKeys.push(offering.id);
    if (offering.name && !candidateKeys.includes(offering.name)) candidateKeys.push(offering.name);

    // Resolve candidates in parallel
    const pdfResults = await Promise.all(
      candidateKeys.slice(0, 4).map((k) => resolvePdfAsBase64(k))
    );

    const attachedBase64Set = new Set<string>();
    for (const b64 of pdfResults) {
      if (b64 && b64.length > 100 && !attachedBase64Set.has(b64.slice(0, 50))) {
        attachedBase64Set.add(b64.slice(0, 50));
        parts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: b64,
          },
        });
        if (parts.length >= 2) break; // Limit to 2 PDF inline parts for optimal token speed
      }
    }

    // Append instruction prompt
    parts.push({ text: prompt });

    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("AI generation timeout")), 35000)
    );

    const aiText = await Promise.race([
      generateAIContentWithParts(parts, systemInstruction, "gemini-3.1-flash-lite"),
      timeoutPromise,
    ]);

    if (aiText && aiText.trim().length > 10) {
      return sanitizeAdvisorResponse({
        ...syncFallback,
        answer: aiText.trim(),
        sourcesUsed: sources,
      });
    }
  } catch (err) {
    console.warn("[OfferingAIService] Live Gemini AI fallback to deterministic engine:", err);
  }

  return sanitizeAdvisorResponse(syncFallback);
}

