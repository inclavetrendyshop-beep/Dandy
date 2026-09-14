"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Event = {
  id: string;
  name: string;
  date: string;
  time: string;
  image: string;
  venue: string;
  city: string;
  category: string;
  url: string;
};

export default function Events() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load(kw = "") {
    setLoading(true);
    setError("");
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("lat, lng, city").eq("id", userData.user.id).single();

    if (!profile?.lat || !profile?.lng) {
      setError("No tenemos tu ubicación guardada. Activa la ubicación al crear tu perfil para ver eventos cerca de ti.");
      setLoading(false);
      return;
    }

    const params = new URLSearchParams({ lat: String(profile.lat), lng: String(profile.lng) });
    if (kw) params.set("keyword", kw);

    const res = await fetch(`/api/events?${params.toString()}`);
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setEvents(data.events);
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <a href="/" style={{ color: "#f5f5f5" }}>← Volver</a>
        <span className="brand" style={{ fontSize: 20, color: "#e8352b" }}>Eventos</span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(keyword);
        }}
        style={{ display: "flex", gap: 8, marginBottom: 16 }}
      >
        <input placeholder="Buscar (ej: fiesta, jazz, arte)" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <button className="primary" type="submit">Buscar</button>
      </form>

      {loading && <p style={{ color: "#9a9a9a" }}>Cargando eventos...</p>}
      {error && <p style={{ color: "#9a9a9a" }}>{error}</p>}
      {!loading && !error && events.length === 0 && <p style={{ color: "#9a9a9a" }}>No encontramos eventos cerca de ti por ahora.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {events.map((ev) => (
          <a
            key={ev.id}
            href={ev.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              gap: 12,
              border: "2px solid #2a2a2a",
              borderRadius: 8,
              overflow: "hidden",
              textDecoration: "none",
              color: "#f5f5f5",
            }}
          >
            <div style={{ width: 90, height: 90, background: "#1e6fd9", flexShrink: 0 }}>
              {ev.image && <img src={ev.image} alt={ev.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            </div>
            <div style={{ padding: 8, flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 14 }}>{ev.name}</p>
              <p style={{ fontSize: 12, color: "#9a9a9a" }}>{ev.date} {ev.time ? "· " + ev.time : ""}</p>
              <p style={{ fontSize: 12, color: "#9a9a9a" }}>{ev.venue}{ev.city ? ", " + ev.city : ""}</p>
              {ev.category && (
                <span style={{ display: "inline-block", marginTop: 4, background: "#2a2a2a", color: "#f2c14e", fontSize: 11, padding: "2px 8px", borderRadius: 20 }}>
                  {ev.category}
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
