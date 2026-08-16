import { supabase } from "@/integrations/supabase/client";

/** Duolingo-like economy rules — one source of truth for hearts, streak and gems. */
export const MAX_HEARTS = 5;
/** One heart comes back every 30 minutes. */
export const HEART_REFILL_MINUTES = 30;
export const REFILL_COST_GEMS = 30;
export const FREEZE_COST_GEMS = 50;
export const GEMS_PER_LESSON = 5;

export type EconomyProfile = {
  id: string;
  hearts: number;
  gems: number;
  streak: number;
  streak_freeze: number;
  hearts_updated_at: string | null;
  last_active_date: string | null;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Hearts regenerate with time — compute the real value from the stored timestamp. */
export function regenerated(p: { hearts: number; hearts_updated_at: string | null }) {
  const hearts = Math.max(0, Math.min(MAX_HEARTS, p.hearts ?? 0));
  if (hearts >= MAX_HEARTS || !p.hearts_updated_at) return { hearts, msToNext: 0 };
  const elapsed = Date.now() - new Date(p.hearts_updated_at).getTime();
  const per = HEART_REFILL_MINUTES * 60_000;
  const gained = Math.floor(elapsed / per);
  const next = Math.min(MAX_HEARTS, hearts + Math.max(0, gained));
  const msToNext = next >= MAX_HEARTS ? 0 : per - (elapsed % per);
  return { hearts: next, msToNext };
}

/** Persist the time-based refill so the top bar and the lesson agree. */
export async function syncHearts(p: EconomyProfile) {
  const { hearts } = regenerated(p);
  if (hearts === p.hearts) return hearts;
  await supabase.from("profiles").update({ hearts, hearts_updated_at: new Date().toISOString() }).eq("id", p.id);
  return hearts;
}

/** Lose one heart (wrong answer). Returns the remaining hearts. */
export async function loseHeart(p: EconomyProfile) {
  const current = regenerated(p).hearts;
  const next = Math.max(0, current - 1);
  await supabase
    .from("profiles")
    .update({ hearts: next, hearts_updated_at: new Date().toISOString() })
    .eq("id", p.id);
  return next;
}

/** Buy a full refill with gems. */
export async function refillWithGems(p: EconomyProfile) {
  if ((p.gems ?? 0) < REFILL_COST_GEMS) throw new Error("جواهرك لا تكفي");
  const { error } = await supabase
    .from("profiles")
    .update({ hearts: MAX_HEARTS, gems: p.gems - REFILL_COST_GEMS, hearts_updated_at: new Date().toISOString() })
    .eq("id", p.id);
  if (error) throw error;
}

/** Buy a streak freeze — saves the flame for one missed day. */
export async function buyFreeze(p: EconomyProfile) {
  if ((p.gems ?? 0) < FREEZE_COST_GEMS) throw new Error("جواهرك لا تكفي");
  const { error } = await supabase
    .from("profiles")
    .update({ gems: p.gems - FREEZE_COST_GEMS, streak_freeze: (p.streak_freeze ?? 0) + 1 })
    .eq("id", p.id);
  if (error) throw error;
}

/**
 * Called when a lesson is completed: extends the flame, or uses a freeze,
 * or restarts it when the chain is broken.
 */
export function nextStreak(p: EconomyProfile) {
  const t = today();
  if (p.last_active_date === t) return { streak: p.streak ?? 0, streak_freeze: p.streak_freeze ?? 0, changed: false };

  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  if (!p.last_active_date || p.last_active_date === yesterday) {
    return { streak: (p.streak ?? 0) + 1, streak_freeze: p.streak_freeze ?? 0, changed: true };
  }
  if ((p.streak_freeze ?? 0) > 0) {
    return { streak: (p.streak ?? 0) + 1, streak_freeze: (p.streak_freeze ?? 0) - 1, changed: true };
  }
  return { streak: 1, streak_freeze: p.streak_freeze ?? 0, changed: true };
}

export function formatCountdown(ms: number) {
  if (ms <= 0) return "";
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
