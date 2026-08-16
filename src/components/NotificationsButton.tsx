import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, CheckCheck } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type Notif = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

const KIND_ICON: Record<string, string> = {
  admin: "📢",
  lesson: "✨",
  streak: "🔥",
  gem: "💎",
  project: "🚀",
  forum: "💬",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `قبل ${m} دقيقة`;
  const h = Math.round(m / 60);
  if (h < 24) return `قبل ${h} ساعة`;
  const d = Math.round(h / 24);
  return d === 1 ? "أمس" : `قبل ${d} يوم`;
}

export function useNotifications() {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [] as Notif[];
      const { data, error } = await supabase
        .from("notifications")
        .select("id,kind,title,body,href,read_at,created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Notif[];
    },
    refetchInterval: 30000,
  });

  // Live updates: new notifications land instantly without a refresh.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user || cancelled) return;
      channel = supabase
        .channel("notifications-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${auth.user.id}` },
          () => qc.invalidateQueries({ queryKey: ["notifications"] }),
        )
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [qc]);

  return q;
}

export function NotificationsButton() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useNotifications();
  const list = data ?? [];
  const unread = list.filter((n) => !n.read_at).length;

  async function markAll() {
    const ids = list.filter((n) => !n.read_at).map((n) => n.id);
    if (!ids.length) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function markOne(id: string) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative w-9 h-9 sm:w-10 sm:h-10 grid place-items-center rounded-full hover:bg-secondary transition"
        aria-label="الإشعارات"
      >
        <Bell className="w-6 h-6 text-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-heart text-white text-[10px] font-extrabold grid place-items-center border-2 border-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)}>
          <div
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-14 inset-x-3 mx-auto max-w-md sm:max-w-lg bg-card border-2 border-border rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-top duration-200"
          >
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b-2 border-border bg-secondary/60">
              <div className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" /> الإشعارات
              </div>
              <div className="flex items-center gap-3">
                {unread > 0 && (
                  <button onClick={markAll} className="text-[11px] font-extrabold text-primary flex items-center gap-1">
                    <CheckCheck className="w-4 h-4" /> تعليم الكل كمقروء
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-xs font-extrabold text-muted-foreground">
                  إغلاق
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="grid place-items-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : list.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <BellOff className="w-9 h-9 mx-auto text-muted-foreground mb-2" />
                <div className="font-extrabold text-sm">لا توجد إشعارات بعد</div>
                <p className="text-xs font-bold text-muted-foreground mt-1">أكمل درساً اليوم وستصلك مكافآتك هنا ✨</p>
              </div>
            ) : (
              <ul className="max-h-[60vh] overflow-y-auto divide-y divide-border">
                {list.map((n) => {
                  const inner = (
                    <>
                      <div className="w-10 h-10 rounded-full grid place-items-center bg-secondary text-lg shrink-0">
                        {KIND_ICON[n.kind] ?? "🔔"}
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <div className="flex items-center gap-2">
                          <div className="font-extrabold text-sm">{n.title}</div>
                          {!n.read_at && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                        </div>
                        {n.body && <div className="text-xs text-muted-foreground mt-0.5 font-bold leading-relaxed">{n.body}</div>}
                        <div className="text-[10px] text-muted-foreground mt-1 font-bold">{timeAgo(n.created_at)}</div>
                      </div>
                    </>
                  );
                  const cls = `flex gap-3 items-start w-full px-4 sm:px-5 py-4 ${n.read_at ? "" : "bg-primary/5"}`;
                  return (
                    <li key={n.id}>
                      {n.href ? (
                        <Link to={n.href} onClick={() => { markOne(n.id); setOpen(false); }} className={cls}>
                          {inner}
                        </Link>
                      ) : (
                        <button onClick={() => markOne(n.id)} className={cls}>{inner}</button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
