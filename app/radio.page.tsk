"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const SHOWS = [
  {
    title: "Tribute to Larry Levan & The Paradise Garage — Pt. 5",
    dj: "Omar Abdallah",
    feed: "/djomarabdallah/tribute-to-larry-levan-the-paradise-garage-part-5/",
  },
  {
    title: "Larry Levan Live at the Paradise Garage (1979)",
    dj: "Amore Music Experience",
    feed: "/amemgmt/larry-levan-live-at-the-paradise-garage-1979/",
  },
  {
    title: "Larry Levan Live @ The Paradise Garage — Closing Night",
    dj: "djmixes",
    feed: "/djmixes/larry-levan-live-the-paradise-garage-closing-night-party-1987/",
  },
  {
    title: "Live at the Paradise Garage — Larry Levan",
    dj: "Soul Cool Records",
    feed: "/SoulCoolRecords/live-at-the-paradise-garage-larry-levan/",
  },
];

export default function Radio() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", userData.user.id)
      .single();
    if (!myProfile) {
      router.push("/onboarding");
      return;
    }
    setIsPremium(!!myProfile.is_premium);
    setLoading(false);
  }

  if (loading) {
    return <div style={{ padding: 24, color: "#9a9a9a" }}>Cargando...</div>;
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span className="brand" style={{ fontSize: 24, color: "#e8352b" }}>Dandy</span>
        <a href="/" style={{ color: "#f5f5f5" }}>← Volver</a>
      </div>

      <h1 style={{ fontSize: 20, color: "#c9a24b", marginBottom: 4 }}>Dandy Radio</h1>
      <p style={{ fontSize: 13, color: "#9a9a9a", marginBottom: 20 }}>
        El espíritu del Paradise Garage: mixes tributo a Larry Levan y a la era del garage house de David Mancuso, vía Mixcloud.
      </p>

      {!isPremium && (
        <div
          style={{
            border: "1px solid #c9a24b",
            borderRadius: 10,
            padding: 24,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 16, color: "#f5f5f5", marginBottom: 8 }}>Dandy Radio es una función Premium</p>
          <p style={{ fontSize: 13, color: "#9a9a9a", marginBottom: 16 }}>
            Hazte Premium para escuchar la emisora sin límites, además de ver perfiles sin límite de distancia.
          </p>
          
            href="/settings"
            style={{
              display: "inline-block",
              background: "#c9a24b",
              color: "#1a1a1a",
              fontWeight: 700,
              padding: "10px 24px",
              borderRadius: 8,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Hazte Premium
          </a>
        </div>
      )}

      {isPremium && (
        <div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {SHOWS.map((show, i) => (
              <button
                key={show.feed}
                onClick={() => setCurrent(i)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: "2px solid " + (current === i ? "#e8352b" : "#2a2a2a"),
                  background: current === i ? "#e8352b" : "transparent",
                  color: "#f5f5f5",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {show.dj}
              </button>
            ))}
          </div>

          <div style={{ border: "2px solid #2a2a2a", borderRadius: 8, overflow: "hidden", background: "#171717" }}>
            <div style={{ padding: 14 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#f5f5f5" }}>{SHOWS[current].title}</p>
              <p style={{ fontSize: 12, color: "#9a9a9a" }}>{SHOWS[current].dj} · vía Mixcloud</p>
            </div>
            <iframe
              key={SHOWS[current].feed}
              title={SHOWS[current].title}
              width="100%"
              height="120"
              src={
                "https://www.mixcloud.com/widget/iframe/?hide_cover=1&light=0&feed=" +
                encodeURIComponent(SHOWS[current].feed)
              }
              frameBorder="0"
              allow="autoplay"
            />
          </div>
        </div>
      )}
    </div>
  );
}
