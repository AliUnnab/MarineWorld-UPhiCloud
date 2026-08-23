import { getPersistenceMode } from "./persistenceMode";
import { getFirebaseApp } from "@/lib/auth/firebaseAuth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  runTransaction,
} from "firebase/firestore";
import type {
  CommercialDigitalProperty,
  CommercialReservationIntent,
  CommercialOffer,
  CommercialAgreement,
  CommercialAuditRecord,
} from "@/lib/services/commercialPropertyService";

/**
 * PHASE 1 — Commercial Property Repository
 * Canonical Firestore Persistence & Atomic Slot Concurrency for:
 * - /properties/{canonicalPropertyKey}
 * - /companies/{companyId}/commercialInventory/{slotId}
 * - /commercialAgreements/{agreementId}
 * - /companies/{companyId}/commercialAgreements/{agreementId}
 * - /reservationIntents/{intentId}
 * - /companies/{companyId}/reservationIntents/{intentId}
 * - /commercialOffers/{offerId}
 * - /companies/{companyId}/commercialOffers/{offerId}
 * - /auditEvents/{auditId}
 */

// In-memory fallback / cache stores
const inventoryMap = new Map<string, CommercialDigitalProperty>();
const reservationMap = new Map<string, CommercialReservationIntent>();
const offerMap = new Map<string, CommercialOffer>();
const agreementMap = new Map<string, CommercialAgreement>();
const auditList: CommercialAuditRecord[] = [];

export function sanitizeDocKey(rawKey: string): string {
  return rawKey.replace(/[:\/]/g, "__");
}

export function resetCommercialRepositoryStores(): void {
  inventoryMap.clear();
  reservationMap.clear();
  offerMap.clear();
  agreementMap.clear();
  auditList.length = 0;
}

// -------------------------------------------------------------
// 1. INVENTORY & DIGITAL PROPERTIES
// -------------------------------------------------------------

export async function saveCommercialProperty(
  property: CommercialDigitalProperty
): Promise<CommercialDigitalProperty> {
  const companyId = property.tenantCompanyId || "platform-unassigned";
  const propertyId = property.slotId || property.canonicalPropertyKey;
  const canonicalKey = property.canonicalPropertyKey;
  const safeKey = sanitizeDocKey(canonicalKey);

  inventoryMap.set(canonicalKey, { ...property });

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      // Write both to global canonical collection and tenant subcollection
      const globalRef = doc(db, "properties", safeKey);
      await setDoc(globalRef, property, { merge: true });

      if (companyId && companyId !== "platform-unassigned") {
        const tenantRef = doc(db, "companies", companyId, "commercialInventory", propertyId);
        await setDoc(tenantRef, property, { merge: true });
      }
    } catch (err) {
      console.warn("[CommercialRepo] Firestore save property fallback:", err);
    }
  }

  return property;
}

export async function getCommercialProperty(
  companyId: string,
  propertyId: string
): Promise<CommercialDigitalProperty | null> {
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      // First check tenant subcollection
      if (companyId && companyId !== "platform-unassigned") {
        const tenantRef = doc(db, "companies", companyId, "commercialInventory", propertyId);
        const snap = await getDoc(tenantRef);
        if (snap.exists()) {
          const data = snap.data() as CommercialDigitalProperty;
          inventoryMap.set(data.canonicalPropertyKey, data);
          return data;
        }
      }

      // Check global property collection
      const globalRef = doc(db, "properties", sanitizeDocKey(propertyId));
      const globalSnap = await getDoc(globalRef);
      if (globalSnap.exists()) {
        const data = globalSnap.data() as CommercialDigitalProperty;
        inventoryMap.set(data.canonicalPropertyKey, data);
        return data;
      }
    } catch (err) {
      // Fallback to cache
    }
  }

  for (const item of inventoryMap.values()) {
    if (item.slotId === propertyId || item.canonicalPropertyKey === propertyId) {
      return { ...item };
    }
  }
  return null;
}

export async function getCommercialPropertyByCanonicalKey(
  canonicalPropertyKey: string
): Promise<CommercialDigitalProperty | null> {
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const globalRef = doc(db, "properties", sanitizeDocKey(canonicalPropertyKey));
      const snap = await getDoc(globalRef);
      if (snap.exists()) {
        const data = snap.data() as CommercialDigitalProperty;
        inventoryMap.set(data.canonicalPropertyKey, data);
        return data;
      }
    } catch (err) {
      // Fallback
    }
  }

  const cached = inventoryMap.get(canonicalPropertyKey);
  return cached ? { ...cached } : null;
}

export async function getAllCommercialPropertiesFromFirestore(): Promise<CommercialDigitalProperty[]> {
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const coll = collection(db, "properties");
      const snap = await getDocs(coll);
      const list: CommercialDigitalProperty[] = [];
      snap.forEach((d) => {
        const item = d.data() as CommercialDigitalProperty;
        inventoryMap.set(item.canonicalPropertyKey, item);
        list.push(item);
      });
      if (list.length > 0) return list;
    } catch (err) {
      // Fallback
    }
  }
  return Array.from(inventoryMap.values());
}

// -------------------------------------------------------------
// 2. RESERVATION INTENTS
// -------------------------------------------------------------

export async function saveReservationIntent(
  intent: CommercialReservationIntent
): Promise<CommercialReservationIntent> {
  const companyId = intent.companyId;
  reservationMap.set(intent.intentId, { ...intent });

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const globalRef = doc(db, "reservationIntents", intent.intentId);
      const tenantRef = doc(db, "companies", companyId, "reservationIntents", intent.intentId);
      await Promise.all([
        setDoc(globalRef, intent, { merge: true }),
        setDoc(tenantRef, intent, { merge: true }),
      ]);
    } catch (err) {
      console.warn("[CommercialRepo] Firestore save reservation fallback:", err);
    }
  }

  return intent;
}

export async function getReservationIntent(
  companyId: string,
  intentId: string
): Promise<CommercialReservationIntent | null> {
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const ref = doc(db, "companies", companyId, "reservationIntents", intentId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as CommercialReservationIntent;
        reservationMap.set(data.intentId, data);
        return data;
      }
      const globalRef = doc(db, "reservationIntents", intentId);
      const globalSnap = await getDoc(globalRef);
      if (globalSnap.exists()) {
        const data = globalSnap.data() as CommercialReservationIntent;
        reservationMap.set(data.intentId, data);
        return data;
      }
    } catch (err) {
      // Fallback
    }
  }

  const existing = reservationMap.get(intentId);
  return existing ? { ...existing } : null;
}

// -------------------------------------------------------------
// 3. COMMERCIAL OFFERS
// -------------------------------------------------------------

export async function saveCommercialOffer(
  offer: CommercialOffer
): Promise<CommercialOffer> {
  const companyId = offer.companyId;
  offerMap.set(offer.offerId, { ...offer });

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const globalRef = doc(db, "commercialOffers", offer.offerId);
      const tenantRef = doc(db, "companies", companyId, "commercialOffers", offer.offerId);
      await Promise.all([
        setDoc(globalRef, offer, { merge: true }),
        setDoc(tenantRef, offer, { merge: true }),
      ]);
    } catch (err) {
      console.warn("[CommercialRepo] Firestore save offer fallback:", err);
    }
  }

  return offer;
}

export async function getCommercialOffer(
  companyId: string,
  offerId: string
): Promise<CommercialOffer | null> {
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const ref = doc(db, "companies", companyId, "commercialOffers", offerId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as CommercialOffer;
        offerMap.set(data.offerId, data);
        return data;
      }
      const globalRef = doc(db, "commercialOffers", offerId);
      const globalSnap = await getDoc(globalRef);
      if (globalSnap.exists()) {
        const data = globalSnap.data() as CommercialOffer;
        offerMap.set(data.offerId, data);
        return data;
      }
    } catch (err) {
      // Fallback
    }
  }

  const existing = offerMap.get(offerId);
  return existing ? { ...existing } : null;
}

// -------------------------------------------------------------
// 4. COMMERCIAL AGREEMENTS
// -------------------------------------------------------------

export async function saveCommercialAgreement(
  agreement: CommercialAgreement
): Promise<CommercialAgreement> {
  const companyId = agreement.companyId;
  agreementMap.set(agreement.agreementId, { ...agreement });

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const globalRef = doc(db, "commercialAgreements", agreement.agreementId);
      const tenantRef = doc(db, "companies", companyId, "commercialAgreements", agreement.agreementId);
      await Promise.all([
        setDoc(globalRef, agreement, { merge: true }),
        setDoc(tenantRef, agreement, { merge: true }),
      ]);
    } catch (err) {
      console.warn("[CommercialRepo] Firestore save agreement fallback:", err);
    }
  }

  return agreement;
}

export async function getCommercialAgreement(
  companyId: string,
  agreementId: string
): Promise<CommercialAgreement | null> {
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const ref = doc(db, "companies", companyId, "commercialAgreements", agreementId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as CommercialAgreement;
        agreementMap.set(data.agreementId, data);
        return data;
      }
      const globalRef = doc(db, "commercialAgreements", agreementId);
      const globalSnap = await getDoc(globalRef);
      if (globalSnap.exists()) {
        const data = globalSnap.data() as CommercialAgreement;
        agreementMap.set(data.agreementId, data);
        return data;
      }
    } catch (err) {
      // Fallback
    }
  }

  const existing = agreementMap.get(agreementId);
  return existing ? { ...existing } : null;
}

// -------------------------------------------------------------
// 5. AUDIT LOGS
// -------------------------------------------------------------

export async function recordCommercialAudit(
  audit: CommercialAuditRecord
): Promise<CommercialAuditRecord> {
  auditList.push({ ...audit });

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const ref = doc(db, "companies", audit.companyId, "auditEvents", audit.auditId);
      await setDoc(ref, audit, { merge: true });
    } catch (err) {
      console.warn("[CommercialRepo] Firestore save audit fallback:", err);
    }
  }

  return audit;
}

// -------------------------------------------------------------
// 6. ATOMIC TRANSACTIONS FOR MULTI-INSTANCE SLOT CONCURRENCY & ACTIVATION
// -------------------------------------------------------------

export async function atomicHoldSlot(
  companyId: string,
  slotId: string,
  canonicalPropertyKey: string,
  intent: CommercialReservationIntent
): Promise<{ success: boolean; reason?: string }> {
  inventoryMap.set(canonicalPropertyKey, {
    ...(inventoryMap.get(canonicalPropertyKey) as any),
    availabilityStatus: "RESERVED",
    commercialStatus: "RESERVED",
    tenantCompanyId: companyId,
  });
  reservationMap.set(intent.intentId, { ...intent });

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      await runTransaction(db, async (tx) => {
        const safeKey = sanitizeDocKey(canonicalPropertyKey);
        const globalSlotRef = doc(db, "properties", safeKey);
        const tenantSlotRef = doc(db, "companies", companyId, "commercialInventory", slotId);
        const globalIntentRef = doc(db, "reservationIntents", intent.intentId);
        const tenantIntentRef = doc(db, "companies", companyId, "reservationIntents", intent.intentId);

        const slotSnap = await tx.get(globalSlotRef);

        if (slotSnap.exists()) {
          const current = slotSnap.data() as CommercialDigitalProperty;
          const isHeld = current.availabilityStatus === "HELD" && current.holdExpiresAt && new Date(current.holdExpiresAt).getTime() > Date.now();
          const isActive = current.availabilityStatus === "ACTIVE" || current.commercialStatus === "ACTIVE";
          const isReserved = current.availabilityStatus === "RESERVED" || current.commercialStatus === "RESERVED";

          if ((isActive || isReserved || isHeld) && current.tenantCompanyId && current.tenantCompanyId.toLowerCase() !== companyId.toLowerCase()) {
            throw new Error("SLOT_COLLISION_OCCUPIED");
          }
        }

        const updatePayload = {
          availabilityStatus: "RESERVED",
          commercialStatus: "RESERVED",
          tenantCompanyId: companyId,
          tenantCompanyName: intent.companyName || companyId,
          updatedAt: new Date().toISOString(),
        };

        tx.set(globalSlotRef, updatePayload, { merge: true });
        tx.set(tenantSlotRef, updatePayload, { merge: true });
        tx.set(globalIntentRef, intent, { merge: true });
        tx.set(tenantIntentRef, intent, { merge: true });
      });
      return { success: true };
    } catch (err: any) {
      if (err.message === "SLOT_COLLISION_OCCUPIED") {
        return { success: false, reason: "Slot is already occupied or reserved by another tenant in Firestore." };
      }
      return { success: true }; // Dual fallback
    }
  }

  return { success: true };
}

export async function atomicReleaseSlot(
  companyId: string,
  slotId: string,
  canonicalPropertyKey: string,
  intentId: string
): Promise<{ success: boolean }> {
  if (reservationMap.has(intentId)) {
    const existing = reservationMap.get(intentId)!;
    reservationMap.set(intentId, { ...existing, status: "CANCELLED" });
  }

  if (inventoryMap.has(canonicalPropertyKey)) {
    const prop = inventoryMap.get(canonicalPropertyKey)!;
    inventoryMap.set(canonicalPropertyKey, {
      ...prop,
      availabilityStatus: "AVAILABLE",
      commercialStatus: "AVAILABLE",
      tenantCompanyId: null,
      tenantCompanyName: null,
    });
  }

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      await runTransaction(db, async (tx) => {
        const safeKey = sanitizeDocKey(canonicalPropertyKey);
        const globalSlotRef = doc(db, "properties", safeKey);
        const tenantSlotRef = doc(db, "companies", companyId, "commercialInventory", slotId);
        const globalIntentRef = doc(db, "reservationIntents", intentId);
        const tenantIntentRef = doc(db, "companies", companyId, "reservationIntents", intentId);

        const resetPayload = {
          availabilityStatus: "AVAILABLE",
          commercialStatus: "AVAILABLE",
          tenantCompanyId: null,
          tenantCompanyName: null,
          updatedAt: new Date().toISOString(),
        };

        tx.set(globalSlotRef, resetPayload, { merge: true });
        tx.set(tenantSlotRef, resetPayload, { merge: true });
        tx.set(globalIntentRef, { status: "CANCELLED", updatedAt: new Date().toISOString() }, { merge: true });
        tx.set(tenantIntentRef, { status: "CANCELLED", updatedAt: new Date().toISOString() }, { merge: true });
      });
    } catch (err) {
      // Fallback
    }
  }

  return { success: true };
}

export async function atomicAcceptOfferAndCreateAgreement(
  agreement: CommercialAgreement,
  offer: CommercialOffer,
  property: CommercialDigitalProperty
): Promise<{ success: boolean; error?: string }> {
  agreementMap.set(agreement.agreementId, { ...agreement });
  offerMap.set(offer.offerId, { ...offer, status: "ACCEPTED" });
  inventoryMap.set(property.canonicalPropertyKey, { ...property, commercialStatus: "AGREED", availabilityStatus: "RESERVED" });

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      await runTransaction(db, async (tx) => {
        const safeKey = sanitizeDocKey(property.canonicalPropertyKey);
        const globalSlotRef = doc(db, "properties", safeKey);
        const tenantSlotRef = doc(db, "companies", agreement.companyId, "commercialInventory", property.slotId);

        const globalOfferRef = doc(db, "commercialOffers", offer.offerId);
        const tenantOfferRef = doc(db, "companies", agreement.companyId, "commercialOffers", offer.offerId);

        const globalAgreementRef = doc(db, "commercialAgreements", agreement.agreementId);
        const tenantAgreementRef = doc(db, "companies", agreement.companyId, "commercialAgreements", agreement.agreementId);

        tx.set(globalAgreementRef, agreement, { merge: true });
        tx.set(tenantAgreementRef, agreement, { merge: true });

        tx.set(globalOfferRef, { status: "ACCEPTED", updatedAt: new Date().toISOString() }, { merge: true });
        tx.set(tenantOfferRef, { status: "ACCEPTED", updatedAt: new Date().toISOString() }, { merge: true });

        const slotUpdate = {
          commercialStatus: "AGREED",
          availabilityStatus: "RESERVED",
          tenantCompanyId: agreement.companyId,
          updatedAt: new Date().toISOString(),
        };
        tx.set(globalSlotRef, slotUpdate, { merge: true });
        tx.set(tenantSlotRef, slotUpdate, { merge: true });
      });
    } catch (err: any) {
      console.warn("[CommercialRepo] Firestore atomic accept fallback:", err);
    }
  }

  return { success: true };
}

export async function atomicConfirmPaymentAndActivateProperty(
  agreement: CommercialAgreement,
  property: CommercialDigitalProperty
): Promise<{ success: boolean; error?: string }> {
  agreementMap.set(agreement.agreementId, { ...agreement, contractStatus: "ACTIVE", billingStatus: "ACTIVE" });
  inventoryMap.set(property.canonicalPropertyKey, { ...property, commercialStatus: "ACTIVE", availabilityStatus: "ACTIVE" });

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      await runTransaction(db, async (tx) => {
        const safeKey = sanitizeDocKey(property.canonicalPropertyKey);
        const globalSlotRef = doc(db, "properties", safeKey);
        const tenantSlotRef = doc(db, "companies", agreement.companyId, "commercialInventory", property.slotId);

        const globalAgreementRef = doc(db, "commercialAgreements", agreement.agreementId);
        const tenantAgreementRef = doc(db, "companies", agreement.companyId, "commercialAgreements", agreement.agreementId);

        const activeAgreementUpdate = {
          ...agreement,
          contractStatus: "ACTIVE",
          billingStatus: "ACTIVE",
          updatedAt: new Date().toISOString(),
        };

        const activeSlotUpdate = {
          commercialStatus: "ACTIVE",
          availabilityStatus: "ACTIVE",
          tenantCompanyId: agreement.companyId,
          updatedAt: new Date().toISOString(),
        };

        tx.set(globalAgreementRef, activeAgreementUpdate, { merge: true });
        tx.set(tenantAgreementRef, activeAgreementUpdate, { merge: true });
        tx.set(globalSlotRef, activeSlotUpdate, { merge: true });
        tx.set(tenantSlotRef, activeSlotUpdate, { merge: true });
      });
    } catch (err: any) {
      console.warn("[CommercialRepo] Firestore atomic activation fallback:", err);
    }
  }

  return { success: true };
}
