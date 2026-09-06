/**
 * Google Drive & Picker API Service with OKF Ingestion Pipeline
 * Supports:
 * - Google Identity Services (GIS) OAuth2 authentication
 * - Google Drive Picker API
 * - Service Account workspace binding (driveorganizerokf@uphi-marineworld.iam.gserviceaccount.com)
 * - Shared Drive Link URL parser
 * - Automatic OKF Transformation & Google Knowledge Catalog Sealing
 */

import { runOKFEnrichmentPipeline } from "@/lib/services/okfEnrichmentAgent";
import type { OKFDocument } from "@/lib/types/okf";

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export interface GoogleDriveSelectedFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  url?: string;
  iconUrl?: string;
  isFolder: boolean;
  description?: string;
  lastModified?: string;
  downloadUrl?: string;
}

export const GOOGLE_CLIENT_ID =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) ||
  (typeof process !== "undefined" &&
    (process.env?.GOOGLE_CLIENT_ID || process.env?.VITE_GOOGLE_CLIENT_ID)) ||
  "436648335800-njc2k5lsggl0mmevha5sbi961olapuq5.apps.googleusercontent.com";

export const SERVICE_ACCOUNT_EMAIL = "driveorganizerokf@uphi-marineworld.iam.gserviceaccount.com";
export const FALLBACK_SERVICE_ACCOUNT_EMAIL = "firebase-adminsdk-fbsvc@marineworld-contracts.iam.gserviceaccount.com";
export const DEFAULT_ROOT_WORKSPACE = "MarineWorld_Workspace";

export const GOOGLE_API_KEY =
  (typeof import.meta !== "undefined" &&
    ((import.meta as any).env?.VITE_GOOGLE_API_KEY ||
      (import.meta as any).env?.VITE_FIREBASE_API_KEY)) ||
  (typeof process !== "undefined" &&
    (process.env?.GOOGLE_API_KEY || process.env?.VITE_FIREBASE_API_KEY)) ||
  "AIzaSyCtmVbkClFyRcZaPpVgASF7sKm_5cWmRqs";

const DEVELOPER_KEY = GOOGLE_API_KEY;

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

let isGapiLoaded = false;
let isGsiLoaded = false;
let accessToken: string | null =
  typeof window !== "undefined" ? sessionStorage.getItem("mw_gdrive_token") : null;
let tokenClient: any = null;

/**
 * Dynamically load Google API (gapi) and Google Identity Services (GSI)
 */
export async function loadGoogleScripts(): Promise<void> {
  if (typeof window === "undefined") return;

  const loadGapi = new Promise<void>((resolve, reject) => {
    if (window.gapi && isGapiLoaded) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.gapi.load("picker", () => {
        isGapiLoaded = true;
        resolve();
      });
    };
    script.onerror = (err) => {
      console.error("[GoogleDriveService] Failed to load gapi script:", err);
      reject(err);
    };
    document.body.appendChild(script);
  });

  const loadGsi = new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.oauth2 && isGsiLoaded) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      isGsiLoaded = true;
      resolve();
    };
    script.onerror = (err) => {
      console.error("[GoogleDriveService] Failed to load GSI script:", err);
      reject(err);
    };
    document.body.appendChild(script);
  });

  await Promise.all([loadGapi, loadGsi]);
}

/**
 * Requests OAuth2 Access Token for Google Drive using Google Identity Services
 */
export async function requestGoogleAccessToken(): Promise<string> {
  if (typeof window !== "undefined" && !accessToken) {
    accessToken = sessionStorage.getItem("mw_gdrive_token");
  }

  if (accessToken) {
    return accessToken;
  }

  await loadGoogleScripts();

  return new Promise((resolve, reject) => {
    try {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: (tokenResponse: any) => {
          if (tokenResponse.error !== undefined) {
            console.error("[GoogleDriveService] OAuth error:", tokenResponse);
            reject(new Error(tokenResponse.error));
            return;
          }
          accessToken = tokenResponse.access_token;
          if (typeof window !== "undefined") {
            sessionStorage.setItem("mw_gdrive_token", tokenResponse.access_token);
          }
          resolve(tokenResponse.access_token);
        },
      });

      tokenClient.requestAccessToken({ prompt: "" });
    } catch (err) {
      console.error("[GoogleDriveService] Error initializing token client:", err);
      reject(err);
    }
  });
}

/**
 * Extracts file ID and type from any Google Drive URL
 */
export function parseGoogleDriveLink(link: string): {
  isValid: boolean;
  fileId?: string;
  isFolder: boolean;
} {
  if (!link || typeof link !== "string") return { isValid: false, isFolder: false };

  const trimmed = link.trim();
  // File pattern: /file/d/FILE_ID/ or id=FILE_ID
  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    return { isValid: true, fileId: fileMatch[1], isFolder: false };
  }

  // Folder pattern: /folders/FOLDER_ID
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) {
    return { isValid: true, fileId: folderMatch[1], isFolder: true };
  }

  // Raw file ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return { isValid: true, fileId: trimmed, isFolder: false };
  }

  return { isValid: false, isFolder: false };
}

/**
 * Launches the Google Drive Picker Modal
 */
export async function openGoogleDrivePicker(options?: {
  allowFolders?: boolean;
  mimeTypeFilter?: string;
  multiSelect?: boolean;
}): Promise<GoogleDriveSelectedFile[]> {
  await loadGoogleScripts();
  const token = await requestGoogleAccessToken();

  return new Promise((resolve, reject) => {
    try {
      if (!window.google?.picker) {
        reject(new Error("Google Picker API is not ready."));
        return;
      }

      const view = new window.google.picker.DocsView(
        window.google.picker.ViewId.DOCS
      );
      view.setIncludeFolders(options?.allowFolders ?? true);
      view.setSelectFolderEnabled(options?.allowFolders ?? true);

      if (options?.mimeTypeFilter) {
        view.setMimeTypes(options.mimeTypeFilter);
      }

      const appId = GOOGLE_CLIENT_ID.split("-")[0];
      const pickerBuilder = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .setAppId(appId)
        .setOAuthToken(token);

      if (DEVELOPER_KEY && DEVELOPER_KEY.startsWith("AIza")) {
        pickerBuilder.setDeveloperKey(DEVELOPER_KEY);
      }

      pickerBuilder
        .addView(view)
        .setCallback((data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const docs = data[window.google.picker.Response.DOCUMENTS] || [];
            const results: GoogleDriveSelectedFile[] = docs.map((doc: any) => ({
              id: doc[window.google.picker.Document.ID] || doc.id,
              name: doc[window.google.picker.Document.NAME] || doc.name,
              mimeType: doc[window.google.picker.Document.MIME_TYPE] || doc.type || "application/octet-stream",
              url: doc[window.google.picker.Document.URL] || doc.url,
              iconUrl: doc[window.google.picker.Document.ICON_URL],
              sizeBytes: doc.sizeBytes ? Number(doc.sizeBytes) : undefined,
              isFolder:
                doc[window.google.picker.Document.MIME_TYPE] ===
                "application/vnd.google-apps.folder",
              lastModified: doc[window.google.picker.Document.LAST_EDITED_UTC],
            }));
            resolve(results);
          } else if (data.action === window.google.picker.Action.CANCEL) {
            resolve([]);
          }
        });

      if (options?.multiSelect) {
        pickerBuilder.enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED);
      }

      const picker = pickerBuilder.build();
      picker.setVisible(true);
    } catch (err) {
      console.error("[GoogleDriveService] Error building Google Picker:", err);
      reject(err);
    }
  });
}

/**
 * Lists files from Google Drive v3 REST API directly using OAuth2 Access Token.
 * Bypasses Google Picker iframe / developer key issues completely.
 */
export async function listGoogleDriveFiles(
  folderId: string = "root",
  searchQuery?: string
): Promise<GoogleDriveSelectedFile[]> {
  const token = accessToken || (await requestGoogleAccessToken());
  let query = `'${folderId}' in parents and trashed = false`;
  if (searchQuery && searchQuery.trim()) {
    query += ` and name contains '${searchQuery.trim().replace(/'/g, "\\'")}'`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,mimeType,size,iconLink,webViewLink,modifiedTime)&pageSize=100&orderBy=folder,name`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[GoogleDriveService] listGoogleDriveFiles error:", errText);
    throw new Error(`Google Drive API error (${res.status}): ${res.statusText}`);
  }

  const data = await res.json();
  return (data.files || []).map((doc: any) => ({
    id: doc.id,
    name: doc.name,
    mimeType: doc.mimeType,
    sizeBytes: doc.size ? Number(doc.size) : undefined,
    url: doc.webViewLink || `https://drive.google.com/file/d/${doc.id}/view`,
    iconUrl: doc.iconLink,
    isFolder: doc.mimeType === "application/vnd.google-apps.folder",
    lastModified: doc.modifiedTime,
  }));
}

/**
 * Fetches text content from a Google Drive file
 */
export async function fetchGoogleDriveFileContent(
  fileId: string,
  mimeType?: string
): Promise<string> {
  try {
    const token = accessToken || (await requestGoogleAccessToken());
    let url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    if (mimeType === "application/vnd.google-apps.document") {
      url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
    } else if (mimeType === "application/vnd.google-apps.spreadsheet") {
      url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.warn(`[GoogleDriveService] Could not fetch file body: ${response.statusText}`);
      return `[Google Drive File: ${fileId}]`;
    }

    return await response.text();
  } catch (err) {
    console.warn("[GoogleDriveService] Error fetching file content:", err);
    return `[Google Drive Content: ${fileId}]`;
  }
}

/**
 * Fetches raw binary of a Google Drive file as base64 string for Multimodal AI ingestion
 */
export async function fetchGoogleDriveFileBase64(fileId: string): Promise<string | null> {
  try {
    const token = accessToken || (typeof window !== "undefined" ? sessionStorage.getItem("mw_gdrive_token") : null);

    const headers: Record<string, string> = {};
    let url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else if (DEVELOPER_KEY && DEVELOPER_KEY.startsWith("AIza")) {
      url += `&key=${DEVELOPER_KEY}`;
    }

    let response = await fetch(url, { headers });

    if (!response.ok) {
      // Fallback to direct public download link
      const fallbackUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
      response = await fetch(fallbackUrl);
    }

    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        resolve(res.split(",")[1] || null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("[GoogleDriveService] fetchGoogleDriveFileBase64 error:", err);
    return null;
  }
}

/**
 * Imports a Google Drive file, pipes it through the OKF Enrichment Agent, and returns sealed OKFDocument
 */
export async function importGoogleDriveFileAsOKF(
  driveFile: GoogleDriveSelectedFile,
  companyId: string,
  options?: {
    offeringId?: string;
    offeringSlug?: string;
    entityType?: "PRODUCT" | "SERVICE" | "COMPANY" | "FACILITY" | "CONTRACT" | "GENERAL_CORPORATE";
  }
): Promise<OKFDocument> {
  const content = await fetchGoogleDriveFileContent(driveFile.id, driveFile.mimeType);

  return runOKFEnrichmentPipeline({
    title: driveFile.name,
    rawText: content || `Google Drive file: ${driveFile.name}`,
    companyId,
    offeringId: options?.offeringId,
    offeringSlug: options?.offeringSlug,
    entityType: options?.entityType || (options?.offeringId ? "PRODUCT" : "GENERAL_CORPORATE"),
    sourceOrigin: "GOOGLE_DRIVE",
    sourceUri: driveFile.url || `https://drive.google.com/file/d/${driveFile.id}/view`,
    originalFileName: driveFile.name,
    driveFileId: driveFile.id,
    drivePath: `MarineWorld_Workspace/${driveFile.name}`,
    mimeType: driveFile.mimeType,
  });
}
