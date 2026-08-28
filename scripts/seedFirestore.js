#!/usr/bin/env node

/**
 * Runner wrapper for scripts/seedFirestore.ts
 */
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tsScript = path.join(__dirname, "seedFirestore.ts");

const proc = spawn("npx", ["tsx", tsScript], {
  stdio: "inherit",
  env: process.env,
});

proc.on("close", (code) => {
  process.exit(code || 0);
});
