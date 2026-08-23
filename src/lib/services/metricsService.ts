import type { MetricEventEntity, MetricsTimePeriod, CompanyMetricsData, CompanyProfile } from "@/lib/types";
import { getCompanyMetrics, recordPlatformEvent } from "@/lib/metricsStore";
import {
  appendMetricEvent as appendRepoEvent,
  findMetricEventsByCompany,
} from "@/lib/repositories/metricsRepository";

/**
 * Metrics Service — Event-First Deterministic Analytics Pipeline.
 * Flow: USER ACTION -> EVENT -> AGGREGATION -> METRICS PROJECTION.
 */

const eventLogRepository: MetricEventEntity[] = [];

/**
 * Section 6 Canonical Async Methods
 */
export async function appendEvent(event: MetricEventEntity): Promise<MetricEventEntity> {
  await appendRepoEvent(event);
  return recordMetricEvent(event);
}

export async function getCompanyEvents(companyId: string): Promise<MetricEventEntity[]> {
  const fromRepo = await findMetricEventsByCompany(companyId);
  if (fromRepo && fromRepo.length > 0) return fromRepo;
  return eventLogRepository.filter((e) => e.companyId === companyId);
}

export async function calculateMetrics(
  company: CompanyProfile,
  timePeriod: MetricsTimePeriod = "30D"
): Promise<CompanyMetricsData> {
  return getCompanyMetrics(company, timePeriod);
}

/**
 * Record a telemetry metric event
 */
export function recordMetricEvent(
  event: Omit<MetricEventEntity, "id" | "timestamp"> & { id?: string; timestamp?: string }
): MetricEventEntity {
  const canonicalEvent: MetricEventEntity = {
    ...event,
    id: event.id || `evt-${event.companyId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: event.timestamp || new Date().toISOString(),
  };

  eventLogRepository.push(canonicalEvent);

  // Trigger metricsStore aggregation
  recordPlatformEvent({
    eventType: canonicalEvent.eventType,
    companyId: canonicalEvent.companyId,
    sectorCityId: canonicalEvent.sectorCityId,
    userId: canonicalEvent.userId,
    productId: canonicalEvent.entityId,
    timestamp: canonicalEvent.timestamp,
    metadata: canonicalEvent.metadata,
  });

  return canonicalEvent;
}

/**
 * Calculate aggregated metrics projection for a company
 */
export function getCompanyMetricsProjection(
  company: CompanyProfile,
  timePeriod: MetricsTimePeriod = "30D"
): CompanyMetricsData {
  return getCompanyMetrics(company, timePeriod);
}
