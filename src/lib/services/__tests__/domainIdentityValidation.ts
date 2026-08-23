import { resolveIdentity } from "../identityService";
import {
  normalizeHostname,
  resolveDomain,
  registerDomain,
  getDomainEntityWithStatus,
} from "../domainService";

/**
 * Stage 10.3 — Domain & Identity Resolution Test Suite
 * Validates deterministic behavior against Section 22 Test Matrix.
 */
export function runDomainIdentityValidation() {
  const results: Array<{ test: string; passed: boolean; details: string }> = [];

  // Test 1: marineworld.city -> PLATFORM
  const res1 = resolveIdentity("marineworld.city");
  results.push({
    test: "1. marineworld.city -> PLATFORM",
    passed: res1.identityType === "PLATFORM" && res1.platformId === "marineworld" && !res1.error,
    details: `Got identityType=${res1.identityType}, platformId=${res1.platformId}`,
  });

  // Test 2: www.marineworld.city -> PLATFORM
  const res2 = resolveIdentity("www.marineworld.city");
  results.push({
    test: "2. www.marineworld.city -> PLATFORM",
    passed: res2.identityType === "PLATFORM" && res2.platformId === "marineworld" && !res2.error,
    details: `Got identityType=${res2.identityType}, platformId=${res2.platformId}`,
  });

  // Test 3: propulsion.city.marineworld.city -> SECTOR_CITY
  const res3 = resolveIdentity("propulsion.city.marineworld.city");
  results.push({
    test: "3. propulsion.city.marineworld.city -> SECTOR_CITY",
    passed: res3.identityType === "SECTOR_CITY" && res3.sectorCityId === "propulsion" && !res3.error,
    details: `Got identityType=${res3.identityType}, sectorCityId=${res3.sectorCityId}`,
  });

  // Test 4: argentomarine.marineworld.city -> COMPANY
  const res4 = resolveIdentity("argentomarine.marineworld.city");
  results.push({
    test: "4. argentomarine.marineworld.city -> COMPANY",
    passed: res4.identityType === "COMPANY" && res4.companyId === "argento-marine" && !res4.error,
    details: `Got identityType=${res4.identityType}, companyId=${res4.companyId}`,
  });

  // Test 5: argentomarine.com -> COMPANY / CUSTOM
  const res5 = resolveIdentity("argentomarine.com");
  results.push({
    test: "5. argentomarine.com -> COMPANY / CUSTOM",
    passed: res5.identityType === "COMPANY" && res5.companyId === "argento-marine" && !res5.error,
    details: `Got identityType=${res5.identityType}, companyId=${res5.companyId}`,
  });

  // Test 6: unknown-nonexistent-domain.com -> UNRESOLVED / error
  const res6 = resolveIdentity("unknown-nonexistent-domain.com");
  results.push({
    test: "6. unknown.city.marineworld.city -> UNRESOLVED / DOMAIN_NOT_FOUND",
    passed: res6.error === "UNRESOLVED_IDENTITY" || res6.error === "DOMAIN_NOT_FOUND",
    details: `Got error=${res6.error}`,
  });

  // Test 7: inactive domain -> DOMAIN_INACTIVE
  registerDomain({
    id: "dom-inactive-test",
    entityType: "COMPANY",
    entityId: "inactive-corp",
    hostname: "inactivecorp.com",
    url: "https://inactivecorp.com/",
    isCanonical: true,
    isActive: false,
  });
  const res7 = resolveIdentity("inactivecorp.com");
  results.push({
    test: "7. inactive domain -> DOMAIN_INACTIVE",
    passed: res7.error === "DOMAIN_INACTIVE",
    details: `Got error=${res7.error}`,
  });

  // Test 8: duplicate domain -> DOMAIN_COLLISION
  let collisionDetected = false;
  try {
    registerDomain({
      id: "dom-collision-test",
      entityType: "COMPANY",
      entityId: "comp-b",
      hostname: "marineworld.city", // Already registered to marineworld platform
      url: "https://marineworld.city/",
      isCanonical: false,
      isActive: true,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("DOMAIN_COLLISION")) {
      collisionDetected = true;
    }
  }
  results.push({
    test: "8. duplicate domain -> DOMAIN_COLLISION",
    passed: collisionDetected,
    details: `Collision exception caught: ${collisionDetected}`,
  });

  // Test 9: legacy path /sehirler/shipyard -> compatibility fallback
  const res9 = resolveIdentity("localhost:3000", "/sehirler/shipyard");
  results.push({
    test: "9. legacy path /sehirler/shipyard -> SECTOR_CITY compatibility fallback",
    passed: res9.identityType === "SECTOR_CITY" && res9.sectorCityId === "shipyard" && !res9.error,
    details: `Got identityType=${res9.identityType}, sectorCityId=${res9.sectorCityId}`,
  });

  // Test 10: legacy company path /sirketler/crest-group-materials -> compatibility fallback
  const res10 = resolveIdentity("localhost:3000", "/sirketler/crest-group-materials");
  results.push({
    test: "10. legacy company path /sirketler/crest-group-materials -> COMPANY compatibility fallback",
    passed: res10.identityType === "COMPANY" && res10.companyId === "crest-group-materials" && !res10.error,
    details: `Got identityType=${res10.identityType}, companyId=${res10.companyId}`,
  });

  const allPassed = results.every((r) => r.passed);
  console.log("=== STAGE 10.3 DOMAIN & IDENTITY RESOLUTION TEST RESULTS ===");
  results.forEach((r) => console.log(`${r.passed ? "✅ [PASS]" : "❌ [FAIL]"} ${r.test} — ${r.details}`));
  console.log(`OVERALL: ${allPassed ? "ALL 10 TESTS PASSED PERFECTLY" : "SOME TESTS FAILED"}`);

  return { allPassed, results };
}
