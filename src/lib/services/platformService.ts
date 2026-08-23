import type { PlatformEntity } from "@/lib/types";
import {
  findPlatformById,
  findPlatformByCode,
  findAllPlatforms,
  savePlatform,
} from "@/lib/repositories/platformRepository";

/**
 * Stage 10.6 — Platform Service
 * Canonical business service for global platforms (/platforms/{platformId})
 */

export async function getPlatformById(id: string): Promise<PlatformEntity | null> {
  return findPlatformById(id);
}

export async function getPlatformByCode(code: string): Promise<PlatformEntity | null> {
  return findPlatformByCode(code);
}

export async function listPlatforms(): Promise<PlatformEntity[]> {
  return findAllPlatforms();
}

export async function savePlatformEntity(platform: PlatformEntity): Promise<PlatformEntity> {
  return savePlatform(platform);
}
