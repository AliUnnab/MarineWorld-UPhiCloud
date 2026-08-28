import type { PlatformEntity } from "@/lib/types";
import { db } from "@/lib/firebase";
import { isFirestoreMode } from "./persistenceMode";
import { doc, getDoc, setDoc, getDocs, collection } from "firebase/firestore";

/**
 * Platform Repository
 * Data Access Layer for /platforms/{platformId}
 */

const platformStore = new Map<string, PlatformEntity>();

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
  if (isFirestoreMode() && id) {
    try {
      const docRef = doc(db, "platforms", id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const item = snap.data() as PlatformEntity;
        platformStore.set(id, item);
        return item;
      }
    } catch (err) {
      console.warn(`[PlatformRepository] Firestore findPlatformById fallback for ${id}:`, err);
    }
  }
  return platformStore.get(id) || null;
}

export async function findPlatformByCode(code: string): Promise<PlatformEntity | null> {
  const platforms = await findAllPlatforms();
  return platforms.find((p) => p.code === code) || null;
}

export async function findAllPlatforms(): Promise<PlatformEntity[]> {
  if (isFirestoreMode()) {
    try {
      const snap = await getDocs(collection(db, "platforms"));
      if (!snap.empty) {
        const items = snap.docs.map((d) => d.data() as PlatformEntity);
        items.forEach((p) => platformStore.set(p.id, p));
        return items;
      }
    } catch (err) {
      console.warn("[PlatformRepository] Firestore findAllPlatforms fallback:", err);
    }
  }
  return Array.from(platformStore.values());
}

export async function savePlatform(platform: PlatformEntity): Promise<PlatformEntity> {
  platformStore.set(platform.id, platform);
  if (isFirestoreMode() && platform.id) {
    try {
      const docRef = doc(db, "platforms", platform.id);
      await setDoc(docRef, { ...platform }, { merge: true });
    } catch (err) {
      console.warn(`[PlatformRepository] Firestore savePlatform error for ${platform.id}:`, err);
    }
  }
  return platform;
}
