import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { tierMeetsMinimum, type Tier } from "./types";
import { canAccess, requiredTierFor, type Feature } from "./featureAccess";

function userScopedClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any, "public", any>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

function tokenFromAuthHeader(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

/** Server-only. Validates a client's bearer access token and returns the Supabase user it belongs to. */
export async function getUserFromAuthHeader(request: Request): Promise<User | null> {
  const token = tokenFromAuthHeader(request);
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error) return null;
  return data.user;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ScopedClient = SupabaseClient<any, "public", any>;

export type RequireTierResult =
  | { ok: true; user: User; tier: Tier; client: ScopedClient }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Server-only. The authoritative tier check for API routes — validates the caller's
 * session token, then reads their *actual* profiles.tier (RLS-scoped to their own row,
 * same source of truth the UI reads) rather than trusting anything the client claims.
 * Returns a client pre-authenticated as the caller, for routes that also need to read
 * the caller's own data (RLS still applies — it cannot read anyone else's rows).
 */
export async function requireTier(request: Request, minimumTier: Tier): Promise<RequireTierResult> {
  const token = tokenFromAuthHeader(request);
  if (!token) return { ok: false, status: 401, error: "Not authenticated." };

  const client = userScopedClient(token);

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) return { ok: false, status: 401, error: "Not authenticated." };

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("tier")
    .eq("id", userData.user.id)
    .single();
  if (profileError || !profile) return { ok: false, status: 401, error: "Profile not found." };

  const tier = profile.tier as Tier;
  if (!tierMeetsMinimum(tier, minimumTier)) {
    return { ok: false, status: 403, error: `This feature requires ${minimumTier} tier or higher.` };
  }

  return { ok: true, user: userData.user, tier, client };
}

/** Same as requireTier, but keyed off the central feature registry instead of a raw tier literal. */
export function requireFeature(request: Request, feature: Feature): Promise<RequireTierResult> {
  return requireTier(request, requiredTierFor(feature));
}

export { canAccess };
