import {
  signInWithEmail,
  signOutCurrentUser,
} from "@/lib/services/securityService";
import {
  setPersonalVisitorMode,
  setActiveOrganizationContext,
} from "@/lib/services/accessContextService";
import {
  saveCompanyReference,
  getSavedCompanies,
  removeSavedCompanyReference,
  isCompanySaved,
  resolveCanonicalCompanySync,
  saveProductReference,
  getSavedProducts,
  removeSavedProductReference,
  isProductSaved,
  resolveCanonicalProduct,
  saveServiceReference,
  getSavedServices,
  removeSavedServiceReference,
  isServiceSaved,
  resolveCanonicalService,
  getUserActivities,
  clearAllPersonalWorkspaces,
} from "@/lib/services/personalWorkspaceService";
import type {
  SavedCompanyReference,
  SavedProductReference,
  SavedServiceReference,
} from "@/lib/types";

export interface Stage354GateReportItem {
  id: string;
  test: string;
  passed: boolean;
  details: string;
}

export interface Stage354GateReport {
  timestamp: string;
  mode: "PERSONAL_SAVED_ITEMS";
  passedCount: number;
  failedCount: number;
  totalCount: number;
  results: Stage354GateReportItem[];
}

/**
 * Stage 3.5.4 — Personal Saved Companies / Products / Services Runtime Verification Gate
 * Validates real personal bookmark experience for authenticated PERSONAL_VISITOR users,
 * reference-only persistence (no duplicating canonical records), deterministic duplicate protection,
 * canonical resolution with unavailable entity handling, guest prompts, activity logging, and tenant isolation.
 */
export async function runStage354PersonalSavedItemsRuntimeGate(): Promise<Stage354GateReport> {
  const results: Stage354GateReportItem[] = [];

  // Reset stores for a clean test suite
  clearAllPersonalWorkspaces();

  // Test setup: Authenticate primary personal user
  const user1Email = "elena.vane@marineworld-visitor.org";
  const user1Auth = await signInWithEmail(user1Email, "SecurePass2026!");
  setPersonalVisitorMode(user1Auth.uid!);
  const user1Uid = user1Auth.uid!;

  // Secondary user for tenant isolation tests
  const user2Email = "marcus.vance@marineworld-visitor.org";
  const user2Auth = await signInWithEmail(user2Email, "SecurePass2026!");
  const user2Uid = user2Auth.uid!;

  // 01 Guest save company rejected / unauthenticated
  let pass01 = false;
  try {
    await saveCompanyReference("", "argento-marine");
  } catch (e: any) {
    pass01 = true;
  }
  results.push({
    id: "01",
    test: "01 Guest save company rejected",
    passed: pass01,
    details: "Unauthenticated guest save company blocked at service layer",
  });

  // 02 Guest save product rejected / unauthenticated
  let pass02 = false;
  try {
    await saveProductReference("", "prod-001", "argento-marine");
  } catch (e: any) {
    pass02 = true;
  }
  results.push({
    id: "02",
    test: "02 Guest save product rejected",
    passed: pass02,
    details: "Unauthenticated guest save product blocked at service layer",
  });

  // 03 Guest save service rejected / unauthenticated
  let pass03 = false;
  try {
    await saveServiceReference("", "serv-001", "argento-marine");
  } catch (e: any) {
    pass03 = true;
  }
  results.push({
    id: "03",
    test: "03 Guest save service rejected",
    passed: pass03,
    details: "Unauthenticated guest save service blocked at service layer",
  });

  // 04 Authenticated personal user save company success
  const savedComp04 = await saveCompanyReference(user1Uid, "crest-group-materials", "MW-BUS-CREST-GROUP");
  const pass04 =
    savedComp04.userId === user1Uid &&
    savedComp04.companyId === "crest-group-materials" &&
    savedComp04.businessId === "MW-BUS-CREST-GROUP";
  results.push({
    id: "04",
    test: "04 Authenticated personal user save company success",
    passed: pass04,
    details: `Saved company reference created for user: ${savedComp04.companyId}`,
  });

  // 05 Authenticated personal user save product success
  const savedProd05 = await saveProductReference(
    user1Uid,
    "prod-cg-01",
    "crest-group-materials",
    "MW-BUS-CREST-GROUP"
  );
  const pass05 =
    savedProd05.userId === user1Uid &&
    savedProd05.productId === "prod-cg-01" &&
    savedProd05.companyId === "crest-group-materials";
  results.push({
    id: "05",
    test: "05 Authenticated personal user save product success",
    passed: pass05,
    details: `Saved product reference created for user: ${savedProd05.productId}`,
  });

  // 06 Authenticated personal user save service success
  const savedServ06 = await saveServiceReference(
    user1Uid,
    "serv-cg-01",
    "crest-group-materials",
    "MW-BUS-CREST-GROUP"
  );
  const pass06 =
    savedServ06.userId === user1Uid &&
    savedServ06.serviceId === "serv-cg-01" &&
    savedServ06.companyId === "crest-group-materials";
  results.push({
    id: "06",
    test: "06 Authenticated personal user save service success",
    passed: pass06,
    details: `Saved service reference created for user: ${savedServ06.serviceId}`,
  });

  // 07 Save company reference structure
  const pass07 =
    typeof savedComp04.userId === "string" &&
    typeof savedComp04.companyId === "string" &&
    typeof savedComp04.businessId === "string" &&
    typeof savedComp04.savedAt === "string" &&
    !isNaN(Date.parse(savedComp04.savedAt));
  results.push({
    id: "07",
    test: "07 Save company reference structure",
    passed: pass07,
    details: `Reference schema matches {userId, companyId, businessId, savedAt}`,
  });

  // 08 Save product reference structure
  const pass08 =
    typeof savedProd05.userId === "string" &&
    typeof savedProd05.productId === "string" &&
    typeof savedProd05.companyId === "string" &&
    typeof savedProd05.businessId === "string" &&
    typeof savedProd05.savedAt === "string" &&
    !isNaN(Date.parse(savedProd05.savedAt));
  results.push({
    id: "08",
    test: "08 Save product reference structure",
    passed: pass08,
    details: `Reference schema matches {userId, productId, companyId, businessId, savedAt}`,
  });

  // 09 Save service reference structure
  const pass09 =
    typeof savedServ06.userId === "string" &&
    typeof savedServ06.serviceId === "string" &&
    typeof savedServ06.companyId === "string" &&
    typeof savedServ06.businessId === "string" &&
    typeof savedServ06.savedAt === "string" &&
    !isNaN(Date.parse(savedServ06.savedAt));
  results.push({
    id: "09",
    test: "09 Save service reference structure",
    passed: pass09,
    details: `Reference schema matches {userId, serviceId, companyId, businessId, savedAt}`,
  });

  // 10 Duplicate save company rejected / idempotent
  await saveCompanyReference(user1Uid, "crest-group-materials", "MW-BUS-CREST-GROUP");
  const user1Comps10 = await getSavedCompanies(user1Uid);
  const pass10 = user1Comps10.filter((c) => c.reference.companyId === "crest-group-materials").length === 1;
  results.push({
    id: "10",
    test: "10 Duplicate save company rejected / idempotent",
    passed: pass10,
    details: `Duplicate company save prevented (count=${user1Comps10.length})`,
  });

  // 11 Duplicate save product rejected / idempotent
  await saveProductReference(user1Uid, "prod-cg-01", "crest-group-materials");
  const user1Prods11 = await getSavedProducts(user1Uid);
  const pass11 = user1Prods11.filter((p) => p.reference.productId === "prod-cg-01").length === 1;
  results.push({
    id: "11",
    test: "11 Duplicate save product rejected / idempotent",
    passed: pass11,
    details: `Duplicate product save prevented (count=${user1Prods11.length})`,
  });

  // 12 Duplicate save service rejected / idempotent
  await saveServiceReference(user1Uid, "serv-cg-01", "crest-group-materials");
  const user1Servs12 = await getSavedServices(user1Uid);
  const pass12 = user1Servs12.filter((s) => s.reference.serviceId === "serv-cg-01").length === 1;
  results.push({
    id: "12",
    test: "12 Duplicate save service rejected / idempotent",
    passed: pass12,
    details: `Duplicate service save prevented (count=${user1Servs12.length})`,
  });

  // 13 IsCompanySaved returns true when saved, false when not
  const pass13 =
    isCompanySaved(user1Uid, "crest-group-materials") === true &&
    isCompanySaved(user1Uid, "non-existent-company") === false;
  results.push({
    id: "13",
    test: "13 isCompanySaved predicate check",
    passed: pass13,
    details: "isCompanySaved accurately reflects saved state",
  });

  // 14 IsProductSaved returns true when saved, false when not
  const pass14 =
    isProductSaved(user1Uid, "prod-cg-01") === true &&
    isProductSaved(user1Uid, "non-existent-prod") === false;
  results.push({
    id: "14",
    test: "14 isProductSaved predicate check",
    passed: pass14,
    details: "isProductSaved accurately reflects saved state",
  });

  // 15 IsServiceSaved returns true when saved, false when not
  const pass15 =
    isServiceSaved(user1Uid, "serv-cg-01") === true &&
    isServiceSaved(user1Uid, "non-existent-serv") === false;
  results.push({
    id: "15",
    test: "15 isServiceSaved predicate check",
    passed: pass15,
    details: "isServiceSaved accurately reflects saved state",
  });

  // 16 Remove saved company reference success
  const removeComp16 = await removeSavedCompanyReference(user1Uid, "crest-group-materials");
  const pass16 = removeComp16 === true;
  results.push({
    id: "16",
    test: "16 Remove saved company reference success",
    passed: pass16,
    details: "removeSavedCompanyReference returned true",
  });

  // 17 Remove saved product reference success
  const removeProd17 = await removeSavedProductReference(user1Uid, "prod-cg-01");
  const pass17 = removeProd17 === true;
  results.push({
    id: "17",
    test: "17 Remove saved product reference success",
    passed: pass17,
    details: "removeSavedProductReference returned true",
  });

  // 18 Remove saved service reference success
  const removeServ18 = await removeSavedServiceReference(user1Uid, "serv-cg-01");
  const pass18 = removeServ18 === true;
  results.push({
    id: "18",
    test: "18 Remove saved service reference success",
    passed: pass18,
    details: "removeSavedServiceReference returned true",
  });

  // 19 IsCompanySaved returns false after remove
  const pass19 = isCompanySaved(user1Uid, "crest-group-materials") === false;
  results.push({
    id: "19",
    test: "19 isCompanySaved returns false after remove",
    passed: pass19,
    details: "Company status updated to unsaved",
  });

  // 20 IsProductSaved returns false after remove
  const pass20 = isProductSaved(user1Uid, "prod-cg-01") === false;
  results.push({
    id: "20",
    test: "20 isProductSaved returns false after remove",
    passed: pass20,
    details: "Product status updated to unsaved",
  });

  // 21 IsServiceSaved returns false after remove
  const pass21 = isServiceSaved(user1Uid, "serv-cg-01") === false;
  results.push({
    id: "21",
    test: "21 isServiceSaved returns false after remove",
    passed: pass21,
    details: "Service status updated to unsaved",
  });

  // 22 Canonical company resolution from saved reference
  await saveCompanyReference(user1Uid, "crest-group-materials");
  const resolvedComps22 = await getSavedCompanies(user1Uid);
  const foundComp22 = resolvedComps22.find((c) => c.reference.companyId === "crest-group-materials");
  const compName22 = (foundComp22?.entity as any)?.name || (foundComp22?.entity as any)?.displayName;
  const pass22 =
    foundComp22 !== undefined &&
    foundComp22.isAvailable === true &&
    foundComp22.entity !== null &&
    typeof compName22 === "string" &&
    compName22.length > 0;
  results.push({
    id: "22",
    test: "22 Canonical company resolution from saved reference",
    passed: pass22,
    details: `Resolved company: "${compName22}", isAvailable=${foundComp22?.isAvailable}`,
  });

  // 23 Canonical product resolution from saved reference
  await saveProductReference(user1Uid, "prod-cg-01", "crest-group-materials");
  const resolvedProds23 = await getSavedProducts(user1Uid);
  const foundProd23 = resolvedProds23.find((p) => p.reference.productId === "prod-cg-01");
  const pass23 =
    foundProd23 !== undefined &&
    foundProd23.isAvailable === true &&
    foundProd23.entity !== null &&
    typeof foundProd23.entity.name === "string";
  results.push({
    id: "23",
    test: "23 Canonical product resolution from saved reference",
    passed: pass23,
    details: `Resolved product: "${foundProd23?.entity?.name}", isAvailable=${foundProd23?.isAvailable}`,
  });

  // 24 Canonical service resolution from saved reference
  await saveServiceReference(user1Uid, "serv-cg-01", "crest-group-materials");
  const resolvedServs24 = await getSavedServices(user1Uid);
  const foundServ24 = resolvedServs24.find((s) => s.reference.serviceId === "serv-cg-01");
  const pass24 =
    foundServ24 !== undefined &&
    foundServ24.isAvailable === true &&
    foundServ24.entity !== null &&
    typeof foundServ24.entity.name === "string";
  results.push({
    id: "24",
    test: "24 Canonical service resolution from saved reference",
    passed: pass24,
    details: `Resolved service: "${foundServ24?.entity?.name}", isAvailable=${foundServ24?.isAvailable}`,
  });

  // 25 Nonexistent/deleted company returns isAvailable: false without fabricating entity
  await saveCompanyReference(user1Uid, "non-existent-company-999");
  const resolvedComps25 = await getSavedCompanies(user1Uid);
  const foundComp25 = resolvedComps25.find((c) => c.reference.companyId === "non-existent-company-999");
  const pass25 =
    foundComp25 !== undefined &&
    foundComp25.isAvailable === false &&
    foundComp25.entity === null;
  results.push({
    id: "25",
    test: "25 Nonexistent company returns isAvailable: false",
    passed: pass25,
    details: `Nonexistent company handled correctly: isAvailable=${foundComp25?.isAvailable}, entity=${String(foundComp25?.entity)}`,
  });

  // 26 Nonexistent/deleted product returns isAvailable: false without fabricating entity
  await saveProductReference(user1Uid, "ghost-product-999", "crest-group-materials");
  const resolvedProds26 = await getSavedProducts(user1Uid);
  const foundProd26 = resolvedProds26.find((p) => p.reference.productId === "ghost-product-999");
  const pass26 =
    foundProd26 !== undefined &&
    foundProd26.isAvailable === false &&
    foundProd26.entity === null;
  results.push({
    id: "26",
    test: "26 Nonexistent product returns isAvailable: false",
    passed: pass26,
    details: `Nonexistent product handled correctly: isAvailable=${foundProd26?.isAvailable}, entity=${String(foundProd26?.entity)}`,
  });

  // 27 Nonexistent/deleted service returns isAvailable: false without fabricating entity
  await saveServiceReference(user1Uid, "ghost-service-999", "crest-group-materials");
  const resolvedServs27 = await getSavedServices(user1Uid);
  const foundServ27 = resolvedServs27.find((s) => s.reference.serviceId === "ghost-service-999");
  const pass27 =
    foundServ27 !== undefined &&
    foundServ27.isAvailable === false &&
    foundServ27.entity === null;
  results.push({
    id: "27",
    test: "27 Nonexistent service returns isAvailable: false",
    passed: pass27,
    details: `Nonexistent service handled correctly: isAvailable=${foundServ27?.isAvailable}, entity=${String(foundServ27?.entity)}`,
  });

  // Clean up nonexistent tests
  await removeSavedCompanyReference(user1Uid, "non-existent-company-999");
  await removeSavedProductReference(user1Uid, "ghost-product-999");
  await removeSavedServiceReference(user1Uid, "ghost-service-999");

  // 28 Activity recorded on SAVE_COMPANY
  const acts28 = getUserActivities(user1Uid);
  const pass28 = acts28.some((a) => a.type === "SAVE_COMPANY" && a.targetId === "crest-group-materials");
  results.push({
    id: "28",
    test: "28 Activity recorded on SAVE_COMPANY",
    passed: pass28,
    details: `SAVE_COMPANY activity present in user activity stream`,
  });

  // 29 Activity recorded on SAVE_PRODUCT
  const acts29 = getUserActivities(user1Uid);
  const pass29 = acts29.some((a) => a.type === "SAVE_PRODUCT" && a.targetId === "prod-cg-01");
  results.push({
    id: "29",
    test: "29 Activity recorded on SAVE_PRODUCT",
    passed: pass29,
    details: `SAVE_PRODUCT activity present in user activity stream`,
  });

  // 30 Activity recorded on SAVE_SERVICE
  const acts30 = getUserActivities(user1Uid);
  const pass30 = acts30.some((a) => a.type === "SAVE_SERVICE" && a.targetId === "serv-cg-01");
  results.push({
    id: "30",
    test: "30 Activity recorded on SAVE_SERVICE",
    passed: pass30,
    details: `SAVE_SERVICE activity present in user activity stream`,
  });

  // 31 Activity recorded on UNSAVE_COMPANY
  await removeSavedCompanyReference(user1Uid, "crest-group-materials");
  const acts31 = getUserActivities(user1Uid);
  const pass31 = acts31.some((a) => a.type === "UNSAVE_COMPANY" && a.targetId === "crest-group-materials");
  results.push({
    id: "31",
    test: "31 Activity recorded on UNSAVE_COMPANY",
    passed: pass31,
    details: `UNSAVE_COMPANY activity present in user activity stream`,
  });

  // 32 Activity recorded on UNSAVE_PRODUCT
  await removeSavedProductReference(user1Uid, "prod-cg-01");
  const acts32 = getUserActivities(user1Uid);
  const pass32 = acts32.some((a) => a.type === "UNSAVE_PRODUCT" && a.targetId === "prod-cg-01");
  results.push({
    id: "32",
    test: "32 Activity recorded on UNSAVE_PRODUCT",
    passed: pass32,
    details: `UNSAVE_PRODUCT activity present in user activity stream`,
  });

  // 33 Activity recorded on UNSAVE_SERVICE
  await removeSavedServiceReference(user1Uid, "serv-cg-01");
  const acts33 = getUserActivities(user1Uid);
  const pass33 = acts33.some((a) => a.type === "UNSAVE_SERVICE" && a.targetId === "serv-cg-01");
  results.push({
    id: "33",
    test: "33 Activity recorded on UNSAVE_SERVICE",
    passed: pass33,
    details: `UNSAVE_SERVICE activity present in user activity stream`,
  });

  // 34 Tenant isolation: User A saved items not visible in User B saved items
  await saveCompanyReference(user1Uid, "crest-group-materials");
  await saveProductReference(user1Uid, "prod-cg-01", "crest-group-materials");
  await saveServiceReference(user1Uid, "serv-cg-01", "crest-group-materials");

  const user2Comps34 = await getSavedCompanies(user2Uid);
  const user2Prods34 = await getSavedProducts(user2Uid);
  const user2Servs34 = await getSavedServices(user2Uid);
  const pass34 =
    user2Comps34.length === 0 &&
    user2Prods34.length === 0 &&
    user2Servs34.length === 0;
  results.push({
    id: "34",
    test: "34 Tenant isolation between personal users",
    passed: pass34,
    details: `User 2 saved items count: comps=${user2Comps34.length}, prods=${user2Prods34.length}, servs=${user2Servs34.length}`,
  });

  // 35 Company context switch does NOT clear personal saved items
  setActiveOrganizationContext(user1Uid, "crest-group-materials");
  const user1Comps35 = await getSavedCompanies(user1Uid);
  const user1Prods35 = await getSavedProducts(user1Uid);
  const user1Servs35 = await getSavedServices(user1Uid);
  const pass35 =
    user1Comps35.length === 1 &&
    user1Prods35.length === 1 &&
    user1Servs35.length === 1;
  results.push({
    id: "35",
    test: "35 Company context switch does NOT clear personal saved items",
    passed: pass35,
    details: `Personal saves persist across company context changes (comps=${user1Comps35.length}, prods=${user1Prods35.length}, servs=${user1Servs35.length})`,
  });

  // Clean up
  await signOutCurrentUser();

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    timestamp: new Date().toISOString(),
    mode: "PERSONAL_SAVED_ITEMS",
    passedCount,
    failedCount,
    totalCount: results.length,
    results,
  };
}
