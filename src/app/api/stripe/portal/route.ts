import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { getUserFromAuthHeader } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

interface PortalRequestBody {
  origin: string;
}

export async function POST(request: Request) {
  const user = await getUserFromAuthHeader(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: PortalRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    const customerId = (profile as { stripe_customer_id: string | null } | null)?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json(
        { error: "No active subscription to manage yet." },
        { status: 400 }
      );
    }

    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: body.origin,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Could not open billing portal: ${message}` }, { status: 502 });
  }
}
