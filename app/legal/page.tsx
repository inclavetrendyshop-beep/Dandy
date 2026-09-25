"use client";

export default function Legal() {
  return (
    <div style={{ padding: 16, maxWidth: 600, margin: "0 auto", paddingBottom: 48 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <span className="brand" style={{ fontSize: 24, color: "#e8352b" }}>Dandy</span>
        <a href="/" style={{ color: "#f5f5f5" }}>Volver</a>
      </div>

      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Política de Privacidad y Términos de uso</h1>
      <p style={{ fontSize: 13, color: "#9a9a9a", marginBottom: 24 }}>Última actualización: 25 de septiembre de 2026</p>

      <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
        Bienvenido/a a Dandy. Esta página explica qué datos recogemos, para qué los usamos y qué derechos tienes sobre
        ellos. Al crear una cuenta y usar la app, aceptas estos términos.
      </p>

      <h2 style={{ fontSize: 17, marginTop: 28, marginBottom: 8, color: "#f2c14e" }}>1. Datos que recopilamos</h2>
      <p style={{ marginBottom: 8, lineHeight: 1.6 }}>Para poder ofrecerte el servicio, guardamos:</p>
      <ul style={{ paddingLeft: 20, marginBottom: 16, lineHeight: 1.7 }}>
        <li>Datos de tu perfil: nombre, edad, ciudad, biografía, fotos, etiquetas/tribus, posición e identidad de género.</li>
        <li>Estado serológico, si decides indicarlo (es un campo opcional, nunca obligatorio).</li>
        <li>Fotos privadas que subes y decides compartir o no con cada match.</li>
        <li>Tu ubicación geográfica aproximada, para mostrarte perfiles cercanos y para la función de viajar a otras ciudades.</li>
        <li>Documento de identidad (DNI o pasaporte), únicamente si decides verificar tu edad. Lo revisa un administrador y el archivo se elimina automáticamente de nuestros servidores en cuanto termina la revisión.</li>
        <li>Los mensajes, fotos y vídeos que envías en los chats con tus matches.</li>
        <li>Información sobre tu suscripción Premium (si la contratas), gestionada por nuestro proveedor de pagos Stripe. Nosotros no almacenamos los datos de tu tarjeta.</li>
        <li>Datos técnicos básicos de las videollamadas dentro de la app, gestionadas por nuestro proveedor Daily.co.</li>
      </ul>

      <h2 style={{ fontSize: 17, marginTop: 28, marginBottom: 8, color: "#f2c14e" }}>2. Para qué usamos tus datos</h2>
      <ul style={{ paddingLeft: 20, marginBottom: 16, lineHeight: 1.7 }}>
        <li>Mostrarte perfiles compatibles y gestionar matches, chats y videollamadas.</li>
        <li>Verificar tu foto de perfil y tu edad mínima, cuando lo solicites.</li>
        <li>Gestionar tu suscripción Premium y sus funciones (viajar sin límites, etc.).</li>
        <li>Mantener la app segura: gestionar bloqueos, denuncias y evitar el uso fraudulento.</li>
        <li>Cumplir con obligaciones legales cuando sea necesario.</li>
      </ul>

      <h2 style={{ fontSize: 17, marginTop: 28, marginBottom: 8, color: "#f2c14e" }}>3. Con quién compartimos datos</h2>
      <p style={{ marginBottom: 8, lineHeight: 1.6 }}>
        No vendemos tus datos a nadie. Solo los compartimos con los proveedores que necesitamos para que la app
        funcione:
      </p>
      <ul style={{ paddingLeft: 20, marginBottom: 16, lineHeight: 1.7 }}>
        <li><strong>Supabase</strong>: aloja nuestra base de datos, autenticación y almacenamiento de archivos.</li>
        <li><strong>Stripe</strong>: procesa los pagos de la suscripción Premium de forma segura.</li>
        <li><strong>Daily.co</strong>: proporciona la infraestructura técnica de las videollamadas dentro del chat.</li>
      </ul>

      <h2 style={{ fontSize: 17, marginTop: 28, marginBottom: 8, color: "#f2c14e" }}>4. Verificación de edad y documentos de identidad</h2>
      <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
        Si decides verificar tu edad, subes una foto de tu DNI o pasaporte. Solo la revisa un administrador para
        confirmar que eres mayor de edad, y el archivo se borra automáticamente de nuestro almacenamiento en cuanto
        se aprueba o rechaza la verificación. No conservamos copias de tu documento de identidad una vez revisado.
      </p>

      <h2 style={{ fontSize: 17, marginTop: 28, marginBottom: 8, color: "#f2c14e" }}>5. Mensajes con autodestrucción</h2>
      <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
        Las fotos y vídeos que envíes marcados para autodestruirse se eliminan de nuestros servidores después de que
        el destinatario los vea, o cuando borras un mensaje manualmente.
      </p>

      <h2 style={{ fontSize: 17, marginTop: 28, marginBottom: 8, color: "#f2c14e" }}>6. Tus derechos</h2>
      <ul style={{ paddingLeft: 20, marginBottom: 16, lineHeight: 1.7 }}>
        <li>Puedes editar tu perfil en cualquier momento desde Ajustes.</li>
        <li>Puedes borrar tu cuenta cuando quieras: esto elimina permanentemente tu perfil, matches, mensajes y fotos.</li>
        <li>Puedes cancelar tu suscripción Premium en cualquier momento; seguirá activa hasta el final del periodo ya pagado.</li>
        <li>Puedes contactarnos para preguntas sobre tus datos.</li>
      </ul>

      <h2 style={{ fontSize: 17, marginTop: 28, marginBottom: 8, color: "#f2c14e" }}>7. Seguridad</h2>
      <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
        Usamos proveedores con buenas prácticas de seguridad (Supabase, Stripe, Daily.co) y aplicamos medidas
        razonables para proteger tus datos. Ningún sistema es 100% infalible, pero nos tomamos tu privacidad en
        serio, especialmente con los datos más sensibles como el estado serológico y los documentos de identidad.
      </p>

      <h2 style={{ fontSize: 17, marginTop: 28, marginBottom: 8, color: "#f2c14e" }}>8. Edad mínima</h2>
      <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
        Dandy es solo para personas mayores de 18 años. No permitimos el uso de la app por menores de edad.
      </p>

      <h2 style={{ fontSize: 17, marginTop: 28, marginBottom: 8, color: "#f2c14e" }}>9. Contacto</h2>
      <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
        Si tienes cualquier duda sobre esta política o quieres ejercer tus derechos sobre tus datos, escríbenos a{" "}
        <a href="mailto:inclavetrendyshop@gmail.com" style={{ color: "#f2c14e" }}>inclavetrendyshop@gmail.com</a>.
      </p>
    </div>
  );
}

