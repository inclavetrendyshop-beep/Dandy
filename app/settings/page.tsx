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
  country: string | null;
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
      if (myProfile.country && c.country && myProfile.country !== c.country) return false;
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

  if (loading) {
    return (
      <div className="dandy-splash">
        <div className="mark">
          <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <path d="M 10 22 C 10 42, 24 54, 32 54 C 40 54, 54 42, 54 22" />
          </svg>
        </div>
        <h1 className="wordmark">Dandy</h1>
        <div className="rule" />
        <p className="tagline">Para hombres con carácter, barba<br />y algo de historia que contar.</p>
        <style jsx>{`
          .dandy-splash {
            min-height: 100vh;
            background: #0d0d0d;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 48px 32px;
            text-align: center;
          }
          .mark {
            width: 56px;
            height: 56px;
            margin-bottom: 24px;
            opacity: 0;
            animation: markIn 1s ease-out 0.1s forwards;
          }
          .mark svg { width: 100%; height: 100%; }
          .mark path {
            fill: none;
            stroke: #e8352b;
            stroke-width: 1.3;
            stroke-linecap: round;
            stroke-dasharray: 220;
            stroke-dashoffset: 220;
            animation: draw 1.4s ease 0.25s forwards;
          }
          .wordmark {
            font-family: Georgia, "Times New Roman", serif;
            font-style: italic;
            font-weight: 500;
            font-size: 44px;
            color: #f5f5f5;
            margin: 0;
            opacity: 0;
            transform: translateY(8px);
            animation: fadeUp 0.8s ease 0.8s forwards;
          }
          .rule {
            width: 0;
            height: 1px;
            background: rgba(245,245,245,0.15);
            margin: 20px 0;
            animation: widen 0.7s ease 1.4s forwards;
          }
          .tagline {
            font-family: Georgia, serif;
            font-style: italic;
            font-size: 15px;
            line-height: 1.5;
            color: #9a9a9a;
            max-width: 260px;
            margin: 0;
            opacity: 0;
            animation: fadeUp 0.8s ease 1.7s forwards;
          }
          @keyframes markIn { to { opacity: 1; } }
          @keyframes draw { to { stroke-dashoffset: 0; } }
          @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
          @keyframes widen { to { width: 56px; } }
        `}</style>
      </div>
    );
  }

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
          <button onClick={() => setMatchName(null)} style={{ float: "right", background: "none", border: "none", color: "#0d0d0d", fontSize: 16, cursor: "pointer" }}>
            ×
          </button>
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
            <p style={{ fontSize: 13, color: "#9a9a9a" }}>{current.city}{current.country ? `, ${current.country}` : ""}</p>
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
              ×
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
