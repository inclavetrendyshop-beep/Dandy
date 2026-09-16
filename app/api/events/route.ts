import { NextRequest, NextResponse } from "next/server";

// Revalida el resultado cada 20 minutos por combinación de parámetros
// (Next.js cachea automáticamente fetch() en el servidor si se usa `next.revalidate`)
const CACHE_SECONDS = 60 * 20;

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");
  const keyword = req.nextUrl.searchParams.get("keyword") || "";

  if (!lat || !lng) {
    return NextResponse.json({ error: "Falta ubicación" }, { status: 400 });
  }

  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta configurar TICKETMASTER_API_KEY" },
      { status: 500 }
    );
  }

  const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("latlong", `${lat},${lng}`);
  url.searchParams.set("radius", "50");
  url.searchParams.set("unit", "km");
  url.searchParams.set("sort", "date,asc");
  url.searchParams.set("size", "20");
  if (keyword) url.searchParams.set("keyword", keyword);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      // Cachea la respuesta en el servidor de Next.js para no agotar
      // la cuota de la API en cada recarga de pantalla
      next: { revalidate: CACHE_SECONDS },
    });
  } catch (err) {
    console.error("Error de red consultando Ticketmaster:", err);
    return NextResponse.json(
      { error: "No se pudo contactar con Ticketmaster" },
      { status: 502 }
    );
  }

  if (res.status === 429) {
    console.error("Ticketmaster rate limit alcanzado");
    return NextResponse.json(
      { error: "Límite de peticiones alcanzado, inténtalo en unos minutos" },
      { status: 429 }
    );
  }

  if (!res.ok) {
    console.error(
      `Error consultando Ticketmaster: status ${res.status} ${res.statusText}`
    );
    return NextResponse.json(
      { error: "Error consultando Ticketmaster" },
      { status: 502 }
    );
  }

  let data: any;
  try {
    data = await res.json();
  } catch (err) {
    console.error("Error parseando respuesta de Ticketmaster:", err);
    return NextResponse.json(
      { error: "Respuesta inválida de Ticketmaster" },
      { status: 502 }
    );
  }

  const rawEvents = data?._embedded?.events;

  if (!Array.isArray(rawEvents)) {
    // No es un error: simplemente no hay eventos en esa zona/fecha.
    // Lo registramos para poder distinguirlo de un fallo real si hace falta.
    console.info("Sin eventos para lat/lng:", lat, lng, "keyword:", keyword);
    return NextResponse.json({ events: [] });
  }

  const events = rawEvents.map((e: any) => {
    const images: any[] = Array.isArray(e.images) ? e.images : [];
    const bestImage =
      images.find((img: any) => img.width > 500)?.url ||
      images[0]?.url ||
      null;

    return {
      id: e.id,
      name: e.name,
      date: e.dates?.start?.localDate ?? null,
      time: e.dates?.start?.localTime ?? null,
      image: bestImage,
      venue: e._embedded?.venues?.[0]?.name ?? null,
      city: e._embedded?.venues?.[0]?.city?.name ?? null,
      category: e.classifications?.[0]?.segment?.name ?? null,
      url: e.url ?? null,
    };
  });

  return NextResponse.json({ events });
