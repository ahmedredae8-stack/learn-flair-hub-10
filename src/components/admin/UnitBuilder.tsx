import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateLessonSteps, generateUnitPlan } from "@/lib/ai-lesson.functions";
import { MOODS } from "@/components/admin/LessonEditor";

const DEFAULT_IMAGE = "/brand/mascot.png";
const inp = "w-full px-3 py-2 rounded-xl border-2 border-input bg-background font-bold text-sm";

/**
 * Build a whole unit with AI: from a short brief it plans the lessons
 * (titles, objectives, summaries) then writes 15–20 linked dialogue bubbles
 * for each lesson and stores everything as drafts ready for review.
 */
export function UnitBuilder() {
  const qc = useQueryClient();
  const planUnit = useServerFn(generateUnitPlan);
  const writeLesson = useServerFn(generateLessonSteps);

  const [courseId, setCourseId] = useState("");
  const [unitNumber, setUnitNumber] = useState(1);
  const [unitName, setUnitName] = useState("");
  const [brief, setBrief] = useState("");
  const [lessonCount, setLessonCount] = useState(10);
  const [msgCount, setMsgCount] = useState(18);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const coursesQ = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id,title,emoji").order("order_index");
      if (error) throw error;
      return data ?? [];
    },
  });

  const charsQ = useQuery({
    queryKey: ["admin-characters"],
    queryFn: async () => {
      const { data, error } = await supabase.from("characters").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const course = (coursesQ.data ?? []).find((c) => c.id === courseId);
  const isAiCourse = (course?.title ?? "").includes("الذكاء");
  // The AI-tools course has its own cast: only أ. سارة teaches, and رضا/احمد never appear.
  const cast = (charsQ.data ?? []).filter((c) =>
    isAiCourse ? !/رضا|احمد/.test(c.name) : true,
  );

  async function run() {
    if (!courseId) return toast.error("اختر الكورس");
    if (unitName.trim().length < 2) return toast.error("اكتب اسم الوحدة");
    if (brief.trim().length < 10) return toast.error("اكتب معلومات وأهداف الوحدة");

    setBusy(true);
    setLog([]);
    const push = (line: string) => setLog((l) => [...l, line]);
    try {
      push("جاري تخطيط الوحدة…");
      const plan = await planUnit({
        data: {
          courseTitle: course?.title ?? "",
          unitNumber,
          unitName: unitName.trim(),
          brief: brief.trim(),
          lessonCount,
        },
      });
      push(`تم تخطيط ${plan.lessons.length} درس.`);

      for (let i = 0; i < plan.lessons.length; i++) {
        const l = plan.lessons[i];
        const { data: created, error } = await supabase
          .from("lessons")
          .insert({
            course_id: courseId,
            unit: unitNumber,
            order_index: i + 1,
            title: l.title,
            description: l.description ?? "",
            intro_text: l.intro_text ?? "",
            objectives: l.objectives ?? [],
            summary_points: l.summary_points ?? [],
            status: "draft",
            xp_reward: 10,
          } as never)
          .select("id")
          .single();
        if (error || !created) throw new Error(error?.message ?? "فشل إنشاء الدرس");

        const res = await writeLesson({
          data: {
            explanation: `${l.description}\n\nالأهداف:\n${(l.objectives ?? []).join("\n")}\n\nمعلومات الوحدة:\n${brief.trim()}`,
            characters: cast.map((c) => c.name),
            count: msgCount,
            context: {
              courseTitle: course?.title,
              unitNumber,
              unitName: unitName.trim(),
              lessonNumber: i + 1,
              lessonTitle: l.title,
              previousLesson: plan.lessons[i - 1]?.title,
              nextLesson: plan.lessons[i + 1]?.title,
            },
          },
        });

        const rows = res.steps.map((s, idx) => {
          const char = cast.find((c) => c.name.trim() === (s.character ?? "").trim());
          const isQ = s.kind === "question" && Array.isArray(s.choices) && s.choices.length >= 2;
          const isImg = s.kind === "image";
          return {
            lesson_id: (created as { id: string }).id,
            order_index: idx + 1,
            kind: isQ ? "question" : isImg ? "image" : "text",
            content: s.content,
            media_url: isImg ? DEFAULT_IMAGE : null,
            admin_note: s.admin_note?.trim() || null,
            character_id: char?.id ?? null,
            mood: MOODS.some((m) => m.id === s.mood) ? s.mood : "neutral",
            options: isQ
              ? { choices: s.choices, answer: Math.max(0, Math.min((s.choices?.length ?? 1) - 1, s.answer ?? 0)) }
              : null,
          };
        });
        const { error: stepErr } = await supabase.from("lesson_steps").insert(rows as never);
        if (stepErr) throw new Error(stepErr.message);
        push(`${i + 1}. ${l.title} — ${rows.length} رسالة ✓`);
      }

      toast.success("تمت بناء الوحدة — راجعها ثم انشرها");
      qc.invalidateQueries({ queryKey: ["admin-lessons"] });
      qc.invalidateQueries({ queryKey: ["lessons-path"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل بناء الوحدة");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 space-y-2">
      <div className="text-sm font-extrabold text-primary flex items-center gap-1">
        <Sparkles className="w-4 h-4" /> بناء وحدة كاملة بالذكاء الاصطناعي
      </div>
      <p className="text-[10px] font-bold text-muted-foreground leading-5">
        اكتب أهداف الوحدة والمعلومات التي تريد تغطيتها — سيخطّط الذكاء الاصطناعي الدروس بالترتيب، ويربط كل درس بالذي قبله،
        ويكتب لكل درس {msgCount} رسالة تقريباً مع الأسئلة وأماكن الصور، ويحفظها كمسودات لمراجعتك.
      </p>

      <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inp}>
        <option value="">اختر الكورس</option>
        {(coursesQ.data ?? []).map((c) => (
          <option key={c.id} value={c.id}>{c.emoji} {c.title}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input type="number" value={unitNumber} onChange={(e) => setUnitNumber(Number(e.target.value) || 1)} placeholder="رقم الوحدة" className={inp} />
        <input value={unitName} onChange={(e) => setUnitName(e.target.value)} placeholder="اسم الوحدة" className={inp} />
      </div>
      <textarea
        rows={4}
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="أهداف الوحدة، الأدوات، الأفكار، المهارات التي يخرج بها الطالب…"
        className={`${inp} resize-none`}
      />
      <div className="grid grid-cols-2 gap-3">
        <label className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold text-muted-foreground shrink-0">عدد الدروس</span>
          <input type="range" min={3} max={12} value={lessonCount} onChange={(e) => setLessonCount(Number(e.target.value))} className="flex-1 accent-primary" />
          <span className="w-6 text-center text-[12px] font-extrabold text-primary">{lessonCount}</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold text-muted-foreground shrink-0">رسائل/درس</span>
          <input type="range" min={8} max={30} value={msgCount} onChange={(e) => setMsgCount(Number(e.target.value))} className="flex-1 accent-primary" />
          <span className="w-6 text-center text-[12px] font-extrabold text-primary">{msgCount}</span>
        </label>
      </div>
      <button onClick={run} disabled={busy} className="btn-3d w-full active:btn-3d-active disabled:opacity-60">
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-4 h-4" /> ابنِ الوحدة الآن</>}
      </button>

      {log.length > 0 && (
        <ul className="text-[10px] font-bold text-muted-foreground space-y-0.5 max-h-40 overflow-y-auto">
          {log.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      )}
    </div>
  );
}
