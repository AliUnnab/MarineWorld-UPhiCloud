/**
 * Google Drive & Picker API Service
 * Handles OAuth2 authentication via Google Identity Services (GIS)
 * and file picking via Google Drive Picker API.
 */

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

const GOOGLE_CLIENT_ID =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) ||
  (typeof process !== "undefined" &&
    (process.env?.GOOGLE_CLIENT_ID || process.env?.VITE_GOOGLE_CLIENT_ID)) ||
  "";

const DEVELOPER_KEY =
  (typeof import.meta !== "undefined" &&
    ((import.meta as any).env?.VITE_GEMINI_API_KEY ||
      (import.meta as any).env?.VITE_FIREBASE_API_KEY)) ||
  (typeof process !== "undefined" &&
    (process.env?.GEMINI_API_KEY || process.env?.VITE_GEMINI_API_KEY)) ||
  "";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

let isGapiLoaded = false;
let isGsiLoaded = false;
let accessToken: string | null = null;
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
  await loadGoogleScripts();

  return new Promise((resolve, reject) => {
    try {
      if (!tokenClient) {
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
            resolve(tokenResponse.access_token);
          },
        });
      }

      // Check if token already valid
      if (accessToken) {
        resolve(accessToken);
        return;
      }

      // Request token interactively
      tokenClient.requestAccessToken({ prompt: "consent" });
    } catch (err) {
      console.error("[GoogleDriveService] Error initializing token client:", err);
      reject(err);
    }
  });
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

      const pickerBuilder = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .setAppId(GOOGLE_CLIENT_ID.split("-")[0])
        .setOAuthToken(token)
        .setDeveloperKey(DEVELOPER_KEY)
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
 * Fetches text content from a Google Drive file if exportable / readable
 */
export async function fetchGoogleDriveFileContent(
  fileId: string,
  mimeType: string
): Promise<string> {
  const token = accessToken || (await requestGoogleAccessToken());
  try {
    let url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    // If Google Docs, export as plain text
    if (mimeType === "application/vnd.google-apps.document") {
      url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.warn(`[GoogleDriveService] Could not fetch file body: ${response.statusText}`);
      return "";
    }

    return await response.text();
  } catch (err) {
    console.warn("[GoogleDriveService] Error fetching file content:", err);
    return "";
  }
}
