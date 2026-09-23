"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type CityOption = { name: string; lat: number; lng: number };

const FEATURED_CITIES: CityOption[] = [
  { name: "Madrid", lat: 40.4168, lng: -3.7038 },
  { name: "Barcelona", lat: 41.3874, lng: 2.1686 },
  { name: "Ciudad de Mexico", lat: 19.4326, lng: -99.1332 },
  { name: "Buenos Aires", lat: -34.6037, lng: -58.3816 },
  { name: "Bogota", lat: 4.711, lng: -74.0721 },
  { name: "Miami", lat: 25.7617, lng: -80.1918 },
  { name: "Nueva York", lat: 40.7128, lng: -74.006 },
  { name: "Los Angeles", lat: 34.0522, lng: -118.2437 },
  { name: "Londres", lat: 51.5074, lng: -0.1278 },
  { name: "Berlin", lat: 52.52, lng: 13.405 },
  { name: "Amsterdam", lat: 52.3676, lng: 4.9041 },
  { name: "Sao Paulo", lat: -23.5505, lng: -46.6333 },
];

declare global {
  interface Window {
    L: any;
  }
}

export default function Travel() {
  const router = useRouter();
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [selected, setSelected] = useState<CityOption | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userData.user.id).single();
    if (!profile) {
      router.push("/onboarding");
      return;
    }

    if (profile.home_lat == null || profile.home_lng == null) {
      await supabase
        .from("profiles")
        .update({ home_lat: profile.lat, home_lng: profile.lng })
        .eq("id", profile.id);
      profile.home_lat = profile.lat;
      profile.home_lng = profile.lng;
    }

    setMe(profile);
    setLoading(false);
    loadLeaflet(profile);
  }

  function loadLeaflet(profile: any) {
    if (window.L) {
      setupMap(profile);
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setupMap(profile);
    document.body.appendChild(script);
  }

  function setupMap(profile: any) {
    if (!mapDivRef.current || mapRef.current) return;
    const L = window.L;
    const startLat = profile.lat || 40.4168;
    const startLng = profile.lng || -3.7038;

    const map = L.map(mapDivRef.current).setView([startLat, startLng], profile.is_traveling ? 5 : 11);
    const tileLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    const tilePane = map.getPane("tilePane");
    if (tilePane) {
      tilePane.style.filter = "invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9) saturate(0.6)";
    }

    const marker = L.marker([startLat, startLng]).addTo(map);
    markerRef.current = marker;
    mapRef.current = map;

    map.on("click", (e: any) => {
      if (!profile.is_premium) {
        setError("Viajar tocando el mapa es una funcion Premium. Hazte Premium para explorar libremente.");
        return;
      }
      setError("");
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      setSelected({ name: "Ubicacion personalizada", lat, lng });
    });

    setMapReady(true);
  }

  function flyTo(city: CityOption) {
    if (!me?.is_premium) {
      setError("Viajar a otras ciudades es una funcion Premium. Hazte Premium para explorar el mundo.");
      return;
    }
    setError("");
    setSelected(city);
    if (mapRef.current && markerRef.current) {
      mapRef.current.setView([city.lat, city.lng], 11);
      markerRef.current.setLatLng([city.lat, city.lng]);
    }
  }

  async function confirmTravel() {
    if (!me || !selected) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({
        lat: selected.lat,
        lng: selected.lng,
        is_traveling: true,
        traveling_city: selected.name,
      })
      .eq("id", me.id);
    setMe({ ...me, lat: selected.lat, lng: selected.lng, is_traveling: true, traveling_city: selected.name });
    setSelected(null);
    setSaving(false);
  }

  async function goHome() {
    if (!me) return;
    setSaving(true);
    const homeLat = me.home_lat;
    const homeLng = me.home_lng;
    await supabase
      .from("profiles")
      .update({ lat: homeLat, lng: homeLng, is_traveling: false, traveling_city: null })
      .eq("id", me.id);
    setMe({ ...me, lat: homeLat, lng: homeLng, is_traveling: false, traveling_city: null });
    setSelected(null);
    if (mapRef.current && markerRef.current && homeLat != null && homeLng != null) {
      mapRef.current.setView([homeLat, homeLng], 11);
      markerRef.current.setLatLng([homeLat, homeLng]);
    }
    setSaving(false);
  }

  function renderCityCard(city: CityOption) {
    const active = me?.is_traveling && me?.traveling_city === city.name;
    return (
      <button
        key={city.name}
        onClick={() => flyTo(city)}
        style={{
          background: active ? "#e8352b" : "#171717",
          border: "1px solid " + (active ? "#e8352b" : "#2a2a2a"),
          color: "#f5f5f5",
          borderRadius: 8,
          padding: "8px 14px",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {city.name}
      </button>
    );
  }

  if (loading) {
    return <div style={{ padding: 24, color: "#9a9a9a" }}>Cargando...</div>;
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span className="brand" style={{ fontSize: 24, color: "#e8352b" }}>Dandy</span>
        <a href="/" style={{ color: "#f5f5f5" }}>{"←"} Volver</a>
      </div>

      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Viajar</h1>
      <p style={{ fontSize: 13, color: "#9a9a9a", marginBottom: 16 }}>
        Explora perfiles en cualquier parte del mundo. Elige una ciudad destacada o toca el mapa donde quieras aparecer.
      </p>

      {me?.is_traveling && (
        <div style={{ background: "#1e1e1e", border: "1px solid #c9a24b", borderRadius: 8, padding: 12, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
          <span>{"🌍"} Viajando ahora en {me.traveling_city || "una ubicacion personalizada"}</span>
          <button
            onClick={goHome}
            disabled={saving}
            style={{ background: "#c9a24b", color: "#1a1a1a", fontWeight: 700, border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}
          >
            Volver a casa
          </button>
        </div>
      )}

      {!me?.is_premium && (
        <div style={{ background: "#1e1e1e", border: "1px solid #c9a24b", borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 13, color: "#f5f5f5" }}>
          Con la cuenta gratuita puedes ver el mapa, pero viajar a otras ciudades es una funcion Premium.{" "}
          <a href="/settings" style={{ color: "#c9a24b", fontWeight: 700 }}>Hazte Premium</a>
        </div>
      )}

      {error && (
        <div style={{ background: "#3a1414", border: "1px solid #e8352b", borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 13, color: "#ffb4b0" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 12 }}>
        {FEATURED_CITIES.map((c) => renderCityCard(c))}
      </div>

      <div
        ref={mapDivRef}
        style={{ width: "100%", height: 420, borderRadius: 8, border: "2px solid #2a2a2a", background: "#171717" }}
      />

      {selected && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, background: "#171717", border: "1px solid #2a2a2a", borderRadius: 8, padding: 12 }}>
          <span style={{ fontSize: 13 }}>Vas a viajar a: <strong>{selected.name}</strong></span>
          <button
            onClick={confirmTravel}
            disabled={saving}
            style={{ background: "#e8352b", color: "#fff", fontWeight: 700, border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}
          >
            {saving ? "Viajando..." : "Confirmar viaje"}
          </button>
        </div>
      )}

      {!mapReady && (
        <p style={{ fontSize: 12, color: "#9a9a9a", marginTop: 8 }}>Cargando mapa...</p>
      )}
    </div>
  );
}

