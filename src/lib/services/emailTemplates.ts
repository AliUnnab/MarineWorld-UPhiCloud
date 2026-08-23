/**
 * MarineWorld.City - Institutional Email Templates
 * Responsive, clean, corporate visual layout for real-sector maritime business users.
 */

export interface EmailTemplateData {
  title: string;
  recipientName: string;
  primaryActionLabel?: string;
  primaryActionUrl?: string;
  bodyParagraphs: string[];
  keyDetails?: Array<{ label: string; value: string }>;
  footerNote?: string;
}

/**
 * Generates institutional HTML email wrapping MarineWorld.City brand styling
 */
export function buildInstitutionalEmailHtml(data: EmailTemplateData): string {
  const detailsHtml = data.keyDetails && data.keyDetails.length > 0
    ? `
      <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
        <tbody>
          ${data.keyDetails
            .map(
              (detail) => `
            <tr>
              <td style="padding: 10px 16px; border-bottom: 1px solid #edf2f7; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; width: 35%;">
                ${escapeHtml(detail.label)}
              </td>
              <td style="padding: 10px 16px; border-bottom: 1px solid #edf2f7; font-size: 13px; font-weight: 600; color: #0f172a;">
                ${escapeHtml(detail.value)}
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `
    : "";

  const actionButtonHtml = data.primaryActionUrl && data.primaryActionLabel
    ? `
      <div style="margin: 32px 0 24px 0; text-align: left;">
        <a href="${escapeHtml(data.primaryActionUrl)}" target="_blank" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 13px; font-weight: 700; border-radius: 6px; display: inline-block; letter-spacing: 0.02em;">
          ${escapeHtml(data.primaryActionLabel)} &rarr;
        </a>
      </div>
    `
    : "";

  const paragraphsHtml = data.bodyParagraphs
    .map(
      (p) => `<p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">${escapeHtml(p)}</p>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0b192c; padding: 24px 32px; border-bottom: 3px solid #0284c7;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>
                    <span style="font-size: 16px; font-weight: 800; letter-spacing: 0.12em; color: #ffffff; text-transform: uppercase;">
                      MARINEWORLD<span style="color: #38bdf8;">.CITY</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: #94a3b8; text-transform: uppercase; background-color: #1e293b; padding: 4px 8px; border-radius: 4px;">
                      INSTITUTIONAL
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 20px 0; letter-spacing: -0.01em;">
                ${escapeHtml(data.title)}
              </h1>
              
              <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0;">
                Dear ${escapeHtml(data.recipientName)},
              </p>

              ${paragraphsHtml}

              ${detailsHtml}

              ${actionButtonHtml}

              ${data.footerNote ? `<p style="font-size: 12px; color: #64748b; font-style: italic; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">${escapeHtml(data.footerNote)}</p>` : ""}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0 0 6px 0; font-weight: 600; color: #475569;">
                MarineWorld.City &mdash; Global Marine Sector Infrastructure
              </p>
              <p style="margin: 0;">
                This is an automated transactional notification dispatched on behalf of verified company operations.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds plain text alternative for email clients
 */
export function buildInstitutionalEmailText(data: EmailTemplateData): string {
  let text = `MARINEWORLD.CITY - INSTITUTIONAL NOTIFICATION\n`;
  text += `==============================================\n\n`;
  text += `${data.title.toUpperCase()}\n\n`;
  text += `Dear ${data.recipientName},\n\n`;

  data.bodyParagraphs.forEach((p) => {
    text += `${p}\n\n`;
  });

  if (data.keyDetails && data.keyDetails.length > 0) {
    text += `DETAILS:\n`;
    data.keyDetails.forEach((d) => {
      text += `- ${d.label}: ${d.value}\n`;
    });
    text += `\n`;
  }

  if (data.primaryActionUrl && data.primaryActionLabel) {
    text += `${data.primaryActionLabel}: ${data.primaryActionUrl}\n\n`;
  }

  if (data.footerNote) {
    text += `Note: ${data.footerNote}\n\n`;
  }

  text += `---\n`;
  text += `MarineWorld.City - Global Marine Sector Infrastructure\n`;
  return text;
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
