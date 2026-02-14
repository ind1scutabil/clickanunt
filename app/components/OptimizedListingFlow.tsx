"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ALL_CATEGORIES, CAR_MAKES_AND_MODELS, ROMANIAN_COUNTIES, CITIES_BY_COUNTY } from "@/lib/carData";
import { getCsrfToken } from "@/lib/security/csrf-client";

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
  condition: string;
  phone: string;
  allowMessages: boolean;
  lastSaved?: number;
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
  allowMessages: true
};

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
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Pas 0: "Ce vinzi?" quick input
  const [quickInput, setQuickInput] = useState("");

  // Load draft from localStorage or check for ?new parameter on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    
    // If ?new parameter exists, clear everything and start fresh
    if (params.has("new")) {
      console.log("✅ ?new parameter detected - clearing all data");
      localStorage.removeItem("listingDraft");
      setForceNewDraft(true);
      setDraft(INITIAL_DRAFT);
      setCurrentStep(0);
      setQuickInput("");
      return;
    }

    // Otherwise, try to load from localStorage
    const saved = localStorage.getItem("listingDraft");
    if (saved) {
      try {
        console.log("📂 Loading draft from localStorage");
        const parsed = JSON.parse(saved);
        setDraft(parsed);
        setCurrentStep(parsed.step || 0);
      } catch (e) {
        console.error("Failed to load draft", e);
      }
    } else {
      console.log("📝 No saved draft found, starting fresh");
      setDraft(INITIAL_DRAFT);
      setCurrentStep(0);
    }
  }, []);

  // Autosave draft every 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      const toSave = { ...draft, step: currentStep, lastSaved: Date.now() };
      localStorage.setItem("listingDraft", JSON.stringify(toSave));
    }, 3000);
    return () => clearTimeout(timer);
  }, [draft, currentStep]);

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
      if (!draft.category) newErrors.category = "Selectează categoria";
      if (!draft.priceAmount || draft.priceAmount <= 0) newErrors.priceAmount = "Prețul trebuie să fie mai mare de 0";
      if (!draft.county) newErrors.county = "Selectează județul";
      if (!draft.city) newErrors.city = "Selectează orașul";
      if (draft.photos.length === 0) newErrors.photos = "Adaugă minim o poză";
    }
    
    if (step === 2) {
      if (!draft.description.trim() || draft.description.length < 20) {
        newErrors.description = "Descrierea trebuie să aibă minim 20 de caractere";
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

          console.log(`📤 Trimit la API: ${safeFilename}`);
          const res = await fetch("/api/uploads", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "x-csrf-token": csrfToken,
            },
            body: JSON.stringify({ 
              filename: safeFilename, 
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
      
      const safeFilename = `video_${Date.now()}.${safeExt}`;

      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ 
          filename: safeFilename, 
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
    
    // ✅ OBȚINE USER ID - Cu fallback pentru development
    let userId: string = 'anonymous-' + Date.now();
    
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    
    console.log('🔍 Verificare autentificare:', { 
      hasUserData: !!userStr, 
      hasToken: !!token 
    });
    
    // Dacă utilizatorul e autentificat, folosește ID-ul lui
    if (userStr && token) {
      try {

        const csrfToken = await getCsrfToken();
        const user = JSON.parse(userStr);
        if (user.id) {
          userId = user.id;
          console.log('✅ Utilizator autentificat:', { userId, email: user.email });
        }
      } catch (e) {
        console.error('❌ Eroare la parsarea datelor utilizator:', e);
      }
    } else {
      console.warn('⚠️ Utilizator neautentificat - se folosește ID anonim pentru development');
    }
    
    setLoading(true);
    const startTime = Date.now();
    
    try {
      const payload: any = {
        ownerUserId: userId, // ✅ IMPORTANT: Include user ID
        title: draft.title,
        category: draft.category,
        priceAmount: Number(draft.priceAmount),
        priceCurrency: draft.priceCurrency,
        condition: draft.condition,
        description: draft.description,
        county: draft.county,
        city: draft.city,
        photos: draft.photos,
        video: draft.video || null,
        contactPhone: draft.phone,
        allowMessages: draft.allowMessages
      };

      // Add auto-specific fields
      if (isAutoCategory) {
        payload.make = draft.make || null;
        payload.model = draft.model || null;
        payload.year = draft.year ? Number(draft.year) : null;
        payload.mileage = draft.mileage ? Number(draft.mileage) : null;
        payload.fuel = draft.fuel || null;
        payload.transmission = draft.transmission || null;
      }
    
      const csrfToken = await getCsrfToken();

      console.log('📤 Trimis payload la API:', payload);

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

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
        photoCount: draft.photos.length,
        hasVideo: !!draft.video
      });

      // Clear draft - ALWAYS on success
      localStorage.removeItem("listingDraft");
      
      // Reset form state completely
      setDraft(INITIAL_DRAFT);
      setCurrentStep(0);
      setErrors({});
      setTouched({});
      setForceNewDraft(false);
      
      // Redirect to listing
      router.push(`/listings/${data.listing?.id || data.id}`);
      
    } catch (error: any) {
      console.error('❌ EROARE FINALĂ:', error);
      const errorMessage = error?.message || "Eroare la publicare. Te rugăm să încerci din nou.";
      
      // Clear draft even on error - user can try again fresh
      localStorage.removeItem("listingDraft");
      setErrors({ general: errorMessage });
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Reset draft completely
  const handleReset = () => {
    if (confirm("Ești sigur că vrei să resetezi formularul? Toate datele vor fi șterse.")) {
      localStorage.removeItem("listingDraft");
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
    <div className="min-h-screen py-8 px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header with Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white">
              {currentStep === 0 && "Ce vinzi astăzi?"}
              {currentStep === 1 && "Informații esențiale"}
              {currentStep === 2 && "Detalii despre anunț"}
              {currentStep === 3 && "Contact & publicare"}
            </h1>
            <div className="flex items-center gap-4">
              {draft.lastSaved && (
                <span className="text-sm text-gray-400">
                  ✓ Salvat automat
                </span>
              )}
              {currentStep > 0 && (
                <button
                  onClick={handleReset}
                  className="text-sm px-3 py-2 rounded-lg bg-red-900/20 text-red-400 hover:bg-red-900/40 transition"
                  title="Resetează formularul"
                >
                  🔄 Reset
                </button>
              )}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="absolute h-full bg-gradient-to-r from-[var(--accent-primary)] to-[#FFB84D] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span className={currentStep >= 0 ? "text-[var(--accent-primary)]" : ""}>Început</span>
            <span className={currentStep >= 1 ? "text-[var(--accent-primary)]" : ""}>Esențial</span>
            <span className={currentStep >= 2 ? "text-[var(--accent-primary)]" : ""}>Detalii</span>
            <span className={currentStep >= 3 ? "text-[var(--accent-primary)]" : ""}>Finalizare</span>
          </div>
        </div>

        {/* Step 0: Quick Input */}
        {currentStep === 0 && (
          <div className="card p-8 animate-fadeIn">
            <div className="max-w-2xl mx-auto text-center">
              <div className="text-6xl mb-6">🎯</div>
              <h2 className="text-2xl font-bold text-white mb-4">Spune-ne rapid ce vinzi</h2>
              <p className="text-gray-400 mb-8">Ex: "iPhone 14 Pro", "BMW Seria 3", "Apartament 2 camere"</p>
              
              <div className="relative">
                <input
                  type="text"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleQuickSubmit()}
                  placeholder="Scrie aici ce vinzi..."
                  className="w-full px-6 py-4 text-lg rounded-xl bg-[var(--bg-secondary)] border-2 border-gray-800 focus:border-[var(--accent-primary)] text-white placeholder-gray-500 outline-none transition"
                  autoFocus
                />
                <button
                  onClick={handleQuickSubmit}
                  disabled={!quickInput.trim()}
                  className="mt-4 btn btn-primary w-full text-lg py-4"
                >
                  Continuă →
                </button>
              </div>
              
              <button
                onClick={() => setCurrentStep(1)}
                className="mt-6 text-gray-400 hover:text-white transition text-sm"
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
                    <img src={url} alt="" className="w-full h-full object-cover rounded-xl" />
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
                placeholder="Descrie produsul tău în detaliu... (minim 20 de caractere)"
                rows={6}
                className={`w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-2 ${
                  errors.description ? "border-red-500" : "border-gray-800"
                } focus:border-[var(--accent-primary)] text-white outline-none transition resize-none`}
              />
              <div className="flex justify-between mt-2">
                {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
                <p className={`text-sm ml-auto ${draft.description.length >= 20 ? "text-green-500" : "text-gray-400"}`}>
                  {draft.description.length} / 20 caractere
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
                      <option value="Benzină">Benzină</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Hibrid">Hibrid</option>
                      <option value="Electric">Electric</option>
                      <option value="GPL">GPL</option>
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
                      <option value="Manuală">Manuală</option>
                      <option value="Automată">Automată</option>
                    </select>
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
                    <img src={url} alt="" className="w-full h-full object-cover rounded-xl" />
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
                      src={draft.photos[0]} 
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
