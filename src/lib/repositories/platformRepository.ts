import type { PlatformEntity } from "@/lib/types";

/**
 * Stage 10.6 — Platform Repository
 * Data Access Layer for /platforms/{platformId}
 */

const platformStore = new Map<string, PlatformEntity>();

// Seed default platform
const DEFAULT_PLATFORM: PlatformEntity = {
  id: "marineworld",
  code: "PLATFORM-MW",
  name: "marineworld",
  displayName: "MarineWorld.City",
  canonicalDomain: "marineworld.city",
  status: "ACTIVE",
  defaultLanguage: "en",
  supportedSectors: ["marine"],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

platformStore.set(DEFAULT_PLATFORM.id, DEFAULT_PLATFORM);

export async function findPlatformById(id: string): Promise<PlatformEntity | null> {
  return platformStore.get(id) || null;
}

export async function findPlatformByCode(code: string): Promise<PlatformEntity | null> {
  const platforms = Array.from(platformStore.values());
  return platforms.find((p) => p.code === code) || null;
}

export async function findAllPlatforms(): Promise<PlatformEntity[]> {
  return Array.from(platformStore.values());
}

export async function savePlatform(platform: PlatformEntity): Promise<PlatformEntity> {
  platformStore.set(platform.id, platform);
  return platform;
}
