import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flame, Gem, Heart, Snowflake, X } from "lucide-react";
import { useProfile } from "@/lib/useProfile";
import {
  FREEZE_COST_GEMS, MAX_HEARTS, REFILL_COST_GEMS, buyFreeze, formatCountdown, refillWithGems, regenerated,
} from "@/lib/economy";

/** The hearts / flame / gems sheet — this is where the economy becomes useful. */
export function EconomySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    const t = window.setInterval(() => setTick((v) => v + 1), 1000);
    return () => window.clearInterval(t);
  }, [open]);

  if (!open || !profile) return null;
  void tick;
  const { hearts, msToNext } = regenerated(profile);

  async function act(fn: () => Promise<void>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر التنفيذ");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/45" onClick={onClose}>
      <div dir="rtl" className="w-full max-w-md bg-card rounded-t-3xl border-t-4 border-primary p-5 pb-8 space-y-4 animate-in slide-in-from-bottom duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-lg">طاقتك اليوم</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Card icon={<Heart className="w-5 h-5 fill-current" />} color="text-heart" value={`${hearts}/${MAX_HEARTS}`} label="قلوب" />
          <Card icon={<Flame className="w-5 h-5" />} color="text-streak" value={String(profile.streak ?? 0)} label="أيام متتالية" />
          <Card icon={<Gem className="w-5 h-5" />} color="text-gem" value={String(profile.gems ?? 0)} label="جواهر" />
        </div>

        <div className="rounded-2xl bg-secondary/60 p-3 text-[12px] font-bold leading-6">
          كل إجابة خاطئة تُنقص ❤️ قلب. لو خلصت القلوب، ما تقدرش تبدأ درس جديد لحد ما ترجع.
          {hearts < MAX_HEARTS && msToNext > 0 && (
            <div className="mt-1 text-primary font-extrabold">قلب جديد بعد {formatCountdown(msToNext)} ⏳</div>
          )}
        </div>

        <button
          disabled={busy || hearts >= MAX_HEARTS || (profile.gems ?? 0) < REFILL_COST_GEMS}
          onClick={() => act(() => refillWithGems(profile), "امتلأت قلوبك 💖")}
          className="btn-3d w-full active:btn-3d-active disabled:opacity-50"
        >
          <Heart className="w-4 h-4 fill-current" /> املأ القلوب مقابل {REFILL_COST_GEMS} 💎
        </button>

        <button
          disabled={busy || (profile.gems ?? 0) < FREEZE_COST_GEMS}
          onClick={() => act(() => buyFreeze(profile), "اشتريت درع الشعلة 🧊")}
          className="w-full rounded-2xl border-2 border-border py-3 font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Snowflake className="w-4 h-4 text-gem" /> درع الشعلة مقابل {FREEZE_COST_GEMS} 💎
          <span className="text-[11px] text-muted-foreground">(عندك {profile.streak_freeze ?? 0})</span>
        </button>

        <p className="text-[11px] font-bold text-muted-foreground leading-6">
          الشعلة 🔥 تزيد يوم واحد كل يوم تُنهي فيه درساً. لو فاتك يوم، درع الشعلة يحميها تلقائياً.
          والجواهر 💎 تكسبها من كل درس (+5) وتشتري بها القلوب والدروع.
        </p>
      </div>
    </div>
  );
}

function Card({ icon, color, value, label }: { icon: React.ReactNode; color: string; value: string; label: string }) {
  return (
    <div className="rounded-2xl border-2 border-border bg-background p-3">
      <div className={`flex justify-center ${color}`}>{icon}</div>
      <div className="font-extrabold text-lg">{value}</div>
      <div className="text-[10px] font-bold text-muted-foreground">{label}</div>
    </div>
  );
}
