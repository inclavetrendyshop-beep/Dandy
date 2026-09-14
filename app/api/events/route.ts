import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");
  const keyword = req.nextUrl.searchParams.get("keyword") || "";

  if (!lat || !lng) {
    return NextResponse.json({ error: "Falta ubicación" }, { status: 400 });
  }

  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta configurar TICKETMASTER_API_KEY" }, { status: 500 });
  }

  const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("latlong", `${lat},${lng}`);
  url.searchParams.set("radius", "50");
  url.searchParams.set("unit", "km");
  url.searchParams.set("sort", "date,asc");
  url.searchParams.set("size", "20");
  if (keyword) url.searchParams.set("keyword", keyword);

  const res = await fetch(url.toString());
  if (!res.ok) {
    return NextResponse.json({ error: "Error consultando Ticketmaster" }, { status: 502 });
  }
  const data = await res.json();

  const events = (data._embedded?.events || []).map((e: any) => ({
    id: e.id,
    name: e.name,
    date: e.dates?.start?.localDate,
    time: e.dates?.start?.localTime,
    image: e.images?.find((img: any) => img.width > 500)?.url || e.images?.[0]?.url,
    venue: e._embedded?.venues?.[0]?.name,
    city: e._embedded?.venues?.[0]?.city?.name,
    category: e.classifications?.[0]?.segment?.name,
    url: e.url,
  }));

  return NextResponse.json({ events });
}
