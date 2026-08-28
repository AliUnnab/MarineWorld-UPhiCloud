import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SectorConfig, SectorCity, IndustryDomain } from "@/lib/types";

/**
 * -------------------------------------------------------------
 * 1. SECTORS & PLATFORMS
 * Storage path: /platforms/{platformId}, /sectors/{sectorId}
 * -------------------------------------------------------------
 */

export async function getSectorConfig(sectorId: string = "marine"): Promise<SectorConfig | null> {
  const docRef = doc(db, "sectors", sectorId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as SectorConfig;
  }
  return null;
}

export async function saveSectorConfig(sector: SectorConfig): Promise<SectorConfig> {
  const docId = sector.sectorId || (sector as any).id || "marine";
  const docRef = doc(db, "sectors", docId);
  await setDoc(docRef, { ...sector }, { merge: true });
  return sector;
}

export function subscribeToSectorConfig(
  sectorId: string,
  callback: (sector: SectorConfig | null) => void
): Unsubscribe {
  const docRef = doc(db, "sectors", sectorId);
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as SectorConfig);
    } else {
      callback(null);
    }
  });
}

/**
 * -------------------------------------------------------------
 * 2. INDUSTRY DOMAINS
 * Storage path: /industryDomains/{domainId}
 * -------------------------------------------------------------
 */

export async function listIndustryDomains(): Promise<IndustryDomain[]> {
  const colRef = collection(db, "industryDomains");
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as IndustryDomain));
}

export async function getIndustryDomainById(domainId: string): Promise<IndustryDomain | null> {
  const docRef = doc(db, "industryDomains", domainId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as IndustryDomain;
  }
  return null;
}

export function subscribeToIndustryDomains(
  callback: (domains: IndustryDomain[]) => void
): Unsubscribe {
  const colRef = collection(db, "industryDomains");
  return onSnapshot(colRef, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as IndustryDomain)));
  });
}

/**
 * -------------------------------------------------------------
 * 3. SECTOR CITIES
 * Storage path: /sectorCities/{cityId}
 * -------------------------------------------------------------
 */

export async function listSectorCities(): Promise<SectorCity[]> {
  const colRef = collection(db, "sectorCities");
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SectorCity));
}

export async function getSectorCityById(cityId: string): Promise<SectorCity | null> {
  const docRef = doc(db, "sectorCities", cityId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as SectorCity;
  }
  // Try slug query
  const q = query(collection(db, "sectorCities"), where("slug", "==", cityId));
  const qSnap = await getDocs(q);
  if (!qSnap.empty) {
    return { id: qSnap.docs[0].id, ...qSnap.docs[0].data() } as SectorCity;
  }
  return null;
}

export async function saveSectorCity(city: SectorCity): Promise<SectorCity> {
  const docRef = doc(db, "sectorCities", city.id);
  await setDoc(docRef, { ...city }, { merge: true });
  return city;
}

export function subscribeToSectorCities(
  callback: (cities: SectorCity[]) => void
): Unsubscribe {
  const colRef = collection(db, "sectorCities");
  return onSnapshot(colRef, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SectorCity)));
  });
}
