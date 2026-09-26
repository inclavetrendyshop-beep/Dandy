"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/onboarding");
  }

  return (
    <div style={{ padding: 24 }}>
      <p className="brand" style={{ fontSize: 28, color: "#f2c14e", marginBottom: 4 }}>Dandy</p>
      <h1 style={{ fontSize: 18, fontWeight: 400, color: "#8c92a0", marginBottom: 4 }}>Crear cuenta</h1>
      <p style={{ fontSize: 13, color: "#9a9a9a", marginBottom: 20 }}>Para hombres con carácter, barba y algo de historia que contar.</p>
      <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Contraseña (mínimo 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            style={{ width: "100%", paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#8c92a0", cursor: "pointer", fontSize: 16, padding: 0 }}
            title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>
        {error && <p style={{ color: "#e2504a", fontSize: 13 }}>{error}</p>}
        <button className="primary" disabled={loading}>{loading ? "Creando..." : "Crear cuenta"}</button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14, color: "#8a8378" }}>
        ¿Ya tienes cuenta? <a href="/login" style={{ color: "#f2c14e" }}>Inicia sesión</a>
      </p>
      <p style={{ marginTop: 12, fontSize: 12, color: "#6a6a6a" }}>
        Al crear una cuenta aceptas nuestra <a href="/legal" style={{ color: "#f2c14e" }}>Política de Privacidad y Términos</a>.
      </p>
    </div>
  );
}

