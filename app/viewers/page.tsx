"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Viewer = {
  id: string;
  name: string;
  age: number;
  city: string;
  photos: string[];
  viewed_at: string;
};

export default function Viewers() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
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

    const { data: views } = await supabase
      .from("profile_views")
      .select("viewer_id, created_at")
      .eq("viewed_id", myProfile.id)
      .order("created_at", { ascending: false })
      .limit(200);

    const rows = views || [];
    setTotalCount(rows.length);

    if (!myProfile.is_premium) {
      setLoading(false);
      return;
    }

    const seen = new Set<string>();
    const uniqueViewers: { id: string; viewed_at: string }[] = [];
    rows.forEach((v) => {
      if (v.viewer_id === myProfile.id) return;
      if (!seen.has(v.viewer_id)) {
        seen.add(v.viewer_id);
        uniqueViewers.push({ id: v.viewer_id, viewed_at: v.created_at });
      }
    });

    if (uniqueViewers.length === 0) {
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, age, city, photos")
      .in("id", uniqueViewers.map((v) => v.id));

    const merged = uniqueViewers
      .map((v) => {
        const p = (profiles || []).find((pr) => pr.id === v.id);
        if (!p) return null;
        return { ...p, viewed_at: v.viewed_at } as Viewer;
      })
      .filter(Boolean) as Viewer[];

    setViewers(merged);
    setLoading(false);
  }

  function timeAgo(iso: string) {
    const diffMin = (Date.now() - new Date(iso).getTime()) / 60000;
    if (diffMin < 60) return Math.max(1, Math.round(diffMin)) + " min";
    const diffH = diffMin / 60;
    if (diffH < 24) return Math.round(diffH) + " h";
    return Math.round(diffH / 24) + " d";
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

      <h1 style={{ fontSize: 18, marginBottom: 4 }}>Huellas</h1>
      <p style={{ fontSize: 13, color: "#9a9a9a", marginBottom: 16 }}>Quien ha visto tu perfil recientemente.</p>

      {!me?.is_premium ? (
        <div style={{ border: "1px solid #c9a24b", borderRadius: 8, padding: 20, textAlign: "center" }}>
          <p style={{ fontSize: 32, fontWeight: 700, color: "#f2c14e", marginBottom: 8 }}>
            {totalCount > 0 ? totalCount : "?"}
          </p>
          <p style={{ fontSize: 13, color: "#f5f5f5", marginBottom: 16 }}>
            {totalCount > 0
              ? "personas han visto tu perfil. Hazte Premium para ver quienes son."
              : "Hazte Premium para ver quien visita tu perfil."}
          </p>
          <a href="/settings" style={{ background: "#f2c14e", color: "#0d0d0d", fontWeight: 700, padding: "10px 20px", borderRadius: 20, textDecoration: "none", fontSize: 13 }}>
            Hazte Premium
          </a>
        </div>
      ) : viewers.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9a9a9a" }}>
          Todavia nadie ha visto tu perfil.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {viewers.map((v) => (
            <div key={v.id} style={{ borderRadius: 8, overflow: "hidden", background: "#171717", border: "1px solid #2a2a2a" }}>
              <div style={{ width: "100%", aspectRatio: "1 / 1", background: "#1e6fd9" }}>
                {v.photos?.[0] ? (
                  <img src={v.photos[0]} alt={v.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#fff", fontSize: 12 }}>
                    Sin foto
                  </div>
                )}
              </div>
              <div style={{ padding: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {v.name}, {v.age}
                </p>
                <p style={{ fontSize: 11, color: "#9a9a9a" }}>Hace {timeAgo(v.viewed_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
