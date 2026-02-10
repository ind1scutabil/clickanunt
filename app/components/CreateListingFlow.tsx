'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES } from '@/lib/carData';

interface CreateListingFlowProps {
  userId: string;
  userAccountType: 'private' | 'business';
  userSubscriptionTier: 'free' | 'business' | 'premium';
}

type Step = 'category' | 'details' | 'photos' | 'location' | 'preview';

interface ListingDraft {
  title: string;
  category: string;
  subcategory?: string;
  description?: string;
  priceAmount: number;
  condition?: string;
  // Auto-specific
  make?: string;
  model?: string;
  year?: number;
  mileage?: number;
  fuel?: string;
  transmission?: string;
  // Dealer fields (business accounts only)
  isDealer?: boolean;
  dealerBrands?: string[];
  dealerPriceMin?: number;
  dealerPriceMax?: number;
  // Location
  county?: string;
  city?: string;
  // Photos
  photos: string[];
}

export function CreateListingFlow({ userId, userAccountType, userSubscriptionTier }: CreateListingFlowProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('category');
  const [draft, setDraft] = useState<ListingDraft>({
    title: '',
    category: '',
    priceAmount: 0,
    photos: [],
  });
  const [loading, setLoading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [draftId, setDraftId] = useState<string | null>(null);

  // Steps configuration
  const steps: { id: Step; label: string; icon: string }[] = [
    { id: 'category', label: 'Categorie', icon: '📁' },
    { id: 'details', label: 'Detalii', icon: '📝' },
    { id: 'photos', label: 'Poze', icon: '📷' },
    { id: 'location', label: 'Locație', icon: '📍' },
    { id: 'preview', label: 'Previzualizare', icon: '👁️' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Auto-save functionality
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (draft.title || draft.category) {
        await autoSave();
      }
    }, 2000); // Autosave after 2 seconds of inactivity

    return () => clearTimeout(timer);
  }, [draft]);

  const autoSave = useCallback(async () => {
    try {
      setAutoSaveStatus('saving');
      const res = await fetch('/api/listings/draft', {
        method: draftId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draftId,
          ...draft,
          userId,
        }),
      });
      
      if (!res.ok) throw new Error('Failed to save');
      
      const data = await res.json();
      setDraftId(data.id);
      setAutoSaveStatus('saved');
      
      // Save to localStorage as backup
      localStorage.setItem('listing_draft', JSON.stringify(draft));
    } catch (error) {
      console.error('Autosave failed:', error);
      setAutoSaveStatus('error');
    }
  }, [draft, draftId, userId]);

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('listing_draft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setDraft(parsed);
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, []);

  const updateDraft = (updates: Partial<ListingDraft>) => {
    setDraft(prev => ({ ...prev, ...updates }));
  };

  const goToStep = (step: Step) => {
    setCurrentStep(step);
  };

  const nextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const submitListing = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          ownerUserId: userId,
          status: userSubscriptionTier === 'free' ? 'pending' : 'active',
        }),
      });

      if (!res.ok) throw new Error('Failed to create listing');

      const listing = await res.json();
      
      // Clear draft
      localStorage.removeItem('listing_draft');
      if (draftId) {
        await fetch(`/api/listings/draft/${draftId}`, { method: 'DELETE' });
      }

      router.push(`/listings/${listing.id}`);
    } catch (error: any) {
      alert('Eroare la publicarea anunțului: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header with Progress */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Pasul {currentStepIndex + 1} din {steps.length}
              </span>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {autoSaveStatus === 'saved' && (
                  <>
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Salvat automat</span>
                  </>
                )}
                {autoSaveStatus === 'saving' && (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <span>Se salvează...</span>
                  </>
                )}
                {autoSaveStatus === 'error' && (
                  <>
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>Eroare la salvare</span>
                  </>
                )}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Steps Navigation */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => goToStep(step.id)}
                disabled={index > currentStepIndex}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  step.id === currentStep
                    ? 'bg-blue-50 text-blue-600'
                    : index < currentStepIndex
                    ? 'text-green-600 hover:bg-green-50'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                <span className="text-2xl">{step.icon}</span>
                <span className="text-xs font-medium">{step.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {currentStep === 'category' && (
            <CategoryStep draft={draft} updateDraft={updateDraft} />
          )}
          
          {currentStep === 'details' && (
            <DetailsStep 
              draft={draft} 
              updateDraft={updateDraft}
              userAccountType={userAccountType}
            />
          )}
          
          {currentStep === 'photos' && (
            <PhotosStep draft={draft} updateDraft={updateDraft} />
          )}
          
          {currentStep === 'location' && (
            <LocationStep draft={draft} updateDraft={updateDraft} />
          )}
          
          {currentStep === 'preview' && (
            <PreviewStep draft={draft} />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Înapoi
          </button>

          {currentStep !== 'preview' ? (
            <button
              onClick={nextStep}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Continuă →
            </button>
          ) : (
            <button
              onClick={submitListing}
              disabled={loading}
              className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Se publică...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Publică Anunțul</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Step Components (simplified - expand as needed)
function CategoryStep({ draft, updateDraft }: any) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Selectează Categoria</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.keys(CATEGORIES).map(category => (
          <button
            key={category}
            onClick={() => updateDraft({ category })}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              draft.category === category
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="font-semibold">{category}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function DetailsStep({ draft, updateDraft, userAccountType }: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Detalii Anunț</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Titlu *</label>
        <input
          type="text"
          value={draft.title}
          onChange={(e) => updateDraft({ title: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Ex: Audi A4 2020, stare impecabilă"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Preț (RON) *</label>
        <input
          type="number"
          value={draft.priceAmount}
          onChange={(e) => updateDraft({ priceAmount: parseInt(e.target.value) })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="0"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descriere</label>
        <textarea
          value={draft.description || ''}
          onChange={(e) => updateDraft({ description: e.target.value })}
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Descrie anunțul tău..."
        />
      </div>

      {userAccountType === 'business' && draft.category === 'Auto' && (
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Opțiuni Dealer</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.isDealer || false}
              onChange={(e) => updateDraft({ isDealer: e.target.checked })}
              className="w-4 h-4"
            />
            <span>Sunt dealer auto (afișează informații business)</span>
          </label>
        </div>
      )}
    </div>
  );
}

function PhotosStep({ draft, updateDraft }: any) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Adaugă Poze</h2>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-gray-600">Trage și plasează poze aici sau click pentru a încărca</p>
        <input type="file" multiple accept="image/*" className="hidden" />
      </div>
    </div>
  );
}

function LocationStep({ draft, updateDraft }: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Locație</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Județ</label>
        <select
          value={draft.county || ''}
          onChange={(e) => updateDraft({ county: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Selectează județul</option>
          <option value="București">București</option>
          <option value="Cluj">Cluj</option>
          <option value="Timiș">Timiș</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Oraș</label>
        <input
          type="text"
          value={draft.city || ''}
          onChange={(e) => updateDraft({ city: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Ex: Cluj-Napoca"
        />
      </div>
    </div>
  );
}

function PreviewStep({ draft }: any) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Previzualizare Anunț</h2>
      <div className="border rounded-lg p-6 bg-gray-50">
        <h3 className="text-xl font-bold mb-2">{draft.title || 'Fără titlu'}</h3>
        <div className="text-3xl font-bold text-blue-600 mb-4">
          {draft.priceAmount.toLocaleString('ro-RO')} RON
        </div>
        <p className="text-gray-700 whitespace-pre-line mb-4">
          {draft.description || 'Fără descriere'}
        </p>
        <div className="text-sm text-gray-600">
          <div>Categorie: {draft.category}</div>
          <div>Locație: {draft.city}, {draft.county}</div>
        </div>
      </div>
    </div>
  );
}
