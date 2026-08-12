import { NextResponse } from "next/server";
import { getStripeClient, PAID_TIER_PRICE_IDS } from "@/lib/stripe";
import { getUserFromAuthHeader } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

interface CheckoutRequestBody {
  tier: "plus" | "pro";
  origin: string;
}

export async function POST(request: Request) {
  const user = await getUserFromAuthHeader(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: CheckoutRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const priceId = PAID_TIER_PRICE_IDS[body.tier];
  if (!priceId) {
    return NextResponse.json({ error: `Unknown tier "${body.tier}".` }, { status: 400 });
  }

  try {
    const stripe = getStripeClient();
    const admin = getSupabaseAdmin();

    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      customer: (profile as { stripe_customer_id: string | null } | null)?.stripe_customer_id || undefined,
      customer_email: (profile as { stripe_customer_id: string | null } | null)?.stripe_customer_id
        ? undefined
        : user.email,
      metadata: { supabase_user_id: user.id, tier: body.tier },
      subscription_data: { metadata: { supabase_user_id: user.id, tier: body.tier } },
      success_url: `${body.origin}?checkout=success`,
      cancel_url: `${body.origin}?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Could not start checkout: ${message}` }, { status: 502 });
  }
}
