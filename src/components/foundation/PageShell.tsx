import type { ReactNode } from "react";
import type { NavigationItem, SectorConfig } from "@/lib/types";
import { GlobalFooter } from "@/components/foundation/GlobalFooter";
import { SectorCityTopChrome } from "@/components/foundation/SectorCityTopChrome";
import type { BreadcrumbItem } from "@/components/foundation/Breadcrumbs";
import { PageMetadata } from "@/components/foundation/PageMetadata";

/**
 * PageShell — standard structural shell for MarineWorld platform pages:
 * skip link + slim single-height platform top chrome + content slot + footer.
 */
export function PageShell({
  config,
  breadcrumbs,
  metadata,
  children,
}: {
  config: SectorConfig;
  breadcrumbs?: BreadcrumbItem[];
  headerNav?: NavigationItem[];
  metadata?: { title: string; description: string };
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas font-sans text-graphite">
      <a
        href="#page-content"
        className="sr-only z-[60] rounded-full bg-royal px-5 py-3 text-[13px] font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <SectorCityTopChrome config={config} breadcrumbs={breadcrumbs || []} />
      {metadata ? <PageMetadata {...metadata} /> : null}
      <main id="page-content">{children}</main>
      <GlobalFooter config={config} />
    </div>
  );
}


