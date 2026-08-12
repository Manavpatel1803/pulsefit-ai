import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient, tierForPriceId } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await request.text();

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 500 });
  }

  const stripe = getStripeClient();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? session.metadata?.supabase_user_id;
      const tier = session.metadata?.tier;
      if (userId && tier) {
        await admin
          .from("profiles")
          .update({
            tier,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            stripe_subscription_status: "active",
          })
          .eq("id", userId);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.supabase_user_id;
      const priceId = subscription.items.data[0]?.price.id;
      const tier = tierForPriceId(priceId);
      if (userId) {
        const isActive = subscription.status === "active" || subscription.status === "trialing";
        await admin
          .from("profiles")
          .update({
            tier: isActive && tier ? tier : "free",
            stripe_subscription_status: subscription.status,
          })
          .eq("id", userId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.supabase_user_id;
      if (userId) {
        await admin
          .from("profiles")
          .update({ tier: "free", stripe_subscription_id: null, stripe_subscription_status: "canceled" })
          .eq("id", userId);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
