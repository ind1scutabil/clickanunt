'use client';

import { useState } from 'react';
import { CarMakesGrid, CarMakesDropdown, MakeDetails } from '@/app/components/CarMakesGrid';

export default function CarMakesShowcase() {
  const [selectedMake, setSelectedMake] = useState<string>('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            🚗 Complete Car Catalog
          </h1>
          <p className="text-xl text-gray-600">
            Enterprise-grade database with 40+ brands and 1000+ models
          </p>
        </div>

        {/* Main Grid */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <CarMakesGrid 
            selectedMake={selectedMake}
            onSelectMake={setSelectedMake}
          />
        </div>

        {/* Selected Make Details */}
        {selectedMake && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <MakeDetails makeName={selectedMake} />
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">40+</div>
            <div className="text-gray-600 mt-2">Car Brands</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">1000+</div>
            <div className="text-gray-600 mt-2">Car Models</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">∞</div>
            <div className="text-gray-600 mt-2">Scalable Design</div>
          </div>
        </div>
      </div>
    </div>
  );
}
