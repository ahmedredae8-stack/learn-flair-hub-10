import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { AppTopBar } from "@/components/AppTopBar";
import { BottomNav } from "@/components/BottomNav";
import { Loader2, Lock, Crown, Check, PlayCircle } from "lucide-react";
import { BrandMascot } from "@/components/BrandMascot";
import cloud from "@/assets/cloud.png";

export const Route = createFileRoute("/_authenticated/courses")({
  head: () => ({
    meta: [
      { title: "الكورسات — nilex" },
      { name: "description", content: "كل عوالم nilex: أدوات الذكاء الاصطناعي مجاناً، وكورسات مميزة للتصميم والبرمجة وبناء المنتجات." },
      { property: "og:title", content: "الكورسات — nilex" },
      { property: "og:description", content: "اختر عالمك التالي: تصميم، برمجة، منتجات حقيقية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoursesPage,
});

type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  emoji: string;
  color: string;
  coming_soon: boolean;
  order_index: number;
  is_paid: boolean;
  price: number;
  highlights: unknown;
  cover_url: string | null;
};

const CARD: Record<string, string> = {
  primary: "from-primary to-accent",
  streak: "from-streak to-heart",
  accent: "from-accent to-primary",
};

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function useCourses() {
  return useQuery({
    queryKey: ["courses-full"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("courses" as never)
        .select("id,slug,title,subtitle,emoji,color,cover_url,coming_soon,order_index,is_paid,price,highlights")
        .order("order_index") as never as Promise<{ data: Course[] | null; error: { message: string } | null }>);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

function CourseCard({ c, count }: { c: Course; count: number }) {
  const soon = c.coming_soon || count === 0;
  const highlights = asStringArray(c.highlights);

  const inner = (
    <>
      <div className={`relative h-28 sm:h-36 bg-gradient-to-tl ${CARD[c.color] ?? CARD["primary"]} grid place-items-center overflow-hidden`}>
        {c.cover_url ? (
          <img src={c.cover_url} alt={c.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <span className="text-5xl drop-shadow-sm">{c.emoji}</span>
        )}
        {c.is_paid && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/90 text-streak text-[10px] font-extrabold px-2 py-1">
            <Crown className="w-3 h-3" /> مميّز
          </span>
        )}
      </div>
      <div className="p-4 text-right">
        <div className="font-extrabold text-base sm:text-lg">{c.title}</div>
        {c.subtitle && <p className="text-xs font-bold text-muted-foreground mt-1 leading-relaxed">{c.subtitle}</p>}

        {highlights.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {highlights.slice(0, 3).map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] font-bold">
                <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                {h}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] font-extrabold rounded-full bg-secondary px-2.5 py-1">
            {soon ? "قريباً" : `${count} درس`}
          </span>
          {c.is_paid ? (
            <span className="text-xs font-extrabold flex items-center gap-1 text-streak">
              <Crown className="w-3.5 h-3.5" /> {c.price > 0 ? `${c.price} ج.م` : "اشتراك"}
            </span>
          ) : (
            <span className={`text-xs font-extrabold flex items-center gap-1 ${soon ? "text-muted-foreground" : "text-primary"}`}>
              {soon ? <><Lock className="w-3.5 h-3.5" /> مقفول</> : <><PlayCircle className="w-3.5 h-3.5" /> ابدأ الآن</>}
            </span>
          )}
        </div>
      </div>
    </>
  );

  const cls = `block rounded-3xl border-2 border-border bg-card overflow-hidden shadow-sm transition ${
    soon ? "opacity-80" : "hover:-translate-y-1 hover:shadow-lg active:translate-y-0"
  }`;

  return soon ? <div className={cls}>{inner}</div> : <Link to="/" search={{ course: c.slug }} className={cls}>{inner}</Link>;
}

function CoursesPage() {
  const coursesQ = useCourses();

  const countsQ = useQuery({
    queryKey: ["course-lesson-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lessons").select("course_id,status" as never);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of (data ?? []) as unknown as { course_id: string | null; status: string }[]) {
        if (!row.course_id || row.status !== "published") continue;
        map[row.course_id] = (map[row.course_id] ?? 0) + 1;
      }
      return map;
    },
  });

  const courses = coursesQ.data ?? [];
  const counts = countsQ.data ?? {};
  const free = courses.filter((c) => !c.is_paid);
  const paid = courses.filter((c) => c.is_paid);

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-24 font-display">
      <AppTopBar />

      <main className="mx-auto w-full max-w-2xl px-4 pt-4">
        <div className="rounded-3xl bg-primary text-primary-foreground p-5 sm:p-6 flex items-center gap-4 overflow-hidden">
          <BrandMascot slot="mascot_courses" size={72} className="w-16 h-16 sm:w-20 sm:h-20 animate-bob shrink-0 object-contain" />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold">الكورسات ✨</h1>
            <p className="text-xs sm:text-sm font-bold opacity-90 mt-1 leading-relaxed">
              ابدأ مجاناً بأدوات الذكاء الاصطناعي… ثم انتقل لكورسات التصميم والبرمجة وبناء المنتجات.
            </p>
          </div>
        </div>

        {coursesQ.isLoading ? (
          <div className="grid place-items-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
        ) : (
          <>
            <SectionTitle icon="🎁" title="مجاني للجميع" note="ابدأ من هنا" />
            <div className="grid gap-4 sm:grid-cols-2">
              {free.map((c) => <CourseCard key={c.id} c={c} count={counts[c.id] ?? 0} />)}
            </div>

            <SectionTitle icon="👑" title="الكورسات المميّزة" note="محتوى مدفوع" />
            {paid.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-6 text-center">
                <img src={cloud} alt="" width={768} height={512} loading="lazy" className="mx-auto w-28 h-auto animate-float" />
                <div className="mt-2 font-extrabold text-sm">الكورسات المميّزة في الطريق</div>
                <p className="text-[11px] font-bold text-muted-foreground mt-1">تصميم، برمجة، وبناء منتجات حقيقية… ترقّب!</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {paid.map((c) => <CourseCard key={c.id} c={c} count={counts[c.id] ?? 0} />)}
              </div>
            )}
          </>
        )}

        <AdminCourses />
      </main>

      <BottomNav />
    </div>
  );
}

function SectionTitle({ icon, title, note }: { icon: string; title: string; note: string }) {
  return (
    <div className="mt-6 mb-3 flex items-center gap-2">
      <span className="text-xl">{icon}</span>
      <h2 className="font-extrabold text-base">{title}</h2>
      <span className="text-[10px] font-extrabold rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">{note}</span>
    </div>
  );
}

/* ---------- Admin: create & manage courses ---------- */
function AdminCourses() {
  const { data: isAdmin } = useIsAdmin();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [emoji, setEmoji] = useState("🚀");
  const [color, setColor] = useState("primary");
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState("0");

  const listQ = useQuery({
    queryKey: ["admin-courses"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("courses" as never)
        .select("id,slug,title,coming_soon,order_index,is_paid")
        .order("order_index") as never as Promise<{ data: { id: string; slug: string; title: string; coming_soon: boolean; order_index: number; is_paid: boolean }[] | null; error: { message: string } | null }>);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  if (!isAdmin) return null;

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-courses"] });
    qc.invalidateQueries({ queryKey: ["courses"] });
    qc.invalidateQueries({ queryKey: ["courses-full"] });
  }

  async function add() {
    if (title.trim().length < 3 || slug.trim().length < 2) { toast.error("أكمل العنوان والمعرّف"); return; }
    const next = (listQ.data?.length ?? 0) + 1;
    const { error } = await (supabase.from("courses" as never).insert({
      title: title.trim(), slug: slug.trim(), subtitle: subtitle.trim() || null,
      emoji, color, coming_soon: true, order_index: next, status: "published",
      is_paid: isPaid, price: Number(price) || 0,
    } as never) as never as Promise<{ error: { message: string } | null }>);
    if (error) { toast.error(error.message); return; }
    toast.success("تمت إضافة الكورس");
    setTitle(""); setSlug(""); setSubtitle("");
    refresh();
  }

  async function patch(id: string, values: Record<string, unknown>) {
    const { error } = await (supabase.from("courses" as never).update(values as never).eq("id", id) as never as Promise<{ error: { message: string } | null }>);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  const inp = "w-full px-3 py-2 rounded-xl border-2 border-input bg-background font-bold text-sm";

  return (
    <section className="mt-8 rounded-3xl border-2 border-border bg-card p-4 text-right">
      <div className="font-extrabold text-sm mb-3">إدارة الكورسات (أدمن)</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الكورس" className={inp} />
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="المعرّف بالإنجليزية مثل design" className={inp} />
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="وصف قصير" className={inp} />
        <div className="grid grid-cols-2 gap-2">
          <input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="إيموجي" className={inp} />
          <select value={color} onChange={(e) => setColor(e.target.value)} className={inp}>
            <option value="primary">بنفسجي</option>
            <option value="streak">برتقالي</option>
            <option value="accent">سماوي</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs font-extrabold">
          <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} className="w-4 h-4" />
          كورس مدفوع
        </label>
        <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" placeholder="السعر بالجنيه" className={inp} />
      </div>
      <button onClick={add} className="btn-3d w-full mt-3 active:btn-3d-active">إضافة كورس</button>

      <ul className="mt-4 space-y-2">
        {listQ.data?.map((c) => (
          <li key={c.id} className="flex items-center gap-2 rounded-2xl bg-secondary/50 px-3 py-2">
            <span className="flex-1 min-w-0 truncate text-xs font-extrabold">{c.title}</span>
            <button onClick={() => patch(c.id, { is_paid: !c.is_paid })} className="text-[11px] font-extrabold rounded-full bg-card px-2.5 py-1 border-2 border-border">
              {c.is_paid ? "مدفوع" : "مجاني"}
            </button>
            <button onClick={() => patch(c.id, { coming_soon: !c.coming_soon })} className="text-[11px] font-extrabold rounded-full bg-card px-2.5 py-1 border-2 border-border">
              {c.coming_soon ? "مقفول — افتحه" : "مفتوح — أقفله"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
