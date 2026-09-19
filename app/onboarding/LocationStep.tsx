"use client";
import { useEffect, useState } from "react";

type Coords = { lat: number; lng: number } | null;
type LocStatus = "idle" | "requesting" | "granted" | "denied" | "error";

interface LocationStepProps {
  onChange?: (coords: Coords) => void;
}

export default function LocationStep({ onChange }: LocationStepProps) {
  const [coords, setCoords] = useState<Coords>(null);
  const [locStatus, setLocStatus] = useState<LocStatus>("idle");

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setLocStatus("error");
      return;
    }
    setLocStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(next);
        setLocStatus("granted");
        onChange?.(next);
      },
      (err) => {
        setLocStatus(err.code === 1 ? "denied" : "error");
        onChange?.(null);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }

  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        border: "1px solid " + (locStatus === "granted" ? "#2e7d32" : "#2a2a2a"),
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <span style={{ fontSize: 13, color: locStatus === "granted" ? "#2e7d32" : "#9a9a9a" }}>
        {locStatus === "idle" && "Solicitando acceso a tu ubicación..."}
        {locStatus === "requesting" && "Solicitando acceso a tu ubicación..."}
        {locStatus === "granted" && "✓ Ubicación activada"}
        {locStatus === "denied" &&
          "Has denegado el acceso a tu ubicación. Puedes activarla luego, pero sin ella no verás perfiles ni eventos cerca de ti."}
        {locStatus === "error" && "No se pudo obtener tu ubicación."}
      </span>
      {locStatus !== "granted" && locStatus !== "requesting" && locStatus !== "idle" && (
        <button
          type="button"
          onClick={requestLocation}
          style={{
            fontSize: 12,
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid #c9a24b",
            background: "transparent",
            color: "#c9a24b",
            whiteSpace: "nowrap",
          }}
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

export type { Coords as LocationCoords };
