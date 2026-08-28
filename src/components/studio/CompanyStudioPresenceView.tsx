import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Building2,
  MapPin,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  Save,
  AlertCircle,
  ShieldCheck,
  Globe2,
  ExternalLink,
  ChevronRight,
  Radio,
  Layers,
  Info,
  Check,
  ArrowRight,
  Camera,
  Image as ImageIcon,
  Clock,
  Phone,
  Mail,
  Eye,
  EyeOff,
  Compass,
  Anchor,
  Factory,
  Warehouse,
  Sliders,
  X,
  Search,
  Maximize2,
  Upload,
  UploadCloud,
  Link as LinkIcon,
  ArrowUp,
  ArrowDown,
  BookmarkCheck,
  FileImage,
  ZoomIn,
  Cpu,
} from "lucide-react";
import type {
  CompanyEntity,
  PhysicalFacility,
  PhysicalFacilityType,
  FacilityOperationalStatus,
  FacilityVisibility,
  FacilityMediaCategory,
  FacilityMediaItem,
} from "@/lib/types";
import {
  uploadFileToStorage,
  deleteFileFromStorage,
  validateStorageFile,
} from "@/lib/services/storageService";
import {
  getCompanyById,
  saveCompany,
  getPhysicalFacilities,
  getRegisteredHeadquarters,
  setRegisteredHeadquarters,
  addPhysicalFacility,
  updatePhysicalFacility,
  removePhysicalFacility,
  updateGeographicCoverage,
} from "@/lib/services/companyService";
import { getCompanyRecordSync } from "@/lib/repositories/companyRepository";

interface CompanyStudioPresenceViewProps {
  companyId: string;
  onSaved?: () => void;
}

const FACILITY_TYPES: Array<{ type: PhysicalFacilityType; label: string; iconName: string }> = [
  { type: "Office", label: "Office", iconName: "Building2" },
  { type: "Factory", label: "Factory", iconName: "Factory" },
  { type: "Shipyard", label: "Shipyard", iconName: "Anchor" },
  { type: "Service Center", label: "Service Center", iconName: "Sliders" },
  { type: "Showroom", label: "Showroom", iconName: "Eye" },
  { type: "Warehouse", label: "Warehouse", iconName: "Warehouse" },
  { type: "Logistics Hub", label: "Logistics Hub", iconName: "Globe2" },
  { type: "Workshop", label: "Workshop", iconName: "Sliders" },
  { type: "Sales Office", label: "Sales Office", iconName: "Building2" },
  { type: "Regional Branch", label: "Regional Branch", iconName: "Building2" },
  { type: "Other", label: "Other Facility", iconName: "MapPin" },
];

const OPERATIONAL_STATUSES: Array<{ status: FacilityOperationalStatus; label: string; color: string }> = [
  { status: "ACTIVE", label: "Fully Operational (Active)", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  { status: "MAINTENANCE", label: "Scheduled Maintenance / Refit", color: "bg-amber-50 text-amber-800 border-amber-200" },
  { status: "CONSTRUCTION", label: "Under Construction / Expansion", color: "bg-royal/5 text-royal-dark border-royal/20" },
  { status: "SEASONAL", label: "Seasonal Operational Schedule", color: "bg-royal/5 text-royal-dark border-royal/20" },
  { status: "STANDBY", label: "Standby / Emergency Response", color: "bg-royal/5 text-royal-dark border-royal/20" },
  { status: "INACTIVE", label: "Temporarily Inactive", color: "bg-stone/10 text-stone border-line" },
];

const MEDIA_CATEGORIES: Array<{ category: FacilityMediaCategory; label: string }> = [
  { category: "EXTERIOR", label: "Exterior & Quayside Architecture" },
  { category: "INTERIOR", label: "Interior Spaces & Reception" },
  { category: "WORKSHOP", label: "Engineering Workshop & Testing Tanks" },
  { category: "PRODUCTION", label: "Production Line & Drydock Berth" },
  { category: "SHOWROOM", label: "Product & Vessel Showroom" },
  { category: "OFFICE", label: "CAD Design Studio & Technical Office" },
  { category: "SERVICE", label: "Service Bay & Maintenance Rig" },
  { category: "INFRASTRUCTURE", label: "Heavy Cranes & Port Infrastructure" },
  { category: "OTHER", label: "General Facility Imagery" },
];

const CURATED_FACILITY_PRESETS: Array<{ title: string; image: string; category: FacilityMediaCategory; caption: string }> = [
  {
    title: "Deepwater Quayside & Engineering Berth",
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
    category: "EXTERIOR",
    caption: "Direct deepwater berthing facility with heavy crane access for vessel refits.",
  },
  {
    title: "Naval Architecture CAD & Simulation Studio",
    image: "https://images.unsplash.com/photo-1586528116311-ad8ed7c50a92?auto=format&fit=crop&w=1200&q=80",
    category: "OFFICE",
    caption: "High-performance computational workstations for hull hydrodynamic optimization.",
  },
  {
    title: "Hydrostatic Testing & Pressure Tank Basin",
    image: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80",
    category: "WORKSHOP",
    caption: "Controlled hyperbaric pressure testing chamber for subsea autonomous equipment.",
  },
  {
    title: "Heavy Drivetrain Assembly Drydock Bay",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
    category: "PRODUCTION",
    caption: "Drydock gantry crane installation bay for pod propulsion and shaft alignments.",
  },
  {
    title: "Regional Marine Logistics & Spares Depot",
    image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1200&q=80",
    category: "INFRASTRUCTURE",
    caption: "High-density automated logistics depot for rapid critical maritime spare dispatch.",
  },
  {
    title: "Marine Technology Client Presentation Suite",
    image: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=1200&q=80",
    category: "INTERIOR",
    caption: "Executive boardroom and live vessel telemetry briefing theater.",
  },
];

const AVAILABLE_COUNTRIES = [
  "Netherlands",
  "Germany",
  "United Kingdom",
  "Norway",
  "France",
  "Italy",
  "Greece",
  "Spain",
  "Turkey",
  "United States",
  "United Arab Emirates",
  "Singapore",
  "Japan",
  "Australia",
  "Monaco",
  "Belgium",
  "Denmark",
  "Sweden",
  "Finland",
  "Saudi Arabia",
  "Qatar",
];

const AVAILABLE_REGIONS = [
  { code: "GLOBAL", label: "Global Maritime Network" },
  { code: "WESTERN_EUROPE", label: "Western Europe (Rotterdam / Hamburg / Antwerp / London)" },
  { code: "NORTHERN_EUROPE", label: "Northern Europe & Scandinavia (Oslo / Bergen / Gothenburg)" },
  { code: "MEDITERRANEAN", label: "Mediterranean Basin (Monaco / Genoa / Athens / Marseille)" },
  { code: "ASIA_PACIFIC", label: "Asia Pacific (Singapore / Tokyo / Shanghai / Sydney)" },
  { code: "NORTH_AMERICA", label: "North America (Fort Lauderdale / Seattle / Vancouver)" },
  { code: "MIDDLE_EAST", label: "Middle East & Arabian Gulf (Dubai / Abu Dhabi / Doha)" },
];

export const CompanyStudioPresenceView: React.FC<CompanyStudioPresenceViewProps> = ({
  companyId,
  onSaved,
}) => {
  const canonicalCompany =
    getCompanyById(companyId) || (getCompanyRecordSync(companyId) as unknown as CompanyEntity);

  const [facilities, setFacilities] = useState<PhysicalFacility[]>([]);
  const [operatingCountries, setOperatingCountries] = useState<string[]>([]);
  const [operatingRegions, setOperatingRegions] = useState<string[]>([]);
  const [countrySearch, setCountrySearch] = useState("");
  const [customCountryInput, setCustomCountryInput] = useState("");

  // Editor Modal / Drawer State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingFacilityId, setEditingFacilityId] = useState<string | null>(null);
  const [activeEditorTab, setActiveEditorTab] = useState<"identity" | "location" | "scope" | "media">("identity");

  // Public Presentation Preview Modal
  const [previewFacility, setPreviewFacility] = useState<PhysicalFacility | null>(null);

  // Form State
  const [formFacilityName, setFormFacilityName] = useState("");
  const [formFacilityType, setFormFacilityType] = useState<PhysicalFacilityType>("Office");
  const [formCountry, setFormCountry] = useState("Netherlands");
  const [formCity, setFormCity] = useState("Rotterdam");
  const [formAddress, setFormAddress] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formOperationalScope, setFormOperationalScope] = useState("");
  const [formContactEmail, setFormContactEmail] = useState("");
  const [formContactPhone, setFormContactPhone] = useState("");
  const [formStatus, setFormStatus] = useState<FacilityOperationalStatus>("ACTIVE");
  const [formVisibility, setFormVisibility] = useState<FacilityVisibility>("PUBLIC");
  const [formIsHeadquarters, setFormIsHeadquarters] = useState(false);
  const [formOpeningHours, setFormOpeningHours] = useState("Mon - Fri: 08:30 - 17:30 CET");
  const [formYearEstablished, setFormYearEstablished] = useState("2020");
  const [formSectorCityLinks, setFormSectorCityLinks] = useState<string[]>([]);
  const [formMedia, setFormMedia] = useState<FacilityMediaItem[]>([]);

  // Participating Sector Cities read-only from 02 — Positioning
  const participatingSectorCityOptions = useMemo(() => {
    const comp = getCompanyById(companyId) || canonicalCompany;
    const cityIds = new Set<string>();
    if (comp?.primarySectorCityId) cityIds.add(comp.primarySectorCityId);
    if (Array.isArray(comp?.participatingSectorCities)) {
      comp.participatingSectorCities.forEach((c) => cityIds.add(c));
    }
    if (Array.isArray(comp?.sectorCityIds)) {
      comp.sectorCityIds.forEach((c) => cityIds.add(c));
    }
    const legacyComp = comp as any;
    if (Array.isArray(legacyComp?.cityIds)) {
      legacyComp.cityIds.forEach((c: string) => cityIds.add(c));
    }
    if (cityIds.size === 0) {
      cityIds.add("shipyard");
    }

    return Array.from(cityIds).map((id) => ({
      id,
      name: `${id.toUpperCase()}.CITY`,
      category: "Maritime Hub",
      code: "REG",
    }));
  }, [companyId, canonicalCompany]);

  // Media adding sub-state inside editor
  const [activeMediaInputMode, setActiveMediaInputMode] = useState<"upload" | "url" | "presets">("upload");
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [newMediaTitle, setNewMediaTitle] = useState("");
  const [newMediaCaption, setNewMediaCaption] = useState("");
  const [newMediaCategory, setNewMediaCategory] = useState<FacilityMediaCategory>("EXTERIOR");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [mediaFeedbackMessage, setMediaFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Caption inline editing
  const [editingMediaCaptionId, setEditingMediaCaptionId] = useState<string | null>(null);
  const [mediaCaptionEditValue, setMediaCaptionEditValue] = useState("");
  const [mediaTitleEditValue, setMediaTitleEditValue] = useState("");
  const [mediaCategoryEditValue, setMediaCategoryEditValue] = useState<FacilityMediaCategory>("EXTERIOR");

  // Media Zoom Lightbox Modal
  const [mediaPreviewItem, setMediaPreviewItem] = useState<FacilityMediaItem | null>(null);

  // File input ref for desktop upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load Initial Data
  const loadData = () => {
    const loadedFacilities = getPhysicalFacilities(companyId);
    setFacilities([...loadedFacilities]);

    const comp = getCompanyById(companyId) || canonicalCompany;
    const countries =
      comp?.operatingCountries ||
      comp?.countriesServed ||
      (loadedFacilities.length > 0 ? [loadedFacilities[0].country] : ["Netherlands"]);
    const regions =
      comp?.operatingRegions ||
      comp?.regionalEditions || ["Western Europe", "Global Network"];

    setOperatingCountries([...countries]);
    setOperatingRegions([...regions]);
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  // Derived Registered Headquarters (strictly exactly 1)
  const registeredHQ = useMemo(() => {
    return facilities.find((f) => f.isHeadquarters) || facilities[0];
  }, [facilities]);

  const secondaryFacilities = useMemo(() => {
    return facilities.filter((f) => f.id !== registeredHQ?.id);
  }, [facilities, registeredHQ]);

  // Readiness Calculation
  const readiness = useMemo(() => {
    const missing: string[] = [];

    if (!registeredHQ) {
      missing.push("Registered Headquarters is required");
    } else {
      if (!registeredHQ.facilityName?.trim()) missing.push("Headquarters Facility Name");
      if (!registeredHQ.city?.trim()) missing.push("Headquarters City");
      if (!registeredHQ.country?.trim()) missing.push("Headquarters Country");
      if (!registeredHQ.address?.trim()) missing.push("Headquarters Full Street Address");
      if (!registeredHQ.contactEmail?.trim()) missing.push("Headquarters Contact Email");
    }

    if (facilities.length === 0) {
      missing.push("At least one physical operating facility");
    }

    if (operatingCountries.length === 0) {
      missing.push("At least one operating country");
    }

    const isReady = missing.length === 0;
    return {
      isReady,
      statusLabel: isReady ? "PRESENCE READY" : "PRESENCE IN PROGRESS",
      missingRequirements: missing,
    };
  }, [registeredHQ, facilities, operatingCountries]);

  // Open Form for New Facility
  const handleOpenAddFacility = () => {
    setEditingFacilityId(null);
    setActiveEditorTab("identity");
    setFormFacilityName("");
    setFormFacilityType("Service Center");
    setFormCountry(registeredHQ?.country || "Netherlands");
    setFormCity("");
    setFormAddress("");
    setFormDescription("");
    setFormOperationalScope("");
    setFormContactEmail(canonicalCompany?.officialEmail || `facility@${canonicalCompany?.slug || "company"}.com`);
    setFormContactPhone(canonicalCompany?.officialPhone || "+31 10 555 0190");
    setFormStatus("ACTIVE");
    setFormVisibility("PUBLIC");
    setFormIsHeadquarters(false);
    setFormOpeningHours("Mon - Fri: 08:00 - 18:00 CET");
    setFormYearEstablished(new Date().getFullYear().toString());
    setFormSectorCityLinks([]);
    setFormMedia([]);
    setIsEditorOpen(true);
  };

  // Open Form for Editing Facility
  const handleOpenEditFacility = (facility: PhysicalFacility) => {
    setEditingFacilityId(facility.id);
    setActiveEditorTab("identity");
    setFormFacilityName(facility.facilityName);
    setFormFacilityType(facility.facilityType);
    setFormCountry(facility.country);
    setFormCity(facility.city);
    setFormAddress(facility.address || "");
    setFormDescription(facility.description || "");
    setFormOperationalScope(facility.operationalScope || "");
    setFormContactEmail(facility.contactEmail || "");
    setFormContactPhone(facility.contactPhone || facility.telephone || "");
    setFormStatus(facility.status || facility.operatingStatus || "ACTIVE");
    setFormVisibility(facility.visibility || "PUBLIC");
    setFormIsHeadquarters(Boolean(facility.isHeadquarters));
    setFormOpeningHours(facility.openingHours || facility.operatingHours || "Mon - Fri: 08:30 - 17:30 CET");
    setFormYearEstablished(facility.yearEstablished ? facility.yearEstablished.toString() : "2020");
    setFormSectorCityLinks(facility.sectorCityLinks ? [...facility.sectorCityLinks] : []);
    setFormMedia(facility.media ? [...facility.media] : []);
    setIsEditorOpen(true);
  };

  // Save Facility from Modal
  const handleSaveFacilityForm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formFacilityName.trim()) {
      setErrorMessage("Facility Name is required.");
      return;
    }
    if (!formFacilityType) {
      setErrorMessage("Facility Type is required.");
      return;
    }
    if (!formCountry.trim()) {
      setErrorMessage("Country is required.");
      return;
    }
    if (!formCity.trim()) {
      setErrorMessage("City is required.");
      return;
    }
    if (!formAddress.trim()) {
      setErrorMessage("Full physical street address is required.");
      return;
    }
    if (!formOperationalScope.trim()) {
      setErrorMessage("Operational Scope is required.");
      return;
    }

    const normalizedMedia: FacilityMediaItem[] = formMedia.map((m, idx) => ({
      ...m,
      image: m.url || m.image,
      url: m.url || m.image,
      sortOrder: idx,
      isCover: formMedia.some((item) => item.isCover) ? Boolean(m.isCover) : idx === 0,
    }));

    try {
      if (editingFacilityId) {
        updatePhysicalFacility(companyId, editingFacilityId, {
          facilityName: formFacilityName,
          facilityType: formFacilityType,
          country: formCountry,
          city: formCity,
          address: formAddress,
          description: formDescription,
          operationalScope: formOperationalScope,
          contactEmail: formContactEmail,
          contactPhone: formContactPhone,
          telephone: formContactPhone,
          status: formStatus,
          operatingStatus: formStatus,
          visibility: formVisibility,
          isHeadquarters: formIsHeadquarters,
          sectorCityLinks: formSectorCityLinks,
          openingHours: formOpeningHours,
          operatingHours: formOpeningHours,
          yearEstablished: formYearEstablished,
          media: normalizedMedia,
        });
        setSuccessMessage(`Facility "${formFacilityName}" updated successfully.`);
      } else {
        addPhysicalFacility(companyId, {
          facilityName: formFacilityName,
          facilityType: formFacilityType,
          country: formCountry,
          city: formCity,
          address: formAddress,
          description: formDescription,
          operationalScope: formOperationalScope,
          contactEmail: formContactEmail,
          contactPhone: formContactPhone,
          telephone: formContactPhone,
          status: formStatus,
          operatingStatus: formStatus,
          visibility: formVisibility,
          isHeadquarters: formIsHeadquarters,
          verificationStatus: "VERIFIED",
          sectorCityLinks: formSectorCityLinks,
          openingHours: formOpeningHours,
          operatingHours: formOpeningHours,
          yearEstablished: formYearEstablished,
          media: normalizedMedia,
        });
        setSuccessMessage(`Physical facility "${formFacilityName}" added.`);
      }

      loadData();
      setIsEditorOpen(false);
      setTimeout(() => setSuccessMessage(null), 3500);
      if (onSaved) onSaved();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save facility.");
    }
  };

  // Fast Set as Headquarters
  const handleSetHeadquarters = (facilityId: string) => {
    const updatedHQ = setRegisteredHeadquarters(companyId, facilityId);
    if (updatedHQ) {
      setSuccessMessage(`"${updatedHQ.facilityName}" is now the Registered Headquarters.`);
      loadData();
      setTimeout(() => setSuccessMessage(null), 3500);
      if (onSaved) onSaved();
    }
  };

  // Delete Facility
  const handleDeleteFacility = (facilityId: string, facilityName: string) => {
    if (confirm(`Are you sure you want to remove the facility "${facilityName}"?`)) {
      const ok = removePhysicalFacility(companyId, facilityId);
      if (ok) {
        setSuccessMessage(`Facility "${facilityName}" removed.`);
        loadData();
        setTimeout(() => setSuccessMessage(null), 3500);
        if (onSaved) onSaved();
      }
    }
  };

  // =========================================================================
  // MEDIA MANAGEMENT HANDLERS (DESKTOP UPLOAD + URL IMPORT + REORDER + COVER)
  // =========================================================================

  // 1. Desktop Upload Handler (JPG, PNG, WEBP, Multiple selection via Firebase Storage)
  const handleProcessDesktopFiles = async (files: FileList | File[]) => {
    setMediaFeedbackMessage(null);
    const validExtensions = ["image/jpeg", "image/png", "image/webp"];
    const fileArray = Array.from(files);

    if (fileArray.length === 0) return;

    const invalidFiles = fileArray.filter((file) => {
      const isMimeValid = validExtensions.includes(file.type);
      const isExtValid = /\.(jpg|jpeg|png|webp)$/i.test(file.name);
      return !isMimeValid && !isExtValid;
    });

    if (invalidFiles.length > 0) {
      setMediaFeedbackMessage({
        type: "error",
        text: `Unsupported format (${invalidFiles.map((f) => f.name).join(", ")}). Allowed formats: JPG, PNG, WEBP.`,
      });
      return;
    }

    setIsProcessingUpload(true);
    const newItems: FacilityMediaItem[] = [];

    try {
      for (let index = 0; index < fileArray.length; index++) {
        const file = fileArray[index];
        const res = await uploadFileToStorage(file, {
          companyId,
          categoryFolder: "facilities",
          subFolder: editingFacilityId || "hq",
          fileRole: newMediaCategory || "EXTERIOR",
        });

        const cleanTitle = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]/g, " ")
          .trim();

        const newItem: FacilityMediaItem = {
          id: `m-up-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
          type: "image",
          source: "upload",
          url: res.url,
          image: res.url,
          storagePath: res.storagePath,
          title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
          caption: "",
          category: newMediaCategory || "EXTERIOR",
          isCover: formMedia.length === 0 && index === 0,
          sortOrder: formMedia.length + index,
          createdAt: new Date().toISOString(),
        };

        newItems.push(newItem);
      }

      setFormMedia((prev) => {
        const hasExistingCover = prev.some((m) => m.isCover);
        const combined = [...prev, ...newItems];
        if (!hasExistingCover && combined.length > 0) {
          combined[0].isCover = true;
        }
        return combined.map((m, idx) => ({ ...m, sortOrder: idx }));
      });

      setMediaFeedbackMessage({
        type: "success",
        text: `Successfully uploaded ${fileArray.length} facility photo${fileArray.length > 1 ? "s" : ""} to Firebase Storage.`,
      });
      setTimeout(() => setMediaFeedbackMessage(null), 3500);
    } catch (err: any) {
      console.error("[CompanyStudioPresenceView] Upload error:", err);
      setMediaFeedbackMessage({
        type: "error",
        text: `Upload failed: ${err?.message || "Unknown error"}`,
      });
    } finally {
      setIsProcessingUpload(false);
    }
  };

  // 2. URL Import Handler
  const handleAddUrlMedia = () => {
    setMediaFeedbackMessage(null);
    const url = newMediaUrl.trim();
    if (!url) {
      setMediaFeedbackMessage({ type: "error", text: "Please enter an image URL." });
      return;
    }

    if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("/") && !url.startsWith("data:")) {
      setMediaFeedbackMessage({ type: "error", text: "URL must start with https://, http://, or /" });
      return;
    }

    const newItem: FacilityMediaItem = {
      id: `m-url-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: "image",
      source: "url",
      url,
      image: url,
      title: newMediaTitle.trim() || `${formFacilityName || "Facility"} Photography`,
      caption: newMediaCaption.trim(),
      category: newMediaCategory,
      isCover: formMedia.length === 0,
      sortOrder: formMedia.length,
      createdAt: new Date().toISOString(),
    };

    setFormMedia((prev) => {
      const next = [...prev, newItem];
      if (!next.some((m) => m.isCover) && next.length > 0) {
        next[0].isCover = true;
      }
      return next.map((m, idx) => ({ ...m, sortOrder: idx }));
    });

    setNewMediaUrl("");
    setNewMediaTitle("");
    setNewMediaCaption("");
    setMediaFeedbackMessage({ type: "success", text: "Photo URL imported successfully." });
    setTimeout(() => setMediaFeedbackMessage(null), 3000);
  };

  // 3. Quick-Add Presets
  const handleApplyPresetMedia = (preset: typeof CURATED_FACILITY_PRESETS[0]) => {
    const newItem: FacilityMediaItem = {
      id: `m-preset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: "image",
      source: "url",
      url: preset.image,
      image: preset.image,
      title: preset.title,
      caption: preset.caption,
      category: preset.category,
      isCover: formMedia.length === 0,
      sortOrder: formMedia.length,
      createdAt: new Date().toISOString(),
    };

    setFormMedia((prev) => {
      const next = [...prev, newItem];
      if (!next.some((m) => m.isCover) && next.length > 0) {
        next[0].isCover = true;
      }
      return next.map((m, idx) => ({ ...m, sortOrder: idx }));
    });
  };

  // 4. Set as Cover Photo
  const handleSetCover = (mediaId: string) => {
    setFormMedia((prev) =>
      prev.map((item) => ({
        ...item,
        isCover: item.id === mediaId,
      }))
    );
  };

  // 5. Reorder Media Items (Up/Down)
  const handleReorderMedia = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= formMedia.length) return;

    setFormMedia((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next.map((m, idx) => ({ ...m, sortOrder: idx }));
    });
  };

  // 6. Remove Media Item (Clean up from Firebase Storage if applicable)
  const handleRemoveMedia = (mediaId: string) => {
    setFormMedia((prev) => {
      const target = prev.find((m) => m.id === mediaId);
      if (target) {
        if (target.storagePath || (target.url && target.url.includes("firebasestorage.app"))) {
          deleteFileFromStorage(target.storagePath || target.url).catch(() => {});
        }
      }
      const filtered = prev.filter((m) => m.id !== mediaId);
      if (target?.isCover && filtered.length > 0) {
        filtered[0].isCover = true;
      }
      return filtered.map((m, idx) => ({ ...m, sortOrder: idx }));
    });
  };

  // 7. Start / Save Caption & Title Inline Editing
  const handleStartCaptionEdit = (item: FacilityMediaItem) => {
    setEditingMediaCaptionId(item.id);
    setMediaTitleEditValue(item.title || "");
    setMediaCaptionEditValue(item.caption || "");
    setMediaCategoryEditValue(item.category || "EXTERIOR");
  };

  const handleSaveCaptionEdit = (mediaId: string) => {
    setFormMedia((prev) =>
      prev.map((item) => {
        if (item.id === mediaId) {
          return {
            ...item,
            title: mediaTitleEditValue.trim() || item.title || "Facility Photo",
            caption: mediaCaptionEditValue.trim(),
            category: mediaCategoryEditValue,
          };
        }
        return item;
      })
    );
    setEditingMediaCaptionId(null);
  };

  // Geographic Coverage Toggles
  const handleToggleCountry = (country: string) => {
    let next: string[];
    if (operatingCountries.includes(country)) {
      if (operatingCountries.length === 1) return; // Keep at least one
      next = operatingCountries.filter((c) => c !== country);
    } else {
      next = [...operatingCountries, country];
    }
    setOperatingCountries(next);
  };

  const handleAddCustomCountry = () => {
    const c = customCountryInput.trim();
    if (!c) return;
    if (!operatingCountries.includes(c)) {
      setOperatingCountries([...operatingCountries, c]);
    }
    setCustomCountryInput("");
  };

  const handleToggleRegion = (regionLabel: string) => {
    let next: string[];
    if (operatingRegions.includes(regionLabel)) {
      if (operatingRegions.length === 1) return;
      next = operatingRegions.filter((r) => r !== regionLabel);
    } else {
      next = [...operatingRegions, regionLabel];
    }
    setOperatingRegions(next);
  };

  // Global Save of Entire Presence Configuration
  const handleSavePresence = () => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      // 1. Update Geographic Coverage
      updateGeographicCoverage(companyId, operatingCountries, operatingRegions);

      // 2. Ensure Registered Headquarters is synced to Company Entity
      if (registeredHQ) {
        const comp = getCompanyById(companyId);
        if (comp) {
          comp.city = registeredHQ.city;
          comp.country = registeredHQ.country;
          comp.location = `${registeredHQ.city}, ${registeredHQ.country}`;
          comp.registeredHeadquarters = registeredHQ;
          comp.physicalFacilities = facilities;
          comp.operatingCountries = operatingCountries;
          comp.operatingRegions = operatingRegions;
          saveCompany(comp);
        }
      }

      setSuccessMessage("Physical Operating Presence successfully synchronized and verified.");
      setTimeout(() => setSuccessMessage(null), 3500);
      if (onSaved) onSaved();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save presence data.");
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered list of countries for selection
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return AVAILABLE_COUNTRIES;
    return AVAILABLE_COUNTRIES.filter((c) =>
      c.toLowerCase().includes(countrySearch.toLowerCase())
    );
  }, [countrySearch]);

  return (
    <div className="space-y-8" id="module-presence-root">
      {/* 01. TOP HEADER & READINESS BAR */}
      <div className="bg-white border border-line rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-b border-line pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-royal/10 text-royal uppercase tracking-wider">
                03 — PRESENCE
              </span>
              <span className="text-xs font-bold text-graphite uppercase tracking-wider">
                Physical Operating Presence Layer
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-graphite mt-2 tracking-tight">
              Physical Operating Presence
            </h1>
            <p className="text-sm text-stone mt-1.5 max-w-3xl leading-relaxed">
              Define your company’s canonical physical operating infrastructure inside MarineWorld.city —
              including Registered Headquarters, shipyards, factories, engineering centers, logistics hubs, and verified geographic service coverage.
            </p>
          </div>

          {/* Action & Readiness Pill */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <div
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold border flex items-center gap-2 ${readiness.isReady
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${readiness.isReady ? "bg-emerald-600 animate-pulse" : "bg-amber-600"
                  }`}
              />
              <span>{readiness.statusLabel}</span>
            </div>

            <button
              id="presence-btn-global-save"
              onClick={handleSavePresence}
              disabled={isSaving}
              className="px-5 py-2.5 bg-royal hover:bg-royal/90 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition shadow-sm disabled:opacity-50 min-h-[42px]"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "SAVING..." : "SAVE & SYNC PRESENCE"}
            </button>
          </div>
        </div>

        {/* Readiness Missing Banner (if in progress) */}
        {!readiness.isReady && (
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider font-mono text-[11px] text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-700" />
              <span>Mandatory Presence Requirements Incomplete:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-stone pl-1">
              {readiness.missingRequirements.map((req, i) => (
                <li key={i}>{req}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 4-Question Information Architecture Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-canvas border border-line/60 space-y-1.5">
            <div className="font-bold text-graphite uppercase tracking-wider text-[10.5px] font-mono text-royal">
              WHAT IS PRESENCE?
            </div>
            <p className="text-stone leading-relaxed">
              Your verified physical operating infrastructure: headquarters, shipyards, drydocks, offices, and regional support hubs.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-canvas border border-line/60 space-y-1.5">
            <div className="font-bold text-graphite uppercase tracking-wider text-[10.5px] font-mono text-royal">
              WHAT DO I PROVIDE?
            </div>
            <p className="text-stone leading-relaxed">
              Canonical Registered HQ address, specialized facilities with operational scope, direct contacts, photo galleries, and operating countries.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-canvas border border-line/60 space-y-1.5">
            <div className="font-bold text-graphite uppercase tracking-wider text-[10.5px] font-mono text-royal">
              SEPARATED FROM POSITIONING
            </div>
            <p className="text-stone leading-relaxed">
              Positioning defines your sector and digital routing. Presence defines your real-world physical assets and operational scope.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-canvas border border-line/60 space-y-1.5">
            <div className="font-bold text-graphite uppercase tracking-wider text-[10.5px] font-mono text-royal">
              HOW AI USES THIS
            </div>
            <p className="text-stone leading-relaxed">
              Grounds queries on where your teams operate, repair capabilities by shipyard, local contact routing, and verified response regions.
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* 01.5 COMPACT CANONICAL PRESENCE SUMMARY */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 font-mono text-xs">
        <div className="p-4 rounded-xl bg-white border border-line shadow-xs space-y-1">
          <span className="text-[10px] text-mute uppercase font-bold tracking-wider block">PRIMARY HQ</span>
          <span className="text-sm font-bold text-graphite block truncate">
            {registeredHQ ? `${registeredHQ.city}, ${registeredHQ.country}` : "NOT CONFIGURED"}
          </span>
          <span className="text-[10px] text-royal font-semibold">Verified Physical Base</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-line shadow-xs space-y-1">
          <span className="text-[10px] text-mute uppercase font-bold tracking-wider block">FACILITIES</span>
          <span className="text-xl font-bold text-graphite block">{facilities.length}</span>
          <span className="text-[10px] text-stone">1 HQ · {secondaryFacilities.length} Regional</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-line shadow-xs space-y-1">
          <span className="text-[10px] text-mute uppercase font-bold tracking-wider block">COUNTRIES</span>
          <span className="text-xl font-bold text-graphite block">{operatingCountries.length}</span>
          <span className="text-[10px] text-stone">Operational Coverage</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-line shadow-xs space-y-1">
          <span className="text-[10px] text-mute uppercase font-bold tracking-wider block">REGIONS</span>
          <span className="text-xl font-bold text-graphite block">{operatingRegions.length}</span>
          <span className="text-[10px] text-stone">Regional Corridors</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-line shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] text-mute uppercase font-bold tracking-wider block">PUBLIC FACILITIES</span>
          <span className="text-xl font-bold text-royal block">
            {facilities.filter((f) => f.visibility === "PUBLIC").length}
          </span>
          <span className="text-[10px] text-stone">Public Directory Visible</span>
        </div>
      </div>

      {/* 02. CONNECTED SECTOR CITY CONTEXT (READ-ONLY FROM 02 POSITIONING) */}
      <div className="bg-white border border-line rounded-2xl p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <Globe2 className="w-5 h-5 text-royal" />
            <div>
              <h2 className="text-base font-bold text-graphite">Connected Sector City Context</h2>
              <p className="text-xs text-stone">
                Read-only reference resolved deterministically from <strong>02 — Positioning</strong>.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-canvas border border-line text-stone uppercase tracking-wider">
            READ-ONLY FROM POSITIONING
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-canvas border border-line space-y-1">
            <div className="text-[10px] text-mute uppercase font-bold tracking-wider">PRIMARY SECTOR CITY</div>
            <div className="text-sm font-bold text-royal">
              {(canonicalCompany?.primarySectorCityId || "shipyard").toUpperCase()}.CITY
            </div>
            <div className="text-[11px] text-stone">Canonical Sector Placement</div>
          </div>

          <div className="p-4 rounded-xl bg-canvas border border-line space-y-1">
            <div className="text-[10px] text-mute uppercase font-bold tracking-wider">PARTICIPATING SECTOR CITIES</div>
            <div className="text-sm font-bold text-graphite">
              {canonicalCompany?.participatingSectorCities?.length
                ? `${canonicalCompany.participatingSectorCities.length} ACTIVE CITIES`
                : "1 REGISTERED CITY"}
            </div>
            <div className="text-[11px] text-stone">
              {canonicalCompany?.participatingSectorCities?.join(", ").toUpperCase() || "SHIPYARD.CITY"}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-canvas border border-line space-y-1">
            <div className="text-[10px] text-mute uppercase font-bold tracking-wider">SECTOR IDENTITY MAPPING</div>
            <div className="text-sm font-bold text-graphite">
              {canonicalCompany?.primarySectorCategory || "Marine & Maritime"}
            </div>
            <div className="text-[11px] text-stone">
              Domain: {canonicalCompany?.sectorId?.toUpperCase() || "MARINE"}
            </div>
          </div>
        </div>
      </div>

      {/* 03. CANONICAL REGISTERED HEADQUARTERS (PRIMARY PHYSICAL ANCHOR) */}
      <div className="bg-white border-2 border-royal/30 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-royal/10 border border-royal/20 flex items-center justify-center text-royal">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-royal bg-royal/10 px-2 py-0.5 rounded">
                  CANONICAL PHYSICAL ANCHOR
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  VERIFIED HQ
                </span>
              </div>
              <h2 className="text-lg font-bold text-graphite mt-1">
                Registered Headquarters
              </h2>
            </div>
          </div>

          {registeredHQ && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewFacility(registeredHQ)}
                className="px-3 py-2 bg-canvas hover:bg-mist border border-line text-stone hover:text-graphite rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Eye className="w-3.5 h-3.5" />
                Public Presentation
              </button>
              <button
                onClick={() => handleOpenEditFacility(registeredHQ)}
                className="px-3.5 py-2 bg-royal hover:bg-royal/90 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Headquarters
              </button>
            </div>
          )}
        </div>

        {registeredHQ ? (
          <div className="space-y-6">
            {/* Top Overview & Gallery */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: HQ Primary Details */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <div className="text-xs font-mono font-bold text-royal uppercase tracking-wider">
                    {registeredHQ.facilityType}
                  </div>
                  <h3 className="text-xl font-bold text-graphite mt-0.5">
                    {registeredHQ.facilityName}
                  </h3>
                  <p className="text-xs text-stone mt-2 leading-relaxed">
                    {registeredHQ.description ||
                      "Primary corporate headquarters and administrative operations center."}
                  </p>
                </div>

                {/* Structured Specification Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-canvas border border-line space-y-1">
                    <div className="text-[10px] font-mono text-mute uppercase font-bold flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-royal" />
                      PHYSICAL ADDRESS
                    </div>
                    <div className="font-semibold text-graphite">{registeredHQ.address || "Havenlaan 100"}</div>
                    <div className="text-[11px] text-stone">
                      {registeredHQ.city}, {registeredHQ.country}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-canvas border border-line space-y-1">
                    <div className="text-[10px] font-mono text-mute uppercase font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-royal" />
                      OPERATING HOURS
                    </div>
                    <div className="font-semibold text-graphite">{registeredHQ.openingHours || "Mon - Fri: 08:00 - 18:00"}</div>
                    <div className="text-[11px] text-stone">
                      Status: <span className="font-bold text-emerald-700">{registeredHQ.status}</span> · Est. {registeredHQ.yearEstablished || "2018"}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-canvas border border-line space-y-1">
                    <div className="text-[10px] font-mono text-mute uppercase font-bold flex items-center gap-1">
                      <Mail className="w-3 h-3 text-royal" />
                      OFFICIAL HQ CONTACT
                    </div>
                    <div className="font-semibold text-graphite truncate">{registeredHQ.contactEmail || "hq@company.com"}</div>
                    <div className="text-[11px] text-stone">{registeredHQ.contactPhone || "+31 10 555 0190"}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-canvas border border-line space-y-1">
                    <div className="text-[10px] font-mono text-mute uppercase font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-royal" />
                      VISIBILITY & GOVERNANCE
                    </div>
                    <div className="font-semibold text-graphite flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {registeredHQ.visibility} DIRECTORY PROFILE
                    </div>
                    <div className="text-[11px] text-stone">Verification: {registeredHQ.verificationStatus || "VERIFIED"}</div>
                  </div>
                </div>

                {/* Operational Scope */}
                {registeredHQ.operationalScope && (
                  <div className="p-4 rounded-xl bg-soft/50 border border-royal/20 space-y-1">
                    <div className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-royal flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" />
                      CANONICAL OPERATIONAL SCOPE
                    </div>
                    <p className="text-xs text-graphite leading-relaxed">
                      {registeredHQ.operationalScope}
                    </p>
                  </div>
                )}

                {/* Referenced Sector Cities Badges */}
                {registeredHQ.sectorCityLinks && registeredHQ.sectorCityLinks.length > 0 && (
                  <div className="p-3 rounded-xl bg-canvas border border-line space-y-1.5">
                    <div className="text-[10px] font-mono text-mute uppercase font-bold flex items-center gap-1">
                      <Globe2 className="w-3 h-3 text-royal" />
                      REFERENCED SECTOR CITIES (POSITIONING LINK)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {registeredHQ.sectorCityLinks.map((cityId) => (
                        <span
                          key={cityId}
                          className="px-2 py-0.5 rounded text-[10.5px] font-mono font-bold bg-white border border-line text-royal"
                        >
                          {cityId.toUpperCase()}.CITY
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: HQ Photography Gallery Preview */}
              <div className="p-4 rounded-xl bg-canvas border border-line space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-graphite uppercase font-mono">
                    <Camera className="w-3.5 h-3.5 text-royal" />
                    <span>FACILITY MEDIA ({registeredHQ.media?.length || 0})</span>
                  </div>
                  <button
                    onClick={() => {
                      handleOpenEditFacility(registeredHQ);
                      setActiveEditorTab("media");
                    }}
                    className="text-[11px] font-mono text-royal hover:underline font-bold"
                  >
                    + ADD PHOTOS
                  </button>
                </div>

                {registeredHQ.media && registeredHQ.media.length > 0 ? (
                  (() => {
                    const hqCover = registeredHQ.media.find((m) => m.isCover) || registeredHQ.media[0];
                    const hqGallery = registeredHQ.media.filter((m) => m.id !== hqCover.id);
                    const hqCoverUrl = hqCover.url || hqCover.image;

                    return (
                      <div className="space-y-2">
                        <div
                          onClick={() => setMediaPreviewItem(hqCover)}
                          className="relative rounded-xl overflow-hidden aspect-video border border-line group cursor-pointer"
                        >
                          <img
                            src={hqCoverUrl}
                            alt={hqCover.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-2 left-2 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-royal text-white uppercase tracking-wider flex items-center gap-1 shadow-sm">
                              <BookmarkCheck className="w-2.5 h-2.5" />
                              COVER PHOTO
                            </span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-black/70 text-white uppercase tracking-wider">
                              {hqCover.source === "upload" ? "DESKTOP UPLOAD" : "URL IMPORT"}
                            </span>
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-3">
                            <span className="text-[9px] font-mono text-white/80 uppercase font-bold">
                              {hqCover.category}
                            </span>
                            <p className="text-xs text-white font-bold truncate">
                              {hqCover.title}
                            </p>
                            {hqCover.caption && (
                              <p className="text-[10px] text-white/80 truncate">
                                {hqCover.caption}
                              </p>
                            )}
                          </div>
                        </div>

                        {hqGallery.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {hqGallery.slice(0, 3).map((m, idx) => (
                              <div
                                key={m.id || idx}
                                onClick={() => setMediaPreviewItem(m)}
                                className="relative rounded-lg overflow-hidden aspect-square border border-line group cursor-pointer hover:border-royal transition"
                              >
                                <img
                                  src={m.url || m.image}
                                  alt={m.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition flex items-end p-1.5">
                                  <span className="text-[8px] font-mono text-white font-bold truncate bg-black/60 px-1 rounded">
                                    {m.category}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="p-6 rounded-xl border border-dashed border-line text-center space-y-2">
                    <ImageIcon className="w-8 h-8 mx-auto text-stone/40" />
                    <p className="text-xs text-stone">No facility media uploaded yet.</p>
                    <button
                      onClick={() => {
                        handleOpenEditFacility(registeredHQ);
                        setActiveEditorTab("media");
                      }}
                      className="px-3 py-1.5 bg-white border border-line text-royal rounded-lg text-xs font-bold hover:bg-mist transition"
                    >
                      Upload HQ Photos
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center space-y-3">
            <Building2 className="w-10 h-10 mx-auto text-royal/40" />
            <p className="text-sm text-stone font-medium">No Registered Headquarters configured.</p>
            <button
              onClick={handleOpenAddFacility}
              className="px-4 py-2 bg-royal text-white rounded-xl text-xs font-semibold"
            >
              Configure Headquarters
            </button>
          </div>
        )}
      </div>

      {/* 04. PHYSICAL OPERATING FACILITIES & ASSETS DIRECTORY */}
      <div className="bg-white border border-line rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Factory className="w-5 h-5 text-royal" />
              <h2 className="text-lg font-bold text-graphite">
                Physical Operating Assets & Facilities
              </h2>
            </div>
            <p className="text-xs text-stone mt-1">
              Shipyards, factories, engineering centers, logistics hubs, showrooms, and regional facilities ({secondaryFacilities.length} Additional Facilities).
            </p>
          </div>

          <button
            id="presence-btn-add-facility"
            onClick={handleOpenAddFacility}
            className="px-4 py-2.5 bg-royal hover:bg-royal/90 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-sm min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            Add Physical Facility
          </button>
        </div>

        {/* Empty State when no secondary facilities */}
        {secondaryFacilities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-canvas/60 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-royal/10 text-royal flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-sm font-bold text-graphite">No Additional Facilities Registered</h3>
              <p className="text-xs text-stone leading-relaxed">
                Your canonical headquarters is anchored above. Add additional operating facilities such as shipyards, assembly plants, regional sales offices, and service centers.
              </p>
            </div>
            <button
              onClick={handleOpenAddFacility}
              className="px-4 py-2 bg-white border border-line hover:border-royal/40 text-royal rounded-xl text-xs font-mono font-bold transition shadow-2xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              ADD PHYSICAL FACILITY
            </button>
          </div>
        ) : (
          /* Facilities Grid - Excludes Headquarters */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {secondaryFacilities.map((fac) => {
              const statusConfig =
                OPERATIONAL_STATUSES.find((s) => s.status === fac.status) || OPERATIONAL_STATUSES[0];

              return (
                <div
                  key={fac.id}
                  className="rounded-2xl border border-line bg-white hover:border-royal/30 transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs"
                >
                  {/* Top Media / Hero Header */}
                  {(() => {
                    const facCover = fac.media?.find((m) => m.isCover) || fac.media?.[0];
                    const facCoverUrl = facCover?.url || facCover?.image;

                    return (
                      <div className="relative aspect-[21/9] bg-slate-900 overflow-hidden">
                        {facCoverUrl ? (
                          <img
                            src={facCoverUrl}
                            alt={fac.facilityName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-canvas text-stone/40">
                            <Building2 className="w-8 h-8" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-between p-4">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/90 text-graphite uppercase tracking-wider">
                              {fac.facilityType}
                            </span>
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/60 text-white/90 uppercase tracking-wider">
                              OPERATING FACILITY
                            </span>
                          </div>

                          <div>
                            <h3 className="text-base font-bold text-white tracking-tight drop-shadow-sm">
                              {fac.facilityName}
                            </h3>
                            <p className="text-xs text-white/90 font-mono flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-royal" />
                              {fac.city}, {fac.country}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Facility Details Body */}
                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      {/* Operational Scope */}
                      <div className="p-3 rounded-xl bg-canvas border border-line space-y-1">
                        <span className="text-[9.5px] font-mono text-royal font-bold uppercase tracking-wider block">
                          OPERATIONAL SCOPE
                        </span>
                        <p className="text-xs text-graphite font-medium leading-relaxed">
                          {fac.operationalScope || fac.description || "Active verified operating asset."}
                        </p>
                      </div>

                      {/* Status, Visibility, Media Count */}
                      <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-1">
                        <div className="p-2 rounded-lg bg-canvas border border-line space-y-0.5">
                          <span className="text-[9px] text-mute uppercase block">STATUS</span>
                          <span className="font-bold text-graphite text-xs">{fac.status}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-canvas border border-line space-y-0.5">
                          <span className="text-[9px] text-mute uppercase block">VISIBILITY</span>
                          <span className="font-bold text-graphite text-xs">{fac.visibility}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-canvas border border-line space-y-0.5">
                          <span className="text-[9px] text-mute uppercase block">MEDIA</span>
                          <span className="font-bold text-royal text-xs flex items-center gap-1">
                            <Camera className="w-3 h-3 text-royal/70" />
                            {fac.media?.length || 0} Photos
                          </span>
                        </div>
                      </div>

                      {/* Referenced Sector Cities */}
                      {fac.sectorCityLinks && fac.sectorCityLinks.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {fac.sectorCityLinks.map((cityId) => (
                            <span
                              key={cityId}
                              className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-soft border border-royal/20 text-royal"
                            >
                              {cityId.toUpperCase()}.CITY
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Location & Contacts */}
                      <div className="space-y-1 text-xs text-stone border-t border-line/60 pt-3">
                        <div className="flex items-center justify-between text-[11.5px]">
                          <span className="text-mute font-mono">Address:</span>
                          <span className="font-medium text-graphite truncate max-w-[220px]">
                            {fac.address || "Registered Site"}
                          </span>
                        </div>
                        {fac.contactEmail && (
                          <div className="flex items-center justify-between text-[11.5px]">
                            <span className="text-mute font-mono">Contact:</span>
                            <span className="font-medium text-graphite truncate max-w-[220px]">
                              {fac.contactEmail}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="border-t border-line pt-3.5 mt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPreviewFacility(fac)}
                          className="px-2.5 py-1.5 rounded-lg border border-line bg-canvas hover:bg-mist text-xs font-mono font-bold text-graphite flex items-center gap-1.5 transition"
                          title="View Public Presentation"
                        >
                          <Eye className="w-3.5 h-3.5 text-royal" />
                          VIEW
                        </button>
                        <button
                          onClick={() => {
                            handleOpenEditFacility(fac);
                            setActiveEditorTab("identity");
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-line bg-canvas hover:bg-mist text-xs font-mono font-bold text-graphite flex items-center gap-1.5 transition"
                          title="Edit Facility"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-royal" />
                          EDIT
                        </button>
                        <button
                          onClick={() => {
                            handleOpenEditFacility(fac);
                            setActiveEditorTab("media");
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-line bg-canvas hover:bg-mist text-xs font-mono font-bold text-royal flex items-center gap-1.5 transition"
                          title="Manage Photos"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          MEDIA
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSetHeadquarters(fac.id)}
                          className="px-2 py-1 bg-canvas hover:bg-royal hover:text-white border border-line text-stone rounded-lg text-[10px] font-mono font-bold transition"
                          title="Set as Registered Headquarters"
                        >
                          Set as HQ
                        </button>
                        <button
                          onClick={() => handleDeleteFacility(fac.id, fac.facilityName)}
                          className="p-1.5 text-stone hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Remove Facility"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 05. GEOGRAPHIC COVERAGE (OPERATING COUNTRIES & OPERATING REGIONS) */}
      <div className="bg-white border border-line rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
        <div className="border-b border-line pb-4">
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-royal">
            <Globe2 className="w-4 h-4" />
            <span>GEOGRAPHIC REACH & OPERATIONAL SERVICE CORRIDORS</span>
          </div>
          <h2 className="text-lg font-bold text-graphite mt-1">
            Geographic Service Coverage
          </h2>
          <p className="text-xs text-stone mt-1">
            Select the countries and operating regional editions where your company operates vessels, provides refits, dispatches field engineers, or delivers commercial offerings.
          </p>
        </div>

        {/* Operating Countries */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <label className="text-xs font-bold text-graphite uppercase font-mono tracking-wider">
              Operating Countries ({operatingCountries.length} Selected)
            </label>

            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="w-3.5 h-3.5 text-stone absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Search countries..."
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite font-medium"
                />
              </div>

              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={customCountryInput}
                  onChange={(e) => setCustomCountryInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCustomCountry()}
                  placeholder="+ Custom Country"
                  className="w-28 sm:w-36 h-8 px-2 rounded-lg border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite"
                />
                <button
                  type="button"
                  onClick={handleAddCustomCountry}
                  className="h-8 px-2.5 bg-royal text-white rounded-lg text-xs font-bold hover:bg-royal/90"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Active Country Chips */}
          <div className="flex flex-wrap gap-2 p-4 rounded-xl bg-canvas border border-line min-h-[52px]">
            {operatingCountries.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-royal/30 text-xs font-semibold text-graphite shadow-2xs"
              >
                <span>{c}</span>
                <button
                  type="button"
                  onClick={() => handleToggleCountry(c)}
                  className="text-stone hover:text-rose-600 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Country Selection Pills */}
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
            {filteredCountries.map((country) => {
              const isSelected = operatingCountries.includes(country);
              return (
                <button
                  key={country}
                  type="button"
                  onClick={() => handleToggleCountry(country)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${isSelected
                      ? "bg-royal text-white font-bold"
                      : "bg-canvas hover:bg-mist border border-line text-stone hover:text-graphite"
                    }`}
                >
                  {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                  {country}
                </button>
              );
            })}
          </div>
        </div>

        {/* Operating Regional Editions */}
        <div className="space-y-3 border-t border-line/60 pt-6">
          <label className="text-xs font-bold text-graphite uppercase font-mono tracking-wider block">
            Regional Editions ({operatingRegions.length} Active)
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {AVAILABLE_REGIONS.map((reg) => {
              const isSelected = operatingRegions.includes(reg.label);
              return (
                <button
                  key={reg.code}
                  type="button"
                  onClick={() => handleToggleRegion(reg.label)}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start justify-between gap-2 ${isSelected
                      ? "bg-royal/5 border-royal text-graphite shadow-xs"
                      : "bg-canvas hover:bg-white border-line text-stone"
                    }`}
                >
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-royal block">
                      {reg.code}
                    </span>
                    <span className="text-xs font-bold text-graphite block mt-0.5">
                      {reg.label}
                    </span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 border ${isSelected
                        ? "bg-royal border-royal text-white"
                        : "border-line bg-white"
                      }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 06. NETWORK PRESENCE SUMMARY & AI GROUNDING VALIDATION */}
      <div className="bg-white border border-line rounded-2xl p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-royal">
          <Cpu className="w-4 h-4" />
          <span>AI BUSINESS TWIN GROUNDING & PUBLIC DIRECTORY SUMMARY</span>
        </div>
        <h2 className="text-lg font-bold text-graphite">
          Operational Presence Summary
        </h2>
        <p className="text-xs text-stone">
          The verified data above directly populates your canonical Digital Business Twin and feeds intelligent routing for MarineWorld buyers.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs pt-2">
          <div className="p-4 rounded-xl bg-canvas border border-line space-y-1">
            <span className="text-[10px] text-mute uppercase font-bold">TOTAL FACILITIES</span>
            <span className="text-xl font-bold text-graphite block">{facilities.length} ASSETS</span>
            <span className="text-[10.5px] text-stone">1 HQ · {secondaryFacilities.length} Regional</span>
          </div>

          <div className="p-4 rounded-xl bg-canvas border border-line space-y-1">
            <span className="text-[10px] text-mute uppercase font-bold">COUNTRIES SERVED</span>
            <span className="text-xl font-bold text-graphite block">{operatingCountries.length} NATIONS</span>
            <span className="text-[10.5px] text-stone">{operatingCountries.slice(0, 2).join(", ")}...</span>
          </div>

          <div className="p-4 rounded-xl bg-canvas border border-line space-y-1">
            <span className="text-[10px] text-mute uppercase font-bold">REGIONAL EDITIONS</span>
            <span className="text-xl font-bold text-graphite block">{operatingRegions.length} EDITIONS</span>
            <span className="text-[10.5px] text-stone">Global Maritime Graph</span>
          </div>

          <div className="p-4 rounded-xl bg-canvas border border-line space-y-1">
            <span className="text-[10px] text-mute uppercase font-bold">FACILITY MEDIA</span>
            <span className="text-xl font-bold text-royal block">
              {facilities.reduce((acc, f) => acc + (f.media?.length || 0), 0)} PHOTOS
            </span>
            <span className="text-[10.5px] text-stone">Verified Galleries</span>
          </div>
        </div>
      </div>

      {/* ====================================================================
          MODAL: PHYSICAL FACILITY EDITOR & MEDIA MANAGER
          ==================================================================== */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white border border-line rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-line flex items-center justify-between bg-canvas/40">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-royal">
                  {editingFacilityId ? "EDIT PHYSICAL FACILITY" : "NEW OPERATING FACILITY"}
                </span>
                <h3 className="text-lg font-bold text-graphite mt-0.5">
                  {formFacilityName || "Configure Physical Facility"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-2 text-stone hover:text-graphite rounded-xl hover:bg-mist transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-line px-6 bg-white gap-2 font-mono text-xs font-bold overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveEditorTab("identity")}
                className={`py-3 px-3 border-b-2 transition ${activeEditorTab === "identity"
                    ? "border-royal text-royal"
                    : "border-transparent text-stone hover:text-graphite"
                  }`}
              >
                1. IDENTITY & TYPE
              </button>
              <button
                type="button"
                onClick={() => setActiveEditorTab("location")}
                className={`py-3 px-3 border-b-2 transition ${activeEditorTab === "location"
                    ? "border-royal text-royal"
                    : "border-transparent text-stone hover:text-graphite"
                  }`}
              >
                2. LOCATION & ADDRESS
              </button>
              <button
                type="button"
                onClick={() => setActiveEditorTab("scope")}
                className={`py-3 px-3 border-b-2 transition ${activeEditorTab === "scope"
                    ? "border-royal text-royal"
                    : "border-transparent text-stone hover:text-graphite"
                  }`}
              >
                3. SCOPE & CONTACTS
              </button>
              <button
                type="button"
                onClick={() => setActiveEditorTab("media")}
                className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 ${activeEditorTab === "media"
                    ? "border-royal text-royal"
                    : "border-transparent text-stone hover:text-graphite"
                  }`}
              >
                <Camera className="w-3.5 h-3.5" />
                4. MEDIA GALLERY ({formMedia.length})
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSaveFacilityForm} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* TAB 1: IDENTITY & TYPE */}
              {activeEditorTab === "identity" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-graphite">Facility Name *</label>
                    <input
                      type="text"
                      value={formFacilityName}
                      onChange={(e) => setFormFacilityName(e.target.value)}
                      placeholder="e.g. Argento Subsea Propulsion & Assembly Yard"
                      className="w-full h-10 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-graphite">Facility Type *</label>
                      <select
                        value={formFacilityType}
                        onChange={(e) => setFormFacilityType(e.target.value as PhysicalFacilityType)}
                        className="w-full h-10 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite font-medium"
                      >
                        {FACILITY_TYPES.map((t) => (
                          <option key={t.type} value={t.type}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-graphite">Operational Status *</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as FacilityOperationalStatus)}
                        className="w-full h-10 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite font-medium"
                      >
                        {OPERATIONAL_STATUSES.map((s) => (
                          <option key={s.status} value={s.status}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-graphite">Visibility *</label>
                      <select
                        value={formVisibility}
                        onChange={(e) => setFormVisibility(e.target.value as FacilityVisibility)}
                        className="w-full h-10 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite font-medium"
                      >
                        <option value="PUBLIC">PUBLIC — Listed in MarineWorld Directory & Profile</option>
                        <option value="RESTRICTED">RESTRICTED — Verified B2B Inquirers Only</option>
                        <option value="INTERNAL">INTERNAL — Private Operations Node</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-graphite">Year Established</label>
                      <input
                        type="text"
                        value={formYearEstablished}
                        onChange={(e) => setFormYearEstablished(e.target.value)}
                        placeholder="e.g. 2019"
                        className="w-full h-10 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite"
                      />
                    </div>
                  </div>

                  {/* Is Headquarters Checkbox */}
                  <div className="p-4 rounded-xl bg-canvas border border-line flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-graphite">Designate as Registered Headquarters</div>
                      <div className="text-[11px] text-stone">
                        Enforces this facility as the company's single canonical physical anchor.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formIsHeadquarters}
                      onChange={(e) => setFormIsHeadquarters(e.target.checked)}
                      className="w-4 h-4 text-royal rounded focus:ring-royal cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: LOCATION & ADDRESS */}
              {activeEditorTab === "location" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-graphite">Country *</label>
                      <input
                        type="text"
                        value={formCountry}
                        onChange={(e) => setFormCountry(e.target.value)}
                        placeholder="e.g. Netherlands"
                        className="w-full h-10 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-graphite">City / Port Hub *</label>
                      <input
                        type="text"
                        value={formCity}
                        onChange={(e) => setFormCity(e.target.value)}
                        placeholder="e.g. Rotterdam or Schiedam"
                        className="w-full h-10 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-graphite">Full Physical Street Address *</label>
                    <input
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="e.g. Havenstraat 14, 3115 HC Schiedam"
                      className="w-full h-10 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-graphite">Operating Hours / Shift Schedule</label>
                    <input
                      type="text"
                      value={formOpeningHours}
                      onChange={(e) => setFormOpeningHours(e.target.value)}
                      placeholder="e.g. Mon - Fri: 08:00 - 18:00 CET or 24/7 Drydock Operations"
                      className="w-full h-10 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: SCOPE & CONTACTS */}
              {activeEditorTab === "scope" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-graphite">Facility Description</label>
                    <textarea
                      rows={2}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="e.g. Primary deepwater vessel refit yard with 120-meter drydock berth and electric pod drivetrain test benches."
                      className="w-full p-3 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-graphite">Operational Scope & Specializations</label>
                    <textarea
                      rows={2}
                      value={formOperationalScope}
                      onChange={(e) => setFormOperationalScope(e.target.value)}
                      placeholder="e.g. Hybrid propulsion retrofits, shaft alignments, class surveys, and emergency quayside repair."
                      className="w-full p-3 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-graphite">Facility Contact Email</label>
                      <input
                        type="email"
                        value={formContactEmail}
                        onChange={(e) => setFormContactEmail(e.target.value)}
                        placeholder="facility@company.com"
                        className="w-full h-10 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-graphite">Facility Contact Phone</label>
                      <input
                        type="text"
                        value={formContactPhone}
                        onChange={(e) => setFormContactPhone(e.target.value)}
                        placeholder="+31 10 555 0190"
                        className="w-full h-10 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite"
                      />
                    </div>
                  </div>

                  {/* Referenced Sector Cities (Read from 02 — Positioning) */}
                  <div className="space-y-3 pt-3 border-t border-line">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-graphite uppercase font-mono tracking-wider flex items-center gap-1.5">
                          <Globe2 className="w-3.5 h-3.5 text-royal" />
                          Referenced Sector Cities (From 02 — Positioning)
                        </label>
                        <p className="text-[11px] text-stone mt-0.5">
                          Optionally link this physical facility to one or more participating Sector Cities defined in Positioning without creating secondary taxonomy.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-royal font-bold bg-royal/10 px-2 py-0.5 rounded border border-royal/20">
                        {formSectorCityLinks.length} LINKED
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {participatingSectorCityOptions.map((city) => {
                        const isSelected = formSectorCityLinks.includes(city.id);
                        return (
                          <button
                            key={city.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setFormSectorCityLinks(formSectorCityLinks.filter((id) => id !== city.id));
                              } else {
                                setFormSectorCityLinks([...formSectorCityLinks, city.id]);
                              }
                            }}
                            className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${isSelected
                                ? "bg-royal/5 border-royal text-royal shadow-2xs"
                                : "bg-canvas border-line hover:border-royal/40 text-graphite hover:bg-white"
                              }`}
                          >
                            <div className="min-w-0 pr-2">
                              <span className="text-xs font-bold font-mono block truncate">
                                {city.name}
                              </span>
                              <span className="text-[10.5px] text-stone block">
                                {city.category} · {city.code}
                              </span>
                            </div>
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${isSelected ? "bg-royal border-royal text-white" : "border-line bg-white"
                                }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: MEDIA GALLERY */}
              {activeEditorTab === "media" && (
                <div className="space-y-6">
                  {/* Action Selector Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 rounded-xl bg-canvas border border-line">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveMediaInputMode("upload")}
                        className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition flex items-center gap-2 ${activeMediaInputMode === "upload"
                            ? "bg-royal text-white shadow-xs"
                            : "text-stone hover:text-graphite hover:bg-white"
                          }`}
                      >
                        <UploadCloud className="w-4 h-4" />
                        UPLOAD FROM DESKTOP
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveMediaInputMode("url")}
                        className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition flex items-center gap-2 ${activeMediaInputMode === "url"
                            ? "bg-royal text-white shadow-xs"
                            : "text-stone hover:text-graphite hover:bg-white"
                          }`}
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        ADD IMAGE URL
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveMediaInputMode("presets")}
                        className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition flex items-center gap-2 ${activeMediaInputMode === "presets"
                            ? "bg-royal text-white shadow-xs"
                            : "text-stone hover:text-graphite hover:bg-white"
                          }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        CURATED PRESETS
                      </button>
                    </div>

                    <span className="text-[10.5px] font-mono text-mute px-2 font-bold">
                      {formMedia.length} PHOTO{formMedia.length === 1 ? "" : "S"} ATTACHED
                    </span>
                  </div>

                  {/* Feedback Banner */}
                  {mediaFeedbackMessage && (
                    <div
                      className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200 ${mediaFeedbackMessage.type === "success"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-rose-50 text-rose-800 border border-rose-200"
                        }`}
                    >
                      {mediaFeedbackMessage.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{mediaFeedbackMessage.text}</span>
                    </div>
                  )}

                  {/* 1. DESKTOP UPLOAD PANEL */}
                  {activeMediaInputMode === "upload" && (
                    <div className="space-y-4 p-5 rounded-2xl bg-canvas border border-line">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-bold text-graphite uppercase font-mono tracking-wider flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5 text-royal" />
                            Desktop Image Upload
                          </h4>
                          <p className="text-[11.5px] text-stone mt-0.5">
                            Select local JPG, PNG, or WEBP photos from your device. Multiple files supported.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-mono text-mute uppercase font-bold shrink-0">
                            Tag Category:
                          </label>
                          <select
                            value={newMediaCategory}
                            onChange={(e) => setNewMediaCategory(e.target.value as FacilityMediaCategory)}
                            className="h-8 px-2.5 rounded-lg border border-line bg-white text-xs text-graphite font-mono font-medium"
                          >
                            {MEDIA_CATEGORIES.map((c) => (
                              <option key={c.category} value={c.category}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Hidden File Input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                        multiple
                        onChange={(e) => {
                          if (e.target.files) handleProcessDesktopFiles(e.target.files);
                          e.target.value = "";
                        }}
                        className="hidden"
                      />

                      {/* Drag & Drop Upload Zone */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(false);
                          if (e.dataTransfer.files) handleProcessDesktopFiles(e.dataTransfer.files);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-8 rounded-xl border-2 border-dashed transition-all duration-150 flex flex-col items-center justify-center text-center cursor-pointer group ${isDraggingFile
                            ? "border-royal bg-royal/5 scale-[0.99]"
                            : "border-line/80 hover:border-royal/50 bg-white hover:bg-soft/30"
                          }`}
                      >
                        {isProcessingUpload ? (
                          <div className="space-y-2 py-4">
                            <div className="w-8 h-8 border-2 border-royal border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-xs font-mono font-bold text-royal">Processing and encoding media...</p>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-2xl bg-canvas border border-line flex items-center justify-center text-royal group-hover:scale-110 transition-transform">
                              <UploadCloud className="w-6 h-6" />
                            </div>
                            <h5 className="text-xs font-bold text-graphite mt-3">
                              Click to select photos or drag & drop files here
                            </h5>
                            <p className="text-[11px] text-stone mt-1">
                              Supported: <span className="font-mono font-semibold">JPG, PNG, WEBP</span> · Multi-image selection enabled
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                              className="mt-4 px-4 py-2 bg-royal hover:bg-royal/90 text-white rounded-xl text-xs font-mono font-bold shadow-xs transition"
                            >
                              CHOOSE FILES FROM COMPUTER
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 2. URL IMPORT PANEL */}
                  {activeMediaInputMode === "url" && (
                    <div className="p-5 rounded-2xl bg-canvas border border-line space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-graphite uppercase font-mono tracking-wider flex items-center gap-1.5">
                          <LinkIcon className="w-3.5 h-3.5 text-royal" />
                          Import Remote Image URL
                        </h4>
                        <p className="text-[11.5px] text-stone mt-0.5">
                          Provide an external photo link or CDN asset path.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[11px] font-mono text-mute uppercase font-bold">Image URL *</label>
                          <input
                            type="url"
                            value={newMediaUrl}
                            onChange={(e) => setNewMediaUrl(e.target.value)}
                            placeholder="https://images.unsplash.com/... or /facility.jpg"
                            className="w-full h-9 px-3 rounded-lg border border-line bg-white text-xs text-graphite focus:border-royal focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-mono text-mute uppercase font-bold">Category</label>
                          <select
                            value={newMediaCategory}
                            onChange={(e) => setNewMediaCategory(e.target.value as FacilityMediaCategory)}
                            className="w-full h-9 px-2.5 rounded-lg border border-line bg-white text-xs text-graphite focus:border-royal focus:outline-none"
                          >
                            {MEDIA_CATEGORIES.map((c) => (
                              <option key={c.category} value={c.category}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-mono text-mute uppercase font-bold">Photo Title</label>
                          <input
                            type="text"
                            value={newMediaTitle}
                            onChange={(e) => setNewMediaTitle(e.target.value)}
                            placeholder="e.g. Quayside Drydock Berth 1"
                            className="w-full h-9 px-3 rounded-lg border border-line bg-white text-xs text-graphite focus:border-royal focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-mono text-mute uppercase font-bold">Caption (Optional)</label>
                          <input
                            type="text"
                            value={newMediaCaption}
                            onChange={(e) => setNewMediaCaption(e.target.value)}
                            placeholder="e.g. 120-meter deepwater refit station"
                            className="w-full h-9 px-3 rounded-lg border border-line bg-white text-xs text-graphite focus:border-royal focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleAddUrlMedia}
                          className="px-4 py-2 bg-royal hover:bg-royal/90 text-white rounded-xl text-xs font-mono font-bold shadow-xs transition flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          IMPORT PHOTO URL
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. CURATED PRESETS PANEL */}
                  {activeMediaInputMode === "presets" && (
                    <div className="space-y-3 p-5 rounded-2xl bg-canvas border border-line">
                      <div>
                        <h4 className="text-xs font-bold text-graphite uppercase font-mono tracking-wider flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-royal" />
                          Curated Marine Infrastructure Photography
                        </h4>
                        <p className="text-[11.5px] text-stone mt-0.5">
                          Click any verified architectural photo below to quickly attach it to this facility.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                        {CURATED_FACILITY_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleApplyPresetMedia(preset)}
                            className="p-2.5 rounded-xl border border-line hover:border-royal bg-white text-left space-y-1.5 group transition shadow-2xs"
                          >
                            <div className="aspect-video rounded-lg overflow-hidden relative border border-line/60">
                              <img
                                src={preset.image}
                                alt={preset.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                              />
                              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[8.5px] font-mono text-white">
                                {preset.category}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-bold text-graphite truncate group-hover:text-royal">
                                {preset.title}
                              </p>
                              <Plus className="w-3.5 h-3.5 text-stone group-hover:text-royal shrink-0" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* =========================================================
                      ATTACHED PHOTOS GALLERY & MANAGEMENT CONTROLS
                      ========================================================= */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b border-line pb-2">
                      <label className="text-xs font-bold text-graphite uppercase font-mono tracking-wider flex items-center gap-2">
                        <Camera className="w-3.5 h-3.5 text-royal" />
                        Attached Photos ({formMedia.length})
                      </label>
                      <span className="text-[11px] text-stone font-mono">
                        {formMedia.length > 0
                          ? "Set cover, reorder, add captions, or remove photos below."
                          : "No photos attached yet."}
                      </span>
                    </div>

                    {formMedia.length === 0 ? (
                      <div className="p-8 rounded-xl border border-dashed border-line text-center space-y-2 bg-canvas/60">
                        <ImageIcon className="w-8 h-8 mx-auto text-stone/40" />
                        <p className="text-xs text-stone">No facility media attached yet.</p>
                        <p className="text-[11px] text-mute">
                          Use the actions above to upload photos from your computer or import URLs.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {formMedia.map((item, index) => {
                          const isCover = Boolean(item.isCover);
                          const isEditingCaption = editingMediaCaptionId === item.id;
                          const mediaUrl = item.url || item.image;

                          return (
                            <div
                              key={item.id || index}
                              className={`p-3.5 rounded-2xl border transition-all duration-150 ${isCover
                                  ? "border-royal/50 bg-royal/5 shadow-2xs"
                                  : "border-line bg-white hover:border-royal/30"
                                }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                {/* Left: Media Thumbnail + Source Details */}
                                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                  <div
                                    onClick={() => setMediaPreviewItem(item)}
                                    className="relative w-24 h-20 sm:w-28 sm:h-20 rounded-xl overflow-hidden border border-line bg-slate-900 shrink-0 group cursor-pointer"
                                  >
                                    <img
                                      src={mediaUrl}
                                      alt={item.title || "Facility Photo"}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition" />
                                    <div className="absolute top-1 left-1">
                                      <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-black/70 text-white">
                                        #{index + 1}
                                      </span>
                                    </div>
                                    <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition">
                                      <span className="p-1 rounded bg-black/80 text-white block">
                                        <Maximize2 className="w-2.5 h-2.5" />
                                      </span>
                                    </div>
                                  </div>

                                  {/* Info and Caption Body */}
                                  <div className="min-w-0 flex-1 space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {isCover && (
                                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-royal text-white uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                                          <BookmarkCheck className="w-2.5 h-2.5" />
                                          PRIMARY COVER
                                        </span>
                                      )}
                                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-canvas border border-line text-graphite uppercase">
                                        {item.category || "OTHER"}
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded text-[8.5px] font-mono text-mute bg-canvas">
                                        {item.source === "upload" ? "DESKTOP UPLOAD" : "URL IMPORT"}
                                      </span>
                                    </div>

                                    {!isEditingCaption ? (
                                      <div>
                                        <h5 className="text-xs font-bold text-graphite truncate">
                                          {item.title || "Facility Photo"}
                                        </h5>
                                        <p className="text-[11px] text-stone mt-0.5 line-clamp-2">
                                          {item.caption || (
                                            <span className="italic text-stone/50">
                                              No caption added. Click "Edit Details" to add caption.
                                            </span>
                                          )}
                                        </p>
                                      </div>
                                    ) : (
                                      /* Inline Editing Mode */
                                      <div className="space-y-2 pt-1">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          <input
                                            type="text"
                                            value={mediaTitleEditValue}
                                            onChange={(e) => setMediaTitleEditValue(e.target.value)}
                                            placeholder="Photo Title"
                                            className="w-full h-8 px-2.5 rounded-lg border border-line bg-white text-xs text-graphite focus:border-royal focus:outline-none"
                                          />
                                          <select
                                            value={mediaCategoryEditValue}
                                            onChange={(e) =>
                                              setMediaCategoryEditValue(e.target.value as FacilityMediaCategory)
                                            }
                                            className="w-full h-8 px-2 rounded-lg border border-line bg-white text-xs text-graphite focus:border-royal focus:outline-none font-mono"
                                          >
                                            {MEDIA_CATEGORIES.map((c) => (
                                              <option key={c.category} value={c.category}>
                                                {c.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                        <textarea
                                          rows={2}
                                          value={mediaCaptionEditValue}
                                          onChange={(e) => setMediaCaptionEditValue(e.target.value)}
                                          placeholder="Enter descriptive photo caption..."
                                          className="w-full p-2 rounded-lg border border-line bg-white text-xs text-graphite focus:border-royal focus:outline-none leading-relaxed"
                                        />
                                        <div className="flex items-center gap-2 justify-end">
                                          <button
                                            type="button"
                                            onClick={() => setEditingMediaCaptionId(null)}
                                            className="px-2.5 py-1 text-stone hover:text-graphite text-[11px] font-mono"
                                          >
                                            CANCEL
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleSaveCaptionEdit(item.id)}
                                            className="px-3 py-1 bg-royal text-white rounded-lg text-[11px] font-mono font-bold hover:bg-royal/90"
                                          >
                                            SAVE CAPTION
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Right: Management Controls */}
                                <div className="flex sm:flex-col items-center justify-end gap-1.5 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-line/60">
                                  {/* Cover Button */}
                                  {!isCover ? (
                                    <button
                                      type="button"
                                      onClick={() => handleSetCover(item.id)}
                                      className="px-2.5 py-1 rounded-lg border border-line bg-white hover:border-royal/40 text-[10.5px] font-mono font-bold text-graphite hover:text-royal flex items-center gap-1 transition shadow-2xs"
                                      title="Set this image as primary facility cover"
                                    >
                                      <BookmarkCheck className="w-3 h-3 text-stone" />
                                      SET AS COVER
                                    </button>
                                  ) : (
                                    <span className="text-[10px] font-mono font-bold text-royal px-2 py-0.5">
                                      CURRENT COVER
                                    </span>
                                  )}

                                  {/* Reorder Buttons */}
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleReorderMedia(index, "up")}
                                      disabled={index === 0}
                                      className="p-1.5 rounded-lg border border-line bg-white hover:bg-canvas text-stone hover:text-graphite disabled:opacity-30 disabled:cursor-not-allowed transition"
                                      title="Move earlier in gallery order"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleReorderMedia(index, "down")}
                                      disabled={index === formMedia.length - 1}
                                      className="p-1.5 rounded-lg border border-line bg-white hover:bg-canvas text-stone hover:text-graphite disabled:opacity-30 disabled:cursor-not-allowed transition"
                                      title="Move later in gallery order"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* Edit Caption / Delete */}
                                  <div className="flex items-center gap-1">
                                    {!isEditingCaption && (
                                      <button
                                        type="button"
                                        onClick={() => handleStartCaptionEdit(item)}
                                        className="p-1.5 rounded-lg border border-line bg-white hover:bg-canvas text-stone hover:text-royal transition"
                                        title="Edit title, caption, and category"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => setMediaPreviewItem(item)}
                                      className="p-1.5 rounded-lg border border-line bg-white hover:bg-canvas text-stone hover:text-graphite transition"
                                      title="Zoom preview"
                                    >
                                      <ZoomIn className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMedia(item.id)}
                                      className="p-1.5 rounded-lg border border-line bg-white hover:bg-rose-50 text-stone hover:text-rose-600 transition"
                                      title="Remove photo"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-line flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 text-stone hover:text-graphite text-xs font-bold font-mono"
                >
                  CANCEL
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-royal hover:bg-royal/90 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    SAVE FACILITY
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: PUBLIC FACILITY PRESENTATION PREVIEW
          ==================================================================== */}
      {previewFacility && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white border border-line rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-line flex items-center justify-between bg-canvas/40">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-royal text-white uppercase tracking-wider">
                  PUBLIC DIRECTORY PROFILE
                </span>
                <span className="text-xs font-bold text-stone uppercase font-mono">
                  {previewFacility.facilityType}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewFacility(null)}
                className="p-2 text-stone hover:text-graphite rounded-xl hover:bg-mist transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Photo Hero Banner */}
              {(() => {
                const previewCover =
                  previewFacility.media?.find((m) => m.isCover) || previewFacility.media?.[0];
                const previewCoverUrl = previewCover?.url || previewCover?.image;
                const previewGallery =
                  previewFacility.media?.filter((m) => m.id !== previewCover?.id) || [];

                return (
                  <>
                    {previewCoverUrl ? (
                      <div
                        onClick={() => setMediaPreviewItem(previewCover)}
                        className="rounded-xl overflow-hidden aspect-video border border-line relative group cursor-pointer"
                      >
                        <img
                          src={previewCoverUrl}
                          alt={previewFacility.facilityName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-royal text-white uppercase">
                            PRIMARY COVER
                          </span>
                        </div>
                        {previewCover?.caption && (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-6">
                            <p className="text-xs text-white/90">{previewCover.caption}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl aspect-video bg-canvas border border-line flex items-center justify-center text-stone/40">
                        <Building2 className="w-12 h-12" />
                      </div>
                    )}

                    <div>
                      <h3 className="text-xl font-bold text-graphite">
                        {previewFacility.facilityName}
                      </h3>
                      <p className="text-xs font-mono text-royal font-semibold mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {previewFacility.address}, {previewFacility.city}, {previewFacility.country}
                      </p>
                      <p className="text-xs text-stone mt-3 leading-relaxed">
                        {previewFacility.description ||
                          "Official verified physical operating asset inside MarineWorld registry."}
                      </p>
                    </div>

                    {previewFacility.operationalScope && (
                      <div className="p-4 rounded-xl bg-soft/50 border border-royal/20 space-y-1">
                        <div className="text-[10px] font-mono font-bold text-royal uppercase">
                          OPERATIONAL CAPABILITIES & SCOPE
                        </div>
                        <p className="text-xs text-graphite">{previewFacility.operationalScope}</p>
                      </div>
                    )}

                    {previewFacility.sectorCityLinks && previewFacility.sectorCityLinks.length > 0 && (
                      <div className="p-3 rounded-xl bg-canvas border border-line space-y-1">
                        <div className="text-[10px] font-mono font-bold text-mute uppercase">
                          CONNECTED SECTOR CITIES
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {previewFacility.sectorCityLinks.map((cityId) => (
                            <span
                              key={cityId}
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white border border-line text-royal"
                            >
                              {cityId.toUpperCase()}.CITY
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-canvas border border-line space-y-1">
                        <span className="text-[10px] text-mute uppercase font-bold">HOURS</span>
                        <span className="font-bold text-graphite block">{previewFacility.openingHours || "08:00 - 18:00"}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-canvas border border-line space-y-1">
                        <span className="text-[10px] text-mute uppercase font-bold">STATUS</span>
                        <span className="font-bold text-emerald-700 block">{previewFacility.status}</span>
                      </div>
                    </div>

                    {previewGallery.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-graphite uppercase font-mono tracking-wider block">
                          Additional Photography ({previewGallery.length})
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {previewGallery.map((m) => (
                            <div
                              key={m.id}
                              onClick={() => setMediaPreviewItem(m)}
                              className="rounded-lg overflow-hidden aspect-video border border-line relative group cursor-pointer hover:border-royal transition"
                            >
                              <img
                                src={m.url || m.image}
                                alt={m.title || "Facility Photo"}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition flex items-end p-1.5">
                                <span className="text-[8px] font-mono text-white bg-black/70 px-1 rounded truncate">
                                  {m.category}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="p-4 border-t border-line bg-canvas/40 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewFacility(null)}
                className="px-4 py-2 bg-royal text-white rounded-xl text-xs font-bold font-mono"
              >
                CLOSE PREVIEW
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: FULLSCREEN PHOTO LIGHTBOX PREVIEW
          ==================================================================== */}
      {mediaPreviewItem && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-royal text-white uppercase">
                  {mediaPreviewItem.category || "FACILITY MEDIA"}
                </span>
                {mediaPreviewItem.isCover && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-600 text-white uppercase">
                    ★ PRIMARY COVER
                  </span>
                )}
                <span className="text-xs font-mono text-white/60">
                  Source: {mediaPreviewItem.source === "upload" ? "Desktop Upload" : "URL Import"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMediaPreviewItem(null)}
                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 flex flex-col items-center justify-center overflow-hidden bg-black/60">
              <img
                src={mediaPreviewItem.url || mediaPreviewItem.image}
                alt={mediaPreviewItem.title || "Facility Photo"}
                className="max-h-[55vh] max-w-full object-contain rounded-lg border border-white/10 shadow-lg"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="p-4 border-t border-white/10 bg-slate-950/80 space-y-1">
              <h4 className="text-sm font-bold text-white">
                {mediaPreviewItem.title || "Facility Photography Asset"}
              </h4>
              {mediaPreviewItem.caption && (
                <p className="text-xs text-white/80 leading-relaxed">
                  {mediaPreviewItem.caption}
                </p>
              )}
              {mediaPreviewItem.storagePath && (
                <p className="text-[10px] font-mono text-white/40 truncate pt-1">
                  Local Asset Reference: {mediaPreviewItem.storagePath}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
