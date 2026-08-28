import { useState, useMemo, useEffect } from "react";
import type { CompanyProfile, SectorCity, IndustryDomainEntity, SectorConfig, ProductEntity } from "@/lib/types";
import { getCompanyProducts, getCompanyProductBySlug, getCompanyServices, getProductBySlug } from "@/lib/registry";
import { getProductsByCompany, subscribeToCompanyProducts } from "@/services/productService";
import { injectJsonLd, buildProductSchema } from "@/lib/services/schemaOrgService";
import { Icon } from "@/components/digione/icons";
import { DigiBadge, DigiButton } from "@/components/digione/primitives";
import { ProductAIAdvisor } from "./ProductAIAdvisor";
import { SaveEntityButton } from "@/components/foundation/SaveEntityButton";
import { AddToCollectionButton } from "@/components/foundation/AddToCollectionButton";
import { Copy, Check, Share2, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { ShareProtocolModal } from "./ShareProtocolModal";

/* ------------------------------------------------------------
   PRODUCT VISUAL IMAGE COMPONENT WITH GALLERY SUPPORT
   ------------------------------------------------------------ */
export function ProductVisualImage({
  product,
  activeImageSrc,
  className = "w-full h-full object-cover",
  containerClassName = "aspect-video w-full overflow-hidden rounded-card-md border border-line bg-canvas",
}: {
  product: ProductEntity;
  activeImageSrc?: string;
  className?: string;
  containerClassName?: string;
}) {
  const [imageError, setImageError] = useState(false);

  const imageSrc = useMemo(() => {
    if (activeImageSrc) return activeImageSrc;
    if (product.primaryImage) return product.primaryImage;
    if (product.images && product.images.length > 0 && product.images[0]) return product.images[0];
    if (product.gallery && product.gallery.length > 0 && product.gallery[0]) return product.gallery[0];
    return undefined;
  }, [product, activeImageSrc]);

  useEffect(() => {
    setImageError(false);
  }, [imageSrc]);

  if (!imageSrc || imageError) {
    return (
      <div className={`${containerClassName} flex flex-col items-center justify-center p-6 text-center`}>
        <div className="h-12 w-12 rounded-full bg-white border border-line flex items-center justify-center text-royal mb-2 shadow-xs">
          <Icon name="box" className="h-6 w-6" />
        </div>
        <span className="font-mono text-[11px] font-bold text-graphite uppercase tracking-wide truncate max-w-[200px]">
          {product.name}
        </span>
        <span className="font-mono text-[9.5px] text-mute mt-0.5">
          {imageError ? "VISUAL FEED UNAVAILABLE" : "SECTOR SPECIFICATION GRAPHIC"}
        </span>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <img
        src={imageSrc}
        alt={product.name}
        onError={() => setImageError(true)}
        className={`${className} group-hover:scale-105 transition-transform duration-300`}
      />
    </div>
  );
}

/* ------------------------------------------------------------
   LOADING SKELETON
   ------------------------------------------------------------ */
export function CompanyProductsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8">
        <div className="h-4 w-32 bg-mist rounded mb-3" />
        <div className="h-8 w-60 bg-mist rounded mb-2" />
        <div className="h-4 w-96 bg-mist rounded" />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="rounded-card-md border border-line bg-white p-4 h-14" />

      {/* Grid Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-card-lg border border-line bg-white p-6 h-80" />
        <div className="rounded-card-lg border border-line bg-white p-6 h-80" />
        <div className="rounded-card-lg border border-line bg-white p-6 h-80" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   MAIN COMPANY PRODUCTS MODULE
   ------------------------------------------------------------ */
export function CompanyProductsModule({
  company,
  primaryCity,
  parentDomain,
  config,
  selectedProductSlug,
  onSelectProduct,
  isLoading = false,
  isError = false,
  onRetry,
}: {
  company: CompanyProfile;
  primaryCity?: SectorCity;
  parentDomain?: IndustryDomainEntity;
  config?: SectorConfig;
  selectedProductSlug?: string;
  onSelectProduct?: (productSlug: string | undefined) => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedAvailability, setSelectedAvailability] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"featured" | "name" | "code">("featured");
  const [retryState, setRetryState] = useState(false);
  const [internalProductSlug, setInternalProductSlug] = useState<string | undefined>(selectedProductSlug);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copiedDetailUrl, setCopiedDetailUrl] = useState(false);
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);
  const [sharingProduct, setSharingProduct] = useState<ProductEntity | null>(null);

  // Sync internal product slug if controlled from parent
  const activeProductSlug = selectedProductSlug !== undefined ? selectedProductSlug : internalProductSlug;

  const handleSetProductSlug = (slug: string | undefined) => {
    setInternalProductSlug(slug);
    setActiveImageIndex(0);
    if (onSelectProduct) {
      onSelectProduct(slug);
    }
  };

  // Fallback initial products from company model
  const fallbackProducts = useMemo(() => getCompanyProducts(company), [company]);
  const [liveProducts, setLiveProducts] = useState<ProductEntity[]>(fallbackProducts);
  const [isLoadingLive, setIsLoadingLive] = useState(true);
  const [liveError, setLiveError] = useState<string | null>(null);

  // Subscribe to real-time Firestore products for this company
  useEffect(() => {
    if (!company?.id) {
      setIsLoadingLive(false);
      return;
    }

    setIsLoadingLive(true);
    setLiveError(null);

    // Initial load + Realtime listener
    const unsubscribe = subscribeToCompanyProducts(company.id, (fetchedProducts) => {
      if (fetchedProducts && fetchedProducts.length > 0) {
        setLiveProducts(fetchedProducts);
      } else {
        setLiveProducts(fallbackProducts);
      }
      setIsLoadingLive(false);
    });

    return () => {
      unsubscribe();
    };
  }, [company?.id, fallbackProducts]);

  const products = liveProducts.length > 0 ? liveProducts : fallbackProducts;

  // Resolve raw product by slug across company or global registry
  const rawProduct = useMemo(() => {
    if (!activeProductSlug) return undefined;
    const inLive = liveProducts.find((p) => p.slug === activeProductSlug || p.id === activeProductSlug);
    if (inLive) return inLive;
    const inCompany = getCompanyProductBySlug(company, activeProductSlug);
    if (inCompany) return inCompany;
    return getProductBySlug(activeProductSlug);
  }, [liveProducts, company, activeProductSlug]);

  const selectedProduct = useMemo(() => {
    if (rawProduct && company?.id && (rawProduct.companyId === company.id || !rawProduct.companyId)) {
      return rawProduct;
    }
    return undefined;
  }, [rawProduct, company?.id]);

  // Inject Schema.org JSON-LD when product detail is active
  useEffect(() => {
    if (selectedProduct) {
      injectJsonLd(buildProductSchema(selectedProduct as any, company as any));
    }
  }, [selectedProduct, company]);

  // Extract unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [products]);

  // Filter & sort product listing
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = p.name ? p.name.toLowerCase().includes(q) : false;
          const matchesCode = p.productCode ? p.productCode.toLowerCase().includes(q) : false;
          const matchesCat = p.category ? p.category.toLowerCase().includes(q) : false;
          const matchesDesc = p.shortDescription ? p.shortDescription.toLowerCase().includes(q) : false;
          if (!matchesName && !matchesCode && !matchesCat && !matchesDesc) return false;
        }

        if (selectedCategory !== "ALL" && p.category !== selectedCategory) {
          return false;
        }

        if (selectedAvailability !== "ALL" && (p.availability || "AVAILABLE") !== selectedAvailability) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === "code") {
          return (a.productCode || "").localeCompare(b.productCode || "");
        }
        return 0;
      });
  }, [products, searchQuery, selectedCategory, selectedAvailability, sortBy]);

  if (isLoading) {
    return <CompanyProductsSkeleton />;
  }

  if (isError || retryState) {
    return (
      <div className="rounded-card-lg border border-line bg-white p-8 md:p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-800 mb-4 border border-amber-200">
          <Icon name="box" className="h-6 w-6" />
        </div>
        <h3 className="text-h3 text-graphite font-mono">PRODUCT CATALOG DATA UNAVAILABLE</h3>
        <p className="mt-2 text-[14px] text-stone max-w-md mx-auto">
          Unable to resolve product specifications and inventory for {company.name}.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <DigiButton
            onClick={() => {
              setRetryState(false);
              if (onRetry) onRetry();
            }}
            icon="exchange"
          >
            TRY AGAIN
          </DigiButton>
        </div>
      </div>
    );
  }

  // Controlled State: PRODUCT_NOT_FOUND (Slug provided, but no product exists in registry)
  if (activeProductSlug && !rawProduct) {
    return (
      <div className="rounded-card-lg border border-line bg-white p-8 md:p-12 text-center shadow-xs animate-page-enter">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-800 mb-4 border border-amber-200">
          <Icon name="box" className="h-6 w-6 text-amber-700" />
        </div>
        <span className="font-mono text-[10.5px] font-bold text-amber-800 uppercase tracking-widest block mb-1">
          PRODUCT_NOT_FOUND
        </span>
        <h3 className="text-h3 text-graphite font-mono uppercase">PRODUCT RECORD NOT FOUND</h3>
        <p className="mt-2 text-[14px] text-stone max-w-md mx-auto">
          No product matching reference <code className="bg-canvas px-1.5 py-0.5 rounded font-mono font-bold text-graphite">{activeProductSlug}</code> was found in the catalog.
        </p>
        <div className="mt-6 flex justify-center">
          <DigiButton onClick={() => handleSetProductSlug(undefined)} icon="arrowRight">
            RETURN TO PRODUCTS CATALOG
          </DigiButton>
        </div>
      </div>
    );
  }

  // Controlled State: PRODUCT_INVALID_COMPANY_CONTEXT (Product exists, but belongs to a different company)
  if (activeProductSlug && rawProduct && company?.id && rawProduct.companyId && rawProduct.companyId !== company.id) {
    return (
      <div className="rounded-card-lg border border-line bg-white p-8 md:p-12 text-center shadow-xs animate-page-enter">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700 mb-4 border border-red-200">
          <Icon name="shield" className="h-6 w-6 text-red-600" />
        </div>
        <span className="font-mono text-[10.5px] font-bold text-red-700 uppercase tracking-widest block mb-1">
          PRODUCT_INVALID_COMPANY_CONTEXT
        </span>
        <h3 className="text-h3 text-graphite font-mono uppercase">PRODUCT / COMPANY MISMATCH DENIED</h3>
        <p className="mt-2 text-[14px] text-stone max-w-md mx-auto">
          Product <strong className="text-graphite">{rawProduct.name}</strong> is registered under a different company and cannot be viewed in {company?.name || "this company"}'s context. Cross-tenant product access is restricted.
        </p>
        <div className="mt-6 flex justify-center">
          <DigiButton onClick={() => handleSetProductSlug(undefined)} icon="arrowRight">
            RETURN TO {company.name.toUpperCase()} CATALOG
          </DigiButton>
        </div>
      </div>
    );
  }

  const companySlug = company.slug ?? company.id;

  /* ------------------------------------------------------------
     VIEW A: SINGLE PRODUCT DETAIL VIEW
     ------------------------------------------------------------ */
  if (selectedProduct) {
    const specsKeys = selectedProduct.specifications ? Object.keys(selectedProduct.specifications) : [];
    const availability = selectedProduct.availability || "AVAILABLE";

    // Collect canonical gallery images
    const galleryImages: string[] = [];
    if (selectedProduct.primaryImage) galleryImages.push(selectedProduct.primaryImage);
    if (selectedProduct.images) {
      selectedProduct.images.forEach((img) => {
        if (img && !galleryImages.includes(img)) galleryImages.push(img);
      });
    }
    if (selectedProduct.gallery) {
      selectedProduct.gallery.forEach((img) => {
        if (img && !galleryImages.includes(img)) galleryImages.push(img);
      });
    }

    const currentImageSrc = galleryImages.length > 0 ? galleryImages[activeImageIndex] || galleryImages[0] : undefined;

    return (
      <div className="space-y-8 animate-page-enter">
        {/* Navigation & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
          <button
            onClick={() => handleSetProductSlug(undefined)}
            className="inline-flex items-center gap-2 font-mono text-[12px] font-bold text-royal hover:underline self-start"
          >
            <Icon name="arrowRight" className="h-3.5 w-3.5 rotate-180" />
            <span>BACK TO ALL PRODUCTS</span>
          </button>

          <div className="flex items-center gap-2 font-mono text-[11px] text-mute">
            <span>PRODUCT REF:</span>
            <span className="font-bold text-graphite">{selectedProduct.productCode || selectedProduct.id.toUpperCase()}</span>
          </div>
        </div>

        {/* Product Detail Main Container */}
        <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs">
          {/* Top Canonical Offering Banner */}
          <div className="rounded-card-md border border-line bg-canvas/70 p-3 font-mono text-[11px] flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-royal bg-soft px-2 py-0.5 rounded border border-royal/20 shrink-0">
                CANONICAL OFFERING
              </span>
              {selectedProduct.canonicalUrl ? (
                <a
                  href={selectedProduct.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-graphite hover:text-royal hover:underline truncate select-all transition"
                  title={selectedProduct.canonicalUrl}
                >
                  {selectedProduct.canonicalUrl}
                </a>
              ) : (
                <span className="text-amber-700 italic font-medium">
                  Generating canonical link…
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (selectedProduct.canonicalUrl) {
                    navigator.clipboard.writeText(selectedProduct.canonicalUrl);
                    setCopiedDetailUrl(true);
                    setTimeout(() => setCopiedDetailUrl(false), 2000);
                  }
                }}
                className="inline-flex items-center gap-1 rounded bg-white border border-line px-2.5 py-1 text-[10px] font-bold text-graphite hover:text-royal hover:border-royal transition cursor-pointer shadow-2xs"
                title="Copy canonical URL"
              >
                {copiedDetailUrl ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedDetailUrl ? "COPIED" : "COPY URL"}</span>
              </button>

              {selectedProduct.canonicalUrl && (
                <button
                  type="button"
                  onClick={() => setSharingProduct(selectedProduct)}
                  className="inline-flex items-center gap-1 rounded bg-white border border-line px-2.5 py-1 text-[10px] font-bold text-graphite hover:text-royal hover:border-royal transition cursor-pointer shadow-2xs"
                  title="Share canonical offering"
                >
                  <Share2 className="w-3 h-3" />
                  <span>SHARE</span>
                </button>
              )}
            </div>
          </div>

          {/* Header info */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-line pb-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] mb-2">
                <span className="rounded bg-soft px-2.5 py-0.5 font-bold text-royal uppercase">
                  {selectedProduct.category}
                </span>
                {selectedProduct.productType && (
                  <span className="rounded bg-canvas border border-line px-2.5 py-0.5 font-semibold text-stone">
                    {selectedProduct.productType}
                  </span>
                )}
                {selectedProduct.productCode && (
                  <span className="rounded bg-canvas border border-line px-2 py-0.5 font-bold text-graphite">
                    CODE: {selectedProduct.productCode}
                  </span>
                )}
              </div>

              <h1 className="text-h1 text-graphite mt-1">{selectedProduct.name}</h1>
              <p className="mt-3 text-[15px] font-medium text-stone max-w-3xl leading-relaxed">
                {selectedProduct.shortDescription}
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <DigiBadge variant={availability === "AVAILABLE" ? "soft" : "neutral"}>
                  {availability === "AVAILABLE" ? "✓ AVAILABLE" : availability}
                </DigiBadge>
                <SaveEntityButton
                  type="product"
                  id={selectedProduct.id}
                  companyId={company.id}
                  businessId={company.businessId}
                  size="sm"
                />
                <AddToCollectionButton
                  type="product"
                  id={selectedProduct.id}
                  companyId={company.id}
                  businessId={company.businessId}
                  entityName={selectedProduct.name}
                  size="sm"
                />
              </div>
              <span className="font-mono text-[10.5px] text-mute">CANONICAL PRODUCT RECORD</span>
            </div>
          </div>

          {/* Product Detail Body Grid */}
          <div className="mt-8 grid gap-8 lg:grid-cols-12">
            {/* Left Column: Visual Gallery, Documents & Certifications */}
            <div className="lg:col-span-5 space-y-6">
              {/* Main Product Visual Display */}
              <div className="space-y-3">
                <ProductVisualImage
                  product={selectedProduct}
                  activeImageSrc={currentImageSrc}
                  containerClassName="w-full aspect-video overflow-hidden rounded-card-md border border-line bg-canvas shadow-xs"
                />

                {/* Interactive Gallery Thumbnails (Requirement 5 & 6) */}
                {galleryImages.length > 1 && (
                  <div className="space-y-1.5">
                    <span className="font-mono text-[10px] font-bold text-mute uppercase block tracking-wider">
                      PRODUCT GALLERY ({galleryImages.length} VIEWS)
                    </span>
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                      {galleryImages.map((imgUrl, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`min-h-[48px] min-w-[48px] h-12 w-12 rounded-card-sm overflow-hidden border-2 transition-all cursor-pointer ${
                            activeImageIndex === idx ? "border-royal ring-2 ring-royal/20" : "border-line opacity-75 hover:opacity-100"
                          }`}
                        >
                          <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Certifications Summary */}
              {selectedProduct.certifications && selectedProduct.certifications.length > 0 && (
                <div className="rounded-card-md border border-line bg-white p-5">
                  <div className="flex items-center gap-2 border-b border-line pb-3 mb-3 font-mono text-[11px] font-bold text-graphite uppercase tracking-wider">
                    <Icon name="shield" className="h-4 w-4 text-royal" />
                    <span>CLASS & PRODUCT CERTIFICATIONS</span>
                  </div>
                  <div className="space-y-2 font-mono text-[11.5px]">
                    {selectedProduct.certifications.map((cert, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded bg-canvas border border-line px-3 py-2">
                        <span className="font-semibold text-graphite">{cert.name}</span>
                        <span className="font-bold text-emerald-600 text-[10.5px]">✓ {cert.status || "VERIFIED"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Documents References */}
              {selectedProduct.documentRefs && selectedProduct.documentRefs.length > 0 && (
                <div className="rounded-card-md border border-line bg-white p-5">
                  <div className="flex items-center gap-2 border-b border-line pb-3 mb-3 font-mono text-[11px] font-bold text-graphite uppercase tracking-wider">
                    <Icon name="doc" className="h-4 w-4 text-royal" />
                    <span>TECHNICAL DATA & DOCUMENTS</span>
                  </div>
                  <div className="space-y-2 font-mono text-[11.5px]">
                    {selectedProduct.documentRefs.map((doc, idx) => (
                      <a
                        key={idx}
                        href={doc.url}
                        onClick={(e) => e.preventDefault()}
                        className="flex items-center justify-between rounded bg-canvas border border-line px-3 py-2.5 hover:border-royal transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Icon name="doc" className="h-4 w-4 text-royal shrink-0" />
                          <span className="font-semibold text-graphite truncate">{doc.title}</span>
                        </div>
                        <span className="text-[10px] font-bold text-mute shrink-0 ml-2">
                          {doc.type || "PDF"} {doc.size ? `(${doc.size})` : ""}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Full Overview, Specs Table, Attributes & Ownership */}
            <div className="lg:col-span-7 space-y-6">
              {/* Product Overview & Description */}
              <div>
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-royal mb-2">
                  PRODUCT OVERVIEW
                </h3>
                <p className="text-[14px] leading-relaxed text-stone">
                  {selectedProduct.description || selectedProduct.shortDescription}
                </p>
              </div>

              {/* Specifications Table */}
              {specsKeys.length > 0 && (
                <div className="rounded-card-md border border-line bg-white p-5">
                  <div className="flex items-center justify-between border-b border-line pb-3 mb-3">
                    <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-graphite">
                      TECHNICAL SPECIFICATIONS
                    </h3>
                    <span className="font-mono text-[10.5px] text-mute">{specsKeys.length} PARAMETERS</span>
                  </div>
                  <dl className="divide-y divide-line/60 font-mono text-[12px]">
                    {specsKeys.map((key) => (
                      <div key={key} className="py-2.5 flex justify-between gap-4">
                        <dt className="text-mute font-medium">{key}</dt>
                        <dd className="font-bold text-graphite text-right">
                          {selectedProduct.specifications![key]}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* Sector-Aware Product Attributes */}
              {selectedProduct.attributes && selectedProduct.attributes.length > 0 && (
                <div className="rounded-card-md border border-line bg-white p-5">
                  <div className="flex items-center justify-between border-b border-line pb-3 mb-3">
                    <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-graphite">
                      SECTOR ATTRIBUTE MATRIX
                    </h3>
                    <span className="font-mono text-[10.5px] text-mute">STRUCTURED DATA</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 font-mono text-[11.5px]">
                    {selectedProduct.attributes.map((attr) => (
                      <div key={attr.key} className="rounded bg-canvas border border-line p-3">
                        <span className="text-[10px] text-mute uppercase block">{attr.label}</span>
                        <span className="font-bold text-graphite text-[12.5px] mt-0.5 block">
                          {String(attr.value)} {attr.unit ? attr.unit : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Canonical Company Ownership Box */}
              <div className="rounded-card-md border border-line bg-canvas p-5">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute block font-bold">
                  CANONICAL MANUFACTURER & SUPPLIER
                </span>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-graphite text-[15px]">{company.name}</h4>
                    <span className="font-mono text-[11px] text-stone block mt-0.5">
                      Registry ID: {company.id.toUpperCase()} • {primaryCity?.domain ?? company.city}
                    </span>
                  </div>
                  <a
                    href={`/companies/${companySlug}/corporate`}
                    className="inline-flex items-center gap-1 font-mono text-[11.5px] font-bold text-royal hover:underline shrink-0"
                  >
                    <span>View Company</span>
                    <Icon name="arrowRight" className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* Request Information CTA */}
              <div className="pt-2">
                <DigiButton
                  variant="primary"
                  className="w-full justify-center py-3.5"
                  icon="exchange"
                  onClick={() => {
                    const connectPath = `/companies/${companySlug}/connect?product=${selectedProduct.slug}`;
                    window.history.pushState({}, "", connectPath);
                    window.dispatchEvent(new Event("popstate"));
                  }}
                >
                  REQUEST SPECIFICATIONS & RFQ FOR {selectedProduct.name.toUpperCase()}
                </DigiButton>
              </div>
            </div>
          </div>
        </div>

        {/* Product-Specific AI Advisor */}
        <ProductAIAdvisor
          product={selectedProduct}
          company={company}
          relatedServices={getCompanyServices(company)}
          onInquire={(prod) => {
            const connectPath = `/companies/${companySlug}/connect?product=${prod.slug}`;
            window.history.pushState({}, "", connectPath);
            window.dispatchEvent(new Event("popstate"));
          }}
        />
      </div>
    );
  }

  /* ------------------------------------------------------------
     VIEW B: PRODUCTS CATALOG LISTING VIEW
     ------------------------------------------------------------ */
  return (
    <div className="space-y-8">
      {/* 01. PRODUCTS PAGE HEADER */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-6">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-royal">
              <Icon name="box" className="h-4 w-4" />
              <span>CANONICAL PRODUCT CATALOG</span>
            </div>
            <h1 className="text-h1 mt-1 text-graphite">Products</h1>
            <p className="mt-2 text-[14.5px] font-medium text-stone max-w-2xl">
              Explore the structured product catalog offered by {company.name}.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
            <span className="rounded-full bg-soft border border-line px-3.5 py-1.5 font-extrabold text-royal">
              {products.length} {products.length === 1 ? "PRODUCT" : "PRODUCTS"}
            </span>
          </div>
        </div>

        {/* 02. SEARCH, FILTER & SORTING CONTROLS */}
        <div className="mt-6 pt-2">
          <div className="grid gap-3 md:grid-cols-12 font-mono text-[12px]">
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name, code, or spec..."
                className="w-full rounded-card-sm border border-line bg-canvas px-3.5 py-2.5 pl-9 text-[13px] text-graphite placeholder:text-mute focus:outline-none focus:border-royal transition-colors"
              />
              <Icon name="search" className="absolute left-3 top-3 h-4 w-4 text-mute" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-mute hover:text-graphite font-bold text-[11px]"
                >
                  CLEAR
                </button>
              )}
            </div>

            {/* Category Filter */}
            {categories.length > 1 && (
              <div className="md:col-span-3">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-card-sm border border-line bg-canvas px-3 py-2.5 text-[12px] text-graphite font-semibold focus:outline-none focus:border-royal"
                >
                  <option value="ALL">All Categories ({products.length})</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort Selector */}
            <div className={categories.length > 1 ? "md:col-span-3" : "md:col-span-6"}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full rounded-card-sm border border-line bg-canvas px-3 py-2.5 text-[12px] text-graphite font-semibold focus:outline-none focus:border-royal"
              >
                <option value="featured">Sort by: Featured Catalog</option>
                <option value="name">Sort by: Name (A-Z)</option>
                <option value="code">Sort by: Product Code</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 03. PRODUCT CARDS GRID OR EMPTY STATES */}
      {products.length === 0 ? (
        /* Empty State: No products in catalog */
        <div className="rounded-card-lg border border-line bg-white p-8 md:p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-canvas text-stone mb-4 border border-line">
            <Icon name="box" className="h-6 w-6 text-mute" />
          </div>
          <h3 className="text-h3 text-graphite">NO PRODUCTS PUBLISHED</h3>
          <p className="mt-2 text-[14px] text-stone max-w-md mx-auto">
            No public products have been published by {company.name} in this catalog yet.
          </p>
          <div className="mt-6 flex justify-center">
            <a
              href={`/companies/${companySlug}/corporate`}
              className="inline-flex items-center gap-1.5 font-mono text-[12px] font-bold text-royal hover:underline"
            >
              <span>Explore Corporate Identity</span>
              <Icon name="arrowRight" className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        /* Search Empty State */
        <div className="rounded-card-lg border border-line bg-white p-8 text-center">
          <h3 className="text-h3 text-graphite">NO MATCHING PRODUCTS FOUND</h3>
          <p className="mt-2 text-[14px] text-stone">
            No products match the active search term "{searchQuery}".
          </p>
          <div className="mt-5">
            <DigiButton
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("ALL");
                setSelectedAvailability("ALL");
              }}
              icon="exchange"
            >
              CLEAR ALL FILTERS
            </DigiButton>
          </div>
        </div>
      ) : (
        /* Product Cards Grid */
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => {
            const avail = product.availability || "AVAILABLE";
            const specsPreview = product.specifications ? Object.entries(product.specifications).slice(0, 2) : [];

            return (
              <div
                key={product.id}
                className="rounded-card-lg border border-line bg-white p-6 shadow-xs flex flex-col justify-between hover:border-royal/50 transition-all duration-200 group"
              >
                <div>
                  {/* Category & Status Eyebrow */}
                  <div className="flex items-center justify-between border-b border-line pb-3 mb-3 font-mono text-[10.5px]">
                    <span className="font-bold text-royal uppercase bg-soft px-2 py-0.5 rounded truncate max-w-[170px]">
                      {product.category}
                    </span>
                    <span className="font-semibold text-stone">
                      {avail === "AVAILABLE" ? "✓ AVAILABLE" : avail}
                    </span>
                  </div>

                  {/* Product Visual Image */}
                  <ProductVisualImage
                    product={product}
                    containerClassName="aspect-video w-full overflow-hidden rounded-card-md border border-line bg-canvas mb-3.5"
                  />

                  {/* Product Code & Title */}
                  {product.productCode && (
                    <span className="font-mono text-[10.5px] font-bold text-mute block mb-1">
                      REF: {product.productCode}
                    </span>
                  )}
                  <h3 className="text-h3 text-graphite group-hover:text-royal transition-colors">
                    {product.name}
                  </h3>

                  {/* Short Description */}
                  <p className="mt-2.5 text-[13.5px] text-stone leading-relaxed line-clamp-3">
                    {product.shortDescription}
                  </p>

                  {/* Specifications Preview */}
                  {specsPreview.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-line/60 space-y-1.5 font-mono text-[11px]">
                      {specsPreview.map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-mute truncate max-w-[120px]">{k}</span>
                          <span className="font-semibold text-graphite text-right truncate max-w-[140px]">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Canonical URL Row */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3.5 rounded-card-xs border border-line bg-canvas/70 p-2.5 font-mono text-[10px]"
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-mute">
                        CANONICAL URL
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (product.canonicalUrl) {
                              navigator.clipboard.writeText(product.canonicalUrl);
                              setCopiedCardId(product.id);
                              setTimeout(() => setCopiedCardId(null), 2000);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded bg-white border border-line px-2 py-0.5 text-[9px] font-bold text-graphite hover:text-royal hover:border-royal transition cursor-pointer shadow-2xs"
                          title="Copy canonical URL"
                        >
                          {copiedCardId === product.id ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                          <span>{copiedCardId === product.id ? "COPIED" : "COPY URL"}</span>
                        </button>

                        {product.canonicalUrl && (
                          <>
                            <a
                              href={product.canonicalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-0.5 rounded bg-white border border-line px-2 py-0.5 text-[9px] font-bold text-graphite hover:text-royal hover:border-royal transition cursor-pointer shadow-2xs"
                              title="Open canonical link"
                            >
                              <span>OPEN</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSharingProduct(product);
                              }}
                              className="inline-flex items-center gap-1 rounded bg-white border border-line px-2 py-0.5 text-[9px] font-bold text-graphite hover:text-royal hover:border-royal transition cursor-pointer shadow-2xs"
                              title="Share canonical offering"
                            >
                              <Share2 className="w-2.5 h-2.5" />
                              <span>SHARE</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {product.canonicalUrl ? (
                      <a
                        href={product.canonicalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="font-semibold text-graphite hover:text-royal hover:underline truncate block select-all transition"
                        title={product.canonicalUrl}
                      >
                        {product.canonicalUrl}
                      </a>
                    ) : (
                      <span className="text-amber-700 italic font-medium block">
                        Generating canonical link…
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action */}
                <div className="mt-6 pt-4 border-t border-line flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <SaveEntityButton
                      type="product"
                      id={product.id}
                      companyId={company.id}
                      businessId={company.businessId}
                      size="sm"
                    />
                    <AddToCollectionButton
                      type="product"
                      id={product.id}
                      companyId={company.id}
                      businessId={company.businessId}
                      entityName={product.name}
                      variant="icon"
                    />
                  </div>
                  <button
                    onClick={() => handleSetProductSlug(product.slug)}
                    className="inline-flex items-center gap-1 font-mono text-[12px] font-bold text-royal group-hover:underline cursor-pointer"
                  >
                    <span>VIEW PRODUCT</span>
                    <Icon name="arrowRight" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share Modal */}
      {sharingProduct && sharingProduct.canonicalUrl && (
        <ShareProtocolModal
          isOpen={!!sharingProduct}
          onClose={() => setSharingProduct(null)}
          title={`Share ${sharingProduct.name}`}
          url={sharingProduct.canonicalUrl}
          description="Anyone with this link can view this offering."
        />
      )}
    </div>
  );
}
