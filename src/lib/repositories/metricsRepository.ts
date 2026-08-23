import type { MetricEventEntity } from "@/lib/types";

/**
 * Stage 10.6 — Metrics Repository
 * Data Access Layer for /companyAnalytics/{companyId}/events/{eventId}
 */

const metricsStore = new Map<string, MetricEventEntity[]>();

export async function appendMetricEvent(event: MetricEventEntity): Promise<MetricEventEntity> {
  const existing = metricsStore.get(event.companyId) || [];
  existing.push(event);
  metricsStore.set(event.companyId, existing);
  return event;
}

export async function findMetricEventsByCompany(companyId: string): Promise<MetricEventEntity[]> {
  return metricsStore.get(companyId) || [];
}
