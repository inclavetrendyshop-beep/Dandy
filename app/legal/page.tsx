export default function Legal() {
  return (
    <div style={{ padding: 24, maxWidth: 640, margin: "0 auto", color: "#f5f5f5" }}>
      <a href="/" style={{ color: "#f5f5f5", fontSize: 13 }}>Volver</a>
      <h1 style={{ fontSize: 22, marginTop: 16, marginBottom: 8, color: "#e8352b" }}>Dandy</h1>
      <h2 style={{ fontSize: 18, marginBottom: 24 }}>Politica de Privacidad y Terminos de Uso</h2>

      <section style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>1. Quienes somos</h3>
        <p style={{ fontSize: 13, color: "#c9c9c9", lineHeight: 1.6 }}>
          Dandy es una aplicacion de citas dirigida a hombres homosexuales mayores de edad.
          Al usar la app aceptas estos terminos y nuestra forma de tratar tus datos.
        </p>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>2. Edad minima</h3>
        <p style={{ fontSize: 13, color: "#c9c9c9", lineHeight: 1.6 }}>
          Debes tener al menos 18 anos para usar Dandy. Nos reservamos el derecho de eliminar
          cualquier cuenta si tenemos motivos para creer que pertenece a un menor.
        </p>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>3. Que datos recogemos</h3>
        <p style={{ fontSize: 13, color: "#c9c9c9", lineHeight: 1.6 }}>
          Recogemos el correo electronico, nombre, edad, ciudad, biografia, fotos que subas,
          tus preferencias (tags), tu ubicacion aproximada (si la activas) y tu actividad dentro
          de la app (con quien haces match, a quien bloqueas o denuncias). El hecho de usar una
          app de citas para hombres gais puede revelar informacion sobre tu orientacion sexual,
          que es un dato especialmente sensible: lo tratamos con el mayor cuidado y no lo
          compartimos con terceros para publicidad.
        </p>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>4. Para que usamos tus datos</h3>
        <p style={{ fontSize: 13, color: "#c9c9c9", lineHeight: 1.6 }}>
          Usamos tus datos unicamente para hacer funcionar la app: mostrarte perfiles compatibles,
          calcular distancias, gestionar matches y chats, y mantener la seguridad de la comunidad
          (bloqueos y denuncias).
        </p>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>5. Con quien compartimos tus datos</h3>
        <p style={{ fontSize: 13, color: "#c9c9c9", lineHeight: 1.6 }}>
          No vendemos tus datos. Los datos se almacenan con nuestro proveedor de base de datos
          (Supabase) y la app se aloja en Vercel, ambos con sus propias medidas de seguridad.
        </p>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>6. Tus derechos</h3>
        <p style={{ fontSize: 13, color: "#c9c9c9", lineHeight: 1.6 }}>
          Puedes borrar tu cuenta y todos tus datos en cualquier momento desde Filtros → Borrar mi
          cuenta. Esa accion es permanente e inmediata. Si tienes cualquier duda sobre tus datos,
          escribenos.
        </p>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>7. Conducta y contenido</h3>
        <p style={{ fontSize: 13, color: "#c9c9c9", lineHeight: 1.6 }}>
          No se permite contenido ilegal, acoso, suplantacion de identidad ni fotos que no cumplan
          las normas de la comunidad. Puedes bloquear y denunciar a otros usuarios desde su perfil.
          Podemos suspender cuentas que incumplan estas normas.
        </p>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>8. Contacto</h3>
        <p style={{ fontSize: 13, color: "#c9c9c9", lineHeight: 1.6 }}>
          Para cualquier consulta sobre privacidad o estos terminos, contacta con nosotros por
          correo electronico.
        </p>
      </section>

      <p style={{ fontSize: 11, color: "#6a6a6a", marginTop: 32 }}>Ultima actualizacion: 2026.</p>
    </div>
  );
}
