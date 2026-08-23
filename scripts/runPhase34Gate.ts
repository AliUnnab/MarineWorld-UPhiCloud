import { runPhase34CompanyActivationRuntimeGate } from "../src/lib/services/__tests__/phase34CompanyActivationRuntimeGate";

async function main() {
  console.log("==================================================");
  console.log("PHASE 3.4B — COMPANY ACTIVATION & LIFECYCLE RUNTIME GATE");
  console.log("==================================================");

  const summary = await runPhase34CompanyActivationRuntimeGate();

  console.log(`\nTotal Tests: ${summary.totalCount}`);
  console.log(`Passed:      ${summary.passedCount}`);
  console.log(`Failed:      ${summary.failedCount}`);
  console.log("--------------------------------------------------");

  for (const res of summary.results) {
    const statusStr = res.passed ? "PASS" : "FAIL";
    console.log(`[${statusStr}] ${res.id}: ${res.description}`);
    if (!res.passed && res.error) {
      console.log(`       ERROR: ${res.error}`);
    }
  }

  console.log("==================================================");

  if (summary.failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
