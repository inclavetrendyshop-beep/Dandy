"use client";
import { useEffect, useState } from "react";

export default function Splash() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1300);
    const hideTimer = setTimeout(() => setVisible(false), 1800);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#0d0d0d",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        opacity: fading ? 0 : 1,
        transition: "opacity 0.5s ease",
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <div
        style={{
          position: "relative",
          width: 88,
          height: 88,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: -20,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(232,53,43,0.35) 0%, rgba(232,53,43,0) 70%)",
            animation: "dandySplashGlow 1.8s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "relative",
            width: 72,
            height: 72,
            borderRadius: 16,
            border: "3px solid #e8352b",
            background: "#0d0d0d",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "dandySplashBreathe 1.8s ease-in-out infinite",
          }}
        >
          <span style={{ color: "#e8352b", fontSize: 40, fontWeight: 900, fontFamily: "'Fredoka', sans-serif" }}>D</span>
        </div>
      </div>
      <span className="brand" style={{ fontSize: 28, color: "#e8352b" }}>Dandy</span>
      <span style={{ fontSize: 13, color: "#9a9a9a", textAlign: "center", padding: "0 32px" }}>
        Conecta con hombres sofisticados cerca de ti
      </span>
      <style>{`
        @keyframes dandySplashBreathe {
          0% { transform: scale(0.6); opacity: 0; }
          40% { transform: scale(1.05); opacity: 1; }
          60% { transform: scale(0.98); }
          100% { transform: scale(1); }
        }
        @keyframes dandySplashGlow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}

