"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Liker = {
  id: string;
  name: string;
  age: number;
  city: string;
  photos: string[];
  liked_at: string;
};

export default function Likes() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [likers, setLikers] = useState<Liker[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [matchName, setMatchName] = useState<string | null>(null);

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

    const { data: theirLikes } = await supabase
      .from("swipes")
      .select("swiper_id, created_at")
      .eq("swiped_id", myProfile.id)
      .eq("action", "like")
      .order("created_at", { ascending: false });

    const { data: mySwipes } = await supabase
      .from("swipes")
      .select("swiped_id")
      .eq("swiper_id", myProfile.id);
    const alreadyAnswered = new Set((mySwipes || []).map((s) => s.swiped_id));

    const pending = (theirLikes || []).filter((l) => !alreadyAnswered.has(l.swiper_id));
    setTotalCount(pending.length);

    if (!myProfile.is_premium) {
      setLoading(false);
      return;
    }

    if (pending.length === 0) {
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, age, city, photos")
      .in("id", pending.map((p) => p.swiper_id));

    const merged = pending
      .map((p) => {
        const prof = (profiles || []).find((pr) => pr.id === p.swiper_id);
        if (!prof) return null;
        return { ...prof, liked_at: p.created_at } as Liker;
      })
      .filter(Boolean) as Liker[];

    setLikers(merged);
    setLoading(false);
  }

  async function respond(liker: Liker, action: "like" | "pass") {
    if (!me || actingOn) return;
    setActingOn(liker.id);

    await supabase.from("swipes").insert({ swiper_id: me.id, swiped_id: liker.id, action });

    if (action === "like") {
      const orFilter = "and(user1_id.eq." + me.id + ",user2_id.eq." + liker.id + "),and(user1_id.eq." + liker.id + ",user2_id.eq." + me.id + ")";
      const { data: existingMatch } = await supabase
        .from("matches")
        .select("id")
        .or(orFilter)
        .maybeSingle();
      if (!existingMatch) {
        const { data: newMatch } = await supabase
          .from("matches")
          .insert({ user1_id: me.id, user2_id: liker.id })
          .select()
          .single();
        if (newMatch) {
          if (me.match_reveal_photo_url) {
            await supabase.from("messages").insert({
              match_id: newMatch.id,
              sender_id: me.id,
              image_url: me.match_reveal_photo_url,
            });
          }
        }
      }
      setMatchName(liker.name);
    }

    setLikers((prev) => prev.filter((l) => l.id !== liker.id));
    setTotalCount((c) => Math.max(0, c - 1));
    setActingOn(null);
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

      <h1 style={{ fontSize: 18, marginBottom: 4 }}>Likes recibidos</h1>
      <p style={{ fontSize: 13, color: "#9a9a9a", marginBottom: 16 }}>Personas a las que aun no has respondido y que ya te han dado like.</p>

      {matchName && (
        <div style={{ background: "#f2c14e", color: "#0d0d0d", border: "2px solid #f5f5f5", borderRadius: 4, padding: 16, marginBottom: 16, fontWeight: 700 }}>
          Nuevo match con {matchName}! <a href="/matches" style={{ textDecoration: "underline" }}>Ver chat</a>
          <button onClick={() => setMatchName(null)} style={{ float: "right", background: "none", border: "none", fontWeight: 700 }}>X</button>
        </div>
      )}

      {!me?.is_premium ? (
        <div style={{ border: "1px solid #c9a24b", borderRadius: 8, padding: 20, textAlign: "center" }}>
          <p style={{ fontSize: 32, fontWeight: 700, color: "#f2c14e", marginBottom: 8 }}>
            {totalCount > 0 ? totalCount : "?"}
          </p>
          <p style={{ fontSize: 13, color: "#f5f5f5", marginBottom: 16 }}>
            {totalCount > 0
              ? "personas te han dado like. Hazte Premium para ver quienes son y responder."
              : "Hazte Premium para ver quien te da like antes de hacer swipe."}
          </p>
          <a href="/settings" style={{ background: "#f2c14e", color: "#0d0d0d", fontWeight: 700, padding: "10px 20px", borderRadius: 20, textDecoration: "none", fontSize: 13 }}>
            Hazte Premium
          </a>
        </div>
      ) : likers.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9a9a9a" }}>
          Nadie te ha dado like todavia.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {likers.map((l) => (
            <div key={l.id} style={{ borderRadius: 8, overflow: "hidden", background: "#171717", border: "1px solid #2a2a2a" }}>
              <div style={{ width: "100%", aspectRatio: "1 / 1", background: "#1e6fd9" }}>
                {l.photos?.[0] ? (
                  <img src={l.photos[0]} alt={l.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#fff", fontSize: 12 }}>
                    Sin foto
                  </div>
                )}
              </div>
              <div style={{ padding: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {l.name}, {l.age}
                </p>
                <p style={{ fontSize: 11, color: "#9a9a9a", marginBottom: 8 }}>Hace {timeAgo(l.liked_at)}</p>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => respond(l, "pass")}
                    disabled={actingOn === l.id}
                    style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "1px solid #9a9a9a", background: "none", color: "#9a9a9a", fontSize: 12, cursor: "pointer" }}
                  >
                    Pasar
                  </button>
                  <button
                    onClick={() => respond(l, "like")}
                    disabled={actingOn === l.id}
                    style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "1px solid #e8352b", background: "#e8352b", color: "#fff", fontSize: 12, cursor: "pointer" }}
                  >
                    Like
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

