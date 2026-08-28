import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface CommercialInvoiceRecord {
  id: string;
  companyId: string;
  agreementId?: string;
  invoiceNumber: string;
  status: "DRAFT" | "OPEN" | "PAID" | "VOID" | "UNCOLLECTIBLE" | "OVERDUE";
  billingProvider: "STRIPE" | "GOOGLE_CLOUD_MARKETPLACE";
  amountDue: number;
  amountPaid: number;
  currency: string;
  dueDate: string;
  paidAt?: string;
  hostedInvoiceUrl?: string;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommercialPaymentRecord {
  id: string;
  companyId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
  paymentMethod: string;
  providerPaymentId?: string;
  paidAt: string;
  receiptUrl?: string;
}

/**
 * Get company invoices
 */
export async function getCompanyInvoices(companyId: string): Promise<CommercialInvoiceRecord[]> {
  if (!companyId) return [];
  const q = query(
    collection(db, "invoices"),
    where("companyId", "==", companyId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CommercialInvoiceRecord));
}

/**
 * Get invoice by ID
 */
export async function getInvoiceById(invoiceId: string): Promise<CommercialInvoiceRecord | null> {
  const docRef = doc(db, "invoices", invoiceId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as CommercialInvoiceRecord;
  }
  return null;
}

/**
 * Save / update invoice
 */
export async function saveInvoice(invoice: CommercialInvoiceRecord): Promise<CommercialInvoiceRecord> {
  const docRef = doc(db, "invoices", invoice.id);
  const payload = {
    ...invoice,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, payload, { merge: true });
  return payload;
}

/**
 * Record a payment
 */
export async function recordPayment(payment: CommercialPaymentRecord): Promise<CommercialPaymentRecord> {
  const docRef = doc(db, "payments", payment.id);
  await setDoc(docRef, payment, { merge: true });

  // Mark invoice as paid if succeeded
  if (payment.status === "SUCCEEDED" && payment.invoiceId) {
    const invoiceRef = doc(db, "invoices", payment.invoiceId);
    await updateDoc(invoiceRef, {
      status: "PAID",
      amountPaid: payment.amount,
      paidAt: payment.paidAt,
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  }

  return payment;
}

/**
 * List payments for a company
 */
export async function getCompanyPayments(companyId: string): Promise<CommercialPaymentRecord[]> {
  if (!companyId) return [];
  const q = query(
    collection(db, "payments"),
    where("companyId", "==", companyId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CommercialPaymentRecord));
}

/**
 * Real-time listener for company invoices
 */
export function subscribeToCompanyInvoices(
  companyId: string,
  callback: (invoices: CommercialInvoiceRecord[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "invoices"),
    where("companyId", "==", companyId)
  );
  return onSnapshot(q, (snapshot) => {
    const invoices = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CommercialInvoiceRecord));
    callback(invoices);
  });
}
