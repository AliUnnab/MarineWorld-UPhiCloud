import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

// 1. Locate Firebase Admin Service Account Key
function getServiceAccountPath(): string | null {
  const candidates = [
    path.join(rootDir, "serviceAccountKey.json"),
    path.join(rootDir, "firebase-service-account.json"),
    process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? path.resolve(rootDir, process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : null,
  ].filter(Boolean) as string[];

  try {
    const files = fs.readdirSync(rootDir);
    const adminSdkFile = files.find((f) => f.includes("firebase-adminsdk") && f.endsWith(".json"));
    if (adminSdkFile) candidates.unshift(path.join(rootDir, adminSdkFile));
  } catch {}

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const keyPath = getServiceAccountPath();
if (!keyPath) {
  console.warn("⚠️ [Static Generator] No serviceAccountKey.json found. Skipping static Firestore pre-generation.");
  process.exit(0);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id || "uphi-marineworld",
  });
}
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

function escapeHtml(str: string = ""): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function runStaticGeneration() {
  console.log("🚀 [Static Generator] Starting AI-Grounding Static Site Pre-Generation...");

  const templatePath = path.join(distDir, "index.html");
  if (!fs.existsSync(templatePath)) {
    console.error("❌ [Static Generator] dist/index.html not found. Please run 'vite build' first!");
    process.exit(1);
  }
  const baseHtml = fs.readFileSync(templatePath, "utf8");

  // Fetch all companies from Firestore
  const companiesSnap = await db.collection("companies").get();
  console.log(`📦 Found ${companiesSnap.size} companies in Firestore.`);

  const sitemapUrls: string[] = [
    "https://marineworld.city/",
    "https://marineworld.city/companies",
    "https://marineworld.city/cities",
    "https://marineworld.city/sectors",
    "https://marineworld.city/getting-started",
  ];

  let generatedCompaniesCount = 0;
  let generatedProductsCount = 0;

  async function processCompany(compDoc: any) {
    const compData = compDoc.data();
    const compId = compDoc.id;
    const compSlug = compData.slug || compId;

    // Fetch subcollections in parallel
    const [productsSnap, servicesSnap, offeringsSnap, contactsDoc, membersSnap] = await Promise.all([
      db.collection("companies").doc(compId).collection("products").get().catch(() => null),
      db.collection("companies").doc(compId).collection("services").get().catch(() => null),
      db.collection("companies").doc(compId).collection("offerings").get().catch(() => null),
      db.collection("companies").doc(compId).collection("contacts").doc("package").get().catch(() => null),
      db.collection("companies").doc(compId).collection("members").get().catch(() => null),
    ]);

    // Hydrate Products
    const productsMap = new Map<string, any>();
    if (Array.isArray(compData.products)) {
      compData.products.forEach((p: any) => p?.id && productsMap.set(p.id, p));
    }
    if (productsSnap) {
      productsSnap.forEach((d) => productsMap.set(d.id, { id: d.id, ...d.data() }));
    }
    if (offeringsSnap) {
      offeringsSnap.forEach((d) => {
        if (!productsMap.has(d.id)) productsMap.set(d.id, { id: d.id, ...d.data() });
      });
    }
    const products = Array.from(productsMap.values());

    // Hydrate Services
    const servicesMap = new Map<string, any>();
    if (Array.isArray(compData.services)) {
      compData.services.forEach((s: any) => s?.id && servicesMap.set(s.id, s));
    }
    if (servicesSnap) {
      servicesSnap.forEach((d) => servicesMap.set(d.id, { id: d.id, ...d.data() }));
    }
    const services = Array.from(servicesMap.values());

    // Hydrate Contacts & Phones
    let officialPhone = compData.phone || compData.officialPhone || "";
    let officialEmail = compData.email || compData.officialEmail || "";
    let officialWebsite = compData.website || compData.websiteUrl || "";
    let address = compData.address || compData.city || "";
    let country = compData.country || "Global";

    const teamMembersMap = new Map<string, any>();
    if (Array.isArray(compData.teamMembers)) {
      compData.teamMembers.forEach((m: any) => (m?.email || m?.name) && teamMembersMap.set(m.email || m.name, m));
    }

    if (contactsDoc && contactsDoc.exists) {
      const cData = contactsDoc.data();
      if (cData?.generalContacts) {
        if (cData.generalContacts.phoneHq) officialPhone = cData.generalContacts.phoneHq;
        if (cData.generalContacts.officialEmail) officialEmail = cData.generalContacts.officialEmail;
        if (cData.generalContacts.officialWebsite) officialWebsite = cData.generalContacts.officialWebsite;
        if (cData.generalContacts.address) address = cData.generalContacts.address;
      }
      if (Array.isArray(cData?.teamMembers)) {
        cData.teamMembers.forEach((tm: any) => {
          if (tm?.email || tm?.name) teamMembersMap.set(tm.email || tm.name, tm);
        });
      }
    }

    if (membersSnap) {
      membersSnap.forEach((mDoc) => {
        const mData = mDoc.data();
        const key = mData.businessEmail || mData.displayName || mDoc.id;
        if (key && !teamMembersMap.has(key)) {
          teamMembersMap.set(key, {
            id: mDoc.id,
            name: mData.displayName || mData.name || "Team Member",
            role: mData.jobTitle || mData.role || "Executive Member",
            department: mData.department || "Operations",
            email: mData.businessEmail || mData.email || "",
            phone: mData.phone || "",
          });
        }
      });
    }
    const teamMembers = Array.from(teamMembersMap.values());

    const displayName = compData.displayName || compData.name || compSlug;
    const legalName = compData.legalName || compData.name || displayName;
    const businessId = compData.businessId || `MW-BUS-${String(compSlug).toUpperCase()}`;
    const description = compData.description || compData.corporateDescription || compData.shortDescription || `${displayName} is a verified enterprise in the MarineWorld Maritime Ecosystem.`;
    const canonicalUrl = `https://marineworld.city/companies/${compSlug}`;
    sitemapUrls.push(canonicalUrl);

    // Build Team Table Rows HTML
    const teamRowsHtml = teamMembers.length > 0
      ? teamMembers.map((m) => `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px;font-weight:600;color:#0f172a;">${escapeHtml(m.name)}</td>
          <td style="padding:10px;color:#334155;">${escapeHtml(m.role || "Executive")}</td>
          <td style="padding:10px;color:#64748b;">${escapeHtml(m.department || "Corporate")}</td>
          <td style="padding:10px;"><a href="mailto:${escapeHtml(m.email)}" style="color:#0284c7;font-weight:500;">${escapeHtml(m.email || "-")}</a></td>
          <td style="padding:10px;"><a href="tel:${escapeHtml(m.phone)}" style="color:#0284c7;font-weight:500;">${escapeHtml(m.phone || m.whatsapp || "-")}</a></td>
        </tr>
      `).join("")
      : `<tr><td colspan="5" style="padding:12px;color:#64748b;">Corporate management directory available via verified RFQ / inquiry gateway.</td></tr>`;

    // Build Products & OKF Specifications HTML
    const productsHtml = products.length > 0
      ? products.map((p) => {
          const pName = p.name || p.title || "Product";
          const pSlug = p.slug || p.id;
          const pDesc = p.detailedDescription || p.description || p.shortDescription || "";
          const pPrice = p.commercialInformation?.price || p.price || "Commercial RFQ";
          const pWarranty = p.commercialInformation?.warranty || p.specifications?.["Warranty Period"] || "Manufacturer Standard";
          const pIncoterms = p.commercialInformation?.incoterms || "EXW / FOB";
          const pLeadTime = p.commercialInformation?.leadTime || "Available on Order";
          const specs = p.specifications || {};
          const specEntries = Object.entries(specs);

          const specsTableHtml = specEntries.length > 0
            ? `
              <div style="margin-top:12px;">
                <h4 style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:6px;">OKF Technical Specifications &amp; Parameters:</h4>
                <table style="width:100%;border-collapse:collapse;font-size:13px;background:#f8fafc;border-radius:6px;overflow:hidden;">
                  <tbody>
                    ${specEntries.map(([k, v]) => `
                      <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding:6px 12px;font-weight:600;color:#475569;width:35%;">${escapeHtml(k)}:</td>
                        <td style="padding:6px 12px;color:#0f172a;font-weight:500;">${escapeHtml(String(v))}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            `
            : "";

          return `
            <article style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;background:#ffffff;">
              <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;">
                <h3 style="font-size:18px;font-weight:700;color:#0f172a;margin:0;">
                  <a href="https://marineworld.city/products/${escapeHtml(pSlug)}" style="color:#0284c7;text-decoration:none;">${escapeHtml(pName)}</a>
                </h3>
                <span style="font-size:14px;font-weight:700;color:#059669;background:#ecfdf5;padding:4px 10px;border-radius:4px;">${escapeHtml(pPrice)}</span>
              </div>
              <p style="font-size:14px;line-height:1.5;color:#334155;margin:8px 0;">${escapeHtml(pDesc)}</p>
              <div style="font-size:12px;color:#64748b;display:flex;gap:16px;flex-wrap:wrap;margin:8px 0;">
                <span><strong>Warranty:</strong> ${escapeHtml(pWarranty)}</span>
                <span><strong>Incoterms:</strong> ${escapeHtml(pIncoterms)}</span>
                <span><strong>Lead Time:</strong> ${escapeHtml(pLeadTime)}</span>
                <span><strong>Category:</strong> ${escapeHtml(p.category || "Maritime")}</span>
              </div>
              ${specsTableHtml}
            </article>
          `;
        }).join("")
      : `<p style="color:#64748b;font-style:italic;">Direct equipment catalogs and bespoke maritime inquiries can be submitted via verified portal.</p>`;

    // Build Schema.org JSON-LD
    const schemaLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": `${canonicalUrl}#organization`,
          "name": displayName,
          "legalName": legalName,
          "description": description,
          "telephone": officialPhone,
          "email": officialEmail,
          "url": officialWebsite || canonicalUrl,
          "address": {
            "@type": "PostalAddress",
            "streetAddress": address,
            "addressCountry": country,
          },
          "employee": teamMembers.map((m) => ({
            "@type": "Person",
            "name": m.name,
            "jobTitle": m.role || "Executive",
            "email": m.email,
            "telephone": m.phone,
          })),
          "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": `${displayName} Products & Technical Specifications`,
            "itemListElement": products.map((p) => ({
              "@type": "Product",
              "name": p.name || p.title,
              "description": p.detailedDescription || p.description || p.shortDescription,
              "category": p.category || "Maritime",
              "offers": {
                "@type": "Offer",
                "price": p.commercialInformation?.price || p.price || "Commercial RFQ",
                "priceCurrency": p.commercialInformation?.currency || "EUR",
                "warranty": p.commercialInformation?.warranty,
              },
              "additionalProperty": Object.entries(p.specifications || {}).map(([k, v]) => ({
                "@type": "PropertyValue",
                "name": k,
                "value": String(v),
              })),
            })),
          },
        },
      ],
    };

    // Body Crawler Content
    const bodyContentHtml = `
      <div id="root">
        <div class="mw-ai-crawler-content" style="max-width:1200px;margin:0 auto;padding:24px;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;">
          <header style="border-bottom:2px solid #0284c7;padding-bottom:16px;margin-bottom:24px;">
            <div style="font-size:12px;font-weight:700;color:#0284c7;letter-spacing:1px;text-transform:uppercase;">MarineWorld.City Verified Enterprise &amp; OKF Catalog</div>
            <h1 style="font-size:32px;font-weight:800;color:#0f172a;margin:8px 0 4px 0;">${escapeHtml(displayName)}</h1>
            <div style="font-size:14px;color:#64748b;">
              <span><strong>Legal Entity:</strong> ${escapeHtml(legalName)}</span> | 
              <span><strong>Business ID:</strong> <code>${escapeHtml(businessId)}</code></span> | 
              <span><strong>Verification:</strong> <span style="color:#059669;font-weight:600;">VERIFIED ENTERPRISE</span></span>
            </div>
          </header>

          <section style="margin-bottom:32px;">
            <h2 style="font-size:20px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">Corporate Overview &amp; Headquarter Contact Information</h2>
            <p style="font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(description)}</p>
            <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:14px;">
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;font-weight:600;width:220px;">Official Telephone (HQ):</td><td><a href="tel:${escapeHtml(officialPhone)}" style="color:#0284c7;font-weight:600;">${escapeHtml(officialPhone || "-")}</a></td></tr>
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;font-weight:600;">Official Corporate Email:</td><td><a href="mailto:${escapeHtml(officialEmail)}" style="color:#0284c7;font-weight:600;">${escapeHtml(officialEmail || "-")}</a></td></tr>
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;font-weight:600;">Official Website:</td><td><a href="${escapeHtml(officialWebsite)}" target="_blank" rel="noopener noreferrer" style="color:#0284c7;">${escapeHtml(officialWebsite || "-")}</a></td></tr>
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;font-weight:600;">Headquarters Address:</td><td>${escapeHtml(address)} (${escapeHtml(country)})</td></tr>
            </table>
          </section>

          <section style="margin-bottom:32px;">
            <h2 style="font-size:20px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">Key Staff, Employees &amp; Direct Contact Directory</h2>
            <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:14px;">
              <thead>
                <tr style="background:#f8fafc;text-align:left;border-bottom:2px solid #e2e8f0;">
                  <th style="padding:10px;">Name</th>
                  <th style="padding:10px;">Job Title / Role</th>
                  <th style="padding:10px;">Department</th>
                  <th style="padding:10px;">Business Email</th>
                  <th style="padding:10px;">Direct Phone / WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                ${teamRowsHtml}
              </tbody>
            </table>
          </section>

          <section style="margin-bottom:32px;">
            <h2 style="font-size:20px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">Verified Products &amp; OKF Technical Specifications Catalog (${products.length} Items)</h2>
            ${productsHtml}
          </section>
        </div>
      </div>
    `;

    // Inject into HTML Template
    let companyHtml = baseHtml;
    companyHtml = companyHtml.replace(
      /<title>.*?<\/title>/i,
      `<title>${escapeHtml(displayName)} — MarineWorld Verified Enterprise Profile &amp; Technical OKF Catalog</title>`
    );
    const metaDesc = `${displayName}: Official corporate profile, team phone numbers, emails, and verified OKF technical catalog for ${products.map((p) => p.name).slice(0, 5).join(", ")}.`;
    companyHtml = companyHtml.replace(
      /<meta name="description" content=".*?" \/>/i,
      `<meta name="description" content="${escapeHtml(metaDesc)}" />`
    );

    const headInjection = `
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:title" content="${escapeHtml(displayName)} — MarineWorld Verified Profile" />
    <meta property="og:description" content="${escapeHtml(metaDesc)}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:type" content="business.business" />
    <script type="application/ld+json">
${JSON.stringify(schemaLd, null, 2)}
    </script>
    `;
    companyHtml = companyHtml.replace("</head>", `${headInjection}\n</head>`);
    companyHtml = companyHtml.replace('<div id="root"></div>', bodyContentHtml);

    const targets = [compSlug];
    if (compId !== compSlug) targets.push(compId);

    for (const target of targets) {
      const compDir = path.join(distDir, "companies", target);
      fs.mkdirSync(compDir, { recursive: true });
      fs.writeFileSync(path.join(compDir, "index.html"), companyHtml, "utf8");
      fs.writeFileSync(path.join(distDir, "companies", `${target}.html`), companyHtml, "utf8");

      // Write Raw Markdown format (.md) for LLM crawlers
      const rawMarkdown = `# ${displayName} (${legalName})
- Business ID: ${businessId}
- Verification: VERIFIED ENTERPRISE
- Headquarters: ${address}, ${country}
- Official Phone: ${officialPhone}
- Official Email: ${officialEmail}
- Official Website: ${officialWebsite}

## Key Team & Employees:
${teamMembers.map((m) => `- **${m.name}** (${m.role} - ${m.department}): Email: ${m.email} | Phone: ${m.phone || m.whatsapp || "-"}`).join("\n")}

## Products Catalog & OKF Technical Specifications (${products.length} Offerings):
${products.map((p) => `### ${p.name}
- Category: ${p.category || "Maritime"}
- Price / Terms: ${p.commercialInformation?.price || p.price || "Commercial RFQ"}
- Warranty: ${p.commercialInformation?.warranty || p.specifications?.["Warranty Period"] || "Standard"}
- Description: ${p.detailedDescription || p.description || p.shortDescription || ""}
- Technical Specifications:
${Object.entries(p.specifications || {}).map(([k, v]) => `  * ${k}: ${v}`).join("\n")}
`).join("\n")}
`;
      fs.writeFileSync(path.join(distDir, "companies", `${target}.md`), rawMarkdown, "utf8");
    }

    generatedCompaniesCount++;

    // Generate individual Product Pages
    for (const prod of products) {
      const pSlug = prod.slug || prod.id;
      const pName = prod.name || prod.title || "Product";
      const prodUrl = `https://marineworld.city/products/${pSlug}`;
      sitemapUrls.push(prodUrl);

      const prodSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": pName,
        "description": prod.detailedDescription || prod.description || prod.shortDescription,
        "category": prod.category || "Maritime",
        "brand": {
          "@type": "Brand",
          "name": displayName,
        },
        "offers": {
          "@type": "Offer",
          "price": prod.commercialInformation?.price || prod.price || "RFQ",
          "priceCurrency": prod.commercialInformation?.currency || "EUR",
          "warranty": prod.commercialInformation?.warranty,
        },
        "additionalProperty": Object.entries(prod.specifications || {}).map(([k, v]) => ({
          "@type": "PropertyValue",
          "name": k,
          "value": String(v),
        })),
      };

      const prodBody = `
        <div id="root">
          <div class="mw-ai-crawler-content" style="max-width:1200px;margin:0 auto;padding:24px;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;">
            <div style="margin-bottom:16px;">
              <a href="https://marineworld.city/companies/${escapeHtml(compSlug)}" style="color:#0284c7;font-weight:600;text-decoration:none;">&larr; Return to ${escapeHtml(displayName)} Company Profile</a>
            </div>
            <header style="border-bottom:2px solid #0284c7;padding-bottom:16px;margin-bottom:24px;">
              <div style="font-size:12px;font-weight:700;color:#0284c7;letter-spacing:1px;text-transform:uppercase;">Verified Maritime Product &amp; OKF Datasheet</div>
              <h1 style="font-size:32px;font-weight:800;color:#0f172a;margin:8px 0 4px 0;">${escapeHtml(pName)}</h1>
              <div style="font-size:14px;color:#64748b;">
                <span><strong>Manufacturer:</strong> <a href="https://marineworld.city/companies/${escapeHtml(compSlug)}" style="color:#0284c7;font-weight:600;">${escapeHtml(displayName)}</a></span> | 
                <span><strong>Pricing:</strong> <span style="color:#059669;font-weight:700;">${escapeHtml(prod.commercialInformation?.price || prod.price || "Commercial RFQ")}</span></span>
              </div>
            </header>

            <section style="margin-bottom:32px;">
              <h2 style="font-size:20px;font-weight:700;color:#0f172a;">Product Overview &amp; Engineering Specifications</h2>
              <p style="font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(prod.detailedDescription || prod.description || prod.shortDescription || "")}</p>
              
              <div style="margin-top:20px;">
                <h3 style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:12px;">OKF Technical Specifications:</h3>
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                  <tbody>
                    ${Object.entries(prod.specifications || {}).map(([k, v]) => `
                      <tr style="border-bottom:1px solid #e2e8f0;background:#f8fafc;">
                        <td style="padding:10px 14px;font-weight:600;color:#475569;width:35%;">${escapeHtml(k)}:</td>
                        <td style="padding:10px 14px;color:#0f172a;font-weight:600;">${escapeHtml(String(v))}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>

              <div style="margin-top:24px;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
                <h4 style="margin:0 0 8px 0;color:#166534;font-size:15px;font-weight:700;">Commercial &amp; Procurement Inquiries</h4>
                <p style="margin:0;font-size:14px;color:#15803d;">
                  Contact <strong>${escapeHtml(displayName)}</strong>: 
                  Telephone: <a href="tel:${escapeHtml(officialPhone)}" style="color:#166534;font-weight:700;">${escapeHtml(officialPhone)}</a> | 
                  Email: <a href="mailto:${escapeHtml(officialEmail)}" style="color:#166534;font-weight:700;">${escapeHtml(officialEmail)}</a>
                </p>
              </div>
            </section>
          </div>
        </div>
      `;

      let prodHtml = baseHtml;
      prodHtml = prodHtml.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pName)} — ${escapeHtml(displayName)} Technical OKF Datasheet</title>`);
      prodHtml = prodHtml.replace(
        /<meta name="description" content=".*?" \/>/i,
        `<meta name="description" content="${escapeHtml(pName)} by ${escapeHtml(displayName)}. Complete OKF technical parameters, specs, pricing, and compliance." />`
      );

      const prodHead = `
      <link rel="canonical" href="${prodUrl}" />
      <meta property="og:title" content="${escapeHtml(pName)} — ${escapeHtml(displayName)}" />
      <meta property="og:description" content="${escapeHtml(pName)} verified maritime OKF technical datasheet." />
      <meta property="og:url" content="${prodUrl}" />
      <meta property="og:type" content="product" />
      <script type="application/ld+json">
${JSON.stringify(prodSchema, null, 2)}
      </script>
      `;
      prodHtml = prodHtml.replace("</head>", `${prodHead}\n</head>`);
      prodHtml = prodHtml.replace('<div id="root"></div>', prodBody);

      const prodDir = path.join(distDir, "products", pSlug);
      fs.mkdirSync(prodDir, { recursive: true });
      fs.writeFileSync(path.join(prodDir, "index.html"), prodHtml, "utf8");
      fs.writeFileSync(path.join(distDir, "products", `${pSlug}.html`), prodHtml, "utf8");

      const compProdDir = path.join(distDir, "companies", compSlug, "products", pSlug);
      fs.mkdirSync(compProdDir, { recursive: true });
      fs.writeFileSync(path.join(compProdDir, "index.html"), prodHtml, "utf8");

      const okfDir = path.join(distDir, "api", "okf", compId);
      fs.mkdirSync(okfDir, { recursive: true });
      const okfMd = `# ${pName} — OKF Technical Datasheet
Manufacturer: ${displayName} (${legalName})
Company ID: ${compId}
Product Slug: ${pSlug}
Price / Terms: ${prod.commercialInformation?.price || prod.price || "RFQ"}
Incoterms: ${prod.commercialInformation?.incoterms || "EXW"}
Warranty: ${prod.commercialInformation?.warranty || "Standard"}

## Description:
${prod.detailedDescription || prod.description || prod.shortDescription || ""}

## Specifications:
${Object.entries(prod.specifications || {}).map(([k, v]) => `- ${k}: ${v}`).join("\n")}
`;
      fs.writeFileSync(path.join(okfDir, `${pSlug}.md`), okfMd, "utf8");
      fs.writeFileSync(path.join(okfDir, `${pSlug}.json`), JSON.stringify(prod, null, 2), "utf8");

      generatedProductsCount++;
    }
  }

  // Process companies in parallel batches of 25 for fast completion
  const BATCH_SIZE = 25;
  for (let i = 0; i < companiesSnap.docs.length; i += BATCH_SIZE) {
    const chunk = companiesSnap.docs.slice(i, i + BATCH_SIZE);
    await Promise.all(chunk.map((compDoc) => processCompany(compDoc)));
    console.log(`   ↳ Processed ${Math.min(i + BATCH_SIZE, companiesSnap.docs.length)} / ${companiesSnap.docs.length} companies`);
  }

  // Generate XML Sitemap
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((url) => `  <url><loc>${url}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join("\n")}
</urlset>
`;
  fs.writeFileSync(path.join(distDir, "sitemap.xml"), sitemapXml, "utf8");
  fs.writeFileSync(path.join(rootDir, "public", "sitemap.xml"), sitemapXml, "utf8");

  console.log(`✅ [Static Generator] Completed! Pre-rendered ${generatedCompaniesCount} companies and ${generatedProductsCount} products.`);
  console.log(`📄 Generated sitemap.xml with ${sitemapUrls.length} indexed URLs.`);
}

runStaticGeneration().catch((err) => {
  console.error("❌ [Static Generator] Error:", err);
  process.exit(1);
});
