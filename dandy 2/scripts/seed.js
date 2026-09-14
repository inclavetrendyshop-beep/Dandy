/**
 * Script para crear usuarios de prueba (auth + perfil) en Supabase.
 *
 * Uso:
 *   1. Instala la dependencia si no la tienes:  npm install
 *   2. Corre con tus credenciales como variables de entorno:
 *
 *      SUPABASE_URL="https://xxxxx.supabase.co" \
 *      SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key" \
 *      node scripts/seed.js
 *
 *   En Windows (PowerShell):
 *      $env:SUPABASE_URL="https://xxxxx.supabase.co"
 *      $env:SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
 *      node scripts/seed.js
 *
 * IMPORTANTE: la service_role key tiene acceso total a tu base de datos.
 * Nunca la subas a git ni la compartas. Este script solo la lee de env vars.
 */

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Faltan variables de entorno. Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY antes de correr este script."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Perfiles de prueba. Ajusta lat/lng a tu ciudad para que aparezcan dentro
// del radio de distancia (pref_max_distance) de tu propio perfil.
const testProfiles = [
  {
    email: "test.laura@dandy-seed.dev",
    name: "Laura",
    age: 27,
    bio: "Me encanta el senderismo y el buen café.",
    city: "Madrid",
    tags: ["café", "senderismo", "cine"],
    lat: 40.4168,
    lng: -3.7038,
  },
  {
    email: "test.carlos@dandy-seed.dev",
    name: "Carlos",
    age: 30,
    bio: "Programador de día, guitarrista de noche.",
    city: "Madrid",
    tags: ["música", "tecnología", "viajes"],
    lat: 40.4200,
    lng: -3.6900,
  },
  {
    email: "test.marta@dandy-seed.dev",
    name: "Marta",
    age: 25,
    bio: "Amante de los perros y las series.",
    city: "Madrid",
    tags: ["perros", "series", "yoga"],
    lat: 40.4100,
    lng: -3.7100,
  },
  {
    email: "test.diego@dandy-seed.dev",
    name: "Diego",
    age: 29,
    bio: "Fanático del fútbol y la cocina italiana.",
    city: "Madrid",
    tags: ["fútbol", "cocina", "vino"],
    lat: 40.4300,
    lng: -3.6800,
  },
  {
    email: "test.sofia@dandy-seed.dev",
    name: "Sofía",
    age: 26,
    bio: "Diseñadora, amante del arte y los museos.",
    city: "Madrid",
    tags: ["arte", "museos", "fotografía"],
    lat: 40.4050,
    lng: -3.7200,
  },
];

const TEST_PASSWORD = "SeedTest123!";

async function seed() {
  console.log(`Creando ${testProfiles.length} perfiles de prueba...\n`);

  for (const profile of testProfiles) {
    // 1. Crear usuario de auth
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: profile.email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });

    if (userError) {
      // Si ya existe, seguimos con el siguiente en vez de fallar todo el script
      console.warn(`⚠️  ${profile.email}: ${userError.message}`);
      continue;
    }

    const userId = userData.user.id;

    // 2. Crear su perfil correspondiente
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      name: profile.name,
      age: profile.age,
      bio: profile.bio,
      city: profile.city,
      tags: profile.tags,
      lat: profile.lat,
      lng: profile.lng,
      photos: [],
    });

    if (profileError) {
      console.error(`❌ Error creando perfil para ${profile.name}: ${profileError.message}`);
      continue;
    }

    console.log(`✅ ${profile.name} (${profile.email}) creado correctamente`);
  }

  console.log("\nListo. Refresca tu app y deberías ver estos perfiles en el feed.");
}

seed().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
