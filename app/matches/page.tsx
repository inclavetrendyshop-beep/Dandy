"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Matches() {
  const router = useRouter();
  const [matches, setMatches] = useState<any[]>([]);
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
    const myId = userData.user.id;
    const { data } = await supabase
      .from("matches")
      .select("id, user1_id, user2_id")
      .or(`user1_id.eq.${myId},user2_id.eq.${myId}`);

    const withProfiles = await Promise.all(
      (data || []).map(async (m) => {
        const otherId = m.user1_id === myId ? m.user2_id : m.user1_id;
        const { data: profile } = await supabase.from("profiles").select("name, photos").eq("id", otherId).single();
        return { matchId: m.id, name: profile?.name, photo: profile?.photos?.[0] };
      })
    );
    setMatches(withProfiles);
    setLoading(false);
  }

  if (loading) return <div style={{ padding: 24, color: "#9a9a9a" }}>Cargando...</div>;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <a href="/" style={{ color: "#f5f5f5" }}>← Volver</a>
        <span className="brand" style={{ fontSize: 20, color: "#f2c14e" }}>Matches</span>
      </div>
      {matches.length === 0 && <p style={{ color: "#9a9a9a" }}>Todavía no tienes matches.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {matches.map((m) => (
          <a
            key={m.matchId}
            href={`/chat/${m.matchId}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 12,
              border: "2px solid #2a2a2a",
              borderRadius: 4,
              color: "#f5f5f5",
              textDecoration: "none",
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#1e6fd9", overflow: "hidden", flexShrink: 0 }}>
              {m.photo && <img src={m.photo} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            </div>
            <span style={{ fontWeight: 700 }}>{m.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
