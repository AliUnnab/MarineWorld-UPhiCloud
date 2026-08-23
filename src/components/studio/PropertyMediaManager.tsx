import React, { useState, useRef } from "react";
import { CreativeData } from "@/lib/services/propertyGovernanceService";
import {
  validateImageFile,
  validateVideoFile,
  validateMediaUrl,
  uploadMediaAsset,
} from "@/lib/services/mediaAssetService";
import {
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Film,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";

interface PropertyMediaManagerProps {
  creative: CreativeData;
  onChange: (updatedCreative: CreativeData) => void;
  isReadOnly: boolean;
  companyId: string;
  slotId: string;
}

type MediaSubTab = "hero" | "mobile" | "gallery" | "video";

export function PropertyMediaManager({
  creative,
  onChange,
  isReadOnly,
  companyId,
  slotId,
}: PropertyMediaManagerProps) {
  const [activeTab, setActiveTab] = useState<MediaSubTab>("hero");
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<Record<string, string | null>>({});
  const [dragActive, setDragActive] = useState<Record<string, boolean>>({});
  const [manualUrlInput, setManualUrlInput] = useState<string>("");
  const [inputMode, setInputMode] = useState<"upload" | "url">("upload");

  const heroInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Drag handlers
  const handleDrag = (e: React.DragEvent, tabKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive((prev) => ({ ...prev, [tabKey]: true }));
    } else if (e.type === "dragleave") {
      setDragActive((prev) => ({ ...prev, [tabKey]: false }));
    }
  };

  const handleDrop = async (e: React.DragEvent, tabKey: MediaSubTab) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive((prev) => ({ ...prev, [tabKey]: false }));

    if (isReadOnly) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFileUpload(e.dataTransfer.files[0], tabKey);
    }
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    tabKey: MediaSubTab
  ) => {
    if (isReadOnly) return;
    if (e.target.files && e.target.files[0]) {
      await processFileUpload(e.target.files[0], tabKey);
    }
  };

  const processFileUpload = async (file: File, role: MediaSubTab) => {
    setErrorMessage((prev) => ({ ...prev, [role]: null }));
    setIsUploading((prev) => ({ ...prev, [role]: true }));
    setUploadProgress((prev) => ({ ...prev, [role]: 0 }));

    try {
      const uploaded = await uploadMediaAsset(
        file,
        companyId,
        slotId,
        role === "video" ? "video" : role === "mobile" ? "mobile" : role === "gallery" ? "gallery" : "hero",
        (progress) => {
          setUploadProgress((prev) => ({ ...prev, [role]: progress }));
        }
      );

      if (role === "hero") {
        onChange({ ...creative, mediaUrl: uploaded.url });
      } else if (role === "mobile") {
        onChange({ ...creative, mobileMediaUrl: uploaded.url });
      } else if (role === "gallery") {
        const currentGallery = creative.galleryMediaUrls || [];
        if (currentGallery.length < 4) {
          onChange({ ...creative, galleryMediaUrls: [...currentGallery, uploaded.url] });
        } else {
          setErrorMessage((prev) => ({ ...prev, gallery: "Maximum 4 gallery images allowed." }));
        }
      } else if (role === "video") {
        onChange({ ...creative, videoUrl: uploaded.url });
      }
    } catch (err: any) {
      setErrorMessage((prev) => ({
        ...prev,
        [role]: err.message || "Failed to upload asset.",
      }));
    } finally {
      setIsUploading((prev) => ({ ...prev, [role]: false }));
    }
  };

  const handleApplyUrl = (role: MediaSubTab) => {
    setErrorMessage((prev) => ({ ...prev, [role]: null }));
    const validation = validateMediaUrl(manualUrlInput);
    if (!validation.valid) {
      setErrorMessage((prev) => ({ ...prev, [role]: validation.error || "Invalid URL." }));
      return;
    }

    const trimmedUrl = manualUrlInput.trim();

    if (role === "hero") {
      onChange({ ...creative, mediaUrl: trimmedUrl });
    } else if (role === "mobile") {
      onChange({ ...creative, mobileMediaUrl: trimmedUrl });
    } else if (role === "gallery") {
      const currentGallery = creative.galleryMediaUrls || [];
      if (currentGallery.length < 4) {
        onChange({ ...creative, galleryMediaUrls: [...currentGallery, trimmedUrl] });
      } else {
        setErrorMessage((prev) => ({ ...prev, gallery: "Maximum 4 gallery images allowed." }));
      }
    } else if (role === "video") {
      onChange({ ...creative, videoUrl: trimmedUrl });
    }

    setManualUrlInput("");
  };

  const handleRemoveGalleryImage = (index: number) => {
    if (isReadOnly) return;
    const current = [...(creative.galleryMediaUrls || [])];
    current.splice(index, 1);
    onChange({ ...creative, galleryMediaUrls: current });
  };

  return (
    <div className="space-y-5">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-line overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setActiveTab("hero");
            setManualUrlInput("");
          }}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "hero"
              ? "bg-white text-graphite shadow-xs"
              : "text-stone hover:text-graphite"
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Primary Hero</span>
          {creative.mediaUrl && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("mobile");
            setManualUrlInput("");
          }}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "mobile"
              ? "bg-white text-graphite shadow-xs"
              : "text-stone hover:text-graphite"
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Mobile Viewport</span>
          {creative.mobileMediaUrl && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("gallery");
            setManualUrlInput("");
          }}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "gallery"
              ? "bg-white text-graphite shadow-xs"
              : "text-stone hover:text-graphite"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Gallery ({(creative.galleryMediaUrls || []).length}/4)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("video");
            setManualUrlInput("");
          }}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "video"
              ? "bg-white text-graphite shadow-xs"
              : "text-stone hover:text-graphite"
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Cinematic Video</span>
          {creative.videoUrl && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        </button>
      </div>

      {/* Mode Selector: Upload Desktop vs Paste URL */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-stone">
          {activeTab === "hero" && "Primary 16:9 Showcase image for Flagship & Landmark presence."}
          {activeTab === "mobile" && "Optimized vertical/portrait asset for mobile devices (Optional)."}
          {activeTab === "gallery" && "Secondary showcase images for property detail view (Max 4)."}
          {activeTab === "video" && "Background motion reel or MP4 video (Optional)."}
        </div>

        <div className="flex items-center gap-1 bg-white border border-line rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setInputMode("upload")}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
              inputMode === "upload" ? "bg-slate-900 text-white" : "text-stone hover:text-graphite"
            }`}
          >
            <Upload className="w-3 h-3" />
            <span>Upload File</span>
          </button>
          <button
            type="button"
            onClick={() => setInputMode("url")}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
              inputMode === "url" ? "bg-slate-900 text-white" : "text-stone hover:text-graphite"
            }`}
          >
            <LinkIcon className="w-3 h-3" />
            <span>Paste URL</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage[activeTab] && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage[activeTab]}</span>
        </div>
      )}

      {/* =========================================================
          TAB 1: PRIMARY HERO IMAGE
      ========================================================= */}
      {activeTab === "hero" && (
        <div className="space-y-4">
          {/* Active Preview */}
          {creative.mediaUrl ? (
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden border border-line bg-slate-950 aspect-video max-h-56 relative group shadow-sm">
                <img
                  src={creative.mediaUrl}
                  alt="Hero Showcase"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                  <span className="text-[10px] font-mono text-white/90 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
                    Primary 16:9 Showcase
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => heroInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-xs flex items-center gap-1 transition-colors disabled:opacity-40"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Replace</span>
                    </button>
                    <button
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => onChange({ ...creative, mediaUrl: "" })}
                      className="px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold backdrop-blur-xs flex items-center gap-1 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-stone">
                <span className="flex items-center gap-1 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Hero visual loaded and staged for property
                </span>
                <a
                  href={creative.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-graphite flex items-center gap-1 font-mono text-[10px]"
                >
                  View Full Asset <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          ) : (
            /* Upload / URL Input Zone */
            <div>
              {inputMode === "upload" ? (
                <div
                  onDragEnter={(e) => handleDrag(e, "hero")}
                  onDragLeave={(e) => handleDrag(e, "hero")}
                  onDragOver={(e) => handleDrag(e, "hero")}
                  onDrop={(e) => handleDrop(e, "hero")}
                  onClick={() => !isReadOnly && heroInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                    dragActive.hero
                      ? "border-royal bg-royal/5 shadow-inner"
                      : "border-line hover:border-royal/50 bg-white"
                  } ${isReadOnly ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <input
                    ref={heroInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    disabled={isReadOnly}
                    onChange={(e) => handleFileInputChange(e, "hero")}
                    className="hidden"
                  />

                  {isUploading.hero ? (
                    <div className="space-y-3 max-w-xs mx-auto">
                      <div className="w-8 h-8 rounded-full border-2 border-royal border-t-transparent animate-spin mx-auto" />
                      <div className="text-xs font-semibold text-graphite">
                        Staging media asset... ({uploadProgress.hero || 0}%)
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-royal h-full transition-all duration-200"
                          style={{ width: `${uploadProgress.hero || 0}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 mx-auto flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-semibold text-graphite">
                        Drag and drop your primary hero image here, or{" "}
                        <span className="text-royal underline">browse files</span>
                      </div>
                      <p className="text-[11px] text-stone">
                        Supports high-resolution JPG, PNG, WEBP up to 10 MB. Recommended ratio: 16:9.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 bg-white p-5 border border-line rounded-xl">
                  <label className="text-[11px] font-semibold text-graphite block">
                    Direct Image URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      disabled={isReadOnly}
                      value={manualUrlInput}
                      onChange={(e) => setManualUrlInput(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="flex-1 bg-slate-50 border border-line rounded-xl px-3.5 py-2 text-xs text-graphite focus:outline-none focus:border-royal"
                    />
                    <button
                      type="button"
                      disabled={isReadOnly || !manualUrlInput.trim()}
                      onClick={() => handleApplyUrl("hero")}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
                    >
                      Apply URL
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 2: MOBILE VIEWPORT
      ========================================================= */}
      {activeTab === "mobile" && (
        <div className="space-y-4">
          {creative.mobileMediaUrl ? (
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden border border-line bg-slate-950 max-w-[200px] aspect-[9/16] relative group shadow-sm mx-auto">
                <img
                  src={creative.mobileMediaUrl}
                  alt="Mobile Showcase"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3">
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => onChange({ ...creative, mobileMediaUrl: "" })}
                    className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
              <div className="text-center text-[11px] text-emerald-700 font-medium">
                Portrait mobile asset staged
              </div>
            </div>
          ) : (
            <div>
              {inputMode === "upload" ? (
                <div
                  onDragEnter={(e) => handleDrag(e, "mobile")}
                  onDragLeave={(e) => handleDrag(e, "mobile")}
                  onDragOver={(e) => handleDrag(e, "mobile")}
                  onDrop={(e) => handleDrop(e, "mobile")}
                  onClick={() => !isReadOnly && mobileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                    dragActive.mobile
                      ? "border-royal bg-royal/5"
                      : "border-line hover:border-royal/50 bg-white"
                  }`}
                >
                  <input
                    ref={mobileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={isReadOnly}
                    onChange={(e) => handleFileInputChange(e, "mobile")}
                    className="hidden"
                  />
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 mx-auto flex items-center justify-center">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-semibold text-graphite">
                      Upload mobile portrait image (9:16)
                    </div>
                    <p className="text-[11px] text-stone">
                      Tailors the mobile preview viewport.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-white p-5 border border-line rounded-xl">
                  <label className="text-[11px] font-semibold text-graphite block">
                    Mobile Image URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      disabled={isReadOnly}
                      value={manualUrlInput}
                      onChange={(e) => setManualUrlInput(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 bg-slate-50 border border-line rounded-xl px-3.5 py-2 text-xs text-graphite focus:outline-none focus:border-royal"
                    />
                    <button
                      type="button"
                      disabled={isReadOnly || !manualUrlInput.trim()}
                      onClick={() => handleApplyUrl("mobile")}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 3: GALLERY ASSETS
      ========================================================= */}
      {activeTab === "gallery" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(creative.galleryMediaUrls || []).map((url, idx) => (
              <div
                key={idx}
                className="relative rounded-xl overflow-hidden border border-line bg-slate-950 aspect-square group shadow-sm"
              >
                <img src={url} alt={`Gallery item ${idx + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => handleRemoveGalleryImage(idx)}
                    className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono">
                  #{idx + 1}
                </div>
              </div>
            ))}

            {(creative.galleryMediaUrls || []).length < 4 && (
              <div
                onClick={() => !isReadOnly && galleryInputRef.current?.click()}
                className={`border-2 border-dashed border-line rounded-xl aspect-square flex flex-col items-center justify-center p-3 text-center cursor-pointer hover:border-royal/50 hover:bg-slate-50 transition-all ${
                  isReadOnly ? "opacity-40 cursor-not-allowed" : ""
                }`}
              >
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={isReadOnly}
                  onChange={(e) => handleFileInputChange(e, "gallery")}
                  className="hidden"
                />
                <Upload className="w-4 h-4 text-stone mb-1" />
                <span className="text-[11px] font-semibold text-graphite">Add Gallery Image</span>
                <span className="text-[9px] text-stone">Up to 4 images</span>
              </div>
            )}
          </div>

          {inputMode === "url" && (creative.galleryMediaUrls || []).length < 4 && (
            <div className="space-y-3 bg-white p-4 border border-line rounded-xl">
              <label className="text-[11px] font-semibold text-graphite block">
                Add Gallery Image by URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  disabled={isReadOnly}
                  value={manualUrlInput}
                  onChange={(e) => setManualUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 bg-slate-50 border border-line rounded-xl px-3 py-1.5 text-xs text-graphite focus:outline-none focus:border-royal"
                />
                <button
                  type="button"
                  disabled={isReadOnly || !manualUrlInput.trim()}
                  onClick={() => handleApplyUrl("gallery")}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 4: CINEMATIC VIDEO
      ========================================================= */}
      {activeTab === "video" && (
        <div className="space-y-4">
          {creative.videoUrl ? (
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden border border-line bg-slate-950 aspect-video max-h-56 relative group shadow-sm">
                <video
                  src={creative.videoUrl}
                  controls
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Cinematic video attached
                </span>
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => onChange({ ...creative, videoUrl: "" })}
                  className="text-rose-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Video</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              {inputMode === "upload" ? (
                <div
                  onDragEnter={(e) => handleDrag(e, "video")}
                  onDragLeave={(e) => handleDrag(e, "video")}
                  onDragOver={(e) => handleDrag(e, "video")}
                  onDrop={(e) => handleDrop(e, "video")}
                  onClick={() => !isReadOnly && videoInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                    dragActive.video
                      ? "border-royal bg-royal/5"
                      : "border-line hover:border-royal/50 bg-white"
                  }`}
                >
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm"
                    disabled={isReadOnly}
                    onChange={(e) => handleFileInputChange(e, "video")}
                    className="hidden"
                  />
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 mx-auto flex items-center justify-center">
                      <Film className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-semibold text-graphite">
                      Upload video reel (MP4, WebM up to 50 MB)
                    </div>
                    <p className="text-[11px] text-stone">
                      Serves as optional dynamic motion showcase on property card.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-white p-5 border border-line rounded-xl">
                  <label className="text-[11px] font-semibold text-graphite block">
                    Direct Video Stream URL (MP4 / WebM)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      disabled={isReadOnly}
                      value={manualUrlInput}
                      onChange={(e) => setManualUrlInput(e.target.value)}
                      placeholder="https://.../video.mp4"
                      className="flex-1 bg-slate-50 border border-line rounded-xl px-3.5 py-2 text-xs text-graphite focus:outline-none focus:border-royal"
                    />
                    <button
                      type="button"
                      disabled={isReadOnly || !manualUrlInput.trim()}
                      onClick={() => handleApplyUrl("video")}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
