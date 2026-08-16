import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AvatarBubble } from "@/components/AvatarBubble";
import { BottomNav } from "@/components/BottomNav";
import { Trophy, Loader2, Crown, Medal, Sparkles } from "lucide-react";
import { useProfile } from "@/lib/useProfile";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "المتصدرون — ذكاء" },
      { name: "description", content: "قائمة أفضل المتعلمين في تطبيق ذكاء." },
    ],
  }),
  component: LeaderboardPage,
});

type Row = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  xp: number;
};

function LeaderboardPage() {
  const { data: me } = useProfile();
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, xp")
        .order("xp", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const myRank = data && me ? data.findIndex((r) => r.id === me.id) + 1 : 0;

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-24 font-display">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="bg-accent text-primary-foreground pt-8 pb-6 px-6 text-center">
          <Trophy className="w-14 h-14 mx-auto mb-2" />
          <h1 className="text-2xl font-extrabold">المتصدرون</h1>
          <p className="text-sm opacity-90 font-bold">أفضل ٥٠ متعلم على مستوى العالم</p>
        </div>

        {me && myRank > 0 && (
          <div className="mx-4 -mt-4 relative z-10 bg-card border-2 border-primary rounded-2xl p-3 flex items-center gap-3 shadow-lg">
            <div className="w-8 text-center font-extrabold text-primary">#{myRank}</div>
            <AvatarBubble id={me.avatar_url} size={40} />
            <div className="flex-1">
              <div className="text-sm font-extrabold">{me.display_name} <span className="text-xs text-muted-foreground">(أنت)</span></div>
              <div className="text-xs text-muted-foreground">@{me.username}</div>
            </div>
            <div className="flex items-center gap-1 text-primary font-extrabold">
              <Sparkles className="w-4 h-4" />
              {me.xp}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-20 grid place-items-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="mx-4 mt-6 text-center py-10 text-muted-foreground font-bold">
            لا يوجد متصدرون بعد. كن أول من يبدأ! 🚀
          </div>
        ) : (
          <ul className="mx-4 mt-6 space-y-2">
            {data.map((row, i) => {
              const rank = i + 1;
              const isMe = me?.id === row.id;
              return (
                <li
                  key={row.id}
                  className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition ${
                    isMe ? "bg-primary/10 border-primary" : "bg-card border-border"
                  }`}
                >
                  <RankBadge rank={rank} />
                  <AvatarBubble id={row.avatar_url} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate">{row.display_name ?? "لاعب"}</div>
                    <div className="text-xs text-muted-foreground truncate">@{row.username ?? "user"}</div>
                  </div>
                  <div className="flex items-center gap-1 text-primary font-extrabold">
                    <Sparkles className="w-4 h-4" />
                    {row.xp}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <div className="w-10 h-10 rounded-full grid place-items-center bg-streak text-white">
        <Crown className="w-5 h-5" />
      </div>
    );
  if (rank === 2)
    return (
      <div className="w-10 h-10 rounded-full grid place-items-center bg-muted-foreground text-white">
        <Medal className="w-5 h-5" />
      </div>
    );
  if (rank === 3)
    return (
      <div className="w-10 h-10 rounded-full grid place-items-center bg-accent text-white">
        <Medal className="w-5 h-5" />
      </div>
    );
  return (
    <div className="w-10 h-10 rounded-full grid place-items-center bg-secondary text-secondary-foreground font-extrabold">
      {rank}
    </div>
  );
}
