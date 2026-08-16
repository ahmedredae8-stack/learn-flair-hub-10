import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock, Check, Star, Trophy, Sparkles, Pencil, Loader2, Target } from "lucide-react";
import { BrandMascot } from "@/components/BrandMascot";
import cloud from "@/assets/cloud.png";

import { BottomNav } from "@/components/BottomNav";
import { AppTopBar } from "@/components/AppTopBar";
import { useProfile } from "@/lib/useProfile";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "nilex — تعلّم أدوات الذكاء الاصطناعي" },
      { name: "description", content: "دروس تفاعلية قصيرة لإتقان أدوات الذكاء الاصطناعي خطوة بخطوة." },
      { property: "og:title", content: "nilex — تعلّم أدوات الذكاء الاصطناعي" },
      { property: "og:description", content: "خارطة تعلّم يومية لأدوات الذكاء الاصطناعي." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { course?: string } =>
    typeof search["course"] === "string" ? { course: search["course"] } : {},
  component: Home_,
});

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  unit: number;
  order_index: number;
  status: string;
  xp_reward: number;
  objectives: unknown;
  course_id: string | null;
};

type Course = { id: string; slug: string; title: string; subtitle: string | null; emoji: string; color: string; coming_soon: boolean; order_index: number };

type Status = "done" | "active" | "locked";

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("courses" as never)
        .select("id,slug,title,subtitle,emoji,color,coming_soon,order_index")
        .order("order_index") as never as Promise<{ data: Course[] | null; error: { message: string } | null }>);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

function useLessons() {
  return useQuery({
    queryKey: ["lessons-path"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id,title,description,unit,order_index,status,xp_reward,objectives,course_id" as never)
        .order("unit")
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as unknown as Lesson[];
    },
  });
}


function useProgress() {
  return useQuery({
    queryKey: ["my-progress"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return new Set<string>();
      const { data, error } = await supabase.from("lesson_progress").select("lesson_id,completed_at").eq("user_id", auth.user.id);
      if (error) throw error;
      return new Set((data ?? []).filter((r) => r.completed_at).map((r) => r.lesson_id));
    },
  });
}

const UNIT_META: Record<number, { name: string; emoji: string }> = {
  1: { name: "مدخل إلى عالم العقل الرقمي", emoji: "🤖" },
  2: { name: "أسرار التوجيه وكتابة الأوامر", emoji: "✍️" },
  3: { name: "رحلة داخل تطبيق الدردشة", emoji: "💬" },
  4: { name: "سحر التصميم والرسومات", emoji: "🎨" },
  5: { name: "مدخل إلى البرمجة الذكية", emoji: "💻" },
  6: { name: "الاحتراف بأدوات الويب", emoji: "🛠️" },
  7: { name: "الصوت والفيديو بالذكاء الاصطناعي", emoji: "🎬" },
  8: { name: "البيانات والعروض الذكية", emoji: "📊" },
  9: { name: "حل المشكلات وابتكار الحلول", emoji: "💡" },
  10: { name: "ريادة الأعمال الرقمية", emoji: "🚀" },
};

function UnitHeader({ unit, subtitle, color, count }: { unit: number; subtitle: string; color: string; count: number }) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary shadow-[0_4px_0_0_var(--color-primary-shadow)]",
    accent: "bg-accent shadow-[0_4px_0_0_var(--color-accent-shadow)]",
    streak: "bg-streak shadow-[0_4px_0_0_oklch(0.58_0.19_55)]",
  };
  return (
    <div className={`mx-4 my-6 rounded-2xl px-5 py-4 text-primary-foreground grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 ${colorMap[color] ?? colorMap["primary"]}`}>
      <div className="min-w-0">
        <div className="text-xs opacity-80 font-bold">الوحدة {unit}</div>
        <div className="text-lg font-extrabold truncate">{subtitle}</div>
      </div>
      <div className="rounded-xl border-2 border-white/40 px-3 py-2 text-xs font-extrabold shrink-0">{count} دروس</div>
    </div>
  );
}

/** Teaser for the next world at the end of the learning path. */
function CloudTeaser() {
  return (
    <section className="mx-4 mt-8 mb-4">
      <div className="relative rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-6 text-center overflow-hidden">
        <img src={cloud} alt="" width={768} height={512} loading="lazy" className="mx-auto w-40 h-auto animate-float" />
        <div className="mt-2 text-lg font-extrabold">العالم المادي وبناء منتجات</div>
        <p className="mt-1 text-xs font-bold text-muted-foreground leading-relaxed">
          بعد إتقان الذكاء الاصطناعي… حوّل أفكارك إلى منتجات حقيقية تُباع وتُستخدم. قريباً 🚀
        </p>
        <span className="inline-block mt-3 rounded-full bg-primary/15 text-primary text-[11px] font-extrabold px-3 py-1">
          قريباً
        </span>
      </div>
    </section>
  );
}




function PathNode({ lesson, status, offset, isAdmin, onSelect }: { lesson: Lesson; status: Status; offset: number; isAdmin: boolean; onSelect: (l: Lesson, s: Status) => void }) {
  const Icon = status === "done" ? Check : status === "locked" ? Lock : Star;
  let cls = "node-3d";
  if (status === "locked") cls = "node-3d node-3d-locked";

  return (
    <div
      {...(status === "active" ? { "data-active-node": "true" } : {})}
      className="relative flex flex-col items-center scroll-mt-32"
      style={{ transform: `translateX(${offset}px)` }}
    >
      {status === "active" && (
        <div className="absolute -top-10 bg-card border-2 border-border rounded-2xl px-3 py-1.5 shadow-md">
          <span className="text-xs font-extrabold text-primary">ابدأ</span>
        </div>
      )}
      <button onClick={() => onSelect(lesson, status)} className={`${cls} w-20 h-20 active:translate-y-1 active:shadow-none transition-all`} aria-label={lesson.title}>
        <Icon className="w-8 h-8" />
      </button>
      {isAdmin && (
        <Link to="/admin" search={{ lesson: lesson.id }} className="mt-1 flex items-center gap-1 text-[10px] font-extrabold text-primary bg-primary/10 rounded-full px-2 py-0.5">
          <Pencil className="w-3 h-3" /> تعديل
        </Link>
      )}
      <div className="mt-1 text-[10px] font-extrabold text-muted-foreground max-w-[110px] text-center truncate">{lesson.title}</div>
    </div>
  );
}

function MascotPanel() {
  const { data: profile } = useProfile();
  return (
    <div className="mx-4 mt-4 mb-2 rounded-2xl bg-card border border-border p-4 flex items-center gap-3 shadow-sm">
      <BrandMascot slot="mascot_home" alt="زكي المساعد" size={64} className="w-16 h-16 animate-bob object-contain" />
      <div className="flex-1">
        <div className="text-sm font-extrabold">أهلاً {profile?.display_name ?? ""}! أنا زكي 🤖</div>
        <div className="text-xs text-muted-foreground">أكمل درسك اليومي واحصل على +5 جواهر.</div>
      </div>
    </div>
  );
}

function LessonSheet({ lesson, status, onClose }: { lesson: Lesson | null; status: Status; onClose: () => void }) {
  const navigate = useNavigate();
  const { data: isAdmin } = useIsAdmin();
  if (!lesson) return null;
  const locked = status === "locked" && !isAdmin;
  const objectives = asStringArray(lesson.objectives);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div dir="rtl" className="w-full max-w-md bg-card rounded-t-3xl p-6 pb-8 border-t-4 border-primary animate-in slide-in-from-bottom duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-14 h-14 rounded-full grid place-items-center ${locked ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
            {locked ? <Lock className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
          </div>
          <div className="min-w-0">
            <div className="text-lg font-extrabold truncate">{lesson.title}</div>
            <div className="text-xs text-muted-foreground font-bold">وحدة {lesson.unit} • +{lesson.xp_reward} XP</div>
          </div>
        </div>

        {lesson.description && <p className="text-sm font-bold text-muted-foreground mb-3 leading-relaxed">{lesson.description}</p>}

        {objectives.length > 0 && (
          <div className="rounded-2xl bg-secondary/60 p-3 mb-4">
            <div className="flex items-center gap-2 text-primary font-extrabold text-xs mb-2"><Target className="w-4 h-4" /> نبذة عمّا ستتعلّمه</div>
            <ul className="space-y-1.5">
              {objectives.map((o, i) => <li key={i} className="text-xs font-bold flex gap-2"><span className="text-primary">•</span>{o}</li>)}
            </ul>
          </div>
        )}

        <button
          disabled={locked}
          className="btn-3d w-full disabled:opacity-60 disabled:cursor-not-allowed active:btn-3d-active"
          onClick={() => { if (!locked) navigate({ to: "/lesson/$lessonId", params: { lessonId: lesson.id } }); }}
        >
          {locked ? "مقفول" : status === "done" ? "أعد الدرس" : `ابدأ الدرس +${lesson.xp_reward}`}
        </button>

        {isAdmin && (
          <Link to="/admin" search={{ lesson: lesson.id }} className="mt-2 w-full flex items-center justify-center gap-1 text-sm font-extrabold text-primary py-2">
            <Pencil className="w-4 h-4" /> تعديل هذا الدرس
          </Link>
        )}
      </div>
    </div>
  );
}

function Home_() {
  const { data: isAdmin } = useIsAdmin();
  const lessonsQ = useLessons();
  const coursesQ = useCourses();
  const progressQ = useProgress();
  const { course: courseSlug } = Route.useSearch();
  const [selected, setSelected] = useState<{ lesson: Lesson; status: Status } | null>(null);

  const courses = coursesQ.data ?? [];
  const activeCourse = useMemo(
    () => courses.find((c) => c.slug === courseSlug) ?? courses.find((c) => !c.coming_soon) ?? courses[0],
    [courses, courseSlug],
  );

  const lessons = useMemo(
    () =>
      (lessonsQ.data ?? [])
        .filter((l) => isAdmin || l.status === "published")
        .filter((l) => !activeCourse || !l.course_id || l.course_id === activeCourse.id),
    [lessonsQ.data, isAdmin, activeCourse],
  );
  const done = progressQ.data ?? new Set<string>();

  const statusOf = (l: Lesson, index: number): Status => {
    if (done.has(l.id)) return "done";
    const firstUndone = lessons.findIndex((x) => !done.has(x.id));
    return index === firstUndone ? "active" : "locked";
  };

  const units = useMemo(() => {
    const map = new Map<number, Lesson[]>();
    lessons.forEach((l) => { const arr = map.get(l.unit) ?? []; arr.push(l); map.set(l.unit, arr); });
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [lessons]);

  // Unit titles come from the database so admins can rename them per course.
  const unitNamesQ = useQuery({
    queryKey: ["unit-names", activeCourse?.id ?? "all"],
    enabled: !!activeCourse?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("number,name,emoji")
        .eq("course_id", activeCourse!.id);
      if (error) throw error;
      const map: Record<number, { name: string; emoji: string }> = {};
      for (const u of (data ?? []) as { number: number; name: string; emoji: string }[]) {
        map[u.number] = { name: u.name, emoji: u.emoji };
      }
      return map;
    },
  });
  const unitNames = unitNamesQ.data ?? {};

  const total = lessons.length;
  const doneInCourse = lessons.filter((l) => done.has(l.id)).length;
  const pct = total ? Math.round((doneInCourse / total) * 100) : 0;
  const offsets = [0, 44, 66, 44, 0, -44, -66, -44, 0];
  const colors = ["primary", "accent", "streak"];

  // Land the learner on the lesson they're actually at, not at the very top.
  const scrolledFor = useRef<string>("");
  useEffect(() => {
    if (lessonsQ.isLoading || progressQ.isLoading || total === 0) return;
    const key = `${activeCourse?.id ?? "all"}:${doneInCourse}`;
    if (scrolledFor.current === key) return;
    scrolledFor.current = key;
    const id = window.setTimeout(() => {
      document.querySelector("[data-active-node]")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
    return () => window.clearTimeout(id);
  }, [lessonsQ.isLoading, progressQ.isLoading, total, doneInCourse, activeCourse?.id]);


  return (
    <div dir="rtl" className="min-h-screen bg-background pb-24 font-display">
      <AppTopBar />

      <main className="mx-auto w-full max-w-2xl">
        {/* Course switcher — the platform hosts several worlds */}
        <Link
          to="/courses"
          className="mx-4 mt-3 flex items-center gap-3 rounded-2xl bg-primary text-primary-foreground px-4 py-3 shadow-[0_4px_0_0_var(--color-primary-shadow)]"
        >
          <span className="text-2xl">{activeCourse?.emoji ?? "🤖"}</span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold opacity-80">الكورس الحالي</div>
            <div className="text-sm font-extrabold truncate">{activeCourse?.title ?? "أدوات الذكاء الاصطناعي"}</div>
          </div>
          <span className="text-[11px] font-extrabold rounded-full border-2 border-white/40 px-2.5 py-1 shrink-0">تبديل</span>
        </Link>

        <MascotPanel />

        <div className="mx-4 mt-3 mb-1 flex items-center justify-between text-xs text-muted-foreground font-bold">
          <span>تقدّمك في هذا الكورس</span>
          <span>{doneInCourse}/{total} • {pct}%</span>
        </div>
        <div className="mx-4 h-2.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>


        {lessonsQ.isLoading && <div className="grid place-items-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>}

        {!lessonsQ.isLoading && total === 0 && (
          <div className="mx-4 mt-10 rounded-2xl border-2 border-dashed border-border p-8 text-center">
            <Trophy className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <div className="font-extrabold">لا توجد دروس منشورة بعد</div>
            <p className="text-xs text-muted-foreground font-bold mt-1">سيتم إضافة الدروس قريباً من لوحة الأدمن.</p>
            {isAdmin && <Link to="/admin" className="btn-3d inline-flex mt-4 active:btn-3d-active">أضف أول درس</Link>}
          </div>
        )}

        {units.map(([unit, list], ui) => (
          <section key={unit}>
            <UnitHeader
              unit={unit}
              subtitle={`${unitNames[unit]?.emoji ?? UNIT_META[unit]?.emoji ?? "✨"} ${unitNames[unit]?.name ?? UNIT_META[unit]?.name ?? list[0]?.description?.slice(0, 40) ?? "دروس"}`}
              color={colors[ui % colors.length]!}
              count={list.length}
            />
            <div className="flex flex-col items-center gap-8 py-6">
              {list.map((l, i) => (
                <PathNode
                  key={l.id}
                  lesson={l}
                  status={statusOf(l, lessons.indexOf(l))}
                  offset={offsets[i % offsets.length]!}
                  isAdmin={!!isAdmin}
                  onSelect={(lsn, st) => setSelected({ lesson: lsn, status: st })}
                />
              ))}
            </div>
          </section>
        ))}

        <CloudTeaser />

        <div className="text-center text-xs text-muted-foreground py-6 font-bold">🎉 تحديثات جديدة كل أسبوع</div>

      </main>

      <BottomNav />
      <LessonSheet lesson={selected?.lesson ?? null} status={selected?.status ?? "locked"} onClose={() => setSelected(null)} />
    </div>
  );
}
