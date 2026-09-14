"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, distanceKm } from "@/lib/supabase";

type Profile = {
  id: string;
  name: string;
  age: number;
  bio: string;
  city: string;
  tags: string[];
  photos: string[];
  lat: number | null;
  lng: number | null;
};

export default function SwipeDeck() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [deck, setDeck] = useState<Profile[]>([]);
  const [matchName, setMatchName] = useState<string | null>(null);
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

    const { data: swiped } = await supabase.from("swipes").select("swiped_id").eq("swiper_id", myProfile.id);
    const swipedIds = (swiped || []).map((s) => s.swiped_id);

    let query = supabase
      .from("profiles")
      .select("*")
      .neq("id", myProfile.id)
      .gte("age", myProfile.pref_min_age)
      .lte("age", myProfile.pref_max_age);

    const { data: candidates } = await query;

    const filtered = (candidates || []).filter((c) => {
      if (swipedIds.includes(c.id)) return false;
      if (myProfile.lat && myProfile.lng && c.lat && c.lng) {
        const d = distanceKm(myProfile.lat, myProfile.lng, c.lat, c.lng);
        if (d > myProfile.pref_max_distance) return false;
      }
      return true;
    });

    setDeck(filtered);
    setLoading(false);
  }

  async function handleSwipe(action: "like" | "pass") {
    if (!me || deck.length === 0) return;
    const target = deck[0];
    await supabase.from("swipes").insert({ swiper_id: me.id, swiped_id: target.id, action });

    if (action === "like") {
      const { data: theirSwipe } = await supabase
        .from("swipes")
        .select("*")
        .eq("swiper_id", target.id)
        .eq("swiped_id", me.id)
        .eq("action", "like")
        .maybeSingle();
      if (theirSwipe) {
        setMatchName(target.name);
      }
    }
    setDeck((d) => d.slice(1));
  }

  if (loading) return <div style={{ padding: 24, color: "#9a9a9a" }}>Cargando...</div>;

  const current = deck[0];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span className="brand" style={{ fontSize: 24, color: "#e8352b" }}>Dandy</span>
        <div style={{ display: "flex", gap: 16 }}>
          <a href="/events" style={{ color: "#f5f5f5" }}>Eventos</a>
          <a href="/matches" style={{ color: "#f5f5f5" }}>Matches</a>
          <a href="/settings" style={{ color: "#f5f5f5" }}>Filtros</a>
        </div>
      </div>

      {matchName && (
        <div
          style={{
            background: "#f2c14e",
            color: "#0d0d0d",
            border: "2px solid #f5f5f5",
            borderRadius: 4,
            padding: 16,
            marginBottom: 16,
            fontWeight: 700,
          }}
        >
          ¡Nuevo match con {matchName}! <a href="/matches" style={{ textDecoration: "underline" }}>Ver chat</a>
          <button onClick={() => setMatchName(null)} style={{ float: "right", background: "none", border: "none", fontWeight: 700 }}>✕</button>
        </div>
      )}

      {!current && (
        <div style={{ padding: 40, textAlign: "center", color: "#9a9a9a" }}>
          No hay más perfiles por ahora. Ajusta tus filtros o vuelve más tarde.
        </div>
      )}

      {current && (
        <div style={{ border: "2px solid #f5f5f5", borderRadius: 8, overflow: "hidden", background: "#171717" }}>
          <div style={{ height: 380, background: "#1e6fd9", position: "relative" }}>
            {current.photos?.[0] ? (
              <img src={current.photos[0]} alt={current.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#fff" }}>
                Sin foto
              </div>
            )}
          </div>
          <div style={{ padding: 16 }}>
            <p style={{ fontSize: 20, fontWeight: 700 }}>{current.name}, {current.age}</p>
            <p style={{ fontSize: 13, color: "#9a9a9a" }}>{current.city}</p>
            <p style={{ marginTop: 8 }}>{current.bio}</p>
            {current.tags?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {current.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{ background: "#2a2a2a", color: "#f2c14e", fontSize: 12, padding: "4px 10px", borderRadius: 20 }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, padding: 16, borderTop: "2px solid #2a2a2a" }}>
            <button
              onClick={() => handleSwipe("pass")}
              style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid #9a9a9a", background: "none", color: "#9a9a9a", fontSize: 20 }}
            >
              ✕
            </button>
            <button
              onClick={() => handleSwipe("like")}
              style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid #e8352b", background: "#e8352b", color: "#fff", fontSize: 20 }}
            >
              ♥
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
