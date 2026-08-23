import { useEffect } from "react";

/**
 * PageMetadata — client-side metadata boundary for dynamic registry pages.
 * It updates title, description, canonical and Open Graph fields from
 * the currently resolved public registry entity.
 */
export function PageMetadata({
  title,
  description,
  canonicalUrl,
}: {
  title: string;
  description: string;
  canonicalUrl?: string;
}) {
  useEffect(() => {
    document.title = title;

    const canonicalHref = canonicalUrl || `${window.location.origin}${window.location.pathname}`;
    upsertMeta("description", description, "name");
    upsertMeta("og:title", title, "property");
    upsertMeta("og:description", description, "property");
    upsertMeta("og:url", canonicalHref, "property");

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalHref;
  }, [description, title, canonicalUrl]);

  return null;
}

function upsertMeta(name: string, content: string, attribute: "name" | "property") {
  const selector = `meta[${attribute}="${name}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.content = content;
}
