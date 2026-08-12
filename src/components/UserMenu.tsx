"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, HelpCircle, LogOut, Plug, UserCog } from "lucide-react";
import { useApp } from "@/context/AppContext";
import EditProfileModal from "@/components/EditProfileModal";
import HelpSupportModal from "@/components/HelpSupportModal";

export default function UserMenu() {
  const { profile, user, signOut } = useApp();
  const [open, setOpen] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!profile || !user) return null;

  const displayName = profile.full_name || user.email || "Account";

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-mist hover:text-white hover:bg-white/5 active:scale-[0.98] transition-all max-w-[10rem] sm:max-w-none"
        >
          <span className="truncate">{displayName}</span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute right-0 top-10 z-50 w-56 origin-top-right animate-popover-in glass-raised overflow-hidden">
            <div className="px-4 py-3 border-b border-hairline">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-xs text-mist-dim truncate">{user.email}</p>
            </div>
            <div className="py-1.5">
              <MenuItem
                icon={<UserCog className="h-4 w-4" />}
                label="Edit profile"
                onClick={() => {
                  setShowEditProfile(true);
                  setOpen(false);
                }}
              />
              <MenuItem icon={<Plug className="h-4 w-4" />} label="Connected apps" badge="Coming soon" disabled />
              <MenuItem
                icon={<HelpCircle className="h-4 w-4" />}
                label="Help & support"
                onClick={() => {
                  setShowHelp(true);
                  setOpen(false);
                }}
              />
            </div>
            <div className="py-1.5 border-t border-hairline">
              <MenuItem
                icon={<LogOut className="h-4 w-4" />}
                label="Sign out"
                tone="danger"
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
              />
            </div>
          </div>
        )}
      </div>

      {showEditProfile && <EditProfileModal onClose={() => setShowEditProfile(false)} />}
      {showHelp && <HelpSupportModal onClose={() => setShowHelp(false)} />}
    </>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  disabled,
  badge,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string;
  tone?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors ${
        disabled
          ? "text-mist-dim cursor-not-allowed"
          : tone === "danger"
            ? "text-red-400 hover:bg-red-400/10"
            : "text-slate-200 hover:bg-white/5 hover:text-white"
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge && <span className="text-[9px] uppercase tracking-wide text-mist-dim border border-hairline rounded-full px-1.5 py-0.5">{badge}</span>}
    </button>
  );
}
