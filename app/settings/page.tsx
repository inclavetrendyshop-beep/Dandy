"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "inclavetrendyshop@gmail.com";

export default function Settings() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(60);
  const [maxDistance, setMaxDistance] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }
    setUserEmail(userData.user.email ?? null);
    const { data: myProfile } = await supabase.from("profiles").select("*").eq("id", userData.user.id).single();
    if (!myProfile) {
      router.push("/onboarding");
      return;
    }
    setMe(myProfile);
    setMinAge(myProfile.pref_min_age || 18);
    setMaxAge(myProfile.pref_max_age || 60);
    setMaxDistance(myProfile.pref_max_distance || 5);
    setLoading(false);
  }

  async function handleSave() {
    if (!me) return;
    setSaving(true);
    await supabase.from("profiles").update({
      pref_min_age: minAge,
      pref_max_age: maxAge,
      pref_max_distance: maxDistance,
    }).eq("id", me.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleVerifyUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !me) return;
    setVerifying(true);
    setVerifyError("");

    const path = `${me.id}/verify-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("photos").upload(path, file);
    if (upErr) {
      setVerifyError("Error subiendo la foto: " + upErr.message);
      setVerifying(false);
      return;
    }
    const { data } = supabase.storage.from("photos").getPublicUrl(path);

    const { error: dbErr } = await supabase.from("profiles").update({
      verification_photo_url: data.publicUrl,
      verification_status: "pending",
    }).eq("id", me.id);

    if (dbErr) {
      setVerifyError("Error guardando la verificacion: " + dbErr.message);
      setVerifying(false);
      return;
    }

    setMe({ ...me, verification_status: "pending", verification_photo_url: data.publicUrl });
    setVerifying(false);
  }

  async function handleDeleteAccount() {
    const sure = confirm("Seguro que quieres borrar tu cuenta? Se borraran tu perfil, tus matches y tus mensajes. Esta accion no se puede deshacer.");
    if (!sure) return;
    const sureAgain = confirm("Ultima confirmacion: tu cuenta se borrara para siempre. Continuar?");
    if (!sureAgain) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      alert("Hubo un error, vuelve a iniciar sesion e intentalo de nuevo.");
      return;
    }

    const res = await fetch("/api/delete-account", {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
    });

    if (res.ok) {
      alert("Tu cuenta ha sido borrada.");
      await supabase.auth.signOut();
      router.push("/login");
    } else {
      alert("Hubo un error al borrar la cuenta. Intentalo de nuevo.");
    }
  }

  if (loading) {
    return <div style={{ padding: 24, color: "#9a9a9a" }}>Cargando...</div>;
  }

  return (
    <div style={{ padding: 16, maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <span className="brand" style={{ fontSize: 24, color: "#e8352b" }}>Dandy</span>
        <a href="/" style={{ color: "#f5f5f5" }}>Volver</a>
      </div>

      {userEmail === ADMIN_EMAIL && (
        
          href="/admin/verificaciones"
          style={{
            display: "block",
            textAlign: "center",
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #1e6fd9",
            color: "#1e6fd9",
            marginBottom: 24,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Panel de administracion
        </a>
      )}

      <h2 style={{ fontSize: 18, marginBottom: 16 }}>Filtros de busqueda</h2>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 13, color: "#9a9a9a", marginBottom: 6 }}>Edad minima</label>
        <input type="number" value={minAge} onChange={(e) => setMinAge(Number(e.target.value))} style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #2a2a2a", background: "#171717", color: "#f5f5f5" }} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 13, color: "#9a9a9a", marginBottom: 6 }}>Edad maxima</label>
        <input type="number" value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))} style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #2a2a2a", background: "#171717", color: "#f5f5f5" }} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 13, color: "#9a9a9a", marginBottom: 6 }}>Distancia maxima (km)</label>
        <input type="number" value={maxDistance} onChange={(e) => setMaxDistance(Number(e.target.value))} style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #2a2a2a", background: "#171717", color: "#f5f5f5" }} />
        {!me?.is_premium && (
          <p style={{ fontSize: 12, color: "#c9a24b", marginTop: 6 }}>Con cuenta gratuita el limite real son 5 km, aunque pongas mas.</p>
        )}
      </div>

      <button onClick={handleSave} style={{ width: "100%", padding: 12, borderRadius: 8, border: "none", background: "#e8352b", color: "#fff", fontWeight: 700, marginBottom: 12 }}>
        {saving ? "Guardando..." : saved ? "Guardado!" : "Guardar filtros"}
      </button>

      <button onClick={handleLogout} style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #2a2a2a", background: "none", color: "#f5f5f5", marginBottom: 32 }}>
        Cerrar sesion
      </button>

      <div style={{ borderTop: "1px solid #2a2a2a", paddingTop: 24, marginBottom: 32 }}>
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>Verificacion de perfil</h3>

        {me?.verification_status === "approved" && (
          <p style={{ fontSize: 13, color: "#4bc97a", marginBottom: 8 }}>✓ Tu perfil esta verificado.</p>
        )}

        {me?.verification_status === "pending" && (
          <p style={{ fontSize: 13, color: "#c9a24b", marginBottom: 8 }}>Tu foto esta en revision. Te avisaremos cuando se apruebe.</p>
        )}

        {me?.verification_status === "rejected" && (
          <p style={{ fontSize: 13, color: "#e8352b", marginBottom: 8 }}>Tu foto de verificacion fue rechazada. Puedes intentarlo de nuevo con otra foto.</p>
        )}

        {(!me?.verification_status || me?.verification_status === "none" || me?.verification_status === "rejected") && (
          <>
            <p style={{ fontSize: 12, color: "#9a9a9a", marginBottom: 12 }}>
              Sube una selfie clara de tu cara para verificar que tu perfil es real. Un administrador la revisara manualmente.
            </p>
            <label style={{ display: "block", width: "100%", padding: 12, borderRadius: 8, border: "1px solid #2a2a2a", background: "none", color: "#f5f5f5", textAlign: "center", cursor: "pointer" }}>
              {verifying ? "Subiendo..." : "Subir foto de verificacion"}
              <input type="file" accept="image/*" onChange={handleVerifyUpload} disabled={verifying} style={{ display: "none" }} />
            </label>
            {verifyError && <p style={{ fontSize: 12, color: "#e8352b", marginTop: 8 }}>{verifyError}</p>}
          </>
        )}
      </div>

      <div style={{ borderTop: "1px solid #2a2a2a", paddingTop: 24 }}>
        <h3 style={{ fontSize: 14, color: "#e8352b", marginBottom: 8 }}>Zona de peligro</h3>
        <p style={{ fontSize: 12, color: "#9a9a9a", marginBottom: 12 }}>Borrar tu cuenta es permanente. Perderas tu perfil, matches y mensajes.</p>
        <button onClick={handleDeleteAccount} style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #e8352b", background: "none", color: "#e8352b" }}>
          Borrar mi cuenta
        </button>
      </div>
    </div>
  );
}
