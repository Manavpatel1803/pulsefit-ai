import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType = "weekly_review_ready" | "plan_adjusted" | "challenge_progress";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

/**
 * Inserts a notification, respecting the user's own preference for that type and
 * (optionally) deduping so the same trigger doesn't spam repeatedly. Never fails loudly —
 * a notification is a side effect, not something that should break the calling flow if
 * it can't be written (e.g. migration not yet applied).
 */
export async function notifyUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: SupabaseClient<any, "public", any>,
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  dedupeWithinHours?: number
): Promise<void> {
  try {
    const { data: prefs } = await client
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    const enabled = prefs ? (prefs as Record<NotificationType, boolean>)[type] : true;
    if (!enabled) return;

    if (dedupeWithinHours) {
      const cutoff = new Date(Date.now() - dedupeWithinHours * 3600000).toISOString();
      const { data: recent } = await client
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("type", type)
        .gte("created_at", cutoff)
        .limit(1);
      if (recent && recent.length > 0) return;
    }

    await client.from("notifications").insert({ user_id: userId, type, title, body });
  } catch {
    // best-effort — never let a notification failure break the caller
  }
}
