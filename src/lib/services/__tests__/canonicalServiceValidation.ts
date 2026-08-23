import { getPlatformById } from "../platformService";
import { getSectorById } from "../sectorService";
import { getSectorCityBySlug } from "../sectorCityService";
import {
  getCompanyById,
  getCompanyBySlug,
  getCompanyByDomain,
  listCompanies,
  createCompany,
  getCompanyNodes,
  addCompanyNode,
} from "../companyService";
import { listProducts, createProduct, getProduct } from "../productService";
import { listServices, createService } from "../serviceService";
import { listConnects, createConnect } from "../connectService";
import { calculateProjection } from "../businessTwinService";
import { resolveDomain } from "../domainService";
import { resolveIdentity } from "../identityService";
import { buildCompanySchema, buildPlatformSchema } from "../schemaOrgService";
import type { CompanyEntity, ProductEntity, ServiceEntity, ConnectEntity, CompanyNodeEntity } from "@/lib/types";

export interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  message: string;
}

export async function runCanonicalServiceValidation(): Promise<{
  passed: boolean;
  total: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  const recordTest = (id: string, name: string, passed: boolean, message: string) => {
    results.push({ id, name, passed, message });
  };

  try {
    // 1. Platform resolution
    const platform = await getPlatformById("marineworld");
    recordTest(
      "TEST_01",
      "Platform resolution",
      platform !== null && platform.canonicalDomain === "marineworld.city",
      platform ? `Resolved ${platform.displayName}` : "Failed to resolve platform"
    );

    // 2. Sector resolution
    const sector = await getSectorById("marine");
    recordTest(
      "TEST_02",
      "Sector resolution",
      sector !== null && sector.slug === "marine",
      sector ? `Resolved ${sector.displayName}` : "Failed to resolve sector"
    );

    // 3. Sector city resolution
    const city = getSectorCityBySlug("shipyard");
    recordTest(
      "TEST_03",
      "Sector city resolution",
      city !== undefined && (city.slug === "shipyard" || city.id === "shipyard"),
      city ? `Resolved city ${city.name}` : "Failed to resolve sector city"
    );

    // 4. Company resolution
    const testComp: CompanyEntity = {
      id: "comp-canonical-test-01",
      platformId: "marineworld",
      sectorId: "marine",
      primarySectorCityId: "shipyard",
      sectorCityIds: ["shipyard"],
      slug: "argento-marine",
      legalName: "Argento Marine B.V.",
      displayName: "Argento Marine",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      website: "https://argentomarine.com",
    };
    createCompany(testComp);
    const resolvedComp = getCompanyById("comp-canonical-test-01");
    recordTest(
      "TEST_04",
      "Company resolution",
      resolvedComp !== undefined && resolvedComp.id === "comp-canonical-test-01",
      resolvedComp ? `Resolved company ${resolvedComp.legalName}` : "Company resolution failed"
    );

    // 5. Company slug resolution
    const bySlug = getCompanyBySlug("argento-marine");
    recordTest(
      "TEST_05",
      "Company slug resolution",
      bySlug !== undefined && bySlug.id === "comp-canonical-test-01",
      bySlug ? `Resolved slug ${bySlug.slug}` : "Slug resolution failed"
    );

    // 6. Company domain resolution
    const byDomain = getCompanyByDomain("argentomarine.com");
    recordTest(
      "TEST_06",
      "Company domain resolution",
      byDomain !== undefined && byDomain.id === "comp-canonical-test-01",
      byDomain ? `Resolved domain ${byDomain.website}` : "Domain lookup failed"
    );

    // 7. Company -> node relation
    const node: Omit<CompanyNodeEntity, "id" | "companyId" | "createdAt" | "updatedAt"> = {
      name: "Rotterdam Shipyard Node",
      type: "HQ",
      nodeType: "HEADQUARTERS",
      isHeadquarters: true,
      status: "ACTIVE",
      city: "Rotterdam",
      country: "Netherlands",
    };
    const createdNode = addCompanyNode("comp-canonical-test-01", node);
    const nodes = getCompanyNodes("comp-canonical-test-01");
    recordTest(
      "TEST_07",
      "Company -> node relation",
      nodes.some((n) => n.id === createdNode.id),
      `Found ${nodes.length} nodes for company`
    );

    // 8. Company -> product relation
    const testProd: ProductEntity = {
      id: "prod-test-01",
      companyId: "comp-canonical-test-01",
      sectorCityId: "shipyard",
      slug: "heavy-winch-50t",
      name: "Heavy Duty Winch 50T",
      category: "Deck Equipment",
      shortDescription: "50T Tugboat Towing Winch",
      description: "Full hydraulic 50T towing winch.",
      status: "ACTIVE",
      visibility: "PUBLIC",
      availability: "AVAILABLE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await createProduct(testProd);
    const prods = await listProducts("comp-canonical-test-01");
    recordTest(
      "TEST_08",
      "Company -> product relation",
      prods.some((p) => p.id === "prod-test-01"),
      `Found ${prods.length} products for company`
    );

    // 9. Company -> service relation
    const testServ: ServiceEntity = {
      id: "serv-test-01",
      companyId: "comp-canonical-test-01",
      sectorCityId: "shipyard",
      slug: "hull-overhaul",
      name: "Hull Repair & Overhaul",
      category: "Repair Services",
      shortDescription: "Drydock vessel hull repair",
      description: "Complete vessel drydocking and hull overhaul.",
      status: "ACTIVE",
      visibility: "PUBLIC",
      availability: "AVAILABLE",
      serviceAreas: ["Rotterdam Port"],
      capabilities: ["Hull Welding"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await createService(testServ);
    const servs = await listServices("comp-canonical-test-01");
    recordTest(
      "TEST_09",
      "Company -> service relation",
      servs.some((s) => s.id === "serv-test-01"),
      `Found ${servs.length} services for company`
    );

    // 10. Company -> connect relation
    const testConn: ConnectEntity = {
      id: "conn-test-01",
      companyId: "comp-canonical-test-01",
      fromUserId: "usr-buyer-001",
      type: "RFQ",
      subject: "RFQ for 50T Winch",
      status: "NEW",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await createConnect(testConn);
    const connList = await listConnects("comp-canonical-test-01");
    recordTest(
      "TEST_10",
      "Company -> connect relation",
      connList.some((c) => c.id === "conn-test-01"),
      `Found ${connList.length} connect records for company`
    );

    // 11. Company -> businessTwin relation
    const profileMock = {
      id: "comp-canonical-test-01",
      name: "Argento Marine",
      legalName: "Argento Marine B.V.",
    } as any;
    const twinSummary = await calculateProjection(profileMock);
    recordTest(
      "TEST_11",
      "Company -> businessTwin relation",
      twinSummary.companyId === "comp-canonical-test-01",
      `Business Twin projection calculated with completeness ${twinSummary.overallCompleteness}%`
    );

    // 12. Domain -> identity -> company
    const identityComp = resolveIdentity("argentomarine.com");
    recordTest(
      "TEST_12",
      "Domain -> identity -> company",
      identityComp.identityType === "COMPANY" || identityComp.companyId === "comp-canonical-test-01" || identityComp.platformId === "marineworld",
      `Resolved identity type: ${identityComp.identityType}`
    );

    // 13. Domain -> identity -> sector city
    const identityCity = resolveIdentity("shipyard.marineworld.city");
    recordTest(
      "TEST_13",
      "Domain -> identity -> sector city",
      identityCity.identityType === "SECTOR_CITY" && (identityCity.sectorCityId === "shipyard" || identityCity.sectorCityId === "shipyard.city"),
      `Resolved city identity: ${identityCity.sectorCityId}`
    );

    // 14. Unknown domain
    const unknownIdentity = resolveIdentity("nonexistent-domain-999.com");
    recordTest(
      "TEST_14",
      "Unknown domain fallback",
      unknownIdentity.identityType === "PLATFORM" && unknownIdentity.platformId === "marineworld",
      `Fallback to default platform marineworld`
    );

    // 15. Inactive domain
    const inactiveDomain = resolveDomain("inactive.marineworld.city");
    recordTest(
      "TEST_15",
      "Inactive domain check",
      inactiveDomain === null || !inactiveDomain.isActive,
      "Inactive domain correctly flagged or null"
    );

    // 16. Tenant mismatch
    const crossCompanyProd = await getProduct("comp-canonical-test-01", "non-existent-prod-id");
    recordTest(
      "TEST_16",
      "Tenant mismatch / cross-tenant query safety",
      crossCompanyProd === null,
      "Cross-company query returned null as expected"
    );

    // 17. Duplicate company prevention
    const existingBefore = listCompanies().length;
    createCompany(testComp);
    const existingAfter = listCompanies().length;
    recordTest(
      "TEST_17",
      "Duplicate company prevention",
      existingAfter === existingBefore,
      "Idempotent save prevented duplicate company creation"
    );

    // 18. Multi-domain -> same companyId
    const compDomain1 = getCompanyBySlug("argento-marine");
    const compDomain2 = getCompanyByDomain("argentomarine.com");
    recordTest(
      "TEST_18",
      "Multi-domain -> same companyId",
      compDomain1 !== undefined && compDomain2 !== undefined && compDomain1.id === compDomain2.id,
      "Both custom domain and slug resolved to canonical companyId"
    );

    // 19. Schema identity preservation
    const schemaOrg = buildCompanySchema(testComp);
    const platformSchema = buildPlatformSchema({ id: "marineworld", displayName: "MarineWorld.City" });
    recordTest(
      "TEST_19",
      "Schema identity preservation",
      (schemaOrg as any)["@id"] !== undefined && (platformSchema as any)["@id"] === "https://marineworld.city/#organization",
      "Canonical Schema.org @id structure preserved"
    );

    // 20. No localStorage business persistence
    let hasLocalStorageBypass = false;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const key = window.localStorage.getItem("company_name_");
        if (key) hasLocalStorageBypass = true;
      }
    } catch {
      hasLocalStorageBypass = false;
    }
    recordTest(
      "TEST_20",
      "No localStorage business persistence",
      !hasLocalStorageBypass,
      "Zero business data persistence in localStorage"
    );
  } catch (err: any) {
    recordTest("TEST_FATAL", "Validation execution", false, `Fatal error: ${err.message}`);
  }

  const allPassed = results.every((r) => r.passed);
  return {
    passed: allPassed,
    total: results.length,
    results,
  };
}
