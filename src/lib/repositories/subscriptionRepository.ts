import type { Subscription, SubscriptionIntent } from "@/lib/types";
import { getPersistenceMode } from "./persistenceMode";
import { getFirebaseApp } from "@/lib/auth/firebaseAuth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
} from "firebase/firestore";

/**
 * Phase 3.1 — Subscription & Subscription Intent Repository
 * Persistence Layer for:
 * - /companies/{companyId}/subscriptions/{subscriptionId}
 * - /companies/{companyId}/subscriptionIntents/{intentId}
 */

const subscriptionStore = new Map<string, Subscription>();
const subscriptionIntentStore = new Map<string, SubscriptionIntent>();

function buildSubKey(companyId: string, subId: string): string {
  return `${companyId.toLowerCase()}:${subId}`;
}

function buildIntentKey(companyId: string, intentId: string): string {
  return `${companyId.toLowerCase()}:${intentId}`;
}

// Canonical development fixture for Argento Marine
const defaultSubscription: Subscription = {
  id: "sub-argento-marine-01",
  companyId: "argento-marine",
  businessId: "MW-BUS-ARGENTO-MARITIME",
  planId: "plan-growth-01",
  planCode: "GROWTH",
  status: "ACTIVE",
  currentPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  currentPeriodEnd: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString(),
  cancelAtPeriodEnd: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

subscriptionStore.set(
  buildSubKey(defaultSubscription.companyId, defaultSubscription.id),
  defaultSubscription
);

export function getInMemorySubscription(
  companyId: string,
  subId: string
): Subscription | undefined {
  return subscriptionStore.get(buildSubKey(companyId, subId));
}

export function saveInMemorySubscription(sub: Subscription): Subscription {
  subscriptionStore.set(buildSubKey(sub.companyId, sub.id), { ...sub });
  return sub;
}

export function clearSubscriptionStore(): void {
  subscriptionStore.clear();
  subscriptionIntentStore.clear();
}

export function resetDefaultSubscriptionStore(): void {
  subscriptionStore.clear();
  subscriptionIntentStore.clear();
  subscriptionStore.set(
    buildSubKey(defaultSubscription.companyId, defaultSubscription.id),
    { ...defaultSubscription }
  );
}

export async function findSubscriptionById(
  companyId: string,
  subscriptionId: string
): Promise<Subscription | null> {
  if (!companyId || !subscriptionId) return null;
  const key = buildSubKey(companyId, subscriptionId);

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const snap = await getDoc(
        doc(db, "companies", companyId, "subscriptions", subscriptionId)
      );
      if (snap.exists()) {
        return snap.data() as Subscription;
      }
      return subscriptionStore.get(key) || null;
    } catch (err) {
      return subscriptionStore.get(key) || null;
    }
  }

  return subscriptionStore.get(key) || null;
}

export async function findActiveSubscriptionByCompanyId(
  companyId: string
): Promise<Subscription | null> {
  if (!companyId) return null;

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const subCol = collection(db, "companies", companyId, "subscriptions");
      const snap = await getDocs(subCol);
      let activeSub: Subscription | null = null;
      snap.forEach((docSnap) => {
        const data = docSnap.data() as Subscription;
        if (data.status === "ACTIVE") {
          activeSub = data;
        }
      });
      if (activeSub) return activeSub;
    } catch (err) {
      // Fallback to in-memory
    }
  }

  const normId = companyId.toLowerCase();
  for (const [k, sub] of subscriptionStore.entries()) {
    if (k.startsWith(`${normId}:`) && sub.status === "ACTIVE") {
      return sub;
    }
  }
  return null;
}

export async function saveSubscription(
  subscription: Subscription
): Promise<Subscription> {
  const key = buildSubKey(subscription.companyId, subscription.id);
  subscriptionStore.set(key, { ...subscription });

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      await setDoc(
        doc(db, "companies", subscription.companyId, "subscriptions", subscription.id),
        subscription,
        { merge: true }
      );
    } catch (err) {
      console.warn("[SubscriptionRepo] Firestore saveSubscription fallback:", err);
    }
  }

  return subscription;
}

export async function findSubscriptionIntentById(
  companyId: string,
  intentId: string
): Promise<SubscriptionIntent | null> {
  if (!companyId || !intentId) return null;
  const key = buildIntentKey(companyId, intentId);

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const snap = await getDoc(
        doc(db, "companies", companyId, "subscriptionIntents", intentId)
      );
      if (snap.exists()) {
        return snap.data() as SubscriptionIntent;
      }
      return subscriptionIntentStore.get(key) || null;
    } catch (err) {
      return subscriptionIntentStore.get(key) || null;
    }
  }

  return subscriptionIntentStore.get(key) || null;
}

export async function saveSubscriptionIntent(
  intent: SubscriptionIntent
): Promise<SubscriptionIntent> {
  const key = buildIntentKey(intent.companyId, intent.id);
  subscriptionIntentStore.set(key, { ...intent });

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      await setDoc(
        doc(db, "companies", intent.companyId, "subscriptionIntents", intent.id),
        intent,
        { merge: true }
      );
    } catch (err) {
      console.warn("[SubscriptionRepo] Firestore saveSubscriptionIntent fallback:", err);
    }
  }

  return intent;
}
