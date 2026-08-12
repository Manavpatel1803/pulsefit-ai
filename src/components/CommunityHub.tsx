"use client";

import { useState } from "react";
import { Trophy, Users, Zap } from "lucide-react";
import CommunityFeed from "./CommunityFeed";
import ChallengesPanel from "./ChallengesPanel";
import GroupsPanel from "./GroupsPanel";

type SubView = "feed" | "challenges" | "groups";

const TABS: { key: SubView; label: string; icon: React.ReactNode }[] = [
  { key: "feed", label: "Feed", icon: <Zap className="h-3.5 w-3.5" /> },
  { key: "challenges", label: "Challenges", icon: <Trophy className="h-3.5 w-3.5" /> },
  { key: "groups", label: "Groups", icon: <Users className="h-3.5 w-3.5" /> },
];

export default function CommunityHub() {
  const [view, setView] = useState<SubView>("feed");

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              view === t.key ? "bg-white/8 text-white" : "text-mist hover:text-white hover:bg-white/5"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {view === "feed" && <CommunityFeed />}
      {view === "challenges" && <ChallengesPanel />}
      {view === "groups" && <GroupsPanel />}
    </div>
  );
}
