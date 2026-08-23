import { getPersistenceMode } from "./persistenceMode";
import { getFirebaseApp } from "@/lib/auth/firebaseAuth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  runTransaction,
} from "firebase/firestore";
import type {
  CommercialInvoice,
  CommercialPayment,
  StripePaymentMethodRecord,
} from "@/lib/services/commercialBillingService";

export interface CommercialReceipt {
  receiptId: string;
  paymentId: string;
  invoiceId: string;
  companyId: string;
  amountPaid: number;
  currency: string;
  receiptNumber: string;
  issuedAt: string;
  pdfUrl?: string;
  isSimulated?: boolean;
}

/**
 * PHASE 4.16A — Commercial Billing Repository
 * Domain persistence for Invoices, Payments, Receipts, Payment Methods & Single Subscription.
 * Storage path: /companies/{companyId}/{subcollection}/{id}
 */

// In-memory fallback stores
const invoiceMap = new Map<string, CommercialInvoice>();
const paymentMap = new Map<string, CommercialPayment>();
const receiptMap = new Map<string, CommercialReceipt>();
const paymentMethodMap = new Map<string, StripePaymentMethodRecord>();
const singleSubscriptionMap = new Map<string, any>();

export function resetBillingRepositoryStores(): void {
  invoiceMap.clear();
  paymentMap.clear();
  receiptMap.clear();
  paymentMethodMap.clear();
  singleSubscriptionMap.clear();
}

// -------------------------------------------------------------
// 1. INVOICES
// -------------------------------------------------------------

export async function saveCommercialInvoice(
  invoice: CommercialInvoice
): Promise<CommercialInvoice> {
  const companyId = invoice.companyId;
  invoiceMap.set(invoice.invoiceId, { ...invoice });

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const ref = doc(db, "companies", companyId, "commercialInvoices", invoice.invoiceId);
      await setDoc(ref, invoice, { merge: true });
    } catch (err) {
      console.warn("[BillingRepo] Firestore save invoice fallback:", err);
    }
  }

  return invoice;
}

export async function getCommercialInvoice(
  companyId: string,
  invoiceId: string
): Promise<CommercialInvoice | null> {
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const ref = doc(db, "companies", companyId, "commercialInvoices", invoiceId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as CommercialInvoice;
        invoiceMap.set(data.invoiceId, data);
        return data;
      }
    } catch (err) {
      // Fallback
    }
  }

  const existing = invoiceMap.get(invoiceId);
  return existing ? { ...existing } : null;
}

// -------------------------------------------------------------
// 2. PAYMENTS
// -------------------------------------------------------------

export async function saveCommercialPayment(
  payment: CommercialPayment
): Promise<CommercialPayment> {
  const companyId = payment.companyId;
  paymentMap.set(payment.paymentId, { ...payment });

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const ref = doc(db, "companies", companyId, "commercialPayments", payment.paymentId);
      await setDoc(ref, payment, { merge: true });
    } catch (err) {
      console.warn("[BillingRepo] Firestore save payment fallback:", err);
    }
  }

  return payment;
}

export async function getCommercialPayment(
  companyId: string,
  paymentId: string
): Promise<CommercialPayment | null> {
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const ref = doc(db, "companies", companyId, "commercialPayments", paymentId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as CommercialPayment;
        paymentMap.set(data.paymentId, data);
        return data;
      }
    } catch (err) {
      // Fallback
    }
  }

  const existing = paymentMap.get(paymentId);
  return existing ? { ...existing } : null;
}

// -------------------------------------------------------------
// 3. RECEIPTS
// -------------------------------------------------------------

export async function saveCommercialReceipt(
  receipt: CommercialReceipt
): Promise<CommercialReceipt> {
  const companyId = receipt.companyId;
  receiptMap.set(receipt.receiptId, { ...receipt });

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const ref = doc(db, "companies", companyId, "commercialReceipts", receipt.receiptId);
      await setDoc(ref, receipt, { merge: true });
    } catch (err) {
      console.warn("[BillingRepo] Firestore save receipt fallback:", err);
    }
  }

  return receipt;
}

export async function getCommercialReceipt(
  companyId: string,
  receiptId: string
): Promise<CommercialReceipt | null> {
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const ref = doc(db, "companies", companyId, "commercialReceipts", receiptId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as CommercialReceipt;
        receiptMap.set(data.receiptId, data);
        return data;
      }
    } catch (err) {
      // Fallback
    }
  }

  const existing = receiptMap.get(receiptId);
  return existing ? { ...existing } : null;
}

// -------------------------------------------------------------
// 4. PAYMENT METHODS
// -------------------------------------------------------------

export async function savePaymentMethodRecord(
  pm: StripePaymentMethodRecord
): Promise<StripePaymentMethodRecord> {
  const companyId = pm.companyId;
  paymentMethodMap.set(pm.id, { ...pm });

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const ref = doc(db, "companies", companyId, "paymentMethods", pm.id);
      await setDoc(ref, pm, { merge: true });
    } catch (err) {
      console.warn("[BillingRepo] Firestore save payment method fallback:", err);
    }
  }

  return pm;
}

export async function listPaymentMethodRecords(
  companyId: string
): Promise<StripePaymentMethodRecord[]> {
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const snap = await getDoc(doc(db, "companies", companyId));
      // fetch subcollection
    } catch (err) {
      // Fallback
    }
  }

  const list: StripePaymentMethodRecord[] = [];
  for (const pm of paymentMethodMap.values()) {
    if (pm.companyId === companyId && pm.status === "ACTIVE") {
      list.push({ ...pm });
    }
  }
  return list;
}

// -------------------------------------------------------------
// 5. PLATFORM SUBSCRIPTION (/companies/{companyId}/subscription/current)
// -------------------------------------------------------------

export async function savePlatformSubscriptionRecord(
  companyId: string,
  sub: any
): Promise<any> {
  singleSubscriptionMap.set(companyId, { ...sub });

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const ref = doc(db, "companies", companyId, "subscription", "current");
      await setDoc(ref, sub, { merge: true });
    } catch (err) {
      console.warn("[BillingRepo] Firestore save subscription fallback:", err);
    }
  }

  return sub;
}

export async function getPlatformSubscriptionRecord(
  companyId: string
): Promise<any | null> {
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const ref = doc(db, "companies", companyId, "subscription", "current");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        singleSubscriptionMap.set(companyId, data);
        return data;
      }
    } catch (err) {
      // Fallback
    }
  }

  const existing = singleSubscriptionMap.get(companyId);
  return existing ? { ...existing } : null;
}

// -------------------------------------------------------------
// 6. ATOMIC INVOICE PAYMENT EXECUTION
// -------------------------------------------------------------

export async function atomicExecuteInvoicePayment(
  companyId: string,
  invoice: CommercialInvoice,
  payment: CommercialPayment,
  receipt: CommercialReceipt
): Promise<{ success: boolean }> {
  invoiceMap.set(invoice.invoiceId, { ...invoice });
  paymentMap.set(payment.paymentId, { ...payment });
  receiptMap.set(receipt.receiptId, { ...receipt });

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      await runTransaction(db, async (tx) => {
        const invRef = doc(db, "companies", companyId, "commercialInvoices", invoice.invoiceId);
        const payRef = doc(db, "companies", companyId, "commercialPayments", payment.paymentId);
        const recRef = doc(db, "companies", companyId, "commercialReceipts", receipt.receiptId);

        tx.set(invRef, invoice, { merge: true });
        tx.set(payRef, payment, { merge: true });
        tx.set(recRef, receipt, { merge: true });
      });
    } catch (err) {
      // Dual mode fallback
    }
  }

  return { success: true };
}
