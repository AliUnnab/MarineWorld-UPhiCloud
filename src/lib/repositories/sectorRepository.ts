import type { SectorEntity } from "@/lib/types";
import { db } from "@/lib/firebase";
import { isFirestoreMode } from "./persistenceMode";
import { doc, getDoc, setDoc, getDocs, collection } from "firebase/firestore";

/**
 * Sector Repository
 * Data Access Layer for /sectors/{sectorId}
 */

const sectorStore = new Map<string, SectorEntity>();

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
  if (isFirestoreMode() && id) {
    try {
      const docRef = doc(db, "sectors", id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const item = snap.data() as SectorEntity;
        sectorStore.set(id, item);
        return item;
      }
    } catch (err) {
      console.warn(`[SectorRepository] Firestore findSectorById fallback for ${id}:`, err);
    }
  }
  return sectorStore.get(id) || null;
}

export async function findSectorBySlug(slug: string): Promise<SectorEntity | null> {
  const sectors = await findAllSectors();
  return sectors.find((s) => s.slug === slug || s.id === slug) || null;
}

export async function findAllSectors(): Promise<SectorEntity[]> {
  if (isFirestoreMode()) {
    try {
      const snap = await getDocs(collection(db, "sectors"));
      if (!snap.empty) {
        const items = snap.docs.map((d) => d.data() as SectorEntity);
        items.forEach((s) => sectorStore.set(s.id, s));
        return items;
      }
    } catch (err) {
      console.warn("[SectorRepository] Firestore findAllSectors fallback:", err);
    }
  }
  return Array.from(sectorStore.values());
}

export async function saveSector(sector: SectorEntity): Promise<SectorEntity> {
  sectorStore.set(sector.id, sector);
  if (isFirestoreMode() && sector.id) {
    try {
      const docRef = doc(db, "sectors", sector.id);
      await setDoc(docRef, { ...sector }, { merge: true });
    } catch (err) {
      console.warn(`[SectorRepository] Firestore saveSector error for ${sector.id}:`, err);
    }
  }
  return sector;
}
