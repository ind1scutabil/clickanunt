"use client";
import React, { useEffect, useState } from "react";

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

export default function CreateListingForm() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [ownerUserId, setOwnerUserId] = useState("");
  const [title, setTitle] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [mileage, setMileage] = useState<number | "">("");
  const [priceAmount, setPriceAmount] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(data || []))
      .catch(() => setUsers([]));
  }, []);

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

      const payload: any = {
        ownerUserId,
        title,
        make,
        model,
        year: year === "" ? null : Number(year),
        mileage: mileage === "" ? null : Number(mileage),
        priceAmount: priceAmount === "" ? 0 : Number(priceAmount),
        priceCurrency: "RON",
        description,
        photos,
      };

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create listing");
      setMessage("Listing created: " + data.id);
      setTitle("");
      setMake("");
      setModel("");
      setYear("");
      setMileage("");
      setPriceAmount("");
      setDescription("");
      setFiles(null);
    } catch (err: any) {
      setMessage(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 800, padding: 12 }}>
      <h2>Create Listing</h2>
      <div>
        <label>Owner</label>
        <select value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)} required>
          <option value="">Select owner</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.email}</option>
          ))}
        </select>
      </div>
      <div>
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <label>Make</label>
        <input value={make} onChange={(e) => setMake(e.target.value)} />
      </div>
      <div>
        <label>Model</label>
        <input value={model} onChange={(e) => setModel(e.target.value)} />
      </div>
      <div>
        <label>Year</label>
        <input value={year as any} onChange={(e) => setYear(e.target.value === "" ? "" : Number(e.target.value))} type="number" />
      </div>
      <div>
        <label>Mileage</label>
        <input value={mileage as any} onChange={(e) => setMileage(e.target.value === "" ? "" : Number(e.target.value))} type="number" />
      </div>
      <div>
        <label>Price</label>
        <input value={priceAmount as any} onChange={(e) => setPriceAmount(e.target.value === "" ? "" : Number(e.target.value))} type="number" required />
      </div>
      <div>
        <label>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <label>Photos</label>
        <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
      </div>
      <div style={{ marginTop: 8 }}>
        <button type="submit" disabled={loading}>{loading ? "Saving..." : "Create Listing"}</button>
      </div>
      {message && <div style={{ marginTop: 8 }}>{message}</div>}
    </form>
  );
}
