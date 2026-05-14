"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ALL_CATEGORIES, CAR_MAKES_AND_MODELS, ROMANIAN_COUNTIES, CITIES_BY_COUNTY } from "@/lib/carData";
import { getCsrfToken } from "@/lib/security/csrf-client";
import { postJsonWithAuthRefresh } from "@/lib/admin-fetch";
import { listingPrimaryPhotoSrc, LISTING_PHOTO_ONERROR_FALLBACK } from "@/lib/listing-photo-url";

// Types
interface DraftListing {
  step: number;
  title: string;
  category: string;
  priceAmount: number | "";
  priceCurrency: "RON" | "EUR";
  county: string;
  city: string;
  photos: string[];
  video?: string;
  description: string;
  make?: string;
  model?: string;
  year?: number | "";
  mileage?: number | "";
  fuel?: string;
  transmission?: string;
  vin?: string;
  condition: string;
  phone: string;
  allowMessages: boolean;
  lastSaved?: number;
  // Additional car details
  horsepower?: number | "";
  cylinderCapacity?: number | "";
  bodyType?: string;
  color?: string;
  seatCount?: number | "";
  doorCount?: number | "";
  owners?: number | "";
  accidents?: string;
  rare?: boolean;
  registrationDate?: string;
  inspectionExpires?: string;
  countryOfOrigin?: string;
  environmentalClass?: string;
  co2Emissions?: number | "";
  upholstery?: string;
  keys?: number | "";
  cocPapers?: boolean;
}

// Utility: Base64 conversion
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(result.slice(comma + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const INITIAL_DRAFT: DraftListing = {
  step: 0,
  title: "",
  category: "",
  priceAmount: "",
  priceCurrency: "RON",
  county: "",
  city: "",
  photos: [],
  video: undefined,
  description: "",
  condition: "used",
  phone: "",
  allowMessages: true,
  // Additional car details
  horsepower: "",
  cylinderCapacity: "",
  bodyType: "",
  color: "",
  seatCount: "",
  doorCount: "",
  owners: "",
  accidents: "",
  rare: false,
  registrationDate: "",
  inspectionExpires: "",
  countryOfOrigin: "",
  environmentalClass: "",
  co2Emissions: "",
  upholstery: "",
  keys: "",
  cocPapers: false,
  vin: "",
};

const DRAFT_VERSION = "3"; // Increment when schema changes

export default function OptimizedListingFlow() {
  const router = useRouter();
  
  // Core state
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [forceNewDraft, setForceNewDraft] = useState(false);
  
  // Form data with draft support
  const [draft, setDraft] = useState<DraftListing>(INITIAL_DRAFT);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showGeneralError, setShowGeneralError] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Pas 0: "Ce vinzi?" quick input
  const [quickInput, setQuickInput] = useState("");

  // Load draft from localStorage or check for ?new parameter on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    
    // If ?new parameter exists OR no explicit ?continue parameter, clear everything and start fresh
    if (params.has("new") || !params.has("continue")) {
      console.log("✅ Starting fresh listing (no ?continue parameter)");
      localStorage.removeItem("listingDraft");
      localStorage.removeItem("listingDraftVersion");
      setForceNewDraft(true);
      setDraft(INITIAL_DRAFT);
      setCurrentStep(0);
      setQuickInput("");
      setErrors({});
      setTouched({});
      return;
    }

    // Only load draft if explicitly requested with ?continue parameter
    if (params.has("continue")) {
      // Check draft version compatibility
      const savedVersion = localStorage.getItem("listingDraftVersion");
      if (savedVersion !== DRAFT_VERSION) {
        console.log(`📝 Draft version mismatch (saved: ${savedVersion}, current: ${DRAFT_VERSION}) - clearing old data`);
        localStorage.removeItem("listingDraft");
        localStorage.removeItem("listingDraftVersion");
        setDraft(INITIAL_DRAFT);
        setCurrentStep(0);
        setQuickInput("");
        return;
      }

      // Try to load from localStorage
      const saved = localStorage.getItem("listingDraft");
      if (saved) {
        try {
          console.log("📂 Loading draft from localStorage (explicit ?continue)");
          const parsed = JSON.parse(saved);
          setDraft(parsed);
          setCurrentStep(parsed.step || 0);
        } catch (e) {
          console.error("Failed to load draft", e);
          localStorage.removeItem("listingDraft");
          setDraft(INITIAL_DRAFT);
          setCurrentStep(0);
        }
      } else {
        console.log("📝 No saved draft found, starting fresh");
        setDraft(INITIAL_DRAFT);
        setCurrentStep(0);
      }
    }
  }, []);

  // Autosave draft every 3 seconds (but not when starting fresh)
  useEffect(() => {
    // Don't save if we just cleared the draft (forceNewDraft flag)
    if (forceNewDraft) {
      console.log("⏩ Skipping autosave for fresh draft");
      return;
    }

    // Don't save empty drafts
    if (currentStep === 0 && !draft.title && !draft.category && draft.photos.length === 0) {
      console.log("⏩ Skipping autosave for empty draft");
      return;
    }

    const timer = setTimeout(() => {
      const toSave = { ...draft, step: currentStep, lastSaved: Date.now() };
      localStorage.setItem("listingDraft", JSON.stringify(toSave));
      localStorage.setItem("listingDraftVersion", DRAFT_VERSION);
      console.log("💾 Draft autosaved");
    }, 3000);
    return () => clearTimeout(timer);
  }, [draft, currentStep, forceNewDraft]);

  // Smart category detection from quick input
  const detectCategory = useCallback((input: string) => {
    const lower = input.toLowerCase();
    if (/(mașin|auto|bmw|audi|ford|vw|dacia)/i.test(lower)) {
      return "Auto, moto și ambarcațiuni";
    }
    if (/(apartament|casă|teren|garaj|vilă)/i.test(lower)) {
      return "Imobiliare";
    }
    if (/(iphone|samsung|laptop|telefon|tablet)/i.test(lower)) {
      return "Electronice și electrocasnice";
    }
    return "";
  }, []);

  // Auto-suggest title based on category
  const suggestTitle = useCallback((category: string, make?: string, model?: string) => {
    if (category === "Auto, moto și ambarcațiuni" && make && model) {
      return `${make} ${model}`;
    }
    return "";
  }, []);

  // Dynamic fields based on category
  const isAutoCategory = draft.category === "Auto, moto și ambarcațiuni";
  const availableModels = useMemo(() => {
    return draft.make ? CAR_MAKES_AND_MODELS[draft.make as keyof typeof CAR_MAKES_AND_MODELS] || [] : [];
  }, [draft.make]);
  const availableCities = useMemo(() => {
    return draft.county ? CITIES_BY_COUNTY[draft.county as keyof typeof CITIES_BY_COUNTY] || [] : [];
  }, [draft.county]);

  // Validation rules
  const validateStep = useCallback((step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (step === 1) {
      if (!draft.title.trim()) newErrors.title = "Titlul este obligatoriu";
      if (draft.title.trim().length > 0 && draft.title.trim().length < 5) {
        newErrors.title = "Titlul trebuie să aibă minim 5 caractere";
      }
      if (!draft.category) newErrors.category = "Selectează categoria";
      if (!draft.priceAmount || draft.priceAmount <= 0) newErrors.priceAmount = "Prețul trebuie să fie mai mare de 0";
      if (!draft.county) newErrors.county = "Selectează județul";
      if (!draft.city) newErrors.city = "Selectează orașul";
      if (draft.photos.length === 0) newErrors.photos = "Adaugă minim o poză";
    }
    
    if (step === 2) {
      if (!draft.description.trim() || draft.description.length < 10) {
        newErrors.description = "Descrierea trebuie să aibă minim 10 caractere";
      }
    }
    
    if (step === 3) {
      if (!draft.phone.trim() || draft.phone.length < 10) {
        newErrors.phone = "Numărul de telefon este invalid";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [draft]);

  // Handle quick input (Step 0)
  const handleQuickSubmit = () => {
    if (!quickInput.trim()) return;
    
    const detectedCategory = detectCategory(quickInput);
    setDraft(prev => ({
      ...prev,
      title: quickInput,
      category: detectedCategory
    }));
    setCurrentStep(1);
    
    // Track metric
    trackMetric("quick_input_used", { input: quickInput, detected: detectedCategory });
  };

  // Upload image
  const handleImageUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;
    
    const remainingSlots = 20 - draft.photos.length;
    if (remainingSlots <= 0) {
      setErrors(prev => ({ ...prev, photos: "Ai atins limita de 20 poze" }));
      return;
    }
    
    setUploadingImage(true);
    const newPhotos: string[] = [];
    const uploadErrors: string[] = [];
    
    try {
      const csrfToken = await getCsrfToken();
      if (!csrfToken) {
        console.error("❌ CSRF token missing");
        setErrors(prev => ({ ...prev, photos: "Eroare de securitate - token CSRF lipsă. Încearcă din nou." }));
        setUploadingImage(false);
        return;
      }

      const filesToUpload = Math.min(files.length, remainingSlots);
      console.log(`📸 Încep upload pentru ${filesToUpload} poze...`);
      
      for (let i = 0; i < filesToUpload; i++) {
        const file = files[i];
        console.log(`📸 Procesez fișier ${i+1}: ${file.name} (${file.type}, ${file.size} bytes)`);
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          console.error(`❌ Fișierul ${file.name} nu este imagine: ${file.type}`);
          uploadErrors.push(`${file.name}: nu este imagine`);
          continue;
        }

        // Validate file size (max 10MB per image)
        if (file.size > 10 * 1024 * 1024) {
          console.error(`❌ Fișierul ${file.name} e prea mare: ${file.size} bytes`);
          uploadErrors.push(`${file.name}: prea mare (max 10MB)`);
          continue;
        }
        
        try {
          console.log(`🔄 Convertesc în base64: ${file.name}`);
          const b64 = await fileToBase64(file);
          
          // Validate base64 conversion
          if (!b64 || b64.length === 0) {
            console.error(`❌ Conversie base64 eșuată: ${file.name}`);
            uploadErrors.push(`${file.name}: eroare conversie`);
            continue;
          }
          
          console.log(`✅ Base64 convertit, lungime: ${b64.length} chars`);

          // Extract safe filename extension - detect from MIME type for reliability
          let safeExt = 'jpg';
          if (file.type === 'image/png') safeExt = 'png';
          else if (file.type === 'image/webp') safeExt = 'webp';
          else if (file.type === 'image/gif') safeExt = 'gif';
          else if (file.type === 'image/svg+xml') safeExt = 'svg';
          
          const safeFilename = `photo_${Date.now()}_${i}.${safeExt}`;

          console.log(`📤 Trimit la API (fără filename)`);
          const res = await fetch("/api/uploads", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "x-csrf-token": csrfToken,
            },
            body: JSON.stringify({ 
              data: b64,
              type: "image"
            }),
          });

          console.log(`📥 Răspuns API status: ${res.status}`);
          const data = await res.json();
          console.log(`📥 Răspuns API data:`, data);
          
          if (res.ok && data.url) {
            console.log(`✅ Upload reușit: ${data.url}`);
            newPhotos.push(data.url);
          } else {
            const errorMsg = data.error || data.reason || 'Eroare necunoscută';
            console.error(`❌ Upload eșuat: ${errorMsg}`);
            uploadErrors.push(`${file.name}: ${errorMsg}`);
          }
        } catch (fileError: any) {
          console.error(`❌ Eroare upload fișier: ${fileError.message}`);
          uploadErrors.push(`${file.name}: ${fileError.message || 'Eroare upload'}`);
        }
      }
      
      if (newPhotos.length > 0) {
        console.log(`✅ Adaug ${newPhotos.length} poze în draft`);
        setDraft(prev => ({
          ...prev,
          photos: [...prev.photos, ...newPhotos]
        }));
        
        // Clear error if at least some uploaded successfully
        setErrors(prev => ({ ...prev, photos: "" }));
      }

      if (uploadErrors.length > 0) {
        const errorMsg = uploadErrors.slice(0, 2).join("; ");
        console.error(`❌ Erori upload: ${errorMsg}`);
        setErrors(prev => ({ ...prev, photos: errorMsg }));
      }
    } catch (error: any) {
      console.error("❌ Upload failed (outer)", error);
      setErrors(prev => ({ ...prev, photos: error.message || "Eroare la încărcarea pozelor. Încearcă din nou." }));
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle video upload
  const handleVideoUpload = async (file: File) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('video/')) {
      setErrors(prev => ({ ...prev, video: "Fișierul trebuie să fie un video (MP4, WebM, etc.)" }));
      return;
    }
    
    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, video: "Videoclipul nu poate depăși 50MB" }));
      return;
    }
    
    setUploadingImage(true);
    
    try {
      const csrfToken = await getCsrfToken();
      if (!csrfToken) {
        setErrors(prev => ({ ...prev, video: "Eroare de securitate - token CSRF lipsă" }));
        setUploadingImage(false);
        return;
      }

      const b64 = await fileToBase64(file);
      
      // Validate base64 conversion
      if (!b64 || b64.length === 0) {
        setErrors(prev => ({ ...prev, video: "Eroare la conversie video" }));
        setUploadingImage(false);
        return;
      }

      // Extract safe filename extension - detect from MIME type for reliability  
      let safeExt = 'mp4';
      if (file.type === 'video/webm') safeExt = 'webm';
      else if (file.type === 'video/quicktime') safeExt = 'mov';
      else if (file.type === 'video/x-msvideo') safeExt = 'avi';
      
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ 
          data: b64,
          type: "video"
        }),
      });
      
      const data = await res.json();
      if (res.ok && data.url) {
        setDraft(prev => ({ ...prev, video: data.url }));
        setErrors(prev => ({ ...prev, video: "" }));
      } else {
        setErrors(prev => ({ ...prev, video: data.error || "Eroare la încărcarea videoclipului" }));
      }
    } catch (error: any) {
      console.error("Video upload failed", error);
      setErrors(prev => ({ ...prev, video: error.message || "Eroare la încărcarea videoclipului" }));
    } finally {
      setUploadingImage(false);
    }
  };

  // Remove photo
  const removePhoto = (index: number) => {
    setDraft(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };
  
  // Remove video
  const removeVideo = () => {
    setDraft(prev => ({ ...prev, video: undefined }));
  };

  // Navigate steps
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
      trackMetric("step_completed", { step: currentStep });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  // Submit listing
  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    
    setLoading(true);
    const startTime = Date.now();
    
    try {
      const payload: any = {
        title: draft.title?.trim(),
        category: draft.category,
        priceAmount: Number(draft.priceAmount),
        priceCurrency: draft.priceCurrency,
        condition: draft.condition,
        description: draft.description,
        county: draft.county,
        city: draft.city,
        photos: draft.photos,
        contactPhone: draft.phone,
        allowMessages: draft.allowMessages
      };

      // Client-side sanity validation to avoid server schema errors
      if (!payload.title || payload.title.length < 5) {
        setErrors({ title: "Titlul trebuie să aibă minim 5 caractere" });
        setShowGeneralError(true);
        setLoading(false);
        return;
      }

      const fuelMap: Record<string, string> = {
        "Benzină": "petrol",
        "Diesel": "diesel",
        "Hibrid": "hybrid",
        "Electric": "electric",
        "GPL": "lpg",
      };
      const transmissionMap: Record<string, string> = {
        "Manuală": "manual",
        "Automată": "automatic",
      };
      const validFuel = new Set(['petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'gas']);
      const validTransmission = new Set(['manual', 'automatic']);

      // Add auto-specific fields
      if (isAutoCategory) {
        payload.make = draft.make || null;
        payload.model = draft.model || null;

        const yearValue = draft.year ? Number(draft.year) : null;
        payload.year = yearValue && yearValue >= 1900 ? yearValue : null;

        const mileageValue = draft.mileage ? Number(draft.mileage) : null;
        payload.mileage = mileageValue && mileageValue >= 0 ? mileageValue : null;

        const normalizedFuel = draft.fuel ? (fuelMap[draft.fuel] || draft.fuel) : null;
        const normalizedTransmission = draft.transmission
          ? (transmissionMap[draft.transmission] || draft.transmission)
          : null;

        payload.fuel = normalizedFuel && validFuel.has(normalizedFuel) ? normalizedFuel : null;
        payload.transmission = normalizedTransmission && validTransmission.has(normalizedTransmission)
          ? normalizedTransmission
          : null;
      }
    
      console.log('📤 Trimis payload la API:', payload);
      let res = await postJsonWithAuthRefresh("/api/listings", payload as Record<string, unknown>);

      // Fallback for stale localStorage token:
      // retry once with cookie-based auth only (no Authorization header).
      if (res.status === 401) {
        const retryCsrf = await getCsrfToken();
        res = await fetch("/api/listings", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": retryCsrf,
          },
          body: JSON.stringify(payload),
        });
      }

      console.log('📥 Status răspuns API:', res.status);

      const data = await res.json();
      
      console.log('📥 Răspuns API:', data);
      
      if (!res.ok) {
        const errorMsg = data?.error || data?.reason || data?.message || "Eroare necunoscută la publicare";
        console.error('❌ Eroare API:', errorMsg, data);
        throw new Error(errorMsg);
      }

      // Track success metrics
      const duration = Date.now() - startTime;
      trackMetric("listing_published", { 
        listingId: data.listing?.id || data.id, 
        duration,
        category: draft.category,
        photoCount: draft.photos.length
      });

      // Clear draft - ALWAYS on success
      localStorage.removeItem("listingDraft");
      localStorage.removeItem("listingDraftVersion");
      
      // Reset form state completely
      setDraft(INITIAL_DRAFT);
      setCurrentStep(0);
      setErrors({});
      setTouched({});
      setQuickInput("");
      setForceNewDraft(false);
      
      // Redirect to listing
      router.push(`/listings/${data.listing?.id || data.id}`);
      
    } catch (error: any) {
      console.error('❌ EROARE FINALĂ:', error);
      const errorMessage = error?.message || "Eroare la publicare. Te rugăm să încerci din nou.";
      
      // Clear draft even on error - user can try again fresh
      localStorage.removeItem("listingDraft");
      localStorage.removeItem("listingDraftVersion");
      setErrors({ general: errorMessage });
      setShowGeneralError(true);
    } finally {
      setLoading(false);
    }
  };

  // Reset draft completely
  const handleReset = () => {
    if (confirm("Ești sigur că vrei să resetezi formularul? Toate datele vor fi șterse.")) {
      localStorage.removeItem("listingDraft");
      localStorage.removeItem("listingDraftVersion");
      setDraft(INITIAL_DRAFT);
      setCurrentStep(0);
      setErrors({});
      setTouched({});
      setQuickInput("");
      setForceNewDraft(true);
    }
  };

  // Track metrics
  const trackMetric = (event: string, data: any) => {
    // Send to analytics
    console.log("[METRIC]", event, data);
    
    // You can integrate with Google Analytics, Mixpanel, etc.
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", event, data);
    }
  };

  // Update field with live validation
  const updateField = (field: keyof DraftListing, value: any) => {
    setDraft(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Clear error on change
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  // Progress calculation
  const progress = ((currentStep + 1) / 4) * 100;

  return (
    <div className="relative min-h-screen py-8 px-4" style={{ background: "var(--bg-primary)" }}>
      {showGeneralError && errors.general && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-gradient-to-br from-[#121826] via-[#0B1220] to-[#0B0F1A] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-300">
                <span className="text-lg font-bold">!</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Publicare eșuată</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-200">
                  {errors.general}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => setShowGeneralError(false)}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Închide
              </button>
              <button
                onClick={() => {
                  setShowGeneralError(false);
                  setErrors(prev => ({ ...prev, general: "" }));
                }}
                className="rounded-xl bg-gradient-to-r from-[#6D5BFF] to-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-[#5B4BFF] hover:to-[#4338CA]"
              >
                Revizuiește formularul
              </button>
            </div>
          </div>
        </div>
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(32rem,55vh)] max-h-[420px] bg-[radial-gradient(ellipse_72%_52%_at_50%_-8%,rgba(255,90,0,0.09),transparent_58%),radial-gradient(ellipse_42%_34%_at_92%_4%,rgba(124,92,246,0.07),transparent_50%)]"
      />
      <div className="relative mx-auto max-w-4xl">
        {/* Header with Progress */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              {currentStep === 0 && "Ce vinzi astăzi?"}
              {currentStep === 1 && "Informații esențiale"}
              {currentStep === 2 && "Detalii despre anunț"}
              {currentStep === 3 && "Contact & publicare"}
            </h1>
            <div className="flex shrink-0 items-center gap-4">
              {draft.lastSaved && (
                <span className="hidden text-xs font-medium text-[var(--text-muted)] sm:inline sm:text-sm">
                  Salvat automat
                </span>
              )}
              {currentStep > 0 && (
                <button
                  onClick={handleReset}
                  className="rounded-lg border border-red-500/25 bg-red-950/30 px-3 py-2 text-sm font-medium text-red-300/95 transition hover:border-red-500/40 hover:bg-red-950/50"
                  title="Resetează formularul"
                  type="button"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="relative h-1.5 overflow-hidden rounded-full bg-zinc-800/90 ring-1 ring-white/[0.06]">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#ff5a00] via-[#fb923c] to-amber-500/90 shadow-[0_0_24px_-4px_rgba(255,90,0,0.35)] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex justify-between gap-2">
            {(["Început", "Esențial", "Detalii", "Finalizare"] as const).map((label, i) => {
              const done = currentStep > i;
              const active = currentStep === i;
              return (
                <span
                  key={label}
                  className={`max-w-[24%] truncate text-center text-[11px] font-medium uppercase tracking-[0.12em] transition sm:text-xs ${
                    active
                      ? "text-orange-400/95"
                      : done
                        ? "text-zinc-500"
                        : "text-zinc-600"
                  }`}
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Step 0: Quick Input */}
        {currentStep === 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[var(--bg-elevated)]/90 p-8 shadow-[0_24px_64px_-28px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.04] backdrop-blur-md animate-fadeIn sm:p-10">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent"
            />
            <div className="relative mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-zinc-950/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-orange-500/15">
                <svg className="h-8 w-8 text-orange-400/95" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                  <circle cx="12" cy="12" r="9" className="opacity-40" />
                  <circle cx="12" cy="12" r="5" className="opacity-70" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                  <path strokeLinecap="round" d="M12 3v2M12 19v2M3 12h2M19 12h2" />
                </svg>
              </div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Pas rapid</p>
              <h2 className="mb-3 text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-[1.65rem]">
                Spune-ne rapid ce vinzi
              </h2>
              <p className="mb-8 text-sm leading-relaxed text-[var(--text-tertiary)]">
                Ex: &quot;iPhone 14 Pro&quot;, &quot;BMW Seria 3&quot;, &quot;Apartament 2 camere&quot;
              </p>

              <div className="relative text-left">
                <label htmlFor="listing-quick-what" className="sr-only">
                  Ce vinzi
                </label>
                <input
                  id="listing-quick-what"
                  type="text"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleQuickSubmit();
                    }
                  }}
                  placeholder="Scrie aici ce vinzi..."
                  className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-5 py-4 text-lg text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none ring-0 transition placeholder:text-zinc-500 focus:border-orange-500/45 focus:ring-2 focus:ring-orange-500/20"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleQuickSubmit}
                  disabled={!quickInput.trim()}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff5a00] to-[#e65200] py-4 text-lg font-semibold text-white shadow-[0_12px_40px_-12px_rgba(255,90,0,0.45)] transition hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
                >
                  Continuă
                  <span aria-hidden className="text-xl leading-none">
                    →
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="mt-8 text-sm font-medium text-zinc-500 underline decoration-white/10 underline-offset-4 transition hover:text-orange-300/90 hover:decoration-orange-500/30"
              >
                Sau completează manual →
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Essential Info */}
        {currentStep === 1 && (
          <div className="card p-8 space-y-6 animate-fadeIn">
            {/* Title */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Titlu anunț <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Ex: iPhone 14 Pro Max 256GB, Deep Purple"
                className={`w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 ${
                  errors.title ? "border-red-500" : "border-gray-800"
                } focus:border-[var(--accent-primary)] text-white outline-none transition`}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
              {draft.title.length > 0 && !errors.title && (
                <p className="text-green-500 text-sm mt-1">✓ Titlu perfect!</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Categorie <span className="text-red-500">*</span>
              </label>
              <select
                value={draft.category}
                onChange={(e) => updateField("category", e.target.value)}
                className={`w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 ${
                  errors.category ? "border-red-500" : "border-gray-800"
                } focus:border-[var(--accent-primary)] text-white outline-none transition`}
              >
                <option value="">Selectează categoria</option>
                {ALL_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            </div>

            {/* Auto-specific: Make & Model */}
            {isAutoCategory && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-semibold mb-2">Marca</label>
                  <select
                    value={draft.make || ""}
                    onChange={(e) => {
                      updateField("make", e.target.value);
                      updateField("model", "");
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition"
                  >
                    <option value="">Selectează marca</option>
                    {Object.keys(CAR_MAKES_AND_MODELS).map(make => (
                      <option key={make} value={make}>{make}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-white font-semibold mb-2">Model</label>
                  <select
                    value={draft.model || ""}
                    onChange={(e) => updateField("model", e.target.value)}
                    disabled={!draft.make}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition disabled:opacity-50"
                  >
                    <option value="">Selectează modelul</option>
                    {availableModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Price */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Preț <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <input
                    type="number"
                    value={draft.priceAmount}
                    onChange={(e) => updateField("priceAmount", e.target.value ? Number(e.target.value) : "")}
                    placeholder="0"
                    className={`w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 ${
                      errors.priceAmount ? "border-red-500" : "border-gray-800"
                    } focus:border-[var(--accent-primary)] text-white outline-none transition`}
                  />
                </div>
                <select
                  value={draft.priceCurrency}
                  onChange={(e) => updateField("priceCurrency", e.target.value as "RON" | "EUR")}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition cursor-pointer font-semibold"
                >
                  <option value="RON">💵 RON</option>
                  <option value="EUR">💶 EUR</option>
                </select>
              </div>
              {errors.priceAmount && <p className="text-red-500 text-sm mt-1">{errors.priceAmount}</p>}
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white font-semibold mb-2">
                  Județ <span className="text-red-500">*</span>
                </label>
                <select
                  value={draft.county}
                  onChange={(e) => {
                    updateField("county", e.target.value);
                    updateField("city", "");
                  }}
                  className={`w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 ${
                    errors.county ? "border-red-500" : "border-gray-800"
                  } focus:border-[var(--accent-primary)] text-white outline-none transition`}
                >
                  <option value="">Selectează județul</option>
                  {ROMANIAN_COUNTIES.map(county => (
                    <option key={county} value={county}>{county}</option>
                  ))}
                </select>
                {errors.county && <p className="text-red-500 text-sm mt-1">{errors.county}</p>}
              </div>
              <div>
                <label className="block text-white font-semibold mb-2">
                  Oraș <span className="text-red-500">*</span>
                </label>
                <select
                  value={draft.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  disabled={!draft.county}
                  className={`w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 ${
                    errors.city ? "border-red-500" : "border-gray-800"
                  } focus:border-[var(--accent-primary)] text-white outline-none transition disabled:opacity-50`}
                >
                  <option value="">Selectează orașul</option>
                  {availableCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
              </div>
            </div>

            {/* Photos */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Poze <span className="text-red-500">*</span> (minim 1, maxim 20)
              </label>
              
              <div className="grid grid-cols-4 gap-4 mb-4">
                {draft.photos.map((url, idx) => (
                  <div key={idx} className="relative group aspect-square">
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover rounded-xl"
                      onError={(e) => {
                        const el = e.currentTarget;
                        // Prevent infinite error loops when fallback also fails
                        if (el.src !== LISTING_PHOTO_ONERROR_FALLBACK) {
                          el.onerror = null;
                          el.src = LISTING_PHOTO_ONERROR_FALLBACK;
                        }
                      }}
                    />
                    <button
                      onClick={() => removePhoto(idx)}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
                
                {draft.photos.length < 20 && (
                  <label className="aspect-square border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[var(--accent-primary)] transition">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                      className="hidden"
                    />
                    {uploadingImage ? (
                      <div className="text-gray-400">⏳</div>
                    ) : (
                      <>
                        <div className="text-3xl mb-2">📷</div>
                        <span className="text-xs text-gray-400">Adaugă</span>
                      </>
                    )}
                  </label>
                )}
              </div>
              
              {errors.photos && <p className="text-red-500 text-sm">{errors.photos}</p>}
              {draft.photos.length > 0 && !errors.photos && (
                <p className="text-green-500 text-sm">✓ {draft.photos.length}/20 {draft.photos.length === 1 ? 'poză adăugată' : 'poze adăugate'}</p>
              )}
            </div>
            
            {/* Video */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Videoclip (opțional, max 50MB)
              </label>
              
              {draft.video ? (
                <div className="relative group">
                  <video src={draft.video} className="w-full rounded-xl" controls />
                  <button
                    onClick={removeVideo}
                    className="absolute top-4 right-4 px-4 py-2 bg-red-500 rounded-lg text-white font-bold hover:bg-red-600 transition"
                  >
                    Șterge video
                  </button>
                </div>
              ) : (
                <label className="block border-2 border-dashed border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-[var(--accent-primary)] transition">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0])}
                    className="hidden"
                  />
                  {uploadingImage ? (
                    <div className="text-gray-400">⏳ Încărcare video...</div>
                  ) : (
                    <>
                      <div className="text-4xl mb-2">🎥</div>
                      <p className="text-white font-semibold">Adaugă un videoclip</p>
                      <p className="text-gray-400 text-sm mt-1">Maximum 50MB</p>
                    </>
                  )}
                </label>
              )}
              
              {errors.video && <p className="text-red-500 text-sm mt-2">{errors.video}</p>}
            </div>

            {/* Navigation */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={prevStep}
                className="btn glass flex-1 py-3"
              >
                ← Înapoi
              </button>
              <button
                onClick={nextStep}
                className="btn btn-primary flex-1 py-3"
              >
                Continuă →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {currentStep === 2 && (
          <div className="card p-8 space-y-6 animate-fadeIn">
            {/* Description */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Descriere <span className="text-red-500">*</span>
              </label>
              <textarea
                value={draft.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Descrie produsul tău în detaliu... (minim 10 caractere)"
                rows={6}
                className={`w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 ${
                  errors.description ? "border-red-500" : "border-gray-800"
                } focus:border-[var(--accent-primary)] text-white outline-none transition resize-none`}
              />
              <div className="flex justify-between mt-2">
                {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
                <p className={`text-sm ml-auto ${draft.description.length >= 10 ? "text-green-500" : "text-gray-400"}`}>
                  {draft.description.length} / 10+ caractere
                </p>
              </div>
            </div>

            {/* Auto-specific fields */}
            {isAutoCategory && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-semibold mb-2">An fabricație</label>
                    <input
                      type="number"
                      value={draft.year || ""}
                      onChange={(e) => updateField("year", e.target.value ? Number(e.target.value) : "")}
                      placeholder="2020"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-white font-semibold mb-2">Km parcurși</label>
                    <input
                      type="number"
                      value={draft.mileage || ""}
                      onChange={(e) => updateField("mileage", e.target.value ? Number(e.target.value) : "")}
                      placeholder="50000"
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-semibold mb-2">Combustibil</label>
                    <select
                      value={draft.fuel || ""}
                      onChange={(e) => updateField("fuel", e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition"
                    >
                      <option value="">Selectează</option>
                      <option value="petrol">Benzină</option>
                      <option value="diesel">Diesel</option>
                      <option value="hybrid">Hibrid</option>
                      <option value="electric">Electric</option>
                      <option value="lpg">GPL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white font-semibold mb-2">Transmisie</label>
                    <select
                      value={draft.transmission || ""}
                      onChange={(e) => updateField("transmission", e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition"
                    >
                      <option value="">Selectează</option>
                      <option value="manual">Manuală</option>
                      <option value="automatic">Automată</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-semibold mb-2">Serie șasiu (VIN)</label>
                    <input
                      type="text"
                      value={draft.vin || ""}
                      onChange={(e) => updateField("vin", e.target.value)}
                      placeholder="Ex: WVWZZZ3CZ9E123456"
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-white font-semibold mb-2">Accidente</label>
                    <select
                      value={(draft as any).accidents || ""}
                      onChange={(e) => updateField("accidents", e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition"
                    >
                      <option value="">Selectează</option>
                      <option value="no">Fără accidente</option>
                      <option value="minor">Accident minor</option>
                      <option value="major">Accident major</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2">Rar / Folosit cu grijă</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="rareCar"
                      checked={(draft as any).rare || false}
                      onChange={(e) => updateField("rare", e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                    <label htmlFor="rareCar" className="text-white cursor-pointer">
                      ✓ Mașina a fost folosită rar/cu grijă
                    </label>
                  </div>
                </div>

                {/* Extended car details - matching auto1.com */}
                <div className="border-t border-gray-700 pt-6">
                  <h4 className="text-lg font-bold text-white mb-4">Detalii suplimentare</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white font-semibold mb-2">Putere (CP)</label>
                      <input
                        type="number"
                        value={(draft as any).horsepower || ""}
                        onChange={(e) => updateField("horsepower", e.target.value ? Number(e.target.value) : "")}
                        placeholder="120"
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-semibold mb-2">Cilindree (cm³)</label>
                      <input
                        type="number"
                        value={(draft as any).cylinderCapacity || ""}
                        onChange={(e) => updateField("cylinderCapacity", e.target.value ? Number(e.target.value) : "")}
                        placeholder="1500"
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-white font-semibold mb-2">Culoare</label>
                      <input
                        type="text"
                        value={(draft as any).color || ""}
                        onChange={(e) => updateField("color", e.target.value)}
                        placeholder="Ex: Gri"
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-semibold mb-2">Tip caroserie</label>
                      <select
                        value={(draft as any).bodyType || ""}
                        onChange={(e) => updateField("bodyType", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition"
                      >
                        <option value="">Selectează</option>
                        <option value="sedan">Sedan</option>
                        <option value="suv">SUV</option>
                        <option value="combi">Combi</option>
                        <option value="coupe">Coupe</option>
                        <option value="hatchback">Hatchback</option>
                        <option value="mpv">MPV</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-white font-semibold mb-2">Nr. locuri</label>
                      <input
                        type="number"
                        value={(draft as any).seatCount || ""}
                        onChange={(e) => updateField("seatCount", e.target.value ? Number(e.target.value) : "")}
                        placeholder="5"
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-semibold mb-2">Nr. uși</label>
                      <input
                        type="number"
                        value={(draft as any).doorCount || ""}
                        onChange={(e) => updateField("doorCount", e.target.value ? Number(e.target.value) : "")}
                        placeholder="4"
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-white font-semibold mb-2">Nr. proprietari anteriori</label>
                      <input
                        type="number"
                        value={(draft as any).owners || ""}
                        onChange={(e) => updateField("owners", e.target.value ? Number(e.target.value) : "")}
                        placeholder="2"
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-semibold mb-2">Nr. chei</label>
                      <input
                        type="number"
                        value={(draft as any).keys || ""}
                        onChange={(e) => updateField("keys", e.target.value ? Number(e.target.value) : "")}
                        placeholder="2"
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-white font-semibold mb-2">Data înmatriculării</label>
                      <input
                        type="date"
                        value={(draft as any).registrationDate || ""}
                        onChange={(e) => updateField("registrationDate", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-semibold mb-2">ITP (Inspecție Tehnică) expire la</label>
                      <input
                        type="date"
                        value={(draft as any).inspectionExpires || ""}
                        onChange={(e) => updateField("inspectionExpires", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-white font-semibold mb-2">Țara de origine</label>
                      <select
                        value={(draft as any).countryOfOrigin || ""}
                        onChange={(e) => updateField("countryOfOrigin", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition"
                      >
                        <option value="">Selectează</option>
                        <option value="DE">Germania</option>
                        <option value="FR">Franța</option>
                        <option value="IT">Italia</option>
                        <option value="AT">Austria</option>
                        <option value="PL">Polonia</option>
                        <option value="RO">România</option>
                        <option value="HU">Ungaria</option>
                        <option value="BE">Belgia</option>
                        <option value="NL">Olanda</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-white font-semibold mb-2">Clasa de mediu</label>
                      <select
                        value={(draft as any).environmentalClass || ""}
                        onChange={(e) => updateField("environmentalClass", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition"
                      >
                        <option value="">Selectează</option>
                        <option value="EURO1">EURO 1</option>
                        <option value="EURO2">EURO 2</option>
                        <option value="EURO3">EURO 3</option>
                        <option value="EURO4">EURO 4</option>
                        <option value="EURO5">EURO 5</option>
                        <option value="EURO6">EURO 6</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-white font-semibold mb-2">Emisii CO₂ (g/km)</label>
                      <input
                        type="number"
                        value={(draft as any).co2Emissions || ""}
                        onChange={(e) => updateField("co2Emissions", e.target.value ? Number(e.target.value) : "")}
                        placeholder="150"
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-semibold mb-2">Tapițerie</label>
                      <input
                        type="text"
                        value={(draft as any).upholstery || ""}
                        onChange={(e) => updateField("upholstery", e.target.value)}
                        placeholder="Ex: Piele"
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white outline-none transition"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-white font-semibold mb-2">COC (Certificate of Conformity)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="cocPapers"
                        checked={(draft as any).cocPapers || false}
                        onChange={(e) => updateField("cocPapers", e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                      <label htmlFor="cocPapers" className="text-white cursor-pointer">
                        ✓ Avem documentul COC
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Condition */}
            <div>
              <label className="block text-white font-semibold mb-2">Stare</label>
              <div className="flex gap-4">
                {["new", "used"].map(cond => (
                  <label key={cond} className="flex-1">
                    <input
                      type="radio"
                      name="condition"
                      value={cond}
                      checked={draft.condition === cond}
                      onChange={(e) => updateField("condition", e.target.value)}
                      className="hidden"
                    />
                    <div className={`px-4 py-3 rounded-xl border-2 text-center cursor-pointer transition ${
                      draft.condition === cond
                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-white"
                        : "border-gray-800 text-gray-400 hover:border-gray-700"
                    }`}>
                      {cond === "new" ? "Nou" : "Folosit"}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Additional photos */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Mai multe poze (opțional)
              </label>
              <div className="grid grid-cols-5 gap-4">
                {draft.photos.slice(0, 20).map((url, idx) => (
                  <div key={idx} className="relative group aspect-square">
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover rounded-xl"
                      onError={(e) => {
                        const el = e.currentTarget;
                        if (el.src !== LISTING_PHOTO_ONERROR_FALLBACK) {
                          el.onerror = null;
                          el.src = LISTING_PHOTO_ONERROR_FALLBACK;
                        }
                      }}
                    />
                    <button
                      onClick={() => removePhoto(idx)}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
                
                {draft.photos.length < 20 && (
                  <label className="aspect-square border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[var(--accent-primary)] transition">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                      className="hidden"
                    />
                    {uploadingImage ? (
                      <div className="text-gray-400">⏳</div>
                    ) : (
                      <>
                        <div className="text-2xl mb-1">+</div>
                        <span className="text-xs text-gray-400">Adaugă</span>
                      </>
                    )}
                  </label>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {draft.photos.length}/20 poze • Mai multe poze = mai multe vizualizări!
              </p>
            </div>

            {/* Navigation */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={prevStep}
                className="btn glass flex-1 py-3"
              >
                ← Înapoi
              </button>
              <button
                onClick={nextStep}
                className="btn btn-primary flex-1 py-3"
              >
                Continuă →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Contact & Publish */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            {/* Contact Info */}
            <div className="card p-8 space-y-6">
              <h3 className="text-xl font-bold text-white">Date de contact</h3>
              
              <div>
                <label className="block text-white font-semibold mb-2">
                  Telefon <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={draft.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="0712345678"
                  className={`w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 ${
                    errors.phone ? "border-red-500" : "border-gray-800"
                  } focus:border-[var(--accent-primary)] text-white outline-none transition`}
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="allowMessages"
                  checked={draft.allowMessages}
                  onChange={(e) => updateField("allowMessages", e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <label htmlFor="allowMessages" className="text-white cursor-pointer">
                  Permite mesaje prin platformă
                </label>
              </div>
            </div>

            {/* Preview */}
            <div className="card p-8">
              <h3 className="text-xl font-bold text-white mb-4">Preview anunț</h3>
              
              <div className="bg-[var(--bg-secondary)] rounded-xl p-6">
                {/* Image preview */}
                {draft.photos.length > 0 && (
                  <div className="mb-4 rounded-xl overflow-hidden">
                    <img 
                      src={listingPrimaryPhotoSrc(draft.photos)} 
                      alt={draft.title}
                      className="w-full h-64 object-cover"
                    />
                  </div>
                )}
                
                {/* Title & Price */}
                <h4 className="text-2xl font-bold text-white mb-2">{draft.title || "Titlu anunț"}</h4>
                <div className="text-3xl font-black text-[var(--accent-primary)] mb-4">
                  {draft.priceAmount ? `${draft.priceAmount} RON` : "0 RON"}
                </div>
                
                {/* Details */}
                <div className="space-y-2 text-gray-400">
                  <p>📍 {draft.city}, {draft.county}</p>
                  <p>📁 {draft.category}</p>
                  {isAutoCategory && draft.make && draft.model && (
                    <p>🚗 {draft.make} {draft.model}</p>
                  )}
                </div>
                
                {/* Description preview */}
                {draft.description && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <p className="text-gray-300 line-clamp-3">{draft.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Publish Button */}
            <div className="card p-8">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn btn-primary w-full text-xl py-4 disabled:opacity-50"
              >
                {loading ? "Se publică..." : "🚀 Publică anunțul GRATUIT"}
              </button>
              
              <p className="text-center text-gray-400 text-sm mt-4">
                ✓ Anunțul va fi verificat automat și publicat instant<br/>
                ✓ Complet gratuit, fără costuri ascunse
              </p>
              
              <div className="flex gap-4 mt-6">
                <button
                  onClick={prevStep}
                  className="btn glass flex-1 py-3"
                >
                  ← Modifică detalii
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
