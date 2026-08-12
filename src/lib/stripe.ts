import Stripe from "stripe";
import type { Tier } from "./types";

let client: Stripe | null = null;

/** Server-only. Never import this file from a "use client" component. */
export function getStripeClient(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not set in the server environment.");
  }
  if (!client) {
    client = new Stripe(apiKey);
  }
  return client;
}

export const PAID_TIER_PRICE_IDS: Record<"plus" | "pro", string> = {
  plus: process.env.STRIPE_PLUS_PRICE_ID ?? "",
  pro: process.env.STRIPE_PRO_PRICE_ID ?? "",
};

export function tierForPriceId(priceId: string | null | undefined): Tier | null {
  if (!priceId) return null;
  if (priceId === PAID_TIER_PRICE_IDS.plus) return "plus";
  if (priceId === PAID_TIER_PRICE_IDS.pro) return "pro";
  return null;
}
