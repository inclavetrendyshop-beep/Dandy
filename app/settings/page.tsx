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
      .select("pref_min_age, pref_max_age, pref_max_distance")
      .eq("id", userData.user.id)
      .single();
    if (data) {
      setMinAge(data.pref_min_age);
      setMaxAge(data.pref_max_age);
      setMaxDistance(data.pref_max_distance);
    }
  }

  async function save() {
    if (!userId) return;
    await supabase
      .from("profiles")
      .update({ pref_min_age: minAge, pref_max_age: maxAge, pref_max_distance: maxDistance })
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
        <button className="primary" onClick={save}>{saved ? "Guardado ✓" : "Guardar filtros"}</button>
        <button onClick={logout} style={{ background: "none", border: "2px solid #9a9a9a", color: "#9a9a9a", borderRadius: 4, padding: 10 }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
