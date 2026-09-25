"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PremiumSuccess() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    let attempts = 0;
    let cancelled = false;

    const interval = setInterval(async () => {
      attempts++;
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        clearInterval(interval);
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", userData.user.id)
        .single();

      if (cancelled) return;

      if (profile?.is_premium) {
        setIsPremium(true);
        setChecking(false);
        clearInterval(interval);
      } else if (attempts >= 8) {
        setChecking(false);
        clearInterval(interval);
      }
    }, 1500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [router]);

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 480,
        margin: "0 auto",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 16,
      }}
    >
      <p className="brand" style={{ fontSize: 28, color: "#e8352b" }}>Dandy</p>

      {checking && <p style={{ color: "#9a9a9a" }}>Confirmando tu pago...</p>}

      {!checking && isPremium && (
        <>
          <p style={{ fontSize: 20, fontWeight: 700 }}>Ya eres Premium</p>
          <p style={{ color: "#9a9a9a" }}>
            Ya puedes viajar a cualquier ciudad del mundo y disfrutar del resto de ventajas Premium.
          </p>
        </>
      )}

      {!checking && !isPremium && (
        <>
          <p style={{ fontSize: 18, fontWeight: 700 }}>Tu pago se esta procesando</p>
          <p style={{ color: "#9a9a9a" }}>
            Puede tardar unos segundos en activarse. Si al volver a ajustes no aparece como Premium, espera un momento y recarga la pagina.
          </p>
        </>
      )}

      <a
        href="/settings"
        style={{
          marginTop: 16,
          background: "#e8352b",
          color: "#fff",
          fontWeight: 700,
          borderRadius: 20,
          padding: "10px 24px",
          textDecoration: "none",
        }}
      >
        Ir a ajustes
      </a>
    </div>
  );
}

