'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { COMPLETE_CAR_DATABASE, getModelsByMake, getAllBrandNames } from '@/lib/carDatabasePro';
import { getCarLogoSVG } from '@/app/components/CarLogos';

interface CarSelectorProProps {
  selectedMake?: string;
  selectedModel?: string;
  onSelectMake: (make: string) => void;
  onSelectModel: (model: string) => void;
}

export function CarSelectorPro({
  selectedMake,
  selectedModel,
  onSelectMake,
  onSelectModel,
}: CarSelectorProProps) {
  const [isOpenMake, setIsOpenMake] = useState(false);
  const [isOpenModel, setIsOpenModel] = useState(false);
  const [searchMake, setSearchMake] = useState('');
  const [searchModel, setSearchModel] = useState('');

  const refMakeDropdown = useRef<HTMLDivElement>(null);
  const refModelDropdown = useRef<HTMLDivElement>(null);

  // Handle brand selection with proper state updates
  const handleSelectMake = useCallback(
    (brandName: string) => {
      onSelectMake(brandName);
      onSelectModel('');
      setIsOpenMake(false);
      setSearchMake('');
    },
    [onSelectMake, onSelectModel]
  );

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      if (
        refMakeDropdown.current &&
        !refMakeDropdown.current.contains(target)
      ) {
        setIsOpenMake(false);
      }

      if (
        refModelDropdown.current &&
        !refModelDropdown.current.contains(target)
      ) {
        setIsOpenModel(false);
      }
    };

    if (isOpenMake || isOpenModel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpenMake, isOpenModel]);

  const filteredBrands = COMPLETE_CAR_DATABASE.filter((make) =>
    make.name.toLowerCase().includes(searchMake.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name));

  const availableModels = selectedMake
    ? getModelsByMake(selectedMake)
    : [];

  const filteredModels = availableModels
    .filter((model) =>
      model.toLowerCase().includes(searchModel.toLowerCase())
    )
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-4">
      {/* BRAND SELECTOR */}
      <div ref={refMakeDropdown} className="relative">
        <label className="block text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">
          Marca Mașinii
        </label>

        <button
          onClick={() => {
            setIsOpenMake(!isOpenMake);
            setIsOpenModel(false);
          }}
          className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 hover:border-purple-500/50 text-left rounded-lg transition-all duration-200 flex items-center justify-between group shadow-md hover:shadow-lg"
        >
          <div className="flex items-center gap-2.5">
            {selectedMake ? (
              <>
                <div className="w-7 h-7 text-purple-300 flex-shrink-0">
                  {getCarLogoSVG(selectedMake)}
                </div>
                <span className="text-white font-medium text-sm">{selectedMake}</span>
              </>
            ) : (
              <span className="text-slate-400 text-sm">Selectează marcă...</span>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${
              isOpenMake ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>

        {isOpenMake && (
          <div 
            className="absolute top-full left-0 right-0 mt-2 z-50 bg-slate-800/95 backdrop-blur-sm border border-purple-500/40 rounded-lg shadow-xl overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              type="text"
              placeholder="Caută marcă..."
              value={searchMake}
              onChange={(e) => setSearchMake(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700/70 text-white text-sm border-b border-slate-600 focus:outline-none placeholder-slate-400"
            />
            <div className="max-h-96 overflow-y-auto">
              {filteredBrands.length > 0 ? (
                filteredBrands.map((brand) => (
                  <button
                    type="button"
                    key={brand.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelectMake(brand.name);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-purple-600/25 bg-slate-800/80 border-b border-slate-700/30 last:border-0 flex items-center gap-2.5 transition-all duration-150 group cursor-pointer"
                  >
                    <div className="w-7 h-7 text-purple-300 flex-shrink-0 group-hover:scale-105 transition-transform">
                      {getCarLogoSVG(brand.name)}
                    </div>
                    <span className="text-white group-hover:text-purple-100 font-medium text-sm">
                      {brand.name}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-slate-400 text-sm">
                  Nu găsit...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODEL SELECTOR - Only show if brand is selected */}
      {selectedMake && (
        <div ref={refModelDropdown} className="relative">
          <label className="block text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">
            Model Mașinii
          </label>

          <button
            onClick={() => {
              setIsOpenModel(!isOpenModel);
              setIsOpenMake(false);
            }}
            className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 hover:border-purple-500/50 text-left rounded-lg transition-all duration-200 flex items-center justify-between group shadow-md hover:shadow-lg"
          >
            <span
              className={
                selectedModel
                  ? 'text-white font-medium text-sm'
                  : 'text-slate-400 text-sm'
              }
            >
              {selectedModel ? selectedModel.split('(')[0].trim() : 'Selectează model...'}
            </span>
            <svg
              className={`w-5 h-5 text-slate-400 transition-transform ${
                isOpenModel ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </button>

          {isOpenModel && (
            <div 
              className="absolute top-full left-0 right-0 mt-2 z-50 bg-slate-800/95 backdrop-blur-sm border border-purple-500/40 rounded-lg shadow-xl overflow-hidden"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <input
                autoFocus
                type="text"
                placeholder="Caută model..."
                value={searchModel}
                onChange={(e) => setSearchModel(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700/70 text-white text-sm border-b border-slate-600 focus:outline-none placeholder-slate-400"
              />
              <div className="max-h-96 overflow-y-auto">
                {filteredModels.length > 0 ? (
                  filteredModels.map((model) => (
                    <button
                      type="button"
                      key={model}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelectModel(model);
                        setIsOpenModel(false);
                        setSearchModel('');
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-purple-600/25 bg-slate-800/80 border-b border-slate-700/30 last:border-0 transition-all duration-150 cursor-pointer"
                    >
                      <div className="text-white font-medium text-sm">
                        {model.split('(')[0].trim()}
                      </div>
                      {model.includes('(') && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          {model.split('(')[1]}
                        </div>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center text-slate-400 text-sm">
                    Nu găsit...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SELECTION SUMMARY */}
      {selectedMake && selectedModel && (
        <div className="mt-4 p-3 bg-gradient-to-r from-purple-900/30 to-slate-900/20 border border-purple-500/30 rounded-lg flex items-center gap-3">
          <div className="w-6 h-6 text-purple-300 flex-shrink-0">
            {getCarLogoSVG(selectedMake)}
          </div>
          <div>
            <div className="text-sm text-purple-200 font-semibold">{selectedMake}</div>
            <div className="text-xs text-slate-400">
              {selectedModel.split('(')[0].trim()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
