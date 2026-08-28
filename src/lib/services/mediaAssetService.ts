/**
 * MarineWorld Digital Property Media Asset Service
 * 
 * Manages media uploads, validation, storage references, and metadata.
 * Strictly adheres to rule: only canonical media references/URLs are stored in Firestore/Draft revisions.
 */

export interface MediaValidationResult {
  valid: boolean;
  error?: string;
}

export interface UploadedMediaAsset {
  id: string;
  url: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  width?: number;
  height?: number;
}

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

/**
 * Validate an image file before upload
 */
export function validateImageFile(file: File): MediaValidationResult {
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeInMb} MB) exceeds maximum allowed limit of 10 MB.`,
    };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported file type (${file.type || "unknown"}). Allowed formats: JPG, PNG, WEBP.`,
    };
  }

  return { valid: true };
}

/**
 * Validate a video file before upload
 */
export function validateVideoFile(file: File): MediaValidationResult {
  if (file.size > 50 * 1024 * 1024) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Video size (${sizeInMb} MB) exceeds maximum allowed limit of 50 MB.`,
    };
  }

  if (!ALLOWED_VIDEO_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported video type. Allowed formats: MP4, WebM.`,
    };
  }

  return { valid: true };
}

/**
 * Validate a media URL
 */
export function validateMediaUrl(url: string): MediaValidationResult {
  if (!url || !url.trim()) {
    return { valid: false, error: "Media URL cannot be empty." };
  }

  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, error: "URL must use HTTP or HTTPS protocol." };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Please enter a valid, well-formed URL (e.g., https://...)." };
  }
}

import {
  uploadFileToStorage,
  deleteFileFromStorage,
} from "@/lib/services/storageService";

/**
 * Upload a media file with progress feedback.
 * Generates a canonical Firebase Storage reference and download URL.
 */
export async function uploadMediaAsset(
  file: File,
  companyId: string,
  slotId: string,
  mediaRole: "hero" | "mobile" | "gallery" | "video",
  onProgress?: (progress: number) => void
): Promise<UploadedMediaAsset> {
  const validation = mediaRole === "video" ? validateVideoFile(file) : validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || "File validation failed.");
  }

  const res = await uploadFileToStorage(file, {
    companyId,
    categoryFolder: "properties",
    subFolder: slotId,
    fileRole: mediaRole,
    onProgress,
  });

  return {
    id: `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    url: res.url,
    storagePath: res.storagePath,
    fileName: res.fileName,
    fileSize: res.sizeBytes,
    mimeType: res.contentType,
    uploadedAt: res.uploadedAt,
  };
}

export async function deleteMediaAsset(storagePathOrUrl: string): Promise<boolean> {
  return deleteFileFromStorage(storagePathOrUrl);
}
