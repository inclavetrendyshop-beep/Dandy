import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { matchId } = await req.json();
  if (!matchId) {
    return NextResponse.json({ error: "matchId requerido" }, { status: 400 });
  }

  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta configurar DAILY_API_KEY en Vercel" }, { status: 500 });
  }

  const roomName = "dandy-match-" + matchId;

  const existing = await fetch("https://api.daily.co/v1/rooms/" + roomName, {
    headers: { Authorization: "Bearer " + apiKey },
  });
  if (existing.ok) {
    const data = await existing.json();
    return NextResponse.json({ url: data.url });
  }

  const created = await fetch("https://api.daily.co/v1/rooms", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: roomName,
      properties: {
        enable_chat: false,
        enable_screenshare: false,
      },
    }),
  });

  if (!created.ok) {
    const errText = await created.text();
    return NextResponse.json({ error: "No se pudo crear la sala: " + errText }, { status: 500 });
  }

  const data = await created.json();
  return NextResponse.json({ url: data.url });
}
