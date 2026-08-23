import {
  evaluateFirestoreAccess,
  registerCompanyMember,
  type AuthContext,
} from "@/lib/services/securityService";

/**
 * Stage 10.5 — Security & Multi-Tenant Isolation Validation Test Suite
 * Executes deterministic evaluation for Tests 01 through 20 of the Multi-Tenant Security Matrix.
 */

export interface TestResult {
  testId: string;
  name: string;
  passed: boolean;
  expectedAllowed: boolean;
  actualAllowed: boolean;
  reason: string;
}

export function runSecurityValidationSuite(): {
  allPassed: boolean;
  total: number;
  passedCount: number;
  results: TestResult[];
} {
  // Setup Test Memberships
  const authUnauth: AuthContext = { uid: null };

  const authUserA1Owner: AuthContext = { uid: "user-a1-owner", email: "owner@compa.com" };
  const authUserA2Admin: AuthContext = { uid: "user-a2-admin", email: "admin@compa.com" };
  const authUserA3Manager: AuthContext = { uid: "user-a3-manager", email: "manager@compa.com" };
  const authUserA4Sales: AuthContext = { uid: "user-a4-sales", email: "sales@compa.com" };
  const authUserA5Member: AuthContext = { uid: "user-a5-member", email: "member@compa.com" };

  const authUserB1Owner: AuthContext = { uid: "user-b1-owner", email: "owner@compb.com" };

  // Register fixtures
  registerCompanyMember({
    userId: "user-a1-owner",
    companyId: "comp-001",
    role: "OWNER",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  });

  registerCompanyMember({
    userId: "user-a2-admin",
    companyId: "comp-001",
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  });

  registerCompanyMember({
    userId: "user-a3-manager",
    companyId: "comp-001",
    role: "MANAGER",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  });

  registerCompanyMember({
    userId: "user-a4-sales",
    companyId: "comp-001",
    role: "SALES",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  });

  registerCompanyMember({
    userId: "user-a5-member",
    companyId: "comp-001",
    role: "MEMBER",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  });

  registerCompanyMember({
    userId: "user-b1-owner",
    companyId: "comp-002",
    role: "OWNER",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  });

  const testCases: {
    testId: string;
    name: string;
    path: string;
    operation: "read" | "create" | "update" | "delete";
    auth: AuthContext;
    resourceData?: Record<string, any>;
    requestData?: Record<string, any>;
    expectedAllowed: boolean;
  }[] = [
    {
      testId: "TEST 01",
      name: "Unauthenticated user reads public company profile",
      path: "/companies/comp-001",
      operation: "read",
      auth: authUnauth,
      expectedAllowed: true,
    },
    {
      testId: "TEST 02",
      name: "Unauthenticated user writes company profile",
      path: "/companies/comp-001",
      operation: "update",
      auth: authUnauth,
      requestData: { id: "comp-001", name: "Hacked Name" },
      expectedAllowed: false,
    },
    {
      testId: "TEST 03",
      name: "Company A member reads Company B private node",
      path: "/companies/comp-002/nodes/node-priv",
      operation: "read",
      auth: authUserA5Member,
      resourceData: { visibility: "PRIVATE", companyId: "comp-002" },
      expectedAllowed: false,
    },
    {
      testId: "TEST 04",
      name: "Company A member writes Company B product",
      path: "/companies/comp-002/products/prod-100",
      operation: "create",
      auth: authUserA5Member,
      requestData: { companyId: "comp-002", name: "Malicious Prod" },
      expectedAllowed: false,
    },
    {
      testId: "TEST 05",
      name: "Company A ADMIN updates Company A product",
      path: "/companies/comp-001/products/prod-001",
      operation: "update",
      auth: authUserA2Admin,
      resourceData: { id: "prod-001", companyId: "comp-001" },
      requestData: { id: "prod-001", companyId: "comp-001", name: "Updated Prod" },
      expectedAllowed: true,
    },
    {
      testId: "TEST 06",
      name: "Company A MANAGER updates Company A product",
      path: "/companies/comp-001/products/prod-001",
      operation: "update",
      auth: authUserA3Manager,
      resourceData: { id: "prod-001", companyId: "comp-001" },
      requestData: { id: "prod-001", companyId: "comp-001", name: "Updated Prod" },
      expectedAllowed: true,
    },
    {
      testId: "TEST 07",
      name: "Company A MEMBER attempts to promote own role to ADMIN",
      path: "/companies/comp-001/members/user-a5-member",
      operation: "update",
      auth: authUserA5Member,
      resourceData: { userId: "user-a5-member", companyId: "comp-001", role: "MEMBER" },
      requestData: { userId: "user-a5-member", companyId: "comp-001", role: "ADMIN" },
      expectedAllowed: false,
    },
    {
      testId: "TEST 08",
      name: "Company A member assigns themselves OWNER without existing OWNER role",
      path: "/companies/comp-001/members/user-a2-admin",
      operation: "update",
      auth: authUserA2Admin,
      resourceData: { userId: "user-a2-admin", companyId: "comp-001", role: "ADMIN" },
      requestData: { userId: "user-a2-admin", companyId: "comp-001", role: "OWNER" },
      expectedAllowed: false,
    },
    {
      testId: "TEST 09",
      name: "Company A SALES user creates legitimate Connect record",
      path: "/companies/comp-001/connect/conn-001",
      operation: "create",
      auth: authUserA4Sales,
      requestData: { id: "conn-001", companyId: "comp-001", toCompanyId: "comp-001", fromUserId: "user-a4-sales" },
      expectedAllowed: true,
    },
    {
      testId: "TEST 10",
      name: "Company A SALES user creates Connect record forging sender as Company B user",
      path: "/companies/comp-001/connect/conn-002",
      operation: "create",
      auth: authUserA4Sales,
      requestData: { id: "conn-002", companyId: "comp-001", toCompanyId: "comp-001", fromUserId: "user-b1-owner" },
      expectedAllowed: false,
    },
    {
      testId: "TEST 11",
      name: "Company A member reads Company B AI interaction log",
      path: "/aiInteractions/ai-int-002",
      operation: "read",
      auth: authUserA5Member,
      resourceData: { userId: "user-b1-owner", companyId: "comp-002" },
      expectedAllowed: false,
    },
    {
      testId: "TEST 12",
      name: "Unauthenticated user reads AI interaction log",
      path: "/aiInteractions/ai-int-001",
      operation: "read",
      auth: authUnauth,
      resourceData: { userId: "user-a1-owner", companyId: "comp-001" },
      expectedAllowed: false,
    },
    {
      testId: "TEST 13",
      name: "Unauthenticated user writes platform registry",
      path: "/platforms/marineworld",
      operation: "update",
      auth: authUnauth,
      requestData: { name: "Hacked Platform" },
      expectedAllowed: false,
    },
    {
      testId: "TEST 14",
      name: "Authenticated user writes sector registry",
      path: "/sectors/shipbuilding",
      operation: "update",
      auth: authUserA1Owner,
      requestData: { name: "Hacked Sector" },
      expectedAllowed: false,
    },
    {
      testId: "TEST 15",
      name: "Company OWNER updates Company A company profile",
      path: "/companies/comp-001",
      operation: "update",
      auth: authUserA1Owner,
      resourceData: { id: "comp-001", platformId: "marineworld", sectorId: "shipbuilding", primarySectorCityId: "marineworld" },
      requestData: { id: "comp-001", platformId: "marineworld", sectorId: "shipbuilding", primarySectorCityId: "marineworld", legalName: "Marine Dynamics Corp" },
      expectedAllowed: true,
    },
    {
      testId: "TEST 16",
      name: "Company ADMIN deletes non-owner Company A member",
      path: "/companies/comp-001/members/user-a5-member",
      operation: "delete",
      auth: authUserA2Admin,
      resourceData: { userId: "user-a5-member", companyId: "comp-001", role: "MEMBER" },
      expectedAllowed: true,
    },
    {
      testId: "TEST 17",
      name: "Company ADMIN deletes target OWNER",
      path: "/companies/comp-001/members/user-a1-owner",
      operation: "delete",
      auth: authUserA2Admin,
      resourceData: { userId: "user-a1-owner", companyId: "comp-001", role: "OWNER" },
      expectedAllowed: false,
    },
    {
      testId: "TEST 18",
      name: "User changes membership companyId",
      path: "/companies/comp-001/members/user-a3-manager",
      operation: "update",
      auth: authUserA2Admin,
      resourceData: { userId: "user-a3-manager", companyId: "comp-001", role: "MANAGER" },
      requestData: { userId: "user-a3-manager", companyId: "comp-002", role: "MANAGER" },
      expectedAllowed: false,
    },
    {
      testId: "TEST 19",
      name: "User changes product companyId",
      path: "/companies/comp-001/products/prod-001",
      operation: "update",
      auth: authUserA2Admin,
      resourceData: { id: "prod-001", companyId: "comp-001" },
      requestData: { id: "prod-001", companyId: "comp-002" },
      expectedAllowed: false,
    },
    {
      testId: "TEST 20",
      name: "User changes node companyId",
      path: "/companies/comp-001/nodes/node-001",
      operation: "update",
      auth: authUserA2Admin,
      resourceData: { id: "node-001", companyId: "comp-001" },
      requestData: { id: "node-001", companyId: "comp-002" },
      expectedAllowed: false,
    },
  ];

  const results: TestResult[] = testCases.map((tc) => {
    const res = evaluateFirestoreAccess(
      tc.path,
      tc.operation,
      tc.auth,
      tc.resourceData,
      tc.requestData
    );

    const passed = res.allowed === tc.expectedAllowed;
    return {
      testId: tc.testId,
      name: tc.name,
      passed,
      expectedAllowed: tc.expectedAllowed,
      actualAllowed: res.allowed,
      reason: res.reason,
    };
  });

  const passedCount = results.filter((r) => r.passed).length;
  const allPassed = passedCount === results.length;

  return {
    allPassed,
    total: results.length,
    passedCount,
    results,
  };
}
