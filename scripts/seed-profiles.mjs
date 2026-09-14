// scripts/seed-profiles.mjs
//
// Crea usuarios de prueba (auth + profiles) para poder probar el matching en Dandy.
//
// USO:
//   1. npm install @supabase/supabase-js (si no lo tienes ya)
//   2. Define las variables de entorno (NO las pegues en el código):
//        export SUPABASE_URL="https://xxxxx.supabase.co"
//        export SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
//   3. Corre: node scripts/seed-profiles.mjs
//
// Esto crea 6 usuarios falsos con perfiles completos, todos con la contraseña "test1234".

import { createClient } from "@supabase/supabase-js";

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

const TEST_PASSWORD = "test1234";

const testUsers = [
  {
    email: "ana.test@dandy-seed.com",
    name: "Ana",
    age: 27,
    bio: "Me encanta el senderismo y el café de especialidad.",
    city: "Madrid",
    tags: ["senderismo", "café", "lectura"],
    lat: 40.4168,
    lng: -3.7038,
  },
  {
    email: "carlos.test@dandy-seed.com",
    name: "Carlos",
    age: 30,
    bio: "Desarrollador de día, guitarrista de noche.",
    city: "Madrid",
    tags: ["música", "tecnología", "cine"],
    lat: 40.4200,
    lng: -3.7100,
  },
  {
    email: "laura.test@dandy-seed.com",
    name: "Laura",
    age: 25,
    bio: "Fan de los perros, el yoga y los viajes improvisados.",
    city: "Madrid",
    tags: ["yoga", "viajes", "perros"],
    lat: 40.4150,
    lng: -3.6900,
  },
  {
    email: "diego.test@dandy-seed.com",
    name: "Diego",
    age: 29,
    bio: "Cocino los fines de semana y corro maratones.",
    city: "Madrid",
    tags: ["running", "cocina", "fotografía"],
    lat: 40.4300,
    lng: -3.7000,
  },
  {
    email: "sofia.test@dandy-seed.com",
    name: "Sofía",
    age: 26,
    bio: "Diseñadora gráfica, amante del arte y los museos.",
    city: "Madrid",
    tags: ["arte", "diseño", "museos"],
    lat: 40.4100,
    lng: -3.7050,
  },
  {
    email: "javier.test@dandy-seed.com",
    name: "Javier",
    age: 31,
    bio: "Ciclista de fin de semana y entusiasta de la buena cerveza.",
    city: "Madrid",
    tags: ["ciclismo", "cerveza artesanal", "series"],
    lat: 40.4250,
    lng: -3.6950,
  },
];

async function seed() {
  console.log(`Creando ${testUsers.length} usuarios de prueba...\n`);

  for (const user of testUsers) {
    // 1. Crear usuario de auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: user.email,
        password: TEST_PASSWORD,
        email_confirm: true,
      });

    if (authError) {
      // Si ya existe, lo saltamos sin fallar todo el script
      if (authError.message?.includes("already been registered")) {
        console.log(`⚠️  ${user.email} ya existe, saltando...`);
        continue;
      }
      console.error(`❌ Error creando auth user ${user.email}:`, authError.message);
      continue;
    }

    const userId = authData.user.id;

    // 2. Crear su perfil
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      name: user.name,
      age: user.age,
      bio: user.bio,
      city: user.city,
      tags: user.tags,
      lat: user.lat,
      lng: user.lng,
      photos: [],
    });

    if (profileError) {
      console.error(`❌ Error creando perfil de ${user.name}:`, profileError.message);
      continue;
    }

    console.log(`✅ ${user.name} (${user.email}) creado correctamente`);
  }

  console.log("\nListo. Todos los usuarios de prueba usan la contraseña:", TEST_PASSWORD);
}

seed();
