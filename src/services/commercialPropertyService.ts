import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  CommercialDigitalProperty,
  CommercialReservationIntent,
  CommercialOffer,
  CommercialAgreement,
} from "@/lib/services/commercialPropertyService";

function sanitizeDocKey(rawKey: string): string {
  return rawKey.replace(/[:\/]/g, "__");
}

// ----------------------------------------------------------------------
// 1. Digital Properties & Slots (/properties)
// ----------------------------------------------------------------------

export async function getPropertyByKey(canonicalPropertyKey: string): Promise<CommercialDigitalProperty | null> {
  const docId = sanitizeDocKey(canonicalPropertyKey);
  const docRef = doc(db, "properties", docId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return snapshot.data() as CommercialDigitalProperty;
  }
  return null;
}

export async function listCommercialProperties(): Promise<CommercialDigitalProperty[]> {
  const snapshot = await getDocs(collection(db, "properties"));
  return snapshot.docs.map((d) => d.data() as CommercialDigitalProperty);
}

export async function saveCommercialProperty(property: CommercialDigitalProperty): Promise<CommercialDigitalProperty> {
  const docId = sanitizeDocKey(property.canonicalPropertyKey);
  const docRef = doc(db, "properties", docId);
  const payload = {
    ...property,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, payload, { merge: true });
  return payload;
}

// ----------------------------------------------------------------------
// 2. Commercial Agreements (/commercialAgreements)
// ----------------------------------------------------------------------

export async function getAgreementById(agreementId: string): Promise<CommercialAgreement | null> {
  const docRef = doc(db, "commercialAgreements", agreementId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return snapshot.data() as CommercialAgreement;
  }
  return null;
}

export async function getCompanyAgreements(companyId: string): Promise<CommercialAgreement[]> {
  const q = query(
    collection(db, "commercialAgreements"),
    where("tenantCompanyId", "==", companyId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as CommercialAgreement);
}

export async function saveCommercialAgreement(agreement: CommercialAgreement): Promise<CommercialAgreement> {
  const docRef = doc(db, "commercialAgreements", agreement.agreementId);
  const payload = {
    ...agreement,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, payload, { merge: true });
  return payload;
}

export async function updateAgreementStatus(
  agreementId: string,
  status: CommercialAgreement["contractStatus"]
): Promise<void> {
  const docRef = doc(db, "commercialAgreements", agreementId);
  await updateDoc(docRef, {
    contractStatus: status,
    updatedAt: new Date().toISOString(),
  });
}

// ----------------------------------------------------------------------
// 3. Reservation Intents (/reservationIntents)
// ----------------------------------------------------------------------

export async function getReservationIntentById(intentId: string): Promise<CommercialReservationIntent | null> {
  const docRef = doc(db, "reservationIntents", intentId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return snapshot.data() as CommercialReservationIntent;
  }
  return null;
}

export async function saveReservationIntent(intent: CommercialReservationIntent): Promise<CommercialReservationIntent> {
  const docRef = doc(db, "reservationIntents", intent.intentId);
  const payload = {
    ...intent,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, payload, { merge: true });
  return payload;
}

// ----------------------------------------------------------------------
// 4. Commercial Offers (/commercialOffers)
// ----------------------------------------------------------------------

export async function getOfferById(offerId: string): Promise<CommercialOffer | null> {
  const docRef = doc(db, "commercialOffers", offerId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return snapshot.data() as CommercialOffer;
  }
  return null;
}

export async function saveCommercialOffer(offer: CommercialOffer): Promise<CommercialOffer> {
  const docRef = doc(db, "commercialOffers", offer.offerId);
  const payload = {
    ...offer,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, payload, { merge: true });
  return payload;
}
