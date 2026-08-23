import type { SectorEntity } from "@/lib/types";

/**
 * Stage 10.6 — Sector Repository
 * Data Access Layer for /sectors/{sectorId}
 */

const sectorStore = new Map<string, SectorEntity>();

// Seed default sector
const DEFAULT_SECTOR: SectorEntity = {
  id: "marine",
  platformId: "marineworld",
  code: "SECTOR-MAR",
  slug: "marine",
  name: "Marine & Maritime",
  displayName: "Marine Industry Sector",
  description: "Global Maritime & Ocean Economy Sector",
  status: "ACTIVE",
  icon: "anchor",
  taxonomyVersion: "v1.0",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

sectorStore.set(DEFAULT_SECTOR.id, DEFAULT_SECTOR);

export async function findSectorById(id: string): Promise<SectorEntity | null> {
  return sectorStore.get(id) || null;
}

export async function findSectorBySlug(slug: string): Promise<SectorEntity | null> {
  const sectors = Array.from(sectorStore.values());
  return sectors.find((s) => s.slug === slug) || null;
}

export async function findAllSectors(): Promise<SectorEntity[]> {
  return Array.from(sectorStore.values());
}

export async function saveSector(sector: SectorEntity): Promise<SectorEntity> {
  sectorStore.set(sector.id, sector);
  return sector;
}
