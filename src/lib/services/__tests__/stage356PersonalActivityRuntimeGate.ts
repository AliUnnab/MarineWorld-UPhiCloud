import {
  signInWithEmail,
  signOutCurrentUser,
} from "@/lib/services/securityService";
import {
  setPersonalVisitorMode,
  setActiveOrganizationContext,
} from "@/lib/services/accessContextService";
import {
  recordPersonalActivity,
  recordCompanyView,
  recordProductView,
  recordServiceView,
  getUserActivities,
  getUserActivitiesFiltered,
  clearUserActivities,
  resolveActivityEntity,
  saveCompanyReference,
  saveProductReference,
  saveServiceReference,
  removeSavedCompanyReference,
  removeSavedProductReference,
  removeSavedServiceReference,
  createCollection,
  renameCollection,
  deleteCollection,
  addItemToCollection,
  removeItemFromCollection,
  getSavedCompanies,
  getSavedProducts,
  getSavedServices,
  getUserCollections,
  clearAllPersonalWorkspaces,
} from "@/lib/services/personalWorkspaceService";
import type {
  PersonalActivityRecord,
  PersonalActivityType,
} from "@/lib/types";

export interface Stage356GateReportItem {
  id: string;
  test: string;
  passed: boolean;
  details: string;
}

export interface Stage356GateReport {
  timestamp: string;
  mode: "PERSONAL_ACTIVITY";
  passedCount: number;
  failedCount: number;
  totalCount: number;
  results: Stage356GateReportItem[];
}

/**
 * Stage 3.5.6 — Personal Recent Activity & Discovery History Runtime Verification Gate
 * Validates the complete personal visitor discovery timeline:
 * - Supported event types: VIEW/SAVE/UNSAVE company, product, service; CREATE/RENAME/DELETE collection, ADD/REMOVE item
 * - Deduplication of rapid VIEW events
 * - Reverse chronological ordering
 * - UI activity category filters (ALL, COMPANIES, PRODUCTS, SERVICES, COLLECTIONS)
 * - Canonical entity resolution with resilient "ITEM NO LONGER AVAILABLE" fallback
 * - Tenant isolation across personal user accounts
 * - Clear activity safety without touching saved items or collections
 */
export async function runStage356PersonalActivityRuntimeGate(): Promise<Stage356GateReport> {
  const results: Stage356GateReportItem[] = [];

  // Clean workspace state
  clearAllPersonalWorkspaces();

  // Primary user
  const user1Email = "elena.vane@marineworld-visitor.org";
  const user1Auth = await signInWithEmail(user1Email, "SecurePass2026!");
  const user1Uid = user1Auth.uid!;
  setPersonalVisitorMode(user1Uid);

  // Secondary user for isolation checks
  const user2Email = "marcus.vance@marineworld-visitor.org";
  const user2Auth = await signInWithEmail(user2Email, "SecurePass2026!");
  const user2Uid = user2Auth.uid!;

  // Canonical sample data
  const canonicalCompanyId = "crest-group-materials";
  const canonicalBusinessId = "MW-COMP-CREST";
  const canonicalCompanyName = "Crest Group Materials";
  const canonicalProductId = "prod-cg-01";
  const canonicalProductName = "Advanced Marine Composite Panel";
  const canonicalServiceId = "serv-cg-01";
  const canonicalServiceName = "Hull Integrity Hydrodynamic Analysis";

  // -------------------------------------------------------------
  // 01: VIEW_COMPANY record structure
  // -------------------------------------------------------------
  clearAllPersonalWorkspaces();
  const act01 = recordPersonalActivity(
    user1Uid,
    "VIEW_COMPANY",
    canonicalCompanyId,
    canonicalCompanyName,
    canonicalCompanyId,
    canonicalBusinessId
  );
  const pass01 =
    act01 !== null &&
    act01.type === "VIEW_COMPANY" &&
    act01.targetId === canonicalCompanyId &&
    act01.targetName === canonicalCompanyName &&
    act01.companyId === canonicalCompanyId &&
    act01.businessId === canonicalBusinessId &&
    typeof act01.timestamp === "string" &&
    typeof act01.id === "string";
  results.push({
    id: "01",
    test: "01 recordPersonalActivity records VIEW_COMPANY with canonical metadata",
    passed: Boolean(pass01),
    details: pass01 ? "VIEW_COMPANY contains valid target, company, and business ID" : "Invalid record",
  });

  // -------------------------------------------------------------
  // 02: recordCompanyView helper
  // -------------------------------------------------------------
  const act02 = recordCompanyView(
    user1Uid,
    "argento-marine-systems",
    "Argento Marine Systems",
    "MW-COMP-ARGENTO"
  );
  const pass02 =
    act02 !== null &&
    act02.type === "VIEW_COMPANY" &&
    act02.targetName === "Argento Marine Systems";
  results.push({
    id: "02",
    test: "02 recordCompanyView helper creates VIEW_COMPANY entry",
    passed: Boolean(pass02),
    details: pass02 ? "Helper correctly records company view" : "Helper returned null",
  });

  // -------------------------------------------------------------
  // 03: VIEW_PRODUCT record structure
  // -------------------------------------------------------------
  const act03 = recordPersonalActivity(
    user1Uid,
    "VIEW_PRODUCT",
    canonicalProductId,
    canonicalProductName,
    canonicalCompanyId,
    canonicalBusinessId
  );
  const pass03 =
    act03 !== null &&
    act03.type === "VIEW_PRODUCT" &&
    act03.targetId === canonicalProductId &&
    act03.companyId === canonicalCompanyId;
  results.push({
    id: "03",
    test: "03 recordPersonalActivity records VIEW_PRODUCT with companyId reference",
    passed: Boolean(pass03),
    details: pass03 ? "VIEW_PRODUCT recorded with target and parent company ID" : "Invalid product record",
  });

  // -------------------------------------------------------------
  // 04: recordProductView helper
  // -------------------------------------------------------------
  const act04 = recordProductView(
    user1Uid,
    canonicalCompanyId,
    "prod-cg-02",
    "High-Tensile Carbon Rigging",
    canonicalBusinessId
  );
  const pass04 =
    act04 !== null &&
    act04.type === "VIEW_PRODUCT" &&
    act04.targetName === "High-Tensile Carbon Rigging";
  results.push({
    id: "04",
    test: "04 recordProductView helper creates VIEW_PRODUCT entry",
    passed: Boolean(pass04),
    details: pass04 ? "Helper recorded product view" : "Product view helper failed",
  });

  // -------------------------------------------------------------
  // 05: VIEW_SERVICE record structure
  // -------------------------------------------------------------
  const act05 = recordPersonalActivity(
    user1Uid,
    "VIEW_SERVICE",
    canonicalServiceId,
    canonicalServiceName,
    canonicalCompanyId,
    canonicalBusinessId
  );
  const pass05 =
    act05 !== null &&
    act05.type === "VIEW_SERVICE" &&
    act05.targetId === canonicalServiceId &&
    act05.companyId === canonicalCompanyId;
  results.push({
    id: "05",
    test: "05 recordPersonalActivity records VIEW_SERVICE with companyId reference",
    passed: Boolean(pass05),
    details: pass05 ? "VIEW_SERVICE recorded with target and parent company ID" : "Invalid service record",
  });

  // -------------------------------------------------------------
  // 06: recordServiceView helper
  // -------------------------------------------------------------
  const act06 = recordServiceView(
    user1Uid,
    canonicalCompanyId,
    "serv-cg-02",
    "Ultrasonic Hull Inspection",
    canonicalBusinessId
  );
  const pass06 =
    act06 !== null &&
    act06.type === "VIEW_SERVICE" &&
    act06.targetName === "Ultrasonic Hull Inspection";
  results.push({
    id: "06",
    test: "06 recordServiceView helper creates VIEW_SERVICE entry",
    passed: Boolean(pass06),
    details: pass06 ? "Helper recorded service view" : "Service view helper failed",
  });

  // -------------------------------------------------------------
  // 07: SAVE_COMPANY auto-recorded on saveCompanyReference
  // -------------------------------------------------------------
  saveCompanyReference(user1Uid, canonicalCompanyId);
  const acts07 = getUserActivities(user1Uid);
  const act07 = acts07.find((a) => a.type === "SAVE_COMPANY" && a.targetId === canonicalCompanyId);
  const pass07 = Boolean(act07 && act07.targetName.length > 0);
  results.push({
    id: "07",
    test: "07 saveCompanyReference automatically records SAVE_COMPANY activity",
    passed: pass07,
    details: pass07 ? `Auto-recorded SAVE_COMPANY for ${act07?.targetName}` : "SAVE_COMPANY not found",
  });

  // -------------------------------------------------------------
  // 08: SAVE_PRODUCT auto-recorded on saveProductReference
  // -------------------------------------------------------------
  saveProductReference(user1Uid, canonicalCompanyId, canonicalProductId);
  const acts08 = getUserActivities(user1Uid);
  const act08 = acts08.find((a) => a.type === "SAVE_PRODUCT" && a.targetId === canonicalProductId);
  const pass08 = Boolean(act08 && act08.companyId === canonicalCompanyId);
  results.push({
    id: "08",
    test: "08 saveProductReference automatically records SAVE_PRODUCT activity",
    passed: pass08,
    details: pass08 ? `Auto-recorded SAVE_PRODUCT for ${act08?.targetName}` : "SAVE_PRODUCT not found",
  });

  // -------------------------------------------------------------
  // 09: SAVE_SERVICE auto-recorded on saveServiceReference
  // -------------------------------------------------------------
  saveServiceReference(user1Uid, canonicalCompanyId, canonicalServiceId);
  const acts09 = getUserActivities(user1Uid);
  const act09 = acts09.find((a) => a.type === "SAVE_SERVICE" && a.targetId === canonicalServiceId);
  const pass09 = Boolean(act09 && act09.companyId === canonicalCompanyId);
  results.push({
    id: "09",
    test: "09 saveServiceReference automatically records SAVE_SERVICE activity",
    passed: pass09,
    details: pass09 ? `Auto-recorded SAVE_SERVICE for ${act09?.targetName}` : "SAVE_SERVICE not found",
  });

  // -------------------------------------------------------------
  // 10: UNSAVE_COMPANY auto-recorded on removeSavedCompanyReference
  // -------------------------------------------------------------
  removeSavedCompanyReference(user1Uid, canonicalCompanyId);
  const acts10 = getUserActivities(user1Uid);
  const act10 = acts10.find((a) => a.type === "UNSAVE_COMPANY" && a.targetId === canonicalCompanyId);
  const pass10 = Boolean(act10);
  results.push({
    id: "10",
    test: "10 removeSavedCompanyReference automatically records UNSAVE_COMPANY activity",
    passed: pass10,
    details: pass10 ? "Auto-recorded UNSAVE_COMPANY" : "UNSAVE_COMPANY not found",
  });

  // -------------------------------------------------------------
  // 11: UNSAVE_PRODUCT auto-recorded on removeSavedProductReference
  // -------------------------------------------------------------
  removeSavedProductReference(user1Uid, canonicalProductId);
  const acts11 = getUserActivities(user1Uid);
  const act11 = acts11.find((a) => a.type === "UNSAVE_PRODUCT" && a.targetId === canonicalProductId);
  const pass11 = Boolean(act11);
  results.push({
    id: "11",
    test: "11 removeSavedProductReference automatically records UNSAVE_PRODUCT activity",
    passed: pass11,
    details: pass11 ? "Auto-recorded UNSAVE_PRODUCT" : "UNSAVE_PRODUCT not found",
  });

  // -------------------------------------------------------------
  // 12: UNSAVE_SERVICE auto-recorded on removeSavedServiceReference
  // -------------------------------------------------------------
  removeSavedServiceReference(user1Uid, canonicalServiceId);
  const acts12 = getUserActivities(user1Uid);
  const act12 = acts12.find((a) => a.type === "UNSAVE_SERVICE" && a.targetId === canonicalServiceId);
  const pass12 = Boolean(act12);
  results.push({
    id: "12",
    test: "12 removeSavedServiceReference automatically records UNSAVE_SERVICE activity",
    passed: pass12,
    details: pass12 ? "Auto-recorded UNSAVE_SERVICE" : "UNSAVE_SERVICE not found",
  });

  // -------------------------------------------------------------
  // 13: CREATE_COLLECTION auto-recorded on createCollection
  // -------------------------------------------------------------
  const col13 = createCollection(user1Uid, "2026 Yacht Refit Project", "Curated equipment");
  const acts13 = getUserActivities(user1Uid);
  const act13 = acts13.find((a) => a.type === "CREATE_COLLECTION" && a.targetId === col13.id);
  const pass13 = Boolean(act13 && act13.targetName === "2026 Yacht Refit Project");
  results.push({
    id: "13",
    test: "13 createCollection automatically records CREATE_COLLECTION activity",
    passed: pass13,
    details: pass13 ? `Auto-recorded CREATE_COLLECTION for ${col13.name}` : "CREATE_COLLECTION not found",
  });

  // -------------------------------------------------------------
  // 14: RENAME_COLLECTION auto-recorded on renameCollection
  // -------------------------------------------------------------
  renameCollection(user1Uid, col13.id, "2026 Superyacht Refit Scope");
  const acts14 = getUserActivities(user1Uid);
  const act14 = acts14.find((a) => a.type === "RENAME_COLLECTION" && a.targetId === col13.id);
  const pass14 = Boolean(act14 && act14.targetName === "2026 Superyacht Refit Scope");
  results.push({
    id: "14",
    test: "14 renameCollection automatically records RENAME_COLLECTION activity",
    passed: pass14,
    details: pass14 ? `Auto-recorded RENAME_COLLECTION for "${act14?.targetName}"` : "RENAME_COLLECTION not found",
  });

  // -------------------------------------------------------------
  // 15: DELETE_COLLECTION auto-recorded on deleteCollection
  // -------------------------------------------------------------
  const col15 = createCollection(user1Uid, "Temporary Vendor Shortlist");
  deleteCollection(user1Uid, col15.id);
  const acts15 = getUserActivities(user1Uid);
  const act15 = acts15.find((a) => a.type === "DELETE_COLLECTION" && a.targetId === col15.id);
  const pass15 = Boolean(act15 && act15.targetName === "Temporary Vendor Shortlist");
  results.push({
    id: "15",
    test: "15 deleteCollection automatically records DELETE_COLLECTION activity",
    passed: pass15,
    details: pass15 ? "Auto-recorded DELETE_COLLECTION" : "DELETE_COLLECTION not found",
  });

  // -------------------------------------------------------------
  // 16: ADD_TO_COLLECTION auto-recorded on addItemToCollection
  // -------------------------------------------------------------
  addItemToCollection(user1Uid, col13.id, "product", canonicalProductId, canonicalCompanyId);
  const acts16 = getUserActivities(user1Uid);
  const act16 = acts16.find((a) => a.type === "ADD_TO_COLLECTION" && a.targetId === canonicalProductId);
  const pass16 = Boolean(act16 && act16.collectionId === col13.id);
  results.push({
    id: "16",
    test: "16 addItemToCollection automatically records ADD_TO_COLLECTION activity with collectionId",
    passed: pass16,
    details: pass16 ? `Auto-recorded ADD_TO_COLLECTION with collectionId: ${act16?.collectionId}` : "ADD_TO_COLLECTION not found",
  });

  // -------------------------------------------------------------
  // 17: REMOVE_FROM_COLLECTION auto-recorded on removeItemFromCollection
  // -------------------------------------------------------------
  removeItemFromCollection(user1Uid, col13.id, canonicalProductId);
  const acts17 = getUserActivities(user1Uid);
  const act17 = acts17.find((a) => a.type === "REMOVE_FROM_COLLECTION" && a.targetId === canonicalProductId);
  const pass17 = Boolean(act17 && act17.collectionId === col13.id);
  results.push({
    id: "17",
    test: "17 removeItemFromCollection automatically records REMOVE_FROM_COLLECTION activity",
    passed: pass17,
    details: pass17 ? "Auto-recorded REMOVE_FROM_COLLECTION" : "REMOVE_FROM_COLLECTION not found",
  });

  // -------------------------------------------------------------
  // 18: Rapid VIEW_COMPANY deduplication
  // -------------------------------------------------------------
  clearAllPersonalWorkspaces();
  const testCompanySlug = "test-dedup-company";
  recordCompanyView(user1Uid, testCompanySlug, "Test Dedup Co", "MW-COMP-TEST");
  const countBefore18 = getUserActivities(user1Uid).length;
  // Trigger 4 immediate repeat views
  recordCompanyView(user1Uid, testCompanySlug, "Test Dedup Co", "MW-COMP-TEST");
  recordCompanyView(user1Uid, testCompanySlug, "Test Dedup Co", "MW-COMP-TEST");
  recordCompanyView(user1Uid, testCompanySlug, "Test Dedup Co", "MW-COMP-TEST");
  recordCompanyView(user1Uid, testCompanySlug, "Test Dedup Co", "MW-COMP-TEST");
  const countAfter18 = getUserActivities(user1Uid).length;
  const pass18 = countBefore18 === 1 && countAfter18 === 1;
  results.push({
    id: "18",
    test: "18 Rapid repeated VIEW_COMPANY calls within deduplication window do not duplicate",
    passed: pass18,
    details: pass18 ? "Deduplication prevented redundant company view flood" : `Expected 1 record, found ${countAfter18}`,
  });

  // -------------------------------------------------------------
  // 19: Rapid VIEW_PRODUCT deduplication
  // -------------------------------------------------------------
  const testProdId = "prod-dedup-01";
  recordProductView(user1Uid, testCompanySlug, testProdId, "Dedup Propeller", "MW-COMP-TEST");
  const countBefore19 = getUserActivities(user1Uid).length;
  recordProductView(user1Uid, testCompanySlug, testProdId, "Dedup Propeller", "MW-COMP-TEST");
  recordProductView(user1Uid, testCompanySlug, testProdId, "Dedup Propeller", "MW-COMP-TEST");
  const countAfter19 = getUserActivities(user1Uid).length;
  const pass19 = countBefore19 === 2 && countAfter19 === 2;
  results.push({
    id: "19",
    test: "19 Rapid repeated VIEW_PRODUCT calls within deduplication window do not duplicate",
    passed: pass19,
    details: pass19 ? "Deduplication prevented redundant product view flood" : "Product deduplication failed",
  });

  // -------------------------------------------------------------
  // 20: Rapid VIEW_SERVICE deduplication
  // -------------------------------------------------------------
  const testServId = "serv-dedup-01";
  recordServiceView(user1Uid, testCompanySlug, testServId, "Dedup Survey", "MW-COMP-TEST");
  const countBefore20 = getUserActivities(user1Uid).length;
  recordServiceView(user1Uid, testCompanySlug, testServId, "Dedup Survey", "MW-COMP-TEST");
  recordServiceView(user1Uid, testCompanySlug, testServId, "Dedup Survey", "MW-COMP-TEST");
  const countAfter20 = getUserActivities(user1Uid).length;
  const pass20 = countBefore20 === 3 && countAfter20 === 3;
  results.push({
    id: "20",
    test: "20 Rapid repeated VIEW_SERVICE calls within deduplication window do not duplicate",
    passed: pass20,
    details: pass20 ? "Deduplication prevented redundant service view flood" : "Service deduplication failed",
  });

  // -------------------------------------------------------------
  // 21: Non-view actions are NOT throttled by view deduplication
  // -------------------------------------------------------------
  const col21 = createCollection(user1Uid, "Dedup Bypass 1");
  const col21b = createCollection(user1Uid, "Dedup Bypass 2");
  const acts21 = getUserActivities(user1Uid);
  const creates = acts21.filter((a) => a.type === "CREATE_COLLECTION");
  const pass21 = creates.length >= 2;
  results.push({
    id: "21",
    test: "21 Non-view actions (e.g. collection operations) are not blocked by view deduplication",
    passed: pass21,
    details: pass21 ? `Multiple distinct collection actions correctly stored: ${creates.length}` : "Non-view action throttled",
  });

  // -------------------------------------------------------------
  // 22: Reverse chronological ordering
  // -------------------------------------------------------------
  const allActs22 = getUserActivities(user1Uid);
  let isSortedDescending = true;
  for (let i = 0; i < allActs22.length - 1; i++) {
    if (allActs22[i].timestamp < allActs22[i + 1].timestamp) {
      isSortedDescending = false;
      break;
    }
  }
  const pass22 = allActs22.length > 1 && isSortedDescending;
  results.push({
    id: "22",
    test: "22 getUserActivities returns records in reverse chronological order (newest first)",
    passed: pass22,
    details: pass22 ? `Chronologically ordered ${allActs22.length} records verified` : "Ordering mismatch",
  });

  // -------------------------------------------------------------
  // 23: getUserActivitiesFiltered with "ALL"
  // -------------------------------------------------------------
  const allFiltered23 = getUserActivitiesFiltered(user1Uid, "ALL");
  const pass23 = allFiltered23.length === allActs22.length;
  results.push({
    id: "23",
    test: "23 getUserActivitiesFiltered with 'ALL' returns entire activity history",
    passed: pass23,
    details: pass23 ? `Returned ${allFiltered23.length} items for ALL filter` : "Count mismatch",
  });

  // -------------------------------------------------------------
  // 24: getUserActivitiesFiltered with "COMPANIES"
  // -------------------------------------------------------------
  const compFiltered24 = getUserActivitiesFiltered(user1Uid, "COMPANIES");
  const allAreComp24 = compFiltered24.every((a) => a.type.includes("COMPANY"));
  const pass24 = compFiltered24.length > 0 && allAreComp24;
  results.push({
    id: "24",
    test: "24 getUserActivitiesFiltered with 'COMPANIES' returns only company-related activities",
    passed: pass24,
    details: pass24 ? `Filtered ${compFiltered24.length} company activities` : "Company filter failed",
  });

  // -------------------------------------------------------------
  // 25: getUserActivitiesFiltered with "PRODUCTS"
  // -------------------------------------------------------------
  const prodFiltered25 = getUserActivitiesFiltered(user1Uid, "PRODUCTS");
  const allAreProd25 = prodFiltered25.every((a) => a.type.includes("PRODUCT"));
  const pass25 = prodFiltered25.length > 0 && allAreProd25;
  results.push({
    id: "25",
    test: "25 getUserActivitiesFiltered with 'PRODUCTS' returns only product-related activities",
    passed: pass25,
    details: pass25 ? `Filtered ${prodFiltered25.length} product activities` : "Product filter failed",
  });

  // -------------------------------------------------------------
  // 26: getUserActivitiesFiltered with "SERVICES"
  // -------------------------------------------------------------
  const servFiltered26 = getUserActivitiesFiltered(user1Uid, "SERVICES");
  const allAreServ26 = servFiltered26.every((a) => a.type.includes("SERVICE"));
  const pass26 = servFiltered26.length > 0 && allAreServ26;
  results.push({
    id: "26",
    test: "26 getUserActivitiesFiltered with 'SERVICES' returns only service-related activities",
    passed: pass26,
    details: pass26 ? `Filtered ${servFiltered26.length} service activities` : "Service filter failed",
  });

  // -------------------------------------------------------------
  // 27: getUserActivitiesFiltered with "COLLECTIONS"
  // -------------------------------------------------------------
  const colFiltered27 = getUserActivitiesFiltered(user1Uid, "COLLECTIONS");
  const allAreCol27 = colFiltered27.every((a) => a.type.includes("COLLECTION"));
  const pass27 = colFiltered27.length > 0 && allAreCol27;
  results.push({
    id: "27",
    test: "27 getUserActivitiesFiltered with 'COLLECTIONS' returns only collection-related activities",
    passed: pass27,
    details: pass27 ? `Filtered ${colFiltered27.length} collection activities` : "Collection filter failed",
  });

  // -------------------------------------------------------------
  // 28: resolveActivityEntity for Company
  // -------------------------------------------------------------
  const compAct28: PersonalActivityRecord = {
    id: "act-res-comp",
    type: "VIEW_COMPANY",
    targetId: canonicalCompanyId,
    targetName: canonicalCompanyName,
    companyId: canonicalCompanyId,
    businessId: canonicalBusinessId,
    userId: user1Uid,
    timestamp: new Date().toISOString(),
  };
  const resolved28 = resolveActivityEntity(compAct28);
  const pass28 = resolved28.isAvailable && resolved28.entity !== null;
  results.push({
    id: "28",
    test: "28 resolveActivityEntity resolves canonical company record with isAvailable: true",
    passed: pass28,
    details: pass28 ? `Resolved company: ${(resolved28.entity as any)?.name}` : "Company resolution failed",
  });

  // -------------------------------------------------------------
  // 29: resolveActivityEntity for Product
  // -------------------------------------------------------------
  const prodAct29: PersonalActivityRecord = {
    id: "act-res-prod",
    type: "VIEW_PRODUCT",
    targetId: canonicalProductId,
    targetName: canonicalProductName,
    companyId: canonicalCompanyId,
    userId: user1Uid,
    timestamp: new Date().toISOString(),
  };
  const resolved29 = resolveActivityEntity(prodAct29);
  const pass29 = resolved29.isAvailable && resolved29.entity !== null;
  results.push({
    id: "29",
    test: "29 resolveActivityEntity resolves canonical product record with isAvailable: true",
    passed: pass29,
    details: pass29 ? `Resolved product: ${(resolved29.entity as any)?.name}` : "Product resolution failed",
  });

  // -------------------------------------------------------------
  // 30: resolveActivityEntity for Service
  // -------------------------------------------------------------
  const servAct30: PersonalActivityRecord = {
    id: "act-res-serv",
    type: "VIEW_SERVICE",
    targetId: canonicalServiceId,
    targetName: canonicalServiceName,
    companyId: canonicalCompanyId,
    userId: user1Uid,
    timestamp: new Date().toISOString(),
  };
  const resolved30 = resolveActivityEntity(servAct30);
  const pass30 = resolved30.isAvailable && resolved30.entity !== null;
  results.push({
    id: "30",
    test: "30 resolveActivityEntity resolves canonical service record with isAvailable: true",
    passed: pass30,
    details: pass30 ? `Resolved service: ${(resolved30.entity as any)?.name}` : "Service resolution failed",
  });

  // -------------------------------------------------------------
  // 31: resolveActivityEntity for Non-existent entity
  // -------------------------------------------------------------
  const missingAct31: PersonalActivityRecord = {
    id: "act-res-missing",
    type: "VIEW_PRODUCT",
    targetId: "non-existent-product-999",
    targetName: "Decommissioned Product",
    companyId: canonicalCompanyId,
    userId: user1Uid,
    timestamp: new Date().toISOString(),
  };
  const resolved31 = resolveActivityEntity(missingAct31);
  const pass31 = resolved31.isAvailable === false && resolved31.entity === null;
  results.push({
    id: "31",
    test: "31 resolveActivityEntity safely flags unavailable entities without runtime exceptions",
    passed: pass31,
    details: pass31 ? "Unavailable entity handled gracefully (isAvailable: false)" : "Failed unavailable check",
  });

  // -------------------------------------------------------------
  // 32: Tenant isolation across personal accounts
  // -------------------------------------------------------------
  // User 1 has records from above. Check user 2's activity store.
  const user2Acts32 = getUserActivities(user2Uid);
  const pass32 = user2Acts32.length === 0;
  results.push({
    id: "32",
    test: "32 Tenant isolation: User 1 activities are completely isolated from User 2",
    passed: pass32,
    details: pass32 ? "User 2 has 0 leaked activities from User 1" : "Tenant isolation violated",
  });

  // -------------------------------------------------------------
  // 33: Unauthenticated / empty userId handling
  // -------------------------------------------------------------
  let pass33 = false;
  try {
    const act33 = recordPersonalActivity("", "VIEW_COMPANY", "test", "test");
    // If it returns null or throws, it passed
    if (act33 === null) pass33 = true;
  } catch (e: any) {
    pass33 = true;
  }
  results.push({
    id: "33",
    test: "33 Unauthenticated / empty userId activity operations are safely rejected",
    passed: pass33,
    details: pass33 ? "Empty user ID rejected safely without store pollution" : "Unauthenticated call allowed",
  });

  // -------------------------------------------------------------
  // 34: Organization context independence
  // -------------------------------------------------------------
  // Switching company org context does not leak into or alter personal activity
  setActiveOrganizationContext(user1Uid, "mw-org-crest-group");
  const acts34Before = getUserActivities(user1Uid).length;
  recordCompanyView(user1Uid, "navis-autonomous", "Navis Autonomous", "MW-COMP-NAVIS");
  const acts34After = getUserActivities(user1Uid).length;
  const pass34 = acts34After === acts34Before + 1;
  // Restore visitor mode
  setPersonalVisitorMode(user1Uid);
  results.push({
    id: "34",
    test: "34 Personal activity operates independently of company or organization context",
    passed: pass34,
    details: pass34 ? "Personal activity recorded correctly in all context modes" : "Context interference detected",
  });

  // -------------------------------------------------------------
  // 35: Clear activity safety without touching saved items/collections
  // -------------------------------------------------------------
  // Add saved company and collection to verify persistence after activity clear
  await saveCompanyReference(user1Uid, canonicalCompanyId);
  const testCol35 = createCollection(user1Uid, "Safety Verification Collection");
  const savedCompaniesBefore35 = await getSavedCompanies(user1Uid);
  const collectionsBefore35 = getUserCollections(user1Uid);
  const activityCountBefore35 = getUserActivities(user1Uid).length;

  clearUserActivities(user1Uid);

  const activityCountAfter35 = getUserActivities(user1Uid).length;
  const savedCompaniesAfter35 = await getSavedCompanies(user1Uid);
  const collectionsAfter35 = getUserCollections(user1Uid);

  const pass35 =
    activityCountBefore35 > 0 &&
    activityCountAfter35 === 0 &&
    savedCompaniesAfter35.length === savedCompaniesBefore35.length &&
    collectionsAfter35.length === collectionsBefore35.length;

  results.push({
    id: "35",
    test: "35 clearUserActivities clears activity log without deleting saved items or collections",
    passed: pass35,
    details: pass35
      ? "Activities cleared to 0 while saved companies and collections remain intact"
      : "Clear activity safety check failed",
  });

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return {
    timestamp: new Date().toISOString(),
    mode: "PERSONAL_ACTIVITY",
    passedCount,
    failedCount,
    totalCount: results.length,
    results,
  };
}
