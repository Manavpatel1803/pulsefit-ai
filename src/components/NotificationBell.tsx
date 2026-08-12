"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Settings2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import type { AppNotification, NotificationType } from "@/lib/notifications";

const TYPE_LABEL: Record<NotificationType, string> = {
  weekly_review_ready: "Weekly reviews",
  plan_adjusted: "Plan adjustments",
  challenge_progress: "Challenge progress",
};

interface Preferences {
  weekly_review_ready: boolean;
  plan_adjusted: boolean;
  challenge_progress: boolean;
}

const DEFAULT_PREFS: Preferences = { weekly_review_ready: true, plan_adjusted: true, challenge_progress: true };

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: notifRows }, { data: prefRow }] = await Promise.all([
      supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    setNotifications((notifRows as AppNotification[]) ?? []);
    if (prefRow) setPrefs(prefRow as Preferences);
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  async function markAllRead() {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function togglePref(type: NotificationType) {
    if (!user) return;
    const next = { ...prefs, [type]: !prefs[type] };
    setPrefs(next);
    await supabase.from("notification_preferences").upsert({ user_id: user.id, ...next });
  }

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-mist hover:text-white hover:bg-white/5 active:scale-90 transition-[color,background-color,transform] duration-150"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5 rounded-full bg-amber text-void text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 origin-top-right animate-popover-in glass-raised max-h-96 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-hairline shrink-0">
            <span className="text-sm font-medium text-white">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-indigo-glow hover:underline active:scale-95 transition-transform">
                  Mark all read
                </button>
              )}
              <button onClick={() => setShowSettings((s) => !s)} aria-label="Notification settings" className="text-mist hover:text-white active:scale-90 transition-transform">
                <Settings2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {showSettings && (
            <div className="px-4 py-3 border-b border-hairline space-y-2 shrink-0">
              {(Object.keys(TYPE_LABEL) as NotificationType[]).map((t) => (
                <label key={t} className="flex items-center justify-between text-xs text-slate-300">
                  {TYPE_LABEL[t]}
                  <input type="checkbox" checked={prefs[t]} onChange={() => togglePref(t)} className="accent-indigo" />
                </label>
              ))}
            </div>
          )}

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 && <p className="text-xs text-mist text-center py-8">No notifications yet.</p>}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                className={`w-full text-left px-4 py-3 border-b border-hairline last:border-0 active:scale-[0.98] transition-[background-color,opacity,transform] duration-150 ${
                  n.read ? "opacity-60" : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-white">{n.title}</span>
                  {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-indigo-glow shrink-0" />}
                </div>
                <p className="text-xs text-mist mt-0.5">{n.body}</p>
                <p className="text-[10px] text-mist-dim mt-1">{timeAgo(n.created_at)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
