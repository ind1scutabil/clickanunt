"use client";
import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, ALL_CATEGORIES, CAR_MAKES_AND_MODELS, POPULAR_MAKES, ROMANIAN_COUNTIES, CITIES_BY_COUNTY } from "@/lib/carData";

export default function ProductSearchForm() {
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [fuel, setFuel] = useState("");
  const [transmission, setTransmission] = useState("");
  const [year, setYear] = useState("");
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  const [condition, setCondition] = useState("");
  const [q, setQ] = useState("");
  const router = useRouter();

  // Get available subcategories for selected category
  const availableSubcategories = useMemo(() => {
    return category ? CATEGORIES[category] || [] : [];
  }, [category]);

  // Get available models for selected make
  const availableModels = useMemo(() => {
    return make ? CAR_MAKES_AND_MODELS[make] || [] : [];
  }, [make]);

  // Get available cities for selected county
  const availableCities = useMemo(() => {
    return county ? CITIES_BY_COUNTY[county] || [] : [];
  }, [county]);

  const isAutoCategory = category === "Auto, moto și ambarcațiuni";

  // Reset subcategory when category changes
  React.useEffect(() => {
    setSubcategory("");
  }, [category]);

  // Reset model when make changes
  React.useEffect(() => {
    setModel("");
  }, [make]);

  // Reset city when county changes
  React.useEffect(() => {
    setCity("");
  }, [county]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();

    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (subcategory) params.set("subcategory", subcategory);
    if (make) params.set("make", make);
    if (model) params.set("model", model);
    if (minPrice) params.set("minPrice", minPrice.toString());
    if (maxPrice) params.set("maxPrice", maxPrice.toString());
    if (fuel) params.set("fuel", fuel);
    if (transmission) params.set("transmission", transmission);
    if (year) params.set("year", year.toString());
    if (county) params.set("county", county);
    if (city) params.set("city", city);
    if (condition) params.set("condition", condition);

    router.push(`/listings?${params.toString()}`);
  }

  function handleReset() {
    setQ("");
    setCategory("");
    setSubcategory("");
    setMake("");
    setModel("");
    setMinPrice("");
    setMaxPrice("");
    setFuel("");
    setTransmission("");
    setYear("");
    setCounty("");
    setCity("");
    setCondition("");
    router.push("/listings");
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

  return (
    <form onSubmit={handleSearch} className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Caută Produse</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Search by keyword */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cautare dupa cuvant
          </label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Titlu, descriere..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categorie
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition bg-white"
          >
            <option value="">Toate categoriile</option>
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Subcategory */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subcategorie
          </label>
          <select
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            disabled={!category}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Toate subcategoriile</option>
            {availableSubcategories.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pret Minim (RON)
          </label>
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="ex: 100"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pret Maxim (RON)
          </label>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="ex: 50000"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
          />
        </div>

        {/* Condition */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stare
          </label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition bg-white"
          >
            <option value="">Orice stare</option>
            <option value="new">Nou</option>
            <option value="used">Folosit</option>
            <option value="refurbished">Recondiționat</option>
            <option value="for_parts">Pentru piese</option>
          </select>
        </div>

        {/* County */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Județ
          </label>
          <select
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition bg-white"
          >
            <option value="">Toate județele</option>
            {ROMANIAN_COUNTIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Oraș
          </label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={!county}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Toate orașele</option>
            {availableCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Auto-specific filters (shown only for Auto category) */}
      {isAutoCategory && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtre Auto</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Make */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marca Masini
              </label>
              <select
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition bg-white"
              >
                <option value="">Toate marcile</option>
                {POPULAR_MAKES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model Masini
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={!make}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Toate modelele</option>
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Anul Fabricatiei
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition bg-white"
              >
                <option value="">Orice an</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Fuel Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tip Combustibil
              </label>
              <select
                value={fuel}
                onChange={(e) => setFuel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition bg-white"
              >
                <option value="">Orice tip</option>
                <option value="petrol">Benzina</option>
                <option value="diesel">Motorina</option>
                <option value="hybrid">Hibrid</option>
                <option value="electric">Electric</option>
                <option value="other">Altul</option>
              </select>
            </div>

            {/* Transmission */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cutie Viteze
              </label>
              <select
                value={transmission}
                onChange={(e) => setTransmission(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition bg-white"
              >
                <option value="">Orice cutie</option>
                <option value="manual">Manuala</option>
                <option value="automatic">Automata</option>
                <option value="semiautomatic">Semiautomata</option>
                <option value="other">Altul</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-4">
        <button
          type="submit"
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
        >
          Caută Produse
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 px-6 rounded-lg transition duration-200"
        >
          Reseteaza Cautare
        </button>
      </div>
    </form>
  );
}
