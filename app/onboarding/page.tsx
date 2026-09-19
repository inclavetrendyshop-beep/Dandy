"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LocationStep, { LocationCoords } from "./LocationStep";

export default function Onboarding() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const TAG_OPTIONS = ["Barba", "Canas", "Elegante", "Clásico", "Ejecutivo", "Viajero"];

  // --- Comunidad / tribu: estilo Scruff, se guardan en el mismo array "tags" ---
  const TRIBE_OPTIONS = [
    "Oso",
    "Nutria",
    "Cachorro",
    "Lobo",
    "Musculoso",
    "Deportista",
    "Militar",
    "Cuero",
    "Geek",
    "Daddy",
    "Twink",
    "Friki",
    "Sobrio",
    "Discreto",
    "Poz",
    "Indetectable",
    "Fetiche",
    "Asexual",
    "Vicio",
    "Sexo casual",
  ];
  // --- fin comunidad / tribu ---

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  // --- Posición / rol: selección única, como en Scruff ---
  const [role, setRole] = useState<string | null>(null);
  const ROLE_OPTIONS = [
    "Activo",
    "Pasivo",
    "Versátil",
    "Versátil Activo",
    "Versátil Pasivo",
    "Neutro",
    "Prefiero no decirlo",
  ];

  function selectRole(option: string) {
    setRole((prev) => (prev === option ? null : option));
  }
  // --- fin posición / rol ---

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [coords, setCoords] = useState<LocationCoords>(null);

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
      role,
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

      <LocationStep onChange={setCoords} />

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

        <label style={{ fontSize: 13, color: "#9a9a9a" }}>Comunidad / gustos</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {TRIBE_OPTIONS.map((tag) => (
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

        <label style={{ fontSize: 13, color: "#9a9a9a" }}>Posición</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {ROLE_OPTIONS.map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => selectRole(option)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "2px solid " + (role === option ? "#c9a24b" : "#2a2a2a"),
                background: role === option ? "#c9a24b" : "transparent",
                color: role === option ? "#1a1a1a" : "#f5f5f5",
                fontSize: 13,
              }}
            >
              {option}
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
