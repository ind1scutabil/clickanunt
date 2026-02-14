"use client";
import React, { useEffect, useState } from "react";
import { getCsrfToken } from "@/lib/security/csrf-client";

type UserOption = { id: string; email: string };
type FileWithPreview = {
  file: File;
  preview: string;
  type: "image" | "video";
  url?: string;
  error?: string;
};

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
  const [uploadedMedia, setUploadedMedia] = useState<FileWithPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(data || []))
      .catch(() => setUsers([]));
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files) return;

    const newMedia: FileWithPreview[] = [];
    const imageCount = uploadedMedia.filter((m) => m.type === "image").length;
    const videoCount = uploadedMedia.filter((m) => m.type === "video").length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        newMedia.push({
          file,
          preview: "",
          type: isImage ? "image" : "video",
          error: "Only images and videos are allowed",
        });
        continue;
      }

      // Check limits
      if (isImage && imageCount + newMedia.filter((m) => m.type === "image").length >= 20) {
        newMedia.push({
          file,
          preview: "",
          type: "image",
          error: "Maximum 20 images allowed",
        });
        continue;
      }

      if (isVideo && videoCount + newMedia.filter((m) => m.type === "video").length >= 1) {
        newMedia.push({
          file,
          preview: "",
          type: "video",
          error: "Maximum 1 video allowed",
        });
        continue;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedMedia((prev) => {
          const updated = [...prev];
          const index = updated.findIndex((m) => m.file === file);
          if (index !== -1) {
            updated[index].preview = event.target?.result as string;
          }
          return updated;
        });
      };
      reader.readAsDataURL(file);

      newMedia.push({
        file,
        preview: "",
        type: isImage ? "image" : "video",
      });
    }

    setUploadedMedia((prev) => [...prev, ...newMedia]);
  };

  const removeMedia = (index: number) => {
    setUploadedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    try {
      const photos: string[] = [];
      const uploadedFiles = uploadedMedia.filter((m) => !m.error);
      const csrfToken = await getCsrfToken();

      for (let i = 0; i < uploadedFiles.length; i++) {
        const media = uploadedFiles[i];
        setUploadProgress((prev) => ({ ...prev, [media.file.name]: 0 }));

        try {
          const b64 = await fileToBase64(media.file);
          
          setUploadProgress((prev) => ({ ...prev, [media.file.name]: 50 }));

          const res = await fetch("/api/uploads", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "x-csrf-token": csrfToken,
            },
            body: JSON.stringify({ 
              data: b64,
              type: media.type 
            }),
          });

          setUploadProgress((prev) => ({ ...prev, [media.file.name]: 75 }));

          const jd = await res.json();
          
          if (res.ok && jd.url) {
            photos.push(jd.url);
            setUploadProgress((prev) => ({ ...prev, [media.file.name]: 100 }));
          } else {
            setMessage(`Upload failed for ${media.file.name}: ${jd.error}`);
          }
        } catch (err: any) {
          setMessage(`Upload error for ${media.file.name}: ${err.message}`);
        }
      }

      if (photos.length === 0) {
        throw new Error("No files uploaded successfully");
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
      setMessage("✅ Anunț creat cu succes: " + data.id);
      setTitle("");
      setMake("");
      setModel("");
      setYear("");
      setMileage("");
      setPriceAmount("");
      setDescription("");
      setUploadedMedia([]);
      setUploadProgress({});
    } catch (err: any) {
      setMessage("❌ " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 900, padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h2>Adaugă Anunț Nou</h2>
      
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
          Proprietar
        </label>
        <select 
          value={ownerUserId} 
          onChange={(e) => setOwnerUserId(e.target.value)} 
          required
          style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}
        >
          <option value="">Selectează proprietar</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.email}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>Titlu *</label>
        <input 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          required 
          style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>Marca</label>
          <input 
            value={make} 
            onChange={(e) => setMake(e.target.value)} 
            style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>Model</label>
          <input 
            value={model} 
            onChange={(e) => setModel(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>An</label>
          <input 
            value={year as any} 
            onChange={(e) => setYear(e.target.value === "" ? "" : Number(e.target.value))} 
            type="number"
            style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>Kilometraj</label>
          <input 
            value={mileage as any} 
            onChange={(e) => setMileage(e.target.value === "" ? "" : Number(e.target.value))} 
            type="number"
            style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}
          />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>Preț (RON) *</label>
        <input 
          value={priceAmount as any} 
          onChange={(e) => setPriceAmount(e.target.value === "" ? "" : Number(e.target.value))} 
          type="number" 
          required
          style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>Descriere</label>
        <textarea 
          value={description} 
          onChange={(e) => setDescription(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc", minHeight: 100 }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
          📸 Poze și Video (max 20 poze + 1 video)
        </label>
        <input 
          type="file" 
          multiple 
          accept="image/*,video/*"
          onChange={handleFileSelect}
          style={{ width: "100%", padding: 10, borderRadius: 4, border: "2px dashed #007bff" }}
        />
        <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
          ℹ️ Selectează până la 20 imagini și 1 video. Pozi cu probleme nu vor fi adăugate.
        </p>
      </div>

      {/* Media Preview Grid */}
      {uploadedMedia.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h4>Preview Poze și Video ({uploadedMedia.length})</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12 }}>
            {uploadedMedia.map((media, index) => (
              <div 
                key={index}
                style={{
                  position: "relative",
                  borderRadius: 8,
                  overflow: "hidden",
                  border: media.error ? "2px solid #dc3545" : "2px solid #ddd",
                  background: "#f5f5f5",
                  aspectRatio: "1",
                }}
              >
                {media.error ? (
                  <div style={{ 
                    padding: 8, 
                    fontSize: 12, 
                    color: "#dc3545", 
                    display: "flex", 
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    height: "100%"
                  }}>
                    ❌ {media.error}
                  </div>
                ) : media.preview ? (
                  <>
                    {media.type === "image" ? (
                      <img src={media.preview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <>
                        <video src={media.preview} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
                          ▶️
                        </div>
                      </>
                    )}
                    {uploadProgress[media.file.name] && uploadProgress[media.file.name] < 100 && (
                      <div style={{
                        position: "absolute",
                        bottom: 0,
                        width: "100%",
                        height: 4,
                        background: "#ddd",
                      }}>
                        <div style={{
                          width: `${uploadProgress[media.file.name]}%`,
                          height: "100%",
                          background: "#28a745",
                          transition: "width 0.3s"
                        }} />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        background: "rgba(220, 53, 69, 0.8)",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: 28,
                        height: 28,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 24 }}>
                    ⏳
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <button 
          type="submit" 
          disabled={loading || uploadedMedia.length === 0}
          style={{
            padding: "12px 24px",
            background: loading || uploadedMedia.length === 0 ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: loading || uploadedMedia.length === 0 ? "not-allowed" : "pointer",
            fontSize: 16,
            fontWeight: "bold"
          }}
        >
          {loading ? "⏳ Se adaugă anunț..." : "✅ Adaugă Anunț"}
        </button>
      </div>

      {message && (
        <div style={{
          padding: 12,
          borderRadius: 4,
          background: message.includes("❌") ? "#f8d7da" : "#d4edda",
          color: message.includes("❌") ? "#721c24" : "#155724",
          marginTop: 16
        }}>
          {message}
        </div>
      )}
    </form>
  );
}
