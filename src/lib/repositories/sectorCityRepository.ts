import type { SectorCityEntity } from "@/lib/types";
import { db } from "@/lib/firebase";
import { isFirestoreMode } from "./persistenceMode";
import { doc, getDoc, setDoc, getDocs, collection, query, where } from "firebase/firestore";

/**
 * Sector City Repository
 * Data Access Layer for /sectorCities/{sectorCityId}
 */

const sectorCityStore = new Map<string, SectorCityEntity>();

export async function findSectorCityById(id: string): Promise<SectorCityEntity | null> {
  if (isFirestoreMode() && id) {
    try {
      const docRef = doc(db, "sectorCities", id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const item = snap.data() as SectorCityEntity;
        sectorCityStore.set(id, item);
        return item;
      }
    } catch (err) {
      console.warn(`[SectorCityRepository] Firestore findSectorCityById fallback for ${id}:`, err);
    }
  }
  return sectorCityStore.get(id) || null;
}

export async function findSectorCityBySlug(slug: string): Promise<SectorCityEntity | null> {
  const cities = await findAllSectorCities();
  return cities.find((c) => c.slug === slug || c.id === slug) || null;
}

export async function findSectorCitiesBySector(sectorId: string): Promise<SectorCityEntity[]> {
  if (isFirestoreMode() && sectorId) {
    try {
      const q = query(collection(db, "sectorCities"), where("sectorId", "==", sectorId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as SectorCityEntity);
      }
    } catch (err) {
      console.warn(`[SectorCityRepository] Firestore findSectorCitiesBySector fallback for ${sectorId}:`, err);
    }
  }
  const cities = Array.from(sectorCityStore.values());
  return cities.filter((c) => c.sectorId === sectorId);
}

export async function findAllSectorCities(): Promise<SectorCityEntity[]> {
  if (isFirestoreMode()) {
    try {
      const snap = await getDocs(collection(db, "sectorCities"));
      if (!snap.empty) {
        const items = snap.docs.map((d) => d.data() as SectorCityEntity);
        items.forEach((c) => sectorCityStore.set(c.id, c));
        return items;
      }
    } catch (err) {
      console.warn("[SectorCityRepository] Firestore findAllSectorCities fallback:", err);
    }
  }
  return Array.from(sectorCityStore.values());
}

export async function saveSectorCity(city: SectorCityEntity): Promise<SectorCityEntity> {
  sectorCityStore.set(city.id, city);
  if (isFirestoreMode() && city.id) {
    try {
      const docRef = doc(db, "sectorCities", city.id);
      await setDoc(docRef, { ...city }, { merge: true });
    } catch (err) {
      console.warn(`[SectorCityRepository] Firestore saveSectorCity error for ${city.id}:`, err);
    }
  }
  return city;
}
