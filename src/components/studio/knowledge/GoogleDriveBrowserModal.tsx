import React, { useState, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  FileText,
  FileImage,
  FileSpreadsheet,
  Search,
  ChevronRight,
  RefreshCw,
  Check,
  CheckSquare,
  Square,
  X,
  AlertCircle,
  HardDrive,
  LayoutGrid,
  List,
  ShieldCheck,
  CheckCheck,
} from "lucide-react";
import {
  listGoogleDriveFiles,
  type GoogleDriveSelectedFile,
} from "@/lib/services/googleDriveService";

interface GoogleDriveBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFiles: (files: GoogleDriveSelectedFile[]) => void;
  multiSelect?: boolean;
  mimeTypeFilter?: "documents" | "media" | "all";
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

export const GoogleDriveBrowserModal: React.FC<GoogleDriveBrowserModalProps> = ({
  isOpen,
  onClose,
  onSelectFiles,
  multiSelect = true,
  mimeTypeFilter = "all",
}) => {
  const [currentFolderId, setCurrentFolderId] = useState<string>("root");
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: "root", name: "My Drive" },
  ]);
  const [files, setFiles] = useState<GoogleDriveSelectedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<GoogleDriveSelectedFile[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">(mimeTypeFilter === "media" ? "grid" : "list");

  const loadFolder = async (folderId: string, search?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const items = await listGoogleDriveFiles(folderId, search);
      setFiles(items);
    } catch (err: any) {
      console.error("[GoogleDriveBrowserModal] Error loading files:", err);
      setErrorMessage(
        err?.message || "Could not load Google Drive files. Please check permissions."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFolder(currentFolderId);
    } else {
      setSelectedFiles([]);
      setSearchQuery("");
      setCurrentFolderId("root");
      setBreadcrumbs([{ id: "root", name: "My Drive" }]);
    }
  }, [isOpen]);

  const handleNavigateToFolder = (folder: GoogleDriveSelectedFile) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSearchQuery("");
    loadFolder(folder.id);
  };

  const handleBreadcrumbClick = (index: number) => {
    const target = breadcrumbs[index];
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolderId(target.id);
    setSearchQuery("");
    loadFolder(target.id);
  };

  const handleToggleSelect = (file: GoogleDriveSelectedFile) => {
    if (file.isFolder) {
      handleNavigateToFolder(file);
      return;
    }

    if (multiSelect) {
      const exists = selectedFiles.some((f) => f.id === file.id);
      if (exists) {
        setSelectedFiles((prev) => prev.filter((f) => f.id !== file.id));
      } else {
        setSelectedFiles((prev) => [...prev, file]);
      }
    } else {
      setSelectedFiles([file]);
    }
  };

  const filteredFiles = files.filter((f) => {
    if (f.isFolder) return true;
    if (mimeTypeFilter === "media") {
      const isImg = f.mimeType.includes("image") || /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(f.name);
      const isPdf = f.mimeType.includes("pdf") || /\.pdf$/i.test(f.name);
      return isImg || isPdf;
    }
    if (mimeTypeFilter === "documents") {
      const isImg = f.mimeType.includes("image");
      return !isImg || /\.pdf$/i.test(f.name);
    }
    return true;
  });

  const selectableFiles = filteredFiles.filter((f) => !f.isFolder);

  const handleSelectAll = () => {
    if (selectedFiles.length === selectableFiles.length && selectableFiles.length > 0) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(selectableFiles);
    }
  };

  const handleConfirm = () => {
    if (selectedFiles.length === 0) return;
    onSelectFiles(selectedFiles);
    onClose();
  };

  const getFileIcon = (file: GoogleDriveSelectedFile) => {
    if (file.isFolder) {
      return <Folder className="w-5 h-5 text-amber-500 fill-amber-500/20 shrink-0" />;
    }
    const mime = file.mimeType.toLowerCase();
    const name = file.name.toLowerCase();
    if (mime.includes("image") || name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg")) {
      return <FileImage className="w-5 h-5 text-blue-500 shrink-0" />;
    }
    if (mime.includes("sheet") || name.endsWith(".xlsx") || name.endsWith(".csv")) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />;
    }
    return <FileText className="w-5 h-5 text-royal shrink-0" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl h-[88vh] max-h-[850px] bg-white rounded-3xl border border-line shadow-2xl flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line bg-canvas flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-xs border border-amber-500/20">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-graphite font-mono tracking-tight">
                  Google Drive Live Explorer
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  CONNECTED
                </span>
              </div>
              <p className="text-xs text-stone">
                Select multiple documents, PDF drawings, or photos directly from your Google Drive.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone hover:text-graphite hover:bg-mist transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Breadcrumbs + Search + View Toggle + Select All */}
        <div className="p-4 border-b border-line bg-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono py-1">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-stone shrink-0" />}
                <button
                  type="button"
                  onClick={() => handleBreadcrumbClick(idx)}
                  className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                    idx === breadcrumbs.length - 1
                      ? "font-bold text-royal bg-royal/10 border border-royal/20"
                      : "text-stone hover:text-graphite hover:bg-slate-100"
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Search, View Mode & Refresh */}
          <div className="flex items-center gap-2 shrink-0">
            {multiSelect && selectableFiles.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-1.5 rounded-xl border border-line bg-canvas text-xs font-mono text-graphite hover:bg-mist transition flex items-center gap-1.5"
              >
                {selectedFiles.length === selectableFiles.length ? (
                  <>
                    <CheckCheck className="w-3.5 h-3.5 text-royal" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-stone" />
                    <span>Select All ({selectableFiles.length})</span>
                  </>
                )}
              </button>
            )}

            <div className="flex items-center border border-line rounded-xl overflow-hidden p-0.5 bg-canvas">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition ${viewMode === "list" ? "bg-white text-royal shadow-2xs" : "text-stone hover:text-graphite"}`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition ${viewMode === "grid" ? "bg-white text-royal shadow-2xs" : "text-stone hover:text-graphite"}`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="relative w-48 sm:w-56">
              <Search className="w-3.5 h-3.5 text-stone absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search in Drive..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    loadFolder(currentFolderId, searchQuery);
                  }
                }}
                className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-line bg-canvas text-xs font-mono text-graphite focus:outline-hidden focus:border-royal"
              />
            </div>

            <button
              type="button"
              onClick={() => loadFolder(currentFolderId, searchQuery)}
              disabled={isLoading}
              title="Refresh Folder"
              className="p-2 rounded-xl border border-line hover:bg-mist text-stone hover:text-graphite transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-royal" : ""}`} />
            </button>
          </div>
        </div>

        {/* File List / Content View */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2">
          {isLoading ? (
            <div className="py-24 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-royal mx-auto" />
              <p className="text-xs text-stone font-mono">Querying Google Drive files...</p>
            </div>
          ) : errorMessage ? (
            <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-3 text-center max-w-md mx-auto my-12">
              <AlertCircle className="w-6 h-6 mx-auto text-rose-600" />
              <p className="font-bold text-sm">Failed to load Google Drive files</p>
              <p className="text-xs font-mono text-rose-700">{errorMessage}</p>
              <button
                type="button"
                onClick={() => loadFolder(currentFolderId)}
                className="mt-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Try Again
              </button>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="py-24 text-center space-y-2 text-stone">
              <FolderOpen className="w-10 h-10 mx-auto text-stone/40" />
              <p className="text-sm font-bold text-graphite">This folder is empty</p>
              <p className="text-xs">No matching files or subfolders found in this Google Drive location.</p>
            </div>
          ) : viewMode === "grid" ? (
            /* Grid View (Ideal for media, photos, PDF drawings) */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredFiles.map((file) => {
                const isSelected = selectedFiles.some((f) => f.id === file.id);
                const isImg = file.mimeType.includes("image") || /\.(png|jpg|jpeg|webp)$/i.test(file.name);

                return (
                  <div
                    key={file.id}
                    onClick={() => handleToggleSelect(file)}
                    className={`relative p-3 rounded-2xl border transition flex flex-col justify-between gap-2 cursor-pointer group ${
                      isSelected
                        ? "bg-royal/5 border-royal shadow-sm ring-2 ring-royal"
                        : file.isFolder
                        ? "bg-amber-50/40 border-amber-200/80 hover:bg-amber-50 hover:border-amber-300"
                        : "bg-white border-line hover:border-royal/50 hover:bg-slate-50"
                    }`}
                  >
                    {/* Thumbnail / Icon Area */}
                    <div className="w-full aspect-4/3 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center overflow-hidden relative">
                      {isImg && file.url ? (
                        <img
                          src={`https://drive.google.com/thumbnail?id=${file.id}&sz=w400`}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        getFileIcon(file)
                      )}

                      {/* Selection Checkbox Badge */}
                      {!file.isFolder && (
                        <div className="absolute top-2 right-2">
                          {isSelected ? (
                            <div className="w-6 h-6 rounded-full bg-royal text-white flex items-center justify-center shadow-md ring-2 ring-white">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-white/90 border border-stone/30 group-hover:border-royal shadow-xs flex items-center justify-center" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 pt-1">
                      <p className="text-xs font-bold text-graphite truncate font-mono" title={file.name}>
                        {file.name}
                      </p>
                      <div className="flex items-center justify-between text-[10px] font-mono text-stone mt-1">
                        {file.isFolder ? (
                          <span className="text-amber-700 font-bold uppercase flex items-center gap-1">
                            Folder <ChevronRight className="w-3 h-3" />
                          </span>
                        ) : (
                          <span>
                            {file.sizeBytes ? `${(file.sizeBytes / 1024 / 1024).toFixed(2)} MB` : "Doc"}
                          </span>
                        )}
                        {file.lastModified && (
                          <span>{new Date(file.lastModified).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View (Ideal for documents, specs, spreadsheets) */
            <div className="space-y-1.5">
              {filteredFiles.map((file) => {
                const isSelected = selectedFiles.some((f) => f.id === file.id);
                return (
                  <div
                    key={file.id}
                    onClick={() => handleToggleSelect(file)}
                    className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer group ${
                      isSelected
                        ? "bg-royal/5 border-royal shadow-xs ring-1 ring-royal"
                        : file.isFolder
                        ? "bg-amber-50/40 border-amber-200/70 hover:bg-amber-50 hover:border-amber-300"
                        : "bg-white border-line hover:border-royal/50 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Checkbox indicator */}
                      {!file.isFolder ? (
                        isSelected ? (
                          <div className="w-5 h-5 rounded-lg bg-royal text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-lg border border-stone/30 group-hover:border-royal shrink-0" />
                        )
                      ) : (
                        <div className="w-5 h-5 flex items-center justify-center shrink-0">
                          <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                        </div>
                      )}

                      {getFileIcon(file)}

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-graphite truncate font-mono">
                          {file.name}
                        </p>
                        <div className="flex items-center gap-2 text-[10.5px] font-mono text-stone mt-0.5">
                          {file.isFolder ? (
                            <span className="text-amber-700 font-bold uppercase">Folder</span>
                          ) : (
                            <span>
                              {file.sizeBytes ? `${(file.sizeBytes / 1024 / 1024).toFixed(2)} MB` : "Document"}
                            </span>
                          )}
                          {file.lastModified && (
                            <span>• Modified: {new Date(file.lastModified).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {file.isFolder && (
                        <span className="text-[11px] font-mono text-amber-700 font-bold flex items-center gap-1 bg-amber-100/60 px-2.5 py-1 rounded-lg">
                          Open <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="px-6 py-4 border-t border-line bg-canvas flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs font-mono text-stone flex items-center gap-2">
            {selectedFiles.length > 0 ? (
              <span className="px-3 py-1 rounded-xl bg-royal/10 text-royal font-bold border border-royal/20">
                {selectedFiles.length} item{selectedFiles.length > 1 ? "s" : ""} selected
              </span>
            ) : (
              <span>Click on any item to select</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white border border-line text-graphite text-xs font-bold hover:bg-mist transition shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedFiles.length === 0}
              onClick={handleConfirm}
              className="px-6 py-2.5 rounded-xl bg-royal hover:bg-royal/90 disabled:opacity-40 text-white text-xs font-bold transition shadow-md flex items-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Import Selected ({selectedFiles.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
