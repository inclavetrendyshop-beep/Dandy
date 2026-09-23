"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

declare global {
  interface Window {
    DailyIframe: any;
  }
}

export default function Call() {
  const { matchId } = useParams();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<any>(null);
  const [status, setStatus] = useState("Conectando...");
  const [error, setError] = useState("");

  useEffect(() => {
    init();
    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
      }
    };
  }, []);

  async function init() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }

    const { data: match } = await supabase
      .from("matches")
      .select("user1_id, user2_id")
      .eq("id", matchId)
      .single();
    if (!match || (match.user1_id !== userData.user.id && match.user2_id !== userData.user.id)) {
      setError("No tienes acceso a esta llamada.");
      return;
    }

    let res;
    try {
      res = await fetch("/api/create-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
    } catch {
      setError("No se pudo conectar con el servicio de llamadas.");
      return;
    }
    const data = await res.json();
    if (!res.ok || !data.url) {
      setError(data.error || "No se pudo crear la sala de llamada.");
      return;
    }

    loadDaily(data.url);
  }

  function loadDaily(roomUrl: string) {
    if (window.DailyIframe) {
      joinCall(roomUrl);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@daily-co/daily-js/dist/daily-iframe.js";
    script.onload = () => joinCall(roomUrl);
    script.onerror = () => setError("No se pudo cargar el sistema de llamadas.");
    document.body.appendChild(script);
  }

  function joinCall(roomUrl: string) {
    if (!containerRef.current || callFrameRef.current) return;
    const callFrame = window.DailyIframe.createFrame(containerRef.current, {
      iframeStyle: {
        width: "100%",
        height: "100%",
        border: "0",
      },
      showLeaveButton: true,
    });
    callFrameRef.current = callFrame;
    callFrame.on("left-meeting", () => {
      router.push("/chat/" + matchId);
    });
    callFrame.join({ url: roomUrl });
    setStatus("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0d0d0d" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, borderBottom: "2px solid #2a2a2a" }}>
        <a href={"/chat/" + matchId} style={{ color: "#f5f5f5" }}>{"←"} Volver al chat</a>
      </div>
      {error && <div style={{ padding: 16, color: "#ffb4b0" }}>{error}</div>}
      {status && !error && <div style={{ padding: 16, color: "#9a9a9a" }}>{status}</div>}
      <div ref={containerRef} style={{ flex: 1 }} />
    </div>
  );
}

