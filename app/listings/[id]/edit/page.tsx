'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { memoryStorage } from '@/lib/memory-storage';
import { getCsrfToken } from '@/lib/security/csrf-client';
import { CarSelectorPro } from '@/app/components/CarSelectorPro';
import { ALL_CATEGORIES, CATEGORIES, ROMANIAN_COUNTIES, CITIES_BY_COUNTY } from '@/lib/carData';
import { listingPrimaryPhotoSrc, LISTING_PHOTO_ONERROR_FALLBACK } from '@/lib/listing-photo-url';
import { normalizeCountryOfOriginValue } from '@/lib/listing-country-options';
import CountryOfOriginSelect from '@/app/components/listing/CountryOfOriginSelect';

const AUTO_CATEGORY = 'Auto, moto și ambarcațiuni';

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(result.slice(comma + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const normalizeCondition = (value?: string) => {
  if (!value) return '';
  const map: Record<string, string> = {
    Nou: 'new',
    Folosit: 'used',
    'Recondiționat': 'refurbished',
    'Pentru piese': 'for_parts',
  };
  return map[value] || value;
};

const normalizeFuel = (value?: string) => {
  if (!value) return '';
  const map: Record<string, string> = {
    Benzina: 'petrol',
    'Benzină': 'petrol',
    Diesel: 'diesel',
    Motorina: 'diesel',
    'Motorină': 'diesel',
    Electric: 'electric',
    Hybrid: 'hybrid',
    Hibrid: 'hybrid',
    LPG: 'lpg',
    GPL: 'lpg',
    CNG: 'gas',
    Gaz: 'gas',
  };
  return map[value] || value;
};

const normalizeTransmission = (value?: string) => {
  if (!value) return '';
  const map: Record<string, string> = {
    Manual: 'manual',
    'Manuală': 'manual',
    Automata: 'automatic',
    'Automată': 'automatic',
    Semiautomata: 'automatic',
    'Semiautomată': 'automatic',
    CVT: 'automatic',
  };
  return map[value] || value;
};

/** Matches listing Zod: `max(new Date().getFullYear() + 1)` */
const MAX_LISTING_YEAR = new Date().getFullYear() + 1;

function parseOptionalIntInput(raw: string): number | null {
  const t = raw.trim();
  if (t === '' || t === '-' || t === '+') return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalFloatInput(raw: string): number | null {
  const t = raw.trim();
  if (t === '' || t === '-' || t === '+' || t === '.' || t === '-.') return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function finiteNumberInputValue(n: number | null | undefined): string {
  return n != null && Number.isFinite(n) ? String(n) : '';
}

/** For `attributes` numeric fields stored as string in form state */
function numericAttrDisplay(v: unknown): string {
  if (v === '' || v == null) return '';
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  return Number.isFinite(n) ? String(n) : '';
}

function sanitizeLoadedNumericAttributes(attrs: Record<string, unknown> | null | undefined) {
  const o = { ...(attrs || {}) };
  for (const k of ['horsePower', 'engineCapacity', 'owners'] as const) {
    const disp = numericAttrDisplay(o[k]);
    if (disp === '') delete o[k];
    else o[k] = disp;
  }
  return o;
}

function sanitizeLoadedListingAttributes(attrs: Record<string, unknown> | null | undefined) {
  const o = sanitizeLoadedNumericAttributes(attrs);
  for (const key of ['countryOfOrigin', 'lastRegistrationCountry'] as const) {
    const raw = o[key];
    if (raw != null && String(raw).trim()) {
      o[key] = normalizeCountryOfOriginValue(String(raw));
    }
  }
  return o;
}

function parseLoadedYear(y: unknown): number | null {
  if (y === '' || y == null) return null;
  const n = typeof y === 'number' ? y : Number(y);
  if (!Number.isFinite(n)) return null;
  const t = Math.trunc(n);
  return t > 0 ? t : null;
}

function parseLoadedMileage(m: unknown): number | null {
  if (m === '' || m == null) return null;
  const n = typeof m === 'number' ? m : Number(m);
  if (!Number.isFinite(n)) return null;
  const t = Math.trunc(n);
  return t >= 0 ? t : null;
}

function parseLoadedPrice(p: unknown): number | null {
  if (p === '' || p == null) return null;
  const n = typeof p === 'number' ? p : Number(p);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export default function EditListingPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listing, setListing] = useState<any>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    subcategory: '',
    priceAmount: null as number | null,
    priceCurrency: 'RON',
    condition: '',
    description: '',
    county: '',
    city: '',
    contactPhone: '',
    make: '',
    model: '',
    year: null as number | null,
    mileage: null as number | null,
    fuel: '',
    transmission: '',
    vin: '',
    attributes: {} as any
  });

  const canRepublish = ['paused', 'hidden', 'rejected', 'pending'].includes(String(listing?.status || '').toLowerCase());

  const isAutoCategory = formData.category === AUTO_CATEGORY;

  const cityList = useMemo(() => {
    if (!formData.county) return [];
    return CITIES_BY_COUNTY[formData.county as keyof typeof CITIES_BY_COUNTY] || [];
  }, [formData.county]);

  const subcategoryChoices = formData.category
    ? (CATEGORIES as Record<string, string[]>)[formData.category]
    : null;

  const categorySelectOptions = useMemo(() => {
    const base = [...ALL_CATEGORIES];
    if (formData.category && !base.includes(formData.category)) {
      return [formData.category, ...base];
    }
    return base;
  }, [formData.category]);

  const countySelectOptions = useMemo(() => {
    const list = [...ROMANIAN_COUNTIES];
    if (formData.county && !list.includes(formData.county)) {
      return [formData.county, ...list];
    }
    return list;
  }, [formData.county]);

  const handleImageUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remainingSlots = 20 - photos.length;
    if (remainingSlots <= 0) {
      setPhotoError('Ai atins limita de 20 poze');
      return;
    }
    setUploadingImage(true);
    setPhotoError('');
    const newPhotos: string[] = [];
    const uploadErrors: string[] = [];
    try {
      const csrfToken = await getCsrfToken();
      if (!csrfToken) {
        setPhotoError('Token CSRF lipsă. Reîncarcă pagina.');
        setUploadingImage(false);
        return;
      }
      const filesToUpload = Math.min(files.length, remainingSlots);
      for (let i = 0; i < filesToUpload; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          uploadErrors.push(`${file.name}: nu este imagine`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          uploadErrors.push(`${file.name}: prea mare (max 10MB)`);
          continue;
        }
        try {
          const b64 = await fileToBase64(file);
          if (!b64) {
            uploadErrors.push(`${file.name}: eroare conversie`);
            continue;
          }
          const res = await fetch('/api/uploads', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': csrfToken,
            },
            credentials: 'include',
            body: JSON.stringify({ data: b64, type: 'image' }),
          });
          const data = await res.json();
          if (res.ok && data.url) newPhotos.push(data.url);
          else uploadErrors.push(`${file.name}: ${data.error || 'Eroare upload'}`);
        } catch (e: unknown) {
          uploadErrors.push(`${file.name}: ${e instanceof Error ? e.message : 'Eroare'}`);
        }
      }
      if (newPhotos.length > 0) {
        setPhotos((prev) => [...prev, ...newPhotos]);
      }
      if (uploadErrors.length > 0) {
        setPhotoError(uploadErrors.slice(0, 3).join('; '));
      }
    } catch (e: unknown) {
      setPhotoError(e instanceof Error ? e.message : 'Eroare la încărcarea pozelor');
    } finally {
      setUploadingImage(false);
    }
  }, [photos.length]);

  const removePhotoAt = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const loadListing = async () => {
      try {
        const useInMemory = process.env.NEXT_PUBLIC_USE_IN_MEMORY_DB === 'true';
        
        if (useInMemory) {
          const data = memoryStorage.get(id);
          if (data) {
            setListing(data);
            setFormData({
              title: data.title || '',
              category: data.category || '',
              subcategory: data.subcategory || '',
              priceAmount: parseLoadedPrice(data.priceAmount),
              priceCurrency: data.priceCurrency || 'RON',
              condition: normalizeCondition(data.condition || ''),
              description: data.description || '',
              county: data.county || '',
              city: data.city || '',
              contactPhone: data.contactPhone || '',
              make: data.make || '',
              model: data.model || '',
              year: parseLoadedYear(data.year),
              mileage: parseLoadedMileage(data.mileage),
              fuel: normalizeFuel(data.fuel || ''),
              transmission: normalizeTransmission(data.transmission || ''),
              vin: data.vin || '',
              attributes: sanitizeLoadedListingAttributes(data.attributes || {})
            });
            setPhotos(Array.isArray(data.photos) ? [...data.photos] : []);
          }
        } else {
          // Production: fetch from API
          const token = localStorage.getItem('accessToken');
          const response = await fetch(`/api/listings/${id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            console.error('Failed to load listing:', response.status);
            setListing(null);
            setLoading(false);
            return;
          }

          const data = await response.json();
          setListing(data);
          setFormData({
            title: data.title || '',
            category: data.category || '',
            subcategory: data.subcategory || '',
            priceAmount: parseLoadedPrice(data.priceAmount),
            priceCurrency: data.priceCurrency || 'RON',
            condition: normalizeCondition(data.condition || ''),
            description: data.description || '',
            county: data.county || '',
            city: data.city || '',
            contactPhone: data.contactPhone || '',
            make: data.make || '',
            model: data.model || '',
            year: parseLoadedYear(data.year),
            mileage: parseLoadedMileage(data.mileage),
            fuel: normalizeFuel(data.fuel || ''),
            transmission: normalizeTransmission(data.transmission || ''),
            vin: data.vin || '',
            attributes: sanitizeLoadedListingAttributes(data.attributes || {})
          });
          setPhotos(Array.isArray(data.photos) ? [...data.photos] : []);
        }
      } catch (error) {
        console.error('Error loading listing:', error);
        setListing(null);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      loadListing();
    }
  }, [id]);

  const handleSave = async (requestRepublish = false) => {
    setSaving(true);
    try {
      if (!formData.title.trim() || formData.title.trim().length < 5) {
        setNotification({ message: 'Titlul trebuie să aibă minim 5 caractere.', type: 'error' });
        setSaving(false);
        return;
      }

      if (!formData.category.trim()) {
        setNotification({ message: 'Categoria este obligatorie pentru salvare.', type: 'error' });
        setSaving(false);
        return;
      }

      if (photos.length < 1) {
        setNotification({ message: 'Anunțul trebuie să aibă minim o imagine. Adaugă sau păstrează cel puțin o poză.', type: 'error' });
        setSaving(false);
        return;
      }

      if (formData.priceAmount == null || !Number.isFinite(formData.priceAmount) || formData.priceAmount < 0) {
        setNotification({ message: 'Introdu un preț valid (număr ≥ 0).', type: 'error' });
        setSaving(false);
        return;
      }

      if (isAutoCategory && formData.year != null && Number.isFinite(formData.year)) {
        if (formData.year < 1900 || formData.year > MAX_LISTING_YEAR) {
          setNotification({
            message: `Anul fabricației trebuie să fie între 1900 și ${MAX_LISTING_YEAR}.`,
            type: 'error',
          });
          setSaving(false);
          return;
        }
      }

      const condRaw = String(formData.condition || '').trim();
      const condition =
        condRaw && ['new', 'used', 'refurbished', 'for_parts'].includes(condRaw) ? condRaw : null;

      const attrs = { ...formData.attributes };
      for (const key of ['countryOfOrigin', 'lastRegistrationCountry'] as const) {
        const raw = attrs[key];
        if (raw != null && String(raw).trim()) {
          attrs[key] = normalizeCountryOfOriginValue(String(raw));
        }
      }

      const payload: Record<string, unknown> = {
        ...formData,
        title: formData.title.trim(),
        category: formData.category.trim(),
        subcategory: formData.subcategory.trim() || null,
        description: formData.description.trim() || null,
        county: formData.county.trim() || null,
        city: formData.city.trim() || null,
        contactPhone: formData.contactPhone.trim() || null,
        condition,
        priceAmount: formData.priceAmount,
        priceCurrency: formData.priceCurrency,
        photos,
        attributes: attrs,
      };

      if (isAutoCategory) {
        payload.make = formData.make.trim() || null;
        payload.model = formData.model.trim() || null;
        payload.vin = formData.vin.trim() || null;
        payload.year =
          formData.year != null &&
          Number.isFinite(formData.year) &&
          formData.year >= 1900 &&
          formData.year <= MAX_LISTING_YEAR
            ? formData.year
            : null;
        payload.mileage =
          formData.mileage != null && Number.isFinite(formData.mileage) && formData.mileage >= 0
            ? formData.mileage
            : null;
        payload.fuel = ['petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'gas'].includes(String(formData.fuel))
          ? formData.fuel
          : null;
        payload.transmission = ['manual', 'automatic'].includes(String(formData.transmission))
          ? formData.transmission
          : null;
      } else {
        payload.make = null;
        payload.model = null;
        payload.vin = null;
        payload.year = null;
        payload.mileage = null;
        payload.fuel = null;
        payload.transmission = null;
      }
      if (requestRepublish) payload.status = 'pending';

      const useInMemory = process.env.NEXT_PUBLIC_USE_IN_MEMORY_DB === 'true';

      if (useInMemory) {
        const prev = memoryStorage.get(id) || {};
        memoryStorage.set(id, {
          ...prev,
          ...payload,
          id,
          updatedAt: new Date().toISOString(),
        });
        setNotification({ message: 'Anunț salvat cu succes!', type: 'success' });
      } else {
        const token = localStorage.getItem('accessToken');
        const csrfToken = await getCsrfToken();
        const response = await fetch(`/api/listings/${id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken,
          },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.error || 'Eroare la salvare');
        }

        setNotification({
          message: requestRepublish
            ? 'Anunțul a fost trimis la moderare.'
            : canRepublish
            ? 'Modificările au fost salvate. Acum apasă "Salvează și trimite la reverificare".'
            : 'Anunț salvat cu succes!',
          type: 'success'
        });
      }

      // For suspended/rejected listings, keep user on page after plain save
      // so they can explicitly send the listing back to moderation.
      if (!canRepublish || requestRepublish) {
        setTimeout(() => {
          router.push(`/listings/${id}`);
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving listing:', error);
      setNotification({ message: error instanceof Error ? error.message : 'Eroare la salvare', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/listings/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-400">Se încarcă...</div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-400">Anunț nu găsit</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Editează Anunț</h1>
            <p className="text-gray-400">Actualizează detaliile anunțului tău</p>
          </div>

          {notification && (
            <div className={`mb-6 p-4 rounded-lg text-white ${notification.type === 'success' ? 'bg-green-900/50 border border-green-700' : 'bg-red-900/50 border border-red-700'}`}>
              {notification.message}
            </div>
          )}

          {canRepublish && (
            <div className="mb-6 p-4 rounded-lg border border-amber-500/40 bg-amber-900/20">
              <p className="text-amber-200 font-semibold mb-1">Anunț suspendat sau respins de moderare</p>
              <p className="text-amber-100/90 text-sm">
                După ce faci modificările necesare, folosește butonul „Salvează și trimite la reverificare”.
              </p>
              {listing?.moderationNotes ? (
                <p className="mt-2 text-sm text-amber-100"><span className="font-semibold">Motiv:</span> {listing.moderationNotes}</p>
              ) : null}
            </div>
          )}

          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#4E3CFF]/5 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 rounded-2xl border-2 border-gradient-to-br from-[#4E3CFF]/10 to-transparent pointer-events-none" />

            {/* Detalii Anunț */}
            <div className="relative z-10 space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6">Informații Generale</h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Titlu
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="ex: BMW 320d, anul 2015"
                    />
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Categorie
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        const cat = e.target.value;
                        const subs = cat ? (CATEGORIES as Record<string, string[]>)[cat] : undefined;
                        setFormData((prev) => ({
                          ...prev,
                          category: cat,
                          subcategory:
                            subs && subs.length > 0 && prev.subcategory && subs.includes(prev.subcategory)
                              ? prev.subcategory
                              : '',
                        }));
                      }}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează categorie</option>
                      {categorySelectOptions.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Subcategorie
                    </label>
                    {subcategoryChoices && subcategoryChoices.length > 0 ? (
                      <select
                        value={formData.subcategory}
                        onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                        className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                      >
                        <option value="">Selectează subcategoria</option>
                        {subcategoryChoices.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                        {formData.subcategory && !subcategoryChoices.includes(formData.subcategory) ? (
                          <option value={formData.subcategory}>{formData.subcategory} (curent)</option>
                        ) : null}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={formData.subcategory}
                        onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                        className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                        placeholder="ex: Laptopuri, Apartamente de vânzare"
                      />
                    )}
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Stare
                    </label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează stare</option>
                      <option value="new">Nou</option>
                      <option value="used">Folosit</option>
                      <option value="refurbished">Recondiționat</option>
                      <option value="for_parts">Pentru piese</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Prețul */}
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6">Preț</h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Preț
                    </label>
                    <input
                      type="number"
                      value={finiteNumberInputValue(formData.priceAmount)}
                      onChange={(e) =>
                        setFormData({ ...formData, priceAmount: parseOptionalFloatInput(e.target.value) })
                      }
                      min={0}
                      step="0.01"
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="0"
                    />
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Monedă
                    </label>
                    <select
                      value={formData.priceCurrency}
                      onChange={(e) => setFormData({ ...formData, priceCurrency: e.target.value })}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="RON">RON</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Poze */}
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6">Imagini</h2>
                <p className="text-sm text-gray-400 mb-4">
                  Minim 1, maxim 20. Ștergerea unei poze din listă o scoate din anunț la salvare; fișierele de pe server nu se șterg automat.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  {photos.map((url, idx) => (
                    <div key={`${url}-${idx}`} className="relative group aspect-square">
                      <img
                        src={listingPrimaryPhotoSrc([url])}
                        alt=""
                        className="w-full h-full object-cover rounded-xl border border-gray-700/50"
                        onError={(e) => {
                          const el = e.currentTarget;
                          if (el.src !== LISTING_PHOTO_ONERROR_FALLBACK) {
                            el.onerror = null;
                            el.src = LISTING_PHOTO_ONERROR_FALLBACK;
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removePhotoAt(idx)}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-bold"
                        aria-label="Șterge poza"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {photos.length < 20 && (
                    <label className="aspect-square border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#4E3CFF]/60 transition">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                        className="hidden"
                      />
                      {uploadingImage ? (
                        <div className="text-gray-400">Se încarcă…</div>
                      ) : (
                        <>
                          <div className="text-3xl mb-2">📷</div>
                          <span className="text-xs text-gray-400">Adaugă</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
                {photoError ? <p className="text-red-400 text-sm">{photoError}</p> : null}
                {photos.length > 0 ? (
                  <p className="text-green-400 text-sm">
                    {photos.length}/20 {photos.length === 1 ? 'poză' : 'poze'}
                  </p>
                ) : null}
              </div>

              {/* Mașină — doar categorie auto */}
              {isAutoCategory && (
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6">Detalii Mașină</h2>
                
                {/* Professional Car Selector - ENTERPRISE GRADE */}
                <div className="mb-6">
                  <CarSelectorPro
                    selectedMake={formData.make}
                    selectedModel={formData.model}
                    onSelectMake={(make) => setFormData(prev => ({ ...prev, make, model: '' }))}
                    onSelectModel={(model) => setFormData(prev => ({ ...prev, model }))}
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      An fabricație
                    </label>
                    <input
                      type="number"
                      min={1900}
                      max={MAX_LISTING_YEAR}
                      value={finiteNumberInputValue(formData.year)}
                      onChange={(e) =>
                        setFormData({ ...formData, year: parseOptionalIntInput(e.target.value) })
                      }
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="2020"
                    />
                  </div>
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Kilometraj
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={finiteNumberInputValue(formData.mileage)}
                      onChange={(e) =>
                        setFormData({ ...formData, mileage: parseOptionalIntInput(e.target.value) })
                      }
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="50000 km"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Combustibil
                    </label>
                    <select
                      value={formData.fuel}
                      onChange={(e) => setFormData({ ...formData, fuel: e.target.value })}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează...</option>
                      <option value="petrol">⛽ Benzină</option>
                      <option value="diesel">🛢️ Diesel</option>
                      <option value="electric">⚡ Electric</option>
                      <option value="hybrid">🔋 Hibrid</option>
                      <option value="lpg">💨 GPL</option>
                      <option value="gas">💨 CNG/Gaz</option>
                    </select>
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Transmisie
                    </label>
                    <select
                      value={formData.transmission}
                      onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează...</option>
                      <option value="manual">🎛️ Manuală</option>
                      <option value="automatic">⚙️ Automată</option>
                    </select>
                  </div>
                </div>

                {/* Comprehensive Technical Details - Auto1 Style */}
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🚙 Caroserie
                    </label>
                    <select
                      value={formData.attributes?.bodyType || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, bodyType: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează...</option>
                      <option value="Sedan">Sedan</option>
                      <option value="Hatchback">Hatchback</option>
                      <option value="SUV">SUV</option>
                      <option value="Coupe">Coupe</option>
                      <option value="Cabrio">Cabrio/Convertibil</option>
                      <option value="Break">Break/Combi</option>
                      <option value="Monovolum">Monovolum/MPV</option>
                      <option value="Pick-up">Pick-up</option>
                      <option value="Van">Van/Utilitară</option>
                    </select>
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      📆 Prima înmatriculare
                    </label>
                    <input
                      type="text"
                      value={formData.attributes?.firstRegistration || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, firstRegistration: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="ex: 02/2020"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🔖 VIN (Cod șasiu)
                    </label>
                    <input
                      type="text"
                      value={formData.vin || ''}
                      onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600 font-mono"
                      placeholder="17 caractere"
                      maxLength={17}
                    />
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🐎 Putere (CP)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={numericAttrDisplay(formData.attributes?.horsePower)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw.trim() === '') {
                          setFormData({
                            ...formData,
                            attributes: { ...formData.attributes, horsePower: '' },
                          });
                          return;
                        }
                        const n = parseInt(raw, 10);
                        setFormData({
                          ...formData,
                          attributes: {
                            ...formData.attributes,
                            horsePower: Number.isFinite(n) ? String(n) : '',
                          },
                        });
                      }}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="130"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🔧 Capacitate cilindrică (cm³)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={numericAttrDisplay(formData.attributes?.engineCapacity)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw.trim() === '') {
                          setFormData({
                            ...formData,
                            attributes: { ...formData.attributes, engineCapacity: '' },
                          });
                          return;
                        }
                        const n = parseInt(raw, 10);
                        setFormData({
                          ...formData,
                          attributes: {
                            ...formData.attributes,
                            engineCapacity: Number.isFinite(n) ? String(n) : '',
                          },
                        });
                      }}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="1995"
                    />
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🔄 Tracțiune
                    </label>
                    <select
                      value={formData.attributes?.drivetrain || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, drivetrain: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează...</option>
                      <option value="Față">Față (FWD)</option>
                      <option value="Spate">Spate (RWD)</option>
                      <option value="Integrală">Integrală (4WD/AWD)</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🎨 Culoare exterioară
                    </label>
                    <input
                      type="text"
                      value={formData.attributes?.color || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, color: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="ex: Albastru metalic"
                    />
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🪑 Tapițerie
                    </label>
                    <select
                      value={formData.attributes?.upholstery || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, upholstery: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează...</option>
                      <option value="Textil">Textil</option>
                      <option value="Piele">Piele</option>
                      <option value="Piele parțială">Piele parțială</option>
                      <option value="Alcantara">Alcantara</option>
                      <option value="Velur">Velur</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🚪 Număr uși
                    </label>
                    <select
                      value={formData.attributes?.doors || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, doors: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează...</option>
                      <option value="2">2 uși</option>
                      <option value="3">3 uși</option>
                      <option value="4">4 uși</option>
                      <option value="5">5 uși</option>
                    </select>
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      💺 Număr locuri
                    </label>
                    <select
                      value={formData.attributes?.seats || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, seats: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează...</option>
                      <option value="2">2 locuri</option>
                      <option value="4">4 locuri</option>
                      <option value="5">5 locuri</option>
                      <option value="7">7 locuri</option>
                      <option value="9">9 locuri</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      👥 Număr proprietari anteriori
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={numericAttrDisplay(formData.attributes?.owners)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw.trim() === '') {
                          setFormData({
                            ...formData,
                            attributes: { ...formData.attributes, owners: '' },
                          });
                          return;
                        }
                        const n = parseInt(raw, 10);
                        setFormData({
                          ...formData,
                          attributes: {
                            ...formData.attributes,
                            owners: Number.isFinite(n) ? String(n) : '',
                          },
                        });
                      }}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="ex: 2"
                    />
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🔑 Număr chei disponibile
                    </label>
                    <select
                      value={formData.attributes?.keys || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, keys: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează...</option>
                      <option value="1">1 cheie</option>
                      <option value="2">2 chei</option>
                      <option value="3">3+ chei</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      ⚠️ Daune/Accidente anterioare
                    </label>
                    <select
                      value={formData.attributes?.priorDamage || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, priorDamage: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează...</option>
                      <option value="Nu">Nu</option>
                      <option value="Da">Da</option>
                      <option value="Reparat">Da, reparat complet</option>
                    </select>
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      📋 Istoric service
                    </label>
                    <select
                      value={formData.attributes?.serviceHistory || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, serviceHistory: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează...</option>
                      <option value="Complet">Complet (Carnet service)</option>
                      <option value="Parțial">Parțial</option>
                      <option value="Fără">Fără istoric</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🌍 Țara de proveniență
                    </label>
                    <CountryOfOriginSelect
                      value={String(formData.attributes?.countryOfOrigin || '')}
                      onChange={(v) =>
                        setFormData({
                          ...formData,
                          attributes: { ...formData.attributes, countryOfOrigin: v },
                        })
                      }
                      className="w-full max-h-48 px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    />
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🌍 Ultima țară de înmatriculare
                    </label>
                    <CountryOfOriginSelect
                      value={String(formData.attributes?.lastRegistrationCountry || '')}
                      onChange={(v) =>
                        setFormData({
                          ...formData,
                          attributes: { ...formData.attributes, lastRegistrationCountry: v },
                        })
                      }
                      className="w-full max-h-48 px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                      emptyLabel="La fel / necunoscut"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🌱 Normă poluare
                    </label>
                    <select
                      value={formData.attributes?.environmentalClass || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, environmentalClass: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează...</option>
                      <option value="EURO 6d">EURO 6d</option>
                      <option value="EURO 6">EURO 6</option>
                      <option value="EURO 5">EURO 5</option>
                      <option value="EURO 4">EURO 4</option>
                      <option value="EURO 3">EURO 3</option>
                    </select>
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      ✅ ITP valabil până
                    </label>
                    <input
                      type="text"
                      value={formData.attributes?.inspectionValid || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, inspectionValid: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="ex: 12/2026"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🛡️ Garanție
                    </label>
                    <input
                      type="text"
                      value={formData.attributes?.warranty || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, warranty: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="ex: 12 luni, Garanție producător"
                    />
                  </div>
                </div>
              </div>
              )}

              {/* Locație */}
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6">Locație</h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Județ
                    </label>
                    <select
                      value={formData.county}
                      onChange={(e) => setFormData({ ...formData, county: e.target.value, city: '' })}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează județ...</option>
                      {countySelectOptions.map((county) => (
                        <option key={county} value={county}>
                          {county}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Oraș
                    </label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      disabled={!formData.county}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Selectează oraș...</option>
                      {cityList.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                      {formData.city && !cityList.includes(formData.city) ? (
                        <option value={formData.city}>{formData.city} (curent)</option>
                      ) : null}
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6">Contact</h2>
                
                <div className="relative group">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                    placeholder="+40..."
                  />
                </div>
              </div>

              {/* Descriere */}
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6">Descriere</h2>
                
                <div className="relative group">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Descriere Detaliată
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                    placeholder="Descrie starea, istoricul, caracteristicile..."
                    rows={4}
                  />
                </div>
              </div>

              {/* Butoane */}
              <div className="flex gap-4 justify-end pt-6">
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors"
                >
                  Anulează
                </button>
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="px-6 py-3 bg-[#4E3CFF] text-white rounded-xl hover:bg-[#3E2CDF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Se salvează...' : 'Salvează'}
                </button>
                {canRepublish && (
                  <button
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="px-6 py-3 bg-amber-500 text-black rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {saving ? 'Se trimite...' : 'Salvează și trimite la moderare'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
