"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "inclavetrendyshop@gmail.com";

export default function AdminVerificaciones() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  async function checkAccess() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }
    if (userData.user.email !== ADMIN_EMAIL) {
      setChecking(false);
      setAuthorized(false);
      return;
    }
    setAuthorized(true);
    setChecking(false);
    loadPending();
  }

  async function loadPending() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, name, age, city, verification_photo_url, verification_status")
      .eq("verification_status", "pending");
    setPending(data || []);
    setLoading(false);
  }

  async function handleDecision(id: string, decision: "approved" | "rejected") {
    setActingOn(id);
    await supabase.from("profiles").update({ verification_status: decision }).eq("id", id);
    setPending((prev) => prev.filter((p) => p.id !== id));
    setActingOn(null);
  }

  if (checking) {
    return <div style={{ padding: 24, color: "#9a9a9a" }}>Cargando...</div>;
  }

  if (!authorized) {
    return <div style={{ padding: 24, color: "#e8352b" }}>Acceso denegado.</div>;
  }

  return (
    <div style={{ padding: 16, maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <span className="brand" style={{ fontSize: 24, color: "#e8352b" }}>Dandy</span>
        <a href="/" style={{ color: "#f5f5f5" }}>Volver</a>
      </div>

      <h2 style={{ fontSize: 18, marginBottom: 16 }}>Verificaciones pendientes</h2>

      {loading && <p style={{ color: "#9a9a9a" }}>Cargando...</p>}

      {!loading && pending.length === 0 && (
        <p style={{ color: "#9a9a9a" }}>No hay fotos pendientes de revision.</p>
      )}

      {pending.map((p) => (
        <div key={p.id} style={{ border: "1px solid #2a2a2a", borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <p style={{ fontSize: 14, marginBottom: 8 }}>{p.name}, {p.age} - {p.city}</p>
          {p.verification_photo_url && (
            <img
              src={p.verification_photo_url}
              alt="Foto de verificacion"
              style={{ width: "100%", borderRadius: 8, marginBottom: 12 }}
            />
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => handleDecision(p.id, "approved")}
              disabled={actingOn === p.id}
              style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "#4bc97a", color: "#0a0a0a", fontWeight: 700 }}
            >
              Aprobar
            </button>
            <button
              onClick={() => handleDecision(p.id, "rejected")}
              disabled={actingOn === p.id}
              style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #e8352b", background: "none", color: "#e8352b" }}
            >
              Rechazar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
