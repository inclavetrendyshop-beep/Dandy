"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }
    router.push("/");
  }

  return (
    <div style={{ padding: 24 }}>
      <p className="brand" style={{ fontSize: 28, color: "#f2c14e", marginBottom: 4 }}>Dandy</p>
      <h1 style={{ fontSize: 18, fontWeight: 400, color: "#8c92a0", marginBottom: 24 }}>Inicia sesión</h1>
      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p style={{ color: "#e2504a", fontSize: 13 }}>{error}</p>}
        <button className="primary" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14, color: "#8c92a0" }}>
        ¿No tienes cuenta? <a href="/signup" style={{ color: "#f2c14e" }}>Regístrate</a>
      </p>
    </div>
  );
}
