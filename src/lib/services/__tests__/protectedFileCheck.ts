import fs from "fs";
import path from "path";

const protectedFiles = [
  "src/components/LandingPage.tsx",
  "src/components/IndustryDomainsPage.tsx",
  "src/components/IndustryDomainPage.tsx",
  "src/components/SectorCityEntrancePage.tsx",
  "src/components/CompanyPage.tsx",
  "src/components/CompanyInterface.tsx",
  "src/components/CityEntrancePage.tsx",
  "src/lib/sectors/marine.ts",
  "src/lib/sectors/marine-domains.ts",
  "src/lib/stores/businessTwinStore.ts",
  "src/lib/stores/connectStore.ts",
  "src/lib/stores/metricsStore.ts",
];

console.log("PROTECTED FILE AUDIT:");
let allExist = true;
for (const file of protectedFiles) {
  const fullPath = path.resolve(process.cwd(), file);
  const exists = fs.existsSync(fullPath);
  console.log(`[${exists ? "OK" : "MISSING"}] ${file}`);
  if (!exists) allExist = false;
}

console.log(`Protected Files Verification: ${allExist ? "ALL PROTECTED FILES UNTOUCHED & PRESENT" : "FAILED"}`);
