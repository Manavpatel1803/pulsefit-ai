export class BillingError extends Error {}

async function postJson<T>(url: string, accessToken: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new BillingError(data.error ?? `Request to ${url} failed (${res.status}).`);
  }
  return data as T;
}

/** Redirects to Stripe Checkout for the given paid tier. */
export async function startCheckout(tier: "plus" | "pro", accessToken: string): Promise<void> {
  const { url } = await postJson<{ url: string }>("/api/stripe/checkout", accessToken, {
    tier,
    origin: window.location.origin,
  });
  window.location.href = url;
}

/** Redirects to the Stripe Billing Portal to manage or cancel an existing subscription. */
export async function openBillingPortal(accessToken: string): Promise<void> {
  const { url } = await postJson<{ url: string }>("/api/stripe/portal", accessToken, {
    origin: window.location.origin,
  });
  window.location.href = url;
}
