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
    const cleanTitle = (title || "MarineWorld.City")
      .replace(/undefined\s*\|\s*/gi, "")
      .replace(/\s*\|\s*undefined/gi, "")
      .replace(/\bundefined\b/gi, "")
      .trim() || "MarineWorld.City";
    document.title = cleanTitle;

    const cleanDescription = (description || "")
      .replace(/undefined\s*—\s*/gi, "")
      .replace(/\bundefined\b/gi, "")
      .trim();

    const canonicalHref = canonicalUrl || `${window.location.origin}${window.location.pathname}`;
    upsertMeta("description", cleanDescription, "name");
    upsertMeta("og:title", cleanTitle, "property");
    upsertMeta("og:description", cleanDescription, "property");
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
