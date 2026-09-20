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

const FREE_MAX_DISTANCE_KM = 5;

export default function SwipeDeck() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [deck, setDeck] = useState<Profile[]>([]);
  const [matchName, setMatchName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [distanceCapped, setDistanceCapped] = useState(false);

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

    const { data: blocked } = await supabase
      .from("blocks")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${myProfile.id},blocked_id.eq.${myProfile.id}`);
    const blockedIds = (blocked || []).map((b) =>
      b.blocker_id === myProfile.id ? b.blocked_id : b.blocker_id
    );

    let query = supabase
      .from("profiles")
      .select("*")
      .neq("id", myProfile.id)
      .gte("age", myProfile.pref_min_age)
      .lte("age", myProfile.pref_max_age);

    const { data: candidates } = await query;

    const isPremium = !!myProfile.is_premium;
    const preferredMax = myProfile.pref_max_distance ?? FREE_MAX_DISTANCE_KM;
    const effectiveMaxDistance = isPremium ? preferredMax : Math.min(preferredMax, FREE_MAX_DISTANCE_KM);
    let cappedSomeone = false;

    const filtered = (candidates || []).filter((c) => {
      if (swipedIds.includes(c.id)) return false;
      if (blockedIds.includes(c.id)) return false;
      if (myProfile.lat && myProfile.lng && c.lat && c.lng) {
        const d = distanceKm(myProfile.lat, myProfile.lng, c.lat, c.lng);
        if (d > effectiveMaxDistance) {
          if (!isPremium && d <= preferredMax) cappedSomeone = true;
          return false;
        }
      }
      return true;
    });

    setDistanceCapped(!isPremium && cappedSomeone);
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

  async function handleBlock() {
    if (!me || deck.length === 0) return;
    const target = deck[0];
    if (!confirm("Bloquear a " + target.name + "? No volveras a ver este perfil.")) return;
    await supabase.from("blocks").insert({ blocker_id: me.id, blocked_id: target.id });
    setDeck((d) => d.slice(1));
  }

  async function handleReport() {
    if (!me || deck.length === 0) return;
    const target = deck[0];
    const reason = prompt("Por que quieres denunciar a " + target.name + "? (breve motivo)");
    if (reason === null) return;
    await supabase.from("reports").insert({ reporter_id: me.id, reported_id: target.id, reason });
    await supabase.from("blocks").insert({ blocker_id: me.id, blocked_id: target.id });
    alert("Gracias, hemos recibido tu denuncia.");
    setDeck((d) => d.slice(1));
  }

  if (loading) {
    return <div style={{ padding: 24, color: "#9a9a9a" }}>Cargando...</div>;
  }

  const current = deck[0];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span className="brand" style={{ fontSize: 24, color: "#e8352b" }}>Dandy</span>
        <div style={{ display: "flex", gap: 16 }}>
          <a href="/events" style={{ color: "#f5f5f5" }}>Eventos</a>
          <a href="/matches" style={{ color: "#f5f5f5" }}>Matches</a>
          <a href="/radio" style={{ color: "#f5f5f5" }}>Radio</a>
          <a href="/settings" style={{ color: "#f5f5f5" }}>Filtros</a>
        </div>
      </div>

      {matchName && (
        <div style={{ background: "#f2c14e", color: "#0d0d0d", border: "2px solid #f5f5f5", borderRadius: 4, padding: 16, marginBottom: 16, fontWeight: 700 }}>
          Nuevo match con {matchName}! <a href="/matches" style={{ textDecoration: "underline" }}>Ver chat</a>
          <button onClick={() => setMatchName(null)} style={{ float: "right", background: "none", border: "none", fontWeight: 700 }}>X</button>
        </div>
      )}

      {distanceCapped && (
        <div style={{ background: "#1e1e1e", border: "1px solid #c9a24b", borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13, color: "#f5f5f5", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span>Con la cuenta gratuita solo ves perfiles a menos de {FREE_MAX_DISTANCE_KM} km. Hay mas gente esperando un poco mas lejos.</span>
          <a href="/settings" style={{ flexShrink: 0, background: "#c9a24b", color: "#1a1a1a", fontWeight: 700, padding: "6px 14px", borderRadius: 8, fontSize: 12, textDecoration: "none", whiteSpace: "nowrap" }}>Hazte Premium</a>
        </div>
      )}

      {!current && (
        <div style={{ padding: 40, textAlign: "center", color: "#9a9a9a" }}>
          No hay mas perfiles por ahora. Ajusta tus filtros o vuelve mas tarde.
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
                  <span key={tag} style={{ background: "#2a2a2a", color: "#f2c14e", fontSize: 12, padding: "4px 10px", borderRadius: 20 }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
              <button onClick={handleBlock} style={{ background: "none", border: "none", color: "#9a9a9a", fontSize: 12, cursor: "pointer", padding: 0 }}>
                Bloquear
              </button>
              <button onClick={handleReport} style={{ background: "none", border: "none", color: "#9a9a9a", fontSize: 12, cursor: "pointer", padding: 0 }}>
                Denunciar
              </button>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, padding: 16, borderTop: "2px solid #2a2a2a" }}>
            <button onClick={() => handleSwipe("pass")} style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid #9a9a9a", background: "none", color: "#9a9a9a", fontSize: 20 }}>
              X
              </button>
              <button onClick={() => handleSwipe("like")} style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid #e8352b", background: "#e8352b", color: "#fff", fontSize: 20 }}>
              Like
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
           
