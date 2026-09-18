"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Onboarding() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const TAG_OPTIONS = ["Barba", "Canas", "Elegante", "Clásico", "Deportista", "Osos", "Ejecutivo", "Viajero"];

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Ubicación: ahora es un paso explícito y visible, no un intento silencioso ---
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<"idle" | "requesting" | "granted" | "denied" | "error">("idle");

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setLocStatus("error");
      return;
    }
    setLocStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus("granted");
      },
      (err) => {
        setLocStatus(err.code === 1 ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }

  useEffect(() => {
    // Lo intentamos automáticamente al entrar, pero el usuario puede reintentar
    // manualmente si falla o si el navegador tarda más de lo esperado.
    requestLocation();
  }, []);
  // --- fin ubicación ---

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      } else {
        setUserId(data.user.id);
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!userId) return;
    if (Number(age) < 18) {
      setError("Debes tener al menos 18 años.");
      return;
    }
    if (files.length === 0) {
      setError("Sube al menos una foto.");
      return;
    }
    setLoading(true);

    const photoUrls: string[] = [];
    for (const file of files.slice(0, 6)) {
      const path = `${userId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("photos").upload(path, file);
      if (upErr) {
        setError("Error subiendo foto: " + upErr.message);
        setLoading(false);
        return;
      }
      const { data } = supabase.storage.from("photos").getPublicUrl(path);
      photoUrls.push(data.publicUrl);
    }

    const { error: dbErr } = await supabase.from("profiles").insert({
      id: userId,
      name,
      age: Number(age),
      bio,
      city,
      tags,
      photos: photoUrls,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      location_updated_at: coords ? new Date().toISOString() : null,
    });

    setLoading(false);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    router.push("/");
  }

  return (
    <div style={{ padding: 24 }}>
      <p className="brand" style={{ fontSize: 28, color: "#c9a24b", marginBottom: 4 }}>Dandy</p>
      <h1 style={{ fontSize: 18, fontWeight: 400, color: "#8c92a0", marginBottom: 24 }}>Crea tu perfil</h1>

      <div style={{
        border: "1px solid " + (locStatus === "granted" ? "#2e7d32" : "#2a2a2a"),
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}>
        <span style={{ fontSize: 13, color: locStatus === "granted" ? "#2e7d32" : "#9a9a9a" }}>
          {locStatus === "idle" && "Solicitando acceso a tu ubicación..."}
          {locStatus === "requesting" && "Solicitando acceso a tu ubicación..."}
          {locStatus === "granted" && "✓ Ubicación activada"}
          {locStatus === "denied" && "Has denegado el acceso a tu ubicación. Puedes activarla luego, pero sin ella no verás perfiles ni eventos cerca de ti."}
          {locStatus === "error" && "No se pudo obtener tu ubicación."}
        </span>
        {locStatus !== "granted" && locStatus !== "requesting" && locStatus !== "idle" && (
          <button type="button" onClick={requestLocation} style={{
            fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "1px solid #c9a24b",
            background: "transparent", color: "#c9a24b", whiteSpace: "nowrap",
          }}>
            Reintentar
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="number" placeholder="Edad" min={18} value={age} onChange={(e) => setAge(e.target.value)} required />
        <input placeholder="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} required />
        <textarea placeholder="Cuéntanos sobre ti" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        <label style={{ fontSize: 13, color: "#9a9a9a" }}>¿Cómo te describes?</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {TAG_OPTIONS.map((tag) => (
            <button
              type="button"
              key={tag}
              onClick={() => toggleTag(tag)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "2px solid " + (tags.includes(tag) ? "#e8352b" : "#2a2a2a"),
                background: tags.includes(tag) ? "#e8352b" : "transparent",
                color: "#f5f5f5",
                fontSize: 13,
              }}
            >
              {tag}
            </button>
          ))}
        </div>
        <label style={{ fontSize: 13, color: "#9a9a9a" }}>Fotos (hasta 6)</label>
        <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
        {error && <p style={{ color: "#e2504a", fontSize: 13 }}>{error}</p>}
        <button className="primary" disabled={loading}>{loading ? "Guardando..." : "Continuar"}</button>
      </form>
    </div>
  );
}
