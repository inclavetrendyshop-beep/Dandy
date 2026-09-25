import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId, email } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId requerido" }, { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!secretKey || !priceId) {
    return NextResponse.json({ error: "Falta configurar STRIPE_SECRET_KEY o STRIPE_PRICE_ID en Vercel" }, { status: 500 });
  }

  const origin = req.headers.get("origin") || "https://dandy-gamma.vercel.app";

  const body = new URLSearchParams();
  body.append("mode", "subscription");
  body.append("line_items[0][price]", priceId);
  body.append("line_items[0][quantity]", "1");
  body.append("success_url", origin + "/premium/success");
  body.append("cancel_url", origin + "/settings");
  body.append("client_reference_id", userId);
  body.append("metadata[user_id]", userId);
  body.append("managed_payments[enabled]", "false");
  if (email) {
    body.append("customer_email", email);
  }

  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + secretKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!stripeRes.ok) {
    const errText = await stripeRes.text();
    return NextResponse.json({ error: "No se pudo crear la sesion de pago: " + errText }, { status: 500 });
  }

  const data = await stripeRes.json();
  return NextResponse.json({ url: data.url });
}

