"use client";

export default function Soporte() {
  return (
    <div style={{ padding: 24, paddingBottom: 48 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <span className="brand" style={{ fontSize: 24, color: "#e8352b" }}>Dandy</span>
        <a href="/" style={{ color: "#f5f5f5" }}>Volver</a>
      </div>

      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Soporte</h1>
      <p style={{ fontSize: 13, color: "#9a9a9a", marginBottom: 24 }}>
        Estamos aqui para ayudarte.
      </p>

      <div style={{ border: "1px solid #2a2a2a", borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#f2c14e", marginBottom: 8 }}>Escribenos</p>
        <p style={{ fontSize: 13, color: "#f5f5f5", marginBottom: 12 }}>
          Si tienes un problema tecnico, una duda sobre tu suscripcion Premium, o quieres reportar algo, mandanos un correo y te responderemos lo antes posible.
        </p>
        <a
          href="mailto:inclavetrendyshop@gmail.com"
          style={{ display: "inline-block", background: "#f2c14e", color: "#0d0d0d", fontWeight: 700, padding: "10px 20px", borderRadius: 20, textDecoration: "none", fontSize: 13 }}
        >
          inclavetrendyshop@gmail.com
        </a>
      </div>

      <div style={{ border: "1px solid #2a2a2a", borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#f2c14e", marginBottom: 8 }}>Preguntas frecuentes</p>

        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>¿Como cancelo mi suscripcion Premium?</p>
          <p style={{ fontSize: 13, color: "#9a9a9a" }}>
            Desde Configuracion → Gestionar suscripcion, puedes cancelarla en cualquier momento. Seguiras teniendo Premium hasta el final del periodo ya pagado.
          </p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>¿Como denuncio o bloqueo a alguien?</p>
          <p style={{ fontSize: 13, color: "#9a9a9a" }}>
            En cualquier perfil veras las opciones "Bloquear" y "Denunciar" debajo de la biografia.
          </p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>¿Como borro mi cuenta?</p>
          <p style={{ fontSize: 13, color: "#9a9a9a" }}>
            Desde Configuracion → Borrar cuenta. Esto elimina tu perfil y todos tus datos de forma permanente.
          </p>
        </div>

        <div>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>¿Mis fotos privadas son realmente privadas?</p>
          <p style={{ fontSize: 13, color: "#9a9a9a" }}>
            Si. Solo se comparten con un match si tu decides enviarlas desde el chat.
          </p>
        </div>
      </div>

      <p style={{ fontSize: 12, color: "#6a6a6a", textAlign: "center" }}>
        Tambien puedes consultar nuestra <a href="/legal" style={{ color: "#f2c14e" }}>Politica de Privacidad y Terminos</a>.
      </p>
    </div>
  );
}

