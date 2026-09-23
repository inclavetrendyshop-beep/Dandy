"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const TAG_OPTIONS = ["Barba", "Canas", "Elegante", "Clasico", "Ejecutivo", "Viajero"];
const TRIBE_OPTIONS = [
  "Oso", "Nutria", "Cachorro", "Lobo", "Musculoso", "Deportista",
  "Militar", "Cuero", "Geek", "Daddy", "Twink", "Friki",
  "Sobrio", "Discreto", "Poz", "Indetectable", "Fetiche", "Asexual",
  "Vicio", "Sexo casual",
];
const GENDER_OPTIONS = [
  "Hombre cisgenero", "Hombre transgenero", "Mujer transgenero",
  "No binario", "Genero fluido", "Agenero", "Intersexual", "Otro", "Prefiero no decirlo",
];
const ROLE_OPTIONS = ["Activo", "Pasivo", "Versatil", "Versatil Activo", "Versatil Pasivo", "Neutro", "Prefiero no decirlo"];
const HEALTH_OPTIONS = ["VIH+", "VIH-", "Tomo PrEP", "Prefiero no decirlo"];

export default function EditProfile() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [gender, setGender] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }
    setUserId(userData.user.id);

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userData.user.id).single();
    if (!profile) {
      router.push("/onboarding");
      return;
    }

    setName(profile.name || "");
    setAge(profile.age ? String(profile.age) : "");
    setBio(profile.bio || "");
    setCity(profile.city || "");
    setTags(profile.tags || []);
    setGender(profile.gender || null);
    setRole(profile.role || null);
    setHealthStatus(profile.health_status || null);
    setExistingPhotos(profile.photos || []);
    setLoading(false);
  }

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function selectGender(option: string) {
    setGender((prev) => (prev === option ? null : option));
  }

  function selectRole(option: string) {
    setRole((prev) => (prev === option ? null : option));
  }

  function selectHealth(option: string) {
    setHealthStatus((prev) => (prev === option ? null : option));
  }

  function removeExistingPhoto(url: string) {
    setExistingPhotos((prev) => prev.filter((p) => p !== url));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!userId) return;
    if (Number(age) < 18) {
      setError("Debes tener al menos 18 anos.");
      return;
    }
    const totalPhotos = existingPhotos.length + newFiles.length;
    if (totalPhotos === 0) {
      setError("Debes tener al menos una foto.");
      return;
    }
    setSaving(true);

    const uploadedUrls: string[] = [];
    for (const file of newFiles.slice(0, 6 - existingPhotos.length)) {
      const path = userId + "/" + Date.now() + "-" + file.name;
      const { error: upErr } = await supabase.storage.from("photos").upload(path, file);
      if (upErr) {
        setError("Error subiendo foto: " + upErr.message);
        setSaving(false);
        return;
      }
      const { data } = supabase.storage.from("photos").getPublicUrl(path);
      uploadedUrls.push(data.publicUrl);
    }

    const finalPhotos = [...existingPhotos, ...uploadedUrls].slice(0, 6);

    const { error: dbErr } = await supabase
      .from("profiles")
      .update({
        name,
        age: Number(age),
        bio,
        city,
        tags,
        gender,
        role,
        health_status: healthStatus,
        photos: finalPhotos,
      })
      .eq("id", userId);

    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    router.push("/settings");
  }

  if (loading) {
    return <div style={{ padding: 24, color: "#9a9a9a" }}>Cargando...</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p className="brand" style={{ fontSize: 24, color: "#e8352b", margin: 0 }}>Dandy</p>
        <a href="/settings" style={{ color: "#f5f5f5" }}>Volver</a>
      </div>
      <h1 style={{ fontSize: 18, fontWeight: 400, color: "#9a9a9a", marginBottom: 24 }}>Editar perfil</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="number" placeholder="Edad" min={18} value={age} onChange={(e) => setAge(e.target.value)} required />
        <input placeholder="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} required />
        <textarea placeholder="Cuentanos sobre ti" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />

        <label style={{ fontSize: 13, color: "#9a9a9a" }}>Genero</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {GENDER_OPTIONS.map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => selectGender(option)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "2px solid " + (gender === option ? "#c9a24b" : "#2a2a2a"),
                background: gender === option ? "#c9a24b" : "transparent",
                color: gender === option ? "#1a1a1a" : "#f5f5f5",
                fontSize: 13,
              }}
            >
              {option}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 13, color: "#9a9a9a" }}>Como te describes?</label>
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

        <label style={{ fontSize: 13, color: "#9a9a9a" }}>Posicion</label>
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

        <label style={{ fontSize: 13, color: "#9a9a9a" }}>Estado serologico (opcional)</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {HEALTH_OPTIONS.map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => selectHealth(option)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "2px solid " + (healthStatus === option ? "#1e6fd9" : "#2a2a2a"),
                background: healthStatus === option ? "#1e6fd9" : "transparent",
                color: "#f5f5f5",
                fontSize: 13,
              }}
            >
              {option}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 13, color: "#9a9a9a" }}>Tus fotos (hasta 6)</label>
        {existingPhotos.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {existingPhotos.map((url) => (
              <div key={url} style={{ position: "relative", width: 80, height: 80 }}>
                <img src={url} alt="Foto" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8, border: "1px solid #2a2a2a" }} />
                <button
                  type="button"
                  onClick={() => removeExistingPhoto(url)}
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#e8352b",
                    color: "#fff",
                    border: "2px solid #0d0d0d",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setNewFiles(Array.from(e.target.files || []))}
        />

        {error && <p style={{ color: "#e2504a", fontSize: 13 }}>{error}</p>}
        <button className="primary" disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</button>
      </form>
    </div>
  );
}

