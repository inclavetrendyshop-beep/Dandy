import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function verifyStripeSignature(payload: string, sigHeader: string, secret: string): boolean {
  const parts: Record<string, string> = {};
  sigHeader.split(",").forEach((part) => {
    const [k, v] = part.split("=");
    if (k && v) parts[k] = v;
  });
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;

  const signedPayload = timestamp + "." + payload;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const payload = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Falta configurar STRIPE_WEBHOOK_SECRET" }, { status: 400 });
  }

  if (!verifyStripeSignature(payload, sig, webhookSecret)) {
    return NextResponse.json({ error: "Firma invalida" }, { status: 400 });
  }

  const event = JSON.parse(payload);

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.client_reference_id || session.metadata?.user_id;
    const customerId = session.customer;

    if (userId) {
      await supabaseAdmin
        .from("profiles")
        .update({
          is_premium: true,
          stripe_customer_id: customerId,
          premium_since: new Date().toISOString(),
        })
        .eq("id", userId);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const customerId = subscription.customer;

    await supabaseAdmin
      .from("profiles")
      .update({ is_premium: false })
      .eq("stripe_customer_id", customerId);
  }

  return NextResponse.json({ received: true });
}

