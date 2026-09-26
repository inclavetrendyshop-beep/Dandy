"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Trending = {
  id: string;
  name: string;
  age: number;
  city: string;
  photos: string[];
  views: number;
};

const WINDOW_DAYS = 7;
const TOP_N = 20;

export default function Trending() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [profiles, setProfiles] = useState<Trending[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }
    const { data: myProfile } = await supabase.from("profiles").select("*").eq("id", userData.user.id).single();
    if (!myProfile) {
      router.push("/onboarding");
      return;
    }
    setMe(myProfile);

    if (!myProfile.is_premium) {
      setLoading(false);
      return;
    }

    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: views } = await supabase
      .from("profile_views")
      .select("viewed_id")
      .gte("created_at", since)
      .limit(5000);

    const counts: Record<string, number> = {};
    (views || []).forEach((v) => {
      counts[v.viewed_id] = (counts[v.viewed_id] || 0) + 1;
    });

    const topIds = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([id]) => id);

    if (topIds.length === 0) {
      setLoading(false);
      return;
    }

    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, name, age, city, photos")
      .in("id", topIds);

    const merged = topIds
      .map((id) => {
        const p = (profileRows || []).find((pr) => pr.id === id);
        if (!p) return null;
        return { ...p, views: counts[id] } as Trending;
      })
      .filter(Boolean) as Trending[];

    setProfiles(merged);
    setLoading(false);
  }

  if (loading) {
    return <div style={{ padding: 24, color: "#9a9a9a" }}>Cargando...</div>;
  }

  return (
    <div style={{ padding: 16, paddingBottom: 48 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span className="brand" style={{ fontSize: 24, color: "#e8352b" }}>Dandy</span>
        <a href="/" style={{ color: "#f5f5f5" }}>Volver</a>
      </div>

      <h1 style={{ fontSize: 18, marginBottom: 4 }}>Tendencias</h1>
      <p style={{ fontSize: 13, color: "#9a9a9a", marginBottom: 16 }}>Los perfiles mas vistos del mundo esta semana.</p>

      {!me?.is_premium ? (
        <div style={{ border: "1px solid #c9a24b", borderRadius: 8, padding: 20, textAlign: "center" }}>
          <p style={{ fontSize: 28, marginBottom: 8 }}>🌍🔥</p>
          <p style={{ fontSize: 13, color: "#f5f5f5", marginBottom: 16 }}>
            Descubre los perfiles con mas visitas a nivel mundial. Funcion exclusiva Premium.
          </p>
          <a href="/settings" style={{ background: "#f2c14e", color: "#0d0d0d", fontWeight: 700, padding: "10px 20px", borderRadius: 20, textDecoration: "none", fontSize: 13 }}>
            Hazte Premium
          </a>
        </div>
      ) : profiles.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9a9a9a" }}>
          Todavia no hay suficiente actividad para mostrar tendencias.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {profiles.map((p, i) => (
            <div key={p.id} style={{ position: "relative", borderRadius: 8, overflow: "hidden", background: "#171717", border: "1px solid #2a2a2a" }}>
              <div style={{ width: "100%", aspectRatio: "1 / 1", background: "#1e6fd9" }}>
                {p.photos?.[0] ? (
                  <img src={p.photos[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#fff", fontSize: 12 }}>
                    Sin foto
                  </div>
                )}
              </div>
              <span style={{ position: "absolute", top: 6, left: 6, background: "#e8352b", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
                #{i + 1}
              </span>
              <div style={{ padding: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.name}, {p.age}
                </p>
                <p style={{ fontSize: 11, color: "#9a9a9a" }}>{p.views} visitas esta semana</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

