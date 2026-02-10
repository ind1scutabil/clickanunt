"use client";
import React, { useEffect, useState, useMemo } from "react";
import { CATEGORIES, CAR_MAKES_AND_MODELS, ROMANIAN_COUNTIES, CITIES_BY_COUNTY } from "@/lib/carData";

type UserOption = { id: string; email: string };

async function fileToBase64(file: File) {
  return await new Promise<string>((resolve, reject) => {
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

export default function CreateListingFormNew() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [ownerUserId, setOwnerUserId] = useState("");
  
  // Generic fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [priceAmount, setPriceAmount] = useState<number | "">("");
  const [condition, setCondition] = useState("used");
  const [description, setDescription] = useState("");
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  
  // Auto-specific fields (shown only for Auto category)
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [mileage, setMileage] = useState<number | "">("");
  const [fuel, setFuel] = useState("");
  const [transmission, setTransmission] = useState("");
  
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const subcategories = useMemo(() => {
    return category ? CATEGORIES[category] || [] : [];
  }, [category]);

  const availableModels = useMemo(() => {
    return make ? CAR_MAKES_AND_MODELS[make] || [] : [];
  }, [make]);

  const availableCities = useMemo(() => {
    return county ? CITIES_BY_COUNTY[county] || [] : [];
  }, [county]);

  const isAutoCategory = category === "Auto, moto și ambarcațiuni";

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(data || []))
      .catch(() => setUsers([]));
  }, []);

  // Reset subcategory when category changes
  useEffect(() => {
    setSubcategory("");
  }, [category]);

  // Reset model when make changes
  useEffect(() => {
    setModel("");
  }, [make]);

  // Reset city when county changes
  useEffect(() => {
    setCity("");
  }, [county]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const photos: string[] = [];
      if (files && files.length > 0) {
        const arr = Array.from(files);
        for (const f of arr) {
          const b64 = await fileToBase64(f);
          const res = await fetch("/api/uploads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: f.name, data: b64 }),
          });
          const jd = await res.json();
          if (res.ok && jd.url) photos.push(jd.url);
        }
      }

      const payload: Record<string, unknown> = {
        ownerUserId,
        title,
        category,
        subcategory: subcategory || null,
        priceAmount: priceAmount === "" ? 0 : Number(priceAmount),
        priceCurrency: "RON",
        condition,
        description,
        county: county || null,
        city: city || null,
        photos,
      };

      // Add auto-specific fields if auto category
      if (isAutoCategory) {
        payload.make = make || null;
        payload.model = model || null;
        payload.year = year === "" ? null : Number(year);
        payload.mileage = mileage === "" ? null : Number(mileage);
        payload.fuel = fuel || null;
        payload.transmission = transmission || null;
      }

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create listing");
      setMessage("Anunț creat cu succes! ID: " + data.id);
      
      // Reset form
      setTitle("");
      setCategory("");
      setSubcategory("");
      setPriceAmount("");
      setCondition("used");
      setDescription("");
      setCounty("");
      setCity("");
      setMake("");
      setModel("");
      setYear("");
      setMileage("");
      setFuel("");
      setTransmission("");
      setFiles(null);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Creează Anunț Nou</h2>

      {/* Owner Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Proprietar *
        </label>
        <select
          value={ownerUserId}
          onChange={(e) => setOwnerUserId(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
        >
          <option value="">Selectează utilizator</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.email}
            </option>
          ))}
        </select>
      </div>

      {/* Category & Subcategory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categorie *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
          >
            <option value="">Selectează categoria</option>
            {Object.keys(CATEGORIES).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subcategorie
          </label>
          <select
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            disabled={!category}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white disabled:bg-gray-100"
          >
            <option value="">Selectează subcategoria</option>
            {subcategories.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Title */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Titlu anunț *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="ex: Vând Audi A4 2020, stare excelentă"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Price & Condition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preț (RON) *
          </label>
          <input
            type="number"
            value={priceAmount}
            onChange={(e) => setPriceAmount(e.target.value === "" ? "" : Number(e.target.value))}
            required
            placeholder="ex: 15000"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stare
          </label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
          >
            <option value="new">Nou</option>
            <option value="used">Folosit</option>
            <option value="refurbished">Recondiționat</option>
            <option value="for_parts">Pentru piese</option>
          </select>
        </div>
      </div>

      {/* Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Județ
          </label>
          <select
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
          >
            <option value="">Selectează județul</option>
            {ROMANIAN_COUNTIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Oraș
          </label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={!county}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white disabled:bg-gray-100"
          >
            <option value="">Selectează orașul</option>
            {availableCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Auto-specific fields (shown only for Auto category) */}
      {isAutoCategory && (
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalii Auto</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marcă
              </label>
              <select
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
              >
                <option value="">Selectează marca</option>
                {Object.keys(CAR_MAKES_AND_MODELS).sort().map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={!make}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white disabled:bg-gray-100"
              >
                <option value="">Selectează modelul</option>
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                An fabricație
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="ex: 2020"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kilometraj
              </label>
              <input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="ex: 50000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Combustibil
              </label>
              <select
                value={fuel}
                onChange={(e) => setFuel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
              >
                <option value="">Selectează</option>
                <option value="petrol">Benzină</option>
                <option value="diesel">Motorină</option>
                <option value="hybrid">Hibrid</option>
                <option value="electric">Electric</option>
                <option value="other">Altul</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transmisie
              </label>
              <select
                value={transmission}
                onChange={(e) => setTransmission(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
              >
                <option value="">Selectează</option>
                <option value="manual">Manuală</option>
                <option value="automatic">Automată</option>
                <option value="semiautomatic">Semiautomată</option>
                <option value="other">Altul</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Descriere
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          placeholder="Descrie produsul în detaliu..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Photos */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Fotografii
        </label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setFiles(e.target.files)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          Poți încărca mai multe fotografii simultan
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg ${message.includes("succes") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {message}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
      >
        {loading ? "Se creează anunțul..." : "Creează Anunț"}
      </button>
    </form>
  );
}
