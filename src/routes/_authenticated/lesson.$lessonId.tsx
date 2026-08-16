import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AvatarBubble } from "@/components/AvatarBubble";
import { useProfile } from "@/lib/useProfile";
import { ChatMockup, isChatDemo } from "@/components/lesson/ChatMockup";
import { CodeLab, isCodeLab } from "@/components/lesson/CodeLab";
import { SiteViewer, isSiteView, resetSiteOwners } from "@/components/lesson/SiteViewer";
import { EconomySheet } from "@/components/EconomySheet";
import { GEMS_PER_LESSON, loseHeart, nextStreak, regenerated } from "@/lib/economy";
import { characterImage } from "@/lib/characterImage";
import { toast } from "sonner";
import mascot from "@/assets/mascot.png";
import { BrandMascot } from "@/components/BrandMascot";
import { Check, ChevronUp, Loader2, Target, Sparkles, X, Trophy, Heart } from "lucide-react";


export const Route = createFileRoute("/_authenticated/lesson/$lessonId")({
  head: () => ({
    meta: [
      { title: "الدرس — nilex" },
      { name: "description", content: "درس تفاعلي بأسلوب المحادثة على منصة nilex." },
      { property: "og:title", content: "الدرس — nilex" },
      { property: "og:description", content: "تعلّم أدوات الذكاء الاصطناعي خطوة بخطوة." },
    ],
  }),
  component: LessonPlayer,
});

type Step = {
  id: string;
  order_index: number;
  kind: "text" | "image" | "video" | "question";
  content: string | null;
  media_url: string | null;
  options: unknown;
  character_id: string | null;
  mood: string;
};

type Character = { id: string; name: string; avatar_url: string | null; color: string; moods: Record<string, string> | null };

function moodImage(c: Character | undefined, mood: string) {
  return characterImage(c, mood);
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function LessonPlayer() {
  const { lessonId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useProfile();

  const lessonQ = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const stepsQ = useQuery({
    queryKey: ["lesson-steps", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase.from("lesson_steps").select("*").eq("lesson_id", lessonId).order("order_index");
      if (error) throw error;
      return (data ?? []) as unknown as Step[];
    },
  });

  const charsQ = useQuery({
    queryKey: ["characters-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("characters").select("id,name,avatar_url,color,moods");
      if (error) throw error;
      return (data ?? []) as unknown as Character[];
    },
  });

  const lesson = lessonQ.data as Record<string, unknown> | null | undefined;
  const steps = useMemo(() => stepsQ.data ?? [], [stepsQ.data]);
  const charMap = useMemo(() => new Map((charsQ.data ?? []).map((c) => [c.id, c])), [charsQ.data]);
  // Narrator fallback: use the real (admin-uploaded) Zaki artwork instead of the old preset mascot.
  const narrator = useMemo(() => {
    const list = charsQ.data ?? [];
    return list.find((c) => c.name.includes("زكي")) ?? list[0];
  }, [charsQ.data]);

  // reveal state: 0 = intro only, 1..steps.length = bubbles, steps.length+1 = summary
  const [shown, setShown] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [codeDone, setCodeDone] = useState<Set<string>>(new Set());
  const [siteDone, setSiteDone] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [economyOpen, setEconomyOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef(false);

  const hearts = profile ? regenerated(profile).hearts : 5;
  const summaryIndex = steps.length + 1;
  const atSummary = shown >= summaryIndex;
  const currentStep = shown >= 1 && shown <= steps.length ? steps[shown - 1] : undefined;
  const blocked =
    !!currentStep &&
    ((currentStep.kind === "question" && answers[currentStep.id] === undefined) ||
      (!!isCodeLab(currentStep.options) && !codeDone.has(currentStep.id)) ||
      (() => {
        const site = isSiteView(currentStep.options);
        return !!site && (site.require_done ?? !!site.task) && !siteDone.has(currentStep.id);
      })());

  // Each lesson owns its own live site frames.
  useEffect(() => {
    resetSiteOwners(lessonId);
    return () => resetSiteOwners(lessonId);
  }, [lessonId]);

  const reveal = useCallback(() => {
    if (blocked || lockRef.current) return;
    setShown((s) => Math.min(s + 1, summaryIndex));
  }, [blocked, summaryIndex]);

  // A wrong answer really costs a heart — this is what makes the economy matter.
  const onAnswer = useCallback(
    async (step: Step, index: number) => {
      setAnswers((a) => ({ ...a, [step.id]: index }));
      const opts = step.options as { answer?: number } | null;
      if (!profile || opts?.answer === undefined || opts.answer === index) return;
      const left = await loseHeart(profile);
      qc.invalidateQueries({ queryKey: ["profile"] });
      if (left === 0) toast.error("خلصت قلوبك 💔 — املأها لتكمل");
      else toast.error(`ناقص قلب 💔 — باقي ${left}`);
    },
    [profile, qc],
  );

  useEffect(() => {
    lockRef.current = true;
    const t = setTimeout(() => { lockRef.current = false; }, 350);
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    return () => clearTimeout(t);
  }, [shown]);

  // Pull the screen up (scroll to the bottom) to reveal the next message
  function onScroll() {
    const el = scrollRef.current;
    if (!el || atSummary) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) reveal();
  }

  // Touch swipe-up support even when content fits the screen
  const touchY = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) { touchY.current = e.touches[0]?.clientY ?? null; }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchY.current;
    const end = e.changedTouches[0]?.clientY ?? null;
    touchY.current = null;
    if (start === null || end === null) return;
    const el = scrollRef.current;
    const atBottom = !el || el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
    if (start - end > 40 && atBottom) reveal();
  }

  const objectives = asStringArray(lesson?.["objectives"]);
  const points = asStringArray(lesson?.["summary_points"]);
  const allChecked = points.length === 0 || checked.size === points.length;
  const progress = Math.round((Math.min(shown, summaryIndex) / Math.max(summaryIndex, 1)) * 100);

  async function finish() {
    if (!profile || !lesson) return;
    const xp = Number(lesson["xp_reward"] ?? 10);
    setSaving(true);
    try {
      const { error } = await supabase.from("lesson_progress").upsert(
        { user_id: profile.id, lesson_id: lessonId, completed_at: new Date().toISOString(), xp_earned: xp },
        { onConflict: "user_id,lesson_id" },
      );
      if (error) { toast.error(error.message); return; }
      const s = nextStreak(profile);
      await supabase
        .from("profiles")
        .update({
          xp: (profile.xp ?? 0) + xp,
          gems: (profile.gems ?? 0) + GEMS_PER_LESSON,
          streak: s.streak,
          streak_freeze: s.streak_freeze,
          last_active_date: new Date().toISOString().slice(0, 10),
        })
        .eq("id", profile.id);
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["my-progress"] });
      toast.success(s.changed ? `أحسنت! +${xp} XP و🔥 ${s.streak} أيام` : `أحسنت! +${xp} XP 🎉`);
      navigate({ to: "/" });
    } finally {
      setSaving(false);
    }
  }


  if (lessonQ.isLoading) {
    return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!lesson) {
    return (
      <div dir="rtl" className="min-h-screen grid place-items-center bg-background font-display p-6 text-center">
        <div>
          <div className="font-extrabold text-lg mb-2">الدرس غير موجود</div>
          <Link to="/" className="text-primary font-extrabold">العودة للرئيسية</Link>
        </div>
      </div>
    );
  }

  // No hearts left → the lesson really stops until they refill or wait.
  if (hearts <= 0) {
    return (
      <div dir="rtl" className="min-h-screen grid place-items-center bg-background font-display p-6 text-center">
        <div className="max-w-sm">
          <Heart className="w-14 h-14 mx-auto text-heart fill-current animate-bob" />
          <div className="font-extrabold text-lg mt-3">خلصت قلوبك 💔</div>
          <p className="text-sm font-bold text-muted-foreground mt-1 leading-7">
            القلوب ترجع مع الوقت (قلب كل ٣٠ دقيقة)، أو املأها فوراً بالجواهر.
          </p>
          <button onClick={() => setEconomyOpen(true)} className="btn-3d w-full mt-4 active:btn-3d-active">املأ القلوب</button>
          <Link to="/" className="block mt-3 text-primary font-extrabold text-sm">العودة للخريطة</Link>
        </div>
        <EconomySheet open={economyOpen} onClose={() => setEconomyOpen(false)} />
      </div>
    );
  }

  return (
    <div dir="rtl" className="h-[100dvh] bg-background font-display flex flex-col overflow-hidden">
      <header className="shrink-0 bg-card border-b-2 border-border px-3 py-2.5 flex items-center gap-3">
        <Link to="/" className="p-2 rounded-xl hover:bg-secondary text-muted-foreground shrink-0" aria-label="خروج"><X className="w-5 h-5" /></Link>
        <div className="flex-1 min-w-0">
          <div className="truncate text-[11px] font-extrabold text-muted-foreground mb-1">{String(lesson["title"] ?? "")}</div>
          <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <button onClick={() => setEconomyOpen(true)} className="flex items-center gap-1 text-heart font-extrabold shrink-0" aria-label="قلوبك">
          <Heart className="w-5 h-5 fill-current" />
          <span className="text-sm">{hearts}</span>
        </button>
      </header>


      <div
        ref={scrollRef}
        onScroll={onScroll}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        <main className="mx-auto w-full max-w-xl px-4 py-5 space-y-5 sm:space-y-6 pb-32">
          {/* Intro — first card in the same conversation */}
          <div className="rounded-3xl border-2 border-border bg-card overflow-hidden animate-in fade-in duration-300">
            <div className="bg-primary text-primary-foreground p-5 text-center">
              <BrandMascot slot="mascot_lesson" size={72} className="mx-auto w-18 h-18 animate-bob object-contain" />
              <div className="text-[11px] font-extrabold opacity-80 mt-1">الوحدة {String(lesson["unit"] ?? 1)}</div>
              <h1 className="text-xl font-extrabold">{String(lesson["title"] ?? "")}</h1>
            </div>
            <div className="p-4 space-y-3">
              {lesson["intro_text"] ? (
                <p className="text-sm font-bold leading-relaxed">{String(lesson["intro_text"])}</p>
              ) : lesson["description"] ? (
                <p className="text-sm font-bold leading-relaxed text-muted-foreground">{String(lesson["description"])}</p>
              ) : null}
              {objectives.length > 0 && (
                <div className="rounded-2xl bg-secondary/60 p-3">
                  <div className="flex items-center gap-2 text-primary font-extrabold text-xs mb-2"><Target className="w-4 h-4" /> ماذا ستتعلّم؟</div>
                  <ul className="space-y-1.5">
                    {objectives.map((o, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs font-bold">
                        <span className="mt-0.5 w-4 h-4 rounded-full bg-primary/15 text-primary grid place-items-center text-[10px] shrink-0">{i + 1}</span>
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Conversation bubbles */}
          {steps.slice(0, Math.min(shown, steps.length)).map((s) => (
            <Bubble
              key={s.id}
              step={s}
              character={(s.character_id ? charMap.get(s.character_id) : undefined) ?? narrator}
              answer={answers[s.id]}
              onAnswer={(i) => { void onAnswer(s, i); }}
              onCodePass={() => setCodeDone((d) => new Set(d).add(s.id))}
              lessonId={lessonId}
              siteDone={siteDone.has(s.id)}
              onSiteDone={() => setSiteDone((d) => new Set(d).add(s.id))}

            />
          ))}

          {/* Summary — same screen, at the end of the conversation */}
          {atSummary && (
            <div className="rounded-3xl border-2 border-border bg-card overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="bg-streak text-primary-foreground p-5 text-center">
                <Trophy className="w-10 h-10 mx-auto" />
                <h2 className="text-lg font-extrabold mt-1">أحسنت! أنهيت الدرس</h2>
                <p className="text-[11px] font-bold opacity-90">اضغط ✓ على كل نقطة تعلّمتها</p>
              </div>
              <div className="p-4 space-y-2.5">
                {points.length === 0 && (
                  <p className="text-sm font-bold text-muted-foreground flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> أنهيت جميع خطوات هذا الدرس.</p>
                )}
                {points.map((p, i) => {
                  const on = checked.has(i);
                  return (
                    <button
                      key={i}
                      onClick={() => setChecked((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })}
                      className={`w-full flex items-start gap-3 text-right p-3 rounded-2xl border-2 font-bold text-sm transition ${on ? "border-primary bg-primary/10" : "border-input bg-background"}`}
                    >
                      <span className={`w-6 h-6 rounded-lg grid place-items-center shrink-0 ${on ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                        <Check className="w-4 h-4" />
                      </span>
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div ref={endRef} />
        </main>
      </div>

      {/* Bottom action — swipe hint while learning, finish button at the end */}
      <div className="shrink-0 bg-card border-t-2 border-border p-3">
        <div className="mx-auto max-w-xl">
          {atSummary ? (
            <button
              disabled={!allChecked || saving}
              onClick={finish}
              className="btn-3d w-full active:btn-3d-active disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : `إنهاء الدرس +${String(lesson["xp_reward"] ?? 10)} XP`}
            </button>
          ) : (
            <button
              onClick={reveal}
              disabled={blocked}
              className="w-full flex flex-col items-center gap-0.5 py-2 rounded-2xl bg-secondary/70 text-primary font-extrabold text-sm disabled:opacity-50"
            >
              <ChevronUp className={`w-5 h-5 ${blocked ? "" : "animate-hint-up"}`} />
              {blocked
                ? (currentStep && isCodeLab(currentStep.options) ? "شغّل الكود بشكل صحيح للمتابعة" : "اختر إجابة للمتابعة")
                : shown === 0 ? "اسحب للأعلى لتبدأ" : "اسحب للأعلى للرسالة التالية"}

            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Bubble({ step, character, answer, onAnswer, onCodePass, lessonId, siteDone, onSiteDone }: { step: Step; character?: Character; answer?: number; onAnswer: (i: number) => void; onCodePass?: () => void; lessonId: string; siteDone?: boolean; onSiteDone?: () => void }) {
  const img = moodImage(character, step.mood);
  const opts = step.options as { choices?: string[]; answer?: number; media?: { image?: string; video?: string } } | null;
  const choices = opts?.choices ?? [];
  // A single message may mix text + image + video.
  const imageUrl = opts?.media?.image ?? (step.kind === "image" ? step.media_url : null);
  const videoUrl = opts?.media?.video ?? (step.kind === "video" ? step.media_url : null);
  const demo = isChatDemo(step.options);
  const lab = isCodeLab(step.options);
  const site = isSiteView(step.options);

  // A website shown inside the lesson keeps its own session across messages.
  if (site) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 ease-out space-y-3">
        {step.content && (
          <div className="flex items-start gap-2.5">
            {character ? <AvatarBubble id={img} size={40} /> : <BrandMascot slot="mascot_lesson" size={40} className="w-10 h-10 shrink-0 object-contain" />}
            <p className="flex-1 rounded-3xl rounded-tr-md bg-card border-2 border-border px-4 py-3 text-[15px] font-bold leading-8">{step.content}</p>
          </div>
        )}
        <SiteViewer spec={site} lessonId={lessonId} stepId={step.id} done={siteDone} onDone={onSiteDone} />
      </div>
    );
  }

  // The code lab takes the full width of the conversation — it is a workspace, not a bubble.
  if (lab) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 ease-out space-y-3">
        {step.content && (
          <div className="flex items-start gap-2.5">
            {character ? <AvatarBubble id={img} size={40} /> : <BrandMascot slot="mascot_lesson" size={40} className="w-10 h-10 shrink-0 object-contain" />}
            <p className="flex-1 rounded-3xl rounded-tr-md bg-card border-2 border-border px-4 py-3 text-[15px] font-bold leading-8">{step.content}</p>
          </div>
        )}
        <CodeLab spec={lab} onPass={onCodePass} />
      </div>
    );
  }

  // A live app preview is shown as its own wide card in the conversation, not inside a bubble.
  if (demo && !step.content) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 ease-out">
        <ChatMockup demo={demo} />
      </div>
    );
  }


  // Media step whose file has not been uploaded yet — keep the flow pretty instead of an empty bubble.
  const mediaPending = (step.kind === "image" || step.kind === "video") && !imageUrl && !videoUrl && !step.content;
  if (mediaPending) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 ease-out rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-5 text-center">
        <div className="text-3xl">{step.kind === "image" ? "🖼️" : "🎬"}</div>
        <div className="mt-1 text-xs font-extrabold text-muted-foreground">
          {step.kind === "image" ? "توضيح بالصورة قادم هنا" : "مقطع فيديو قصير قادم هنا"}
        </div>
      </div>
    );
  }



  return (
    <div className="flex items-start gap-2.5 sm:gap-3 animate-in fade-in slide-in-from-right-10 duration-500 ease-out">
      {character ? <AvatarBubble id={img} size={44} /> : <BrandMascot slot="mascot_lesson" size={44} className="w-11 h-11 shrink-0 object-contain" />}
      <div className="flex-1 min-w-0">
        {character && <div className="mb-1 text-[12px] font-extrabold" style={{ color: character.color }}>{character.name}</div>}
        <div className="rounded-3xl rounded-tr-md bg-card border-2 border-border px-4 py-3.5 shadow-sm">
          {step.content && <p className="text-[15px] sm:text-base font-bold whitespace-pre-wrap leading-8 tracking-normal">{step.content}</p>}

          {demo && <div className="mt-3 -mx-1"><ChatMockup demo={demo} /></div>}

          {imageUrl && (
            <img src={imageUrl} alt={step.content ?? "صورة الدرس"} loading="lazy" className="mt-3 rounded-2xl w-full" />
          )}
          {videoUrl && (
            <video src={videoUrl} controls className="mt-3 rounded-2xl w-full" />
          )}



          {step.kind === "question" && (
            <div className="mt-3 space-y-2.5">
              {choices.map((c, i) => {
                const chosen = answer === i;
                const correct = opts?.answer === i;
                const state = answer === undefined ? "idle" : chosen ? (correct ? "right" : "wrong") : correct ? "right" : "idle";
                return (
                  <button
                    key={i}
                    onClick={() => answer === undefined && onAnswer(i)}
                    className={`w-full text-right px-4 py-3 rounded-2xl border-2 font-extrabold text-[14px] leading-7 transition ${
                      state === "right" ? "border-primary bg-primary/10 text-primary"
                      : state === "wrong" ? "border-heart bg-heart/10 text-heart"
                      : "border-input bg-background hover:border-primary/50"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
              {answer !== undefined && (
                <div className="text-[13px] font-extrabold">
                  {answer === opts?.answer ? <span className="text-primary">إجابة صحيحة! 🎉</span> : <span className="text-heart">الإجابة الصحيحة موضّحة بالأعلى.</span>}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
