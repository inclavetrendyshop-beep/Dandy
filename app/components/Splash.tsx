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
        gap: "clamp(16px, 4vw, 22px)",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.5s ease",
        pointerEvents: fading ? "none" : "auto",
        padding: "0 24px",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "clamp(96px, 28vw, 140px)",
          height: "clamp(96px, 28vw, 140px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "-22%",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(232,53,43,0.35) 0%, rgba(232,53,43,0) 70%)",
            animation: "dandySplashGlow 1.8s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: "22%",
            border: "3px solid #e8352b",
            background: "#0d0d0d",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "dandySplashBreathe 1.8s ease-in-out infinite",
          }}
        >
          <span style={{ color: "#e8352b", fontSize: "clamp(48px, 14vw, 70px)", fontWeight: 900, fontFamily: "'Fredoka', sans-serif" }}>D</span>
        </div>
      </div>
      <span className="brand" style={{ fontSize: "clamp(30px, 8vw, 42px)", color: "#e8352b" }}>Dandy</span>
      <span style={{ fontSize: "clamp(13px, 3.5vw, 16px)", color: "#9a9a9a", textAlign: "center", maxWidth: 320 }}>
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

