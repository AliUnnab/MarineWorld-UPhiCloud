import { resolveIdentity } from "@/lib/services/identityService";
import { resolveDomain } from "@/lib/services/domainService";
import { getCompanyById, getCompanyBySlug, getCompanyByDomain, getCompanyNodes } from "@/lib/services/companyService";
import { listProducts } from "@/lib/services/productService";
import { listServices } from "@/lib/services/serviceService";
import { listConnects } from "@/lib/services/connectService";
import { getBusinessTwin, calculateProjection } from "@/lib/services/businessTwinService";
import { buildCompanySchema } from "@/lib/services/schemaOrgService";
import type {
  CompanyEntity,
  CompanyNodeEntity,
  ProductEntity,
  ServiceEntity,
  ConnectEntity,
  BusinessTwinProjection,
} from "@/lib/types";

/**
 * Stage 10.7 — Company ViewModel
 * Presentation adapter binding UI components to canonical Company data tree:
 * CompanyEntity -> Nodes -> Products -> Services -> Connects -> BusinessTwin
 */

export interface CompanyViewModelState {
  loading: boolean;
  success: boolean;
  empty: boolean;
  error: string | null;
  data: CompanyEntity | null;
  nodes: CompanyNodeEntity[];
  products: ProductEntity[];
  services: ServiceEntity[];
  connects: ConnectEntity[];
  businessTwin: BusinessTwinProjection | null;
  schema: Record<string, unknown> | null;
}

export async function getCompanyViewModel(hostnameOrIdOrSlug: string): Promise<CompanyViewModelState> {
  try {
    const identityInfo = resolveIdentity(hostnameOrIdOrSlug);
    const domainInfo = resolveDomain(hostnameOrIdOrSlug);

    const targetCompanyId = identityInfo?.companyId || (domainInfo?.entityType === "COMPANY" ? domainInfo.entityId : undefined);

    let company: CompanyEntity | null = null;

    if (targetCompanyId) {
      company = getCompanyById(targetCompanyId) || null;
    }

    if (!company) {
      company = getCompanyBySlug(hostnameOrIdOrSlug) || null;
    }

    if (!company) {
      company = getCompanyByDomain(hostnameOrIdOrSlug) || null;
    }

    if (!company) {
      company = getCompanyById(hostnameOrIdOrSlug) || null;
    }

    if (!company) {
      return {
        loading: false,
        success: false,
        empty: true,
        error: "Company entity not found",
        data: null,
        nodes: [],
        products: [],
        services: [],
        connects: [],
        businessTwin: null,
        schema: null,
      };
    }

    const companyId = company.id;

    // Resolve sub-resources via canonical services
    const nodes = getCompanyNodes(companyId);
    const products = await listProducts(companyId);
    const services = await listServices(companyId);
    const connects = await listConnects(companyId);

    let businessTwin = await getBusinessTwin(companyId);
    if (!businessTwin) {
      businessTwin = await calculateProjection({
        id: company.id,
        name: company.displayName,
        legalName: company.legalName,
      } as any);
    }

    const schema = buildCompanySchema(company) as unknown as Record<string, unknown>;

    return {
      loading: false,
      success: true,
      empty: false,
      error: null,
      data: company,
      nodes,
      products,
      services,
      connects,
      businessTwin,
      schema,
    };
  } catch (err: any) {
    return {
      loading: false,
      success: false,
      empty: true,
      error: err.message || "Failed to load company view model",
      data: null,
      nodes: [],
      products: [],
      services: [],
      connects: [],
      businessTwin: null,
      schema: null,
    };
  }
}
