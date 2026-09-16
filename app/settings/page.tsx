"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Settings() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(99);
  const [maxDistance, setMaxDistance] = useState(100);
  const [country, setCountry] = useState("España");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }
    setUserId(userData.user.id);
    const { data } = await supabase
      .from("profiles")
      .select("pref_min_age, pref_max_age, pref_max_distance, country")
      .eq("id", userData.user.id)
      .single();
    if (data) {
      setMinAge(data.pref_min_age);
      setMaxAge(data.pref_max_age);
      setMaxDistance(data.pref_max_distance);
      if (data.country) setCountry(data.country);
    }
  }

  async function save() {
    if (!userId) return;
    await supabase
      .from("profiles")
      .update({ pref_min_age: minAge, pref_max_age: maxAge, pref_max_distance: maxDistance, country })
      .eq("id", userId);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <a href="/" style={{ color: "#f5f5f5" }}>← Volver</a>
        <span className="brand" style={{ fontSize: 20, color: "#1e6fd9" }}>Filtros</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label style={{ fontSize: 13, color: "#9a9a9a" }}>Edad mínima: {minAge}</label>
          <input type="range" min={18} max={99} value={minAge} onChange={(e) => setMinAge(Number(e.target.value))} />
        </div>
        <div>
          <label style={{ fontSize: 13, color: "#9a9a9a" }}>Edad máxima: {maxAge}</label>
          <input type="range" min={18} max={99} value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))} />
        </div>
        <div>
          <label style={{ fontSize: 13, color: "#9a9a9a" }}>Distancia máxima: {maxDistance} km</label>
          <input type="range" min={1} max={500} value={maxDistance} onChange={(e) => setMaxDistance(Number(e.target.value))} />
        </div>
        <div>
          <label style={{ fontSize: 13, color: "#9a9a9a" }}>País</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 6, background: "#1a1a1a", color: "#f5f5f5", border: "2px solid #2a2a2a", borderRadius: 4 }}
          >
            <option value="España">🇪🇸 España</option>
            <option value="México">🇲🇽 México</option>
            <option value="Argentina">🇦🇷 Argentina</option>
            <option value="Colombia">🇨🇴 Colombia</option>
            <option value="Chile">🇨🇱 Chile</option>
            <option value="Perú">🇵🇪 Perú</option>
            <option value="Estados Unidos">🇺🇸 Estados Unidos</option>
            <option value="Reino Unido">🇬🇧 Reino Unido</option>
            <option value="Francia">🇫🇷 Francia</option>
            <option value="Alemania">🇩🇪 Alemania</option>
            <option value="Italia">🇮🇹 Italia</option>
          </select>
        </div>
        <button className="primary" onClick={save}>{saved ? "Guardado ✓" : "Guardar filtros"}</button>
        <button onClick={logout} style={{ background: "none", border: "2px solid #9a9a9a", color: "#9a9a9a", borderRadius: 4, padding: 10 }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
