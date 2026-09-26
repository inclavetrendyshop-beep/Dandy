"use client";
import { useEffect, useRef, useState } from "react";
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
  verification_status?: string;
  age_verification_status?: string;
  last_active_at?: string;
  looking_now?: boolean;
  is_traveling?: boolean;
  traveling_city?: string;
};

const FREE_MAX_DISTANCE_KM = 5;
const ONLINE_WINDOW_MINUTES = 15;

declare global {
  interface Window {
    L: any;
  }
}

type Tab = "cercanos" | "conectados" | "favoritos" | "mapa";

export default function Nearby() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [people, setPeople] = useState<Profile[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("cercanos");
  const [selected, setSelected] = useState<Profile | null>(null);
  const [matchName, setMatchName] = useState<string | null>(null);

  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (tab === "mapa" && me) {
      loadLeaflet();
    }
  }, [tab, me]);

  useEffect(() => {
    if (mapReady) {
      drawMarkers();
    }
  }, [mapReady, people]);

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

    const { data: blocked } = await supabase
      .from("blocks")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${myProfile.id},blocked_id.eq.${myProfile.id}`);
    const blockedIds = (blocked || []).map((b) =>
      b.blocker_id === myProfile.id ? b.blocked_id : b.blocker_id
    );

    const { data: favs } = await supabase
      .from("favorites")
      .select("favorite_id")
      .eq("user_id", myProfile.id);
    setFavoriteIds((favs || []).map((f) => f.favorite_id));

    const { data: candidates } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", myProfile.id);

    const isPremium = !!myProfile.is_premium;
    const preferredMax = myProfile.pref_max_distance ?? FREE_MAX_DISTANCE_KM;
    const effectiveMaxDistance = isPremium ? preferredMax : Math.min(preferredMax, FREE_MAX_DISTANCE_KM);

    const withDistance = (candidates || [])
      .filter((c) => !blockedIds.includes(c.id))
      .map((c) => {
        const d = myProfile.lat && myProfile.lng && c.lat && c.lng
          ? distanceKm(myProfile.lat, myProfile.lng, c.lat, c.lng)
          : null;
        return { ...c, __distance: d };
      })
      .filter((c) => c.__distance === null || c.__distance <= effectiveMaxDistance)
      .sort((a, b) => {
        const da = a.__distance ?? Infinity;
        const db = b.__distance ?? Infinity;
        return da - db;
      });

    setPeople(withDistance);
    setLoading(false);
  }

  function isOnline(p: Profile) {
    if (!p.last_active_at) return false;
    const diffMin = (Date.now() - new Date(p.last_active_at).getTime()) / 60000;
    return diffMin <= ONLINE_WINDOW_MINUTES;
  }

  function formatDistance(p: any) {
    if (p.__distance === null || p.__distance === undefined) return null;
    if (p.__distance < 1) return Math.round(p.__distance * 1000) + " m";
    return p.__distance.toFixed(1).replace(".", ",") + " km";
  }

  async function openProfile(p: Profile) {
    setSelected(p);
    if (me && p.id !== me.id) {
      await supabase.from("profile_views").insert({ viewer_id: me.id, viewed_id: p.id });
    }
  }

  async function toggleFavorite(profileId: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!me) return;
    const isFav = favoriteIds.includes(profileId);
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", me.id).eq("favorite_id", profileId);
      setFavoriteIds((prev) => prev.filter((id) => id !== profileId));
    } else {
      await supabase.from("favorites").insert({ user_id: me.id, favorite_id: profileId });
      setFavoriteIds((prev) => [...prev, profileId]);
    }
  }

  async function handleLike(target: Profile) {
    if (!me) return;
    await supabase.from("swipes").insert({ swiper_id: me.id, swiped_id: target.id, action: "like" });

    const { data: theirSwipe } = await supabase
      .from("swipes")
      .select("*")
      .eq("swiper_id", target.id)
      .eq("swiped_id", me.id)
      .eq("action", "like")
      .maybeSingle();

    if (theirSwipe) {
      setMatchName(target.name);
      const orFilter = "and(user1_id.eq." + me.id + ",user2_id.eq." + target.id + "),and(user1_id.eq." + target.id + ",user2_id.eq." + me.id + ")";
      const { data: existingMatch } = await supabase
        .from("matches")
        .select("id")
        .or(orFilter)
        .maybeSingle();
      if (!existingMatch) {
        const { data: newMatch } = await supabase
          .from("matches")
          .insert({ user1_id: me.id, user2_id: target.id })
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
          if (target.match_reveal_photo_url) {
            await supabase.from("messages").insert({
              match_id: newMatch.id,
              sender_id: target.id,
              image_url: target.match_reveal_photo_url,
            });
          }
        }
      }
    }
    setSelected(null);
  }

  async function handlePass(target: Profile) {
    if (!me) return;
    await supabase.from("swipes").insert({ swiper_id: me.id, swiped_id: target.id, action: "pass" });
    setSelected(null);
  }

  function loadLeaflet() {
    if (window.L) {
      setupMap();
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setupMap();
    document.body.appendChild(script);
  }

  function setupMap() {
    if (!mapDivRef.current || mapRef.current || !me) return;
    const L = window.L;
    const startLat = me.lat || 40.4168;
    const startLng = me.lng || -3.7038;

    const map = L.map(mapDivRef.current).setView([startLat, startLng], 12);
    const tileLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    const tilePane = map.getPane("tilePane");
    if (tilePane) {
      tilePane.style.filter = "invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9) saturate(0.6)";
    }

    L.circleMarker([startLat, startLng], {
      radius: 8,
      color: "#f2c14e",
      fillColor: "#f2c14e",
      fillOpacity: 1,
    }).addTo(map).bindPopup("Tu ubicacion");

    mapRef.current = map;
    setMapReady(true);
  }

  function drawMarkers() {
    const L = window.L;
    if (!L || !mapRef.current) return;

    markersRef.current.forEach((m) => mapRef.current.removeLayer(m));
    markersRef.current = [];

    const lookingNow = people.filter((p) => p.looking_now && p.lat && p.lng);

    lookingNow.forEach((p) => {
      const marker = L.circleMarker([p.lat as number, p.lng as number], {
        radius: 9,
        color: "#e8352b",
        fillColor: "#e8352b",
        fillOpacity: 0.9,
      }).addTo(mapRef.current);

      marker.bindPopup(
        "<strong>" + p.name + ", " + p.age + "</strong><br/>" + (p.city || "")
      );
      marker.on("click", () => setSelected(p));
      markersRef.current.push(marker);
    });
  }

  if (loading) {
    return <div style={{ padding: 24, color: "#9a9a9a" }}>Cargando...</div>;
  }

  const visible = people.filter((p) => {
    if (tab === "conectados") return isOnline(p);
    if (tab === "favoritos") return favoriteIds.includes(p.id);
    return true;
  });

  const lookingNowCount = people.filter((p) => p.looking_now).length;

  return (
    <div style={{ padding: 16, paddingBottom: 48 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span className="brand" style={{ fontSize: 24, color: "#e8352b" }}>Dandy</span>
        <a href="/" style={{ color: "#f5f5f5" }}>Volver</a>
      </div>

      <h1 style={{ fontSize: 18, marginBottom: 16 }}>Cercanos</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { key: "cercanos", label: "Cercanos" },
          { key: "conectados", label: "Conectados" },
          { key: "favoritos", label: "Favoritos" },
          { key: "mapa", label: "Mapa" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as Tab)}
            style={{
              flex: "1 1 45%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid " + (tab === t.key ? "#e8352b" : "#2a2a2a"),
              background: tab === t.key ? "#e8352b" : "none",
              color: "#f5f5f5",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {matchName && (
        <div style={{ background: "#f2c14e", color: "#0d0d0d", border: "2px solid #f5f5f5", borderRadius: 4, padding: 16, marginBottom: 16, fontWeight: 700 }}>
          Nuevo match con {matchName}! <a href="/matches" style={{ textDecoration: "underline" }}>Ver chat</a>
          <button onClick={() => setMatchName(null)} style={{ float: "right", background: "none", border: "none", fontWeight: 700 }}>X</button>
        </div>
      )}

      {tab === "mapa" && (
        <>
          <p style={{ fontSize: 13, color: "#9a9a9a", marginBottom: 12 }}>
            {lookingNowCount > 0
              ? "Mostrando " + lookingNowCount + " persona" + (lookingNowCount === 1 ? "" : "s") + " que busca ahora cerca de ti. Toca un punto para ver el perfil."
              : "Nadie tiene activado 'Busco ahora' cerca de ti en este momento."}
          </p>
          <div
            ref={mapDivRef}
            style={{ width: "100%", height: 420, borderRadius: 8, border: "2px solid #2a2a2a", background: "#171717" }}
          />
          {!mapReady && (
            <p style={{ fontSize: 12, color: "#9a9a9a", marginTop: 8 }}>Cargando mapa...</p>
          )}
        </>
      )}

      {tab !== "mapa" && (
        <>
          {visible.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#9a9a9a" }}>
              {tab === "favoritos" ? "Aun no has marcado ningun favorito." : "No hay nadie que mostrar ahora mismo."}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {visible.map((p: any) => (
              <div
                key={p.id}
                onClick={() => openProfile(p)}
                style={{ position: "relative", borderRadius: 8, overflow: "hidden", background: "#171717", border: "1px solid #2a2a2a", cursor: "pointer" }}
              >
                <div style={{ width: "100%", aspectRatio: "1 / 1", background: "#1e6fd9" }}>
                  {p.photos?.[0] ? (
                    <img src={p.photos[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#fff", fontSize: 12 }}>
                      Sin foto
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => toggleFavorite(p.id, e)}
                  title="Marcar favorito"
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(13,13,13,0.7)",
                    color: favoriteIds.includes(p.id) ? "#e8352b" : "#f5f5f5",
                    fontSize: 15,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {favoriteIds.includes(p.id) ? "♥" : "♡"}
                </button>

                {isOnline(p) ? (
                  <span style={{ position: "absolute", top: 6, left: 6, background: "#4bc97a", color: "#0a0a0a", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 20 }}>
                    ● En linea
                  </span>
                ) : (
                  <span style={{ position: "absolute", top: 6, left: 6, background: "rgba(30,30,30,0.85)", color: "#9a9a9a", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 20 }}>
                    ● Desconectado
                  </span>
                )}

                <div style={{ padding: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.name}, {p.age}
                  </p>
                  <p style={{ fontSize: 11, color: "#9a9a9a" }}>
                    {formatDistance(p) || p.city}
                    {p.is_traveling && <span style={{ marginLeft: 4 }}>✈️</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 480, background: "#171717", borderRadius: "16px 16px 0 0", overflow: "hidden", maxHeight: "85vh", overflowY: "auto" }}
          >
            <div style={{ height: 320, background: "#1e6fd9", position: "relative" }}>
              {selected.photos?.[0] ? (
                <img src={selected.photos[0]} alt={selected.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#fff" }}>
                  Sin foto
                </div>
              )}
              <button
                onClick={() => setSelected(null)}
                style={{ position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(13,13,13,0.7)", color: "#fff", fontSize: 16, cursor: "pointer" }}
              >
                X
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {selected.name}, {selected.age}
                {selected.verification_status === "approved" && (
                  <span style={{ background: "#1e6fd9", color: "#fff", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
                    Verificado ✓
                  </span>
                )}
              </p>
              <p style={{ fontSize: 13, color: "#9a9a9a" }}>
                {formatDistance(selected as any) || selected.city}
                {selected.is_traveling && (
                  <span title={"Viajando" + (selected.traveling_city ? " en " + selected.traveling_city : "")} style={{ marginLeft: 6 }}>
                    ✈️
                  </span>
                )}
              </p>
              <p style={{ fontSize: 12, marginTop: 4, color: isOnline(selected) ? "#4bc97a" : "#9a9a9a", fontWeight: 700 }}>
                {isOnline(selected) ? "● En linea" : "● Desconectado"}
              </p>
              <p style={{ marginTop: 8 }}>{selected.bio}</p>
              {selected.tags?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {selected.tags.map((tag) => (
                    <span key={tag} style={{ background: "#2a2a2a", color: "#f2c14e", fontSize: 12, padding: "4px 10px", borderRadius: 20 }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 20 }}>
                <button onClick={() => handlePass(selected)} style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid #9a9a9a", background: "none", color: "#9a9a9a", fontSize: 20 }}>
                  X
                </button>
                <button onClick={() => toggleFavorite(selected.id)} style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid #f2c14e", background: "none", color: "#f2c14e", fontSize: 20 }}>
                  {favoriteIds.includes(selected.id) ? "♥" : "♡"}
                </button>
                <button onClick={() => handleLike(selected)} style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid #e8352b", background: "#e8352b", color: "#fff", fontSize: 20 }}>
                  Like
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

