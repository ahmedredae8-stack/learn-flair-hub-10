import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadFile } from "@/lib/upload";
import { AvatarBubble } from "@/components/AvatarBubble";
import { characterImage } from "@/lib/characterImage";
import { CodeLab, isCodeLab } from "@/components/lesson/CodeLab";
import { isSiteView, type SiteSpec } from "@/components/lesson/SiteViewer";

import { Loader2, Plus, Save, Trash2, ArrowUp, ArrowDown, Upload, X } from "lucide-react";

export const MOODS = [
  { id: "neutral", label: "عادي" },
  { id: "happy", label: "سعيد" },
  { id: "sad", label: "حزين" },
  { id: "surprised", label: "متعجب" },
  { id: "thinking", label: "يفكّر" },
  { id: "excited", label: "متحمّس" },
];

type StepKind = "text" | "image" | "video" | "question";

type Step = {
  id: string;
  lesson_id: string;
  order_index: number;
  kind: StepKind;
  content: string | null;
  media_url: string | null;
  options: unknown;
  character_id: string | null;
  mood: string;
  admin_note?: string | null;
};

function toList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export function LessonEditor({ lessonId, onClose }: { lessonId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", intro_text: "", unit: 1, order_index: 1, xp_reward: 10,
    status: "draft" as "draft" | "published" | "archived",
    course_id: "",
    objectives: [] as string[], summary_points: [] as string[],
  });

  const coursesQ = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("courses" as never).select("id,title,emoji").order("order_index") as never as Promise<{ data: { id: string; title: string; emoji: string }[] | null; error: { message: string } | null }>);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });


  const lessonQ = useQuery({
    queryKey: ["admin-lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const l = lessonQ.data as Record<string, unknown> | null | undefined;
    if (!l) return;
    setForm({
      title: String(l["title"] ?? ""),
      description: String(l["description"] ?? ""),
      intro_text: String(l["intro_text"] ?? ""),
      unit: Number(l["unit"] ?? 1),
      order_index: Number(l["order_index"] ?? 1),
      xp_reward: Number(l["xp_reward"] ?? 10),
      status: (l["status"] as "draft" | "published" | "archived") ?? "draft",
      course_id: String(l["course_id"] ?? ""),
      objectives: toList(l["objectives"]),
      summary_points: toList(l["summary_points"]),

    });
  }, [lessonQ.data]);

  const charsQ = useQuery({
    queryKey: ["admin-characters"],
    queryFn: async () => {
      const { data, error } = await supabase.from("characters").select("id,name,avatar_url,color,moods").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const stepsQ = useQuery({
    queryKey: ["admin-steps", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase.from("lesson_steps").select("*").eq("lesson_id", lessonId).order("order_index");
      if (error) throw error;
      return (data ?? []) as unknown as Step[];
    },
  });

  async function saveLesson() {
    setSaving(true);
    try {
      const { error } = await supabase.from("lessons").update({
        title: form.title.trim(), description: form.description.trim(), intro_text: form.intro_text.trim(),
        unit: form.unit, order_index: form.order_index, xp_reward: form.xp_reward, status: form.status,
        course_id: form.course_id || null,
        objectives: form.objectives.filter(Boolean), summary_points: form.summary_points.filter(Boolean),
      } as never).eq("id", lessonId);
      if (error) throw error;

      toast.success("تم حفظ الدرس");
      qc.invalidateQueries({ queryKey: ["admin-lessons"] });
      qc.invalidateQueries({ queryKey: ["lessons-path"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "فشل الحفظ"); } finally { setSaving(false); }
  }

  async function addStep(kind: StepKind | "code" | "site") {
    const order = (stepsQ.data?.length ?? 0) + 1;
    if (kind === "site") {
      const { error } = await supabase.from("lesson_steps").insert({
        lesson_id: lessonId, order_index: order, kind: "text",
        content: "افتح الموقع بالأسفل ونفّذ المطلوب ثم اضغط «تم».",
        options: {
          site: {
            key: `site-${Date.now()}`,
            title: "عارض المواقع",
            tabs: [{ label: "الموقع", url: "https://example.com" }],
            task: "سجّل الدخول إلى الموقع.",
            steps: ["افتح الموقع", "سجّل الدخول", "ارجع واضغط تم"],
            done_label: "تم ✅",
            require_done: true,
            height: 420,
          },
        },
      } as never);
      if (error) return toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["admin-steps", lessonId] });
      return;
    }

    if (kind === "code") {
      const { error } = await supabase.from("lesson_steps").insert({
        lesson_id: lessonId, order_index: order, kind: "text", content: "",
        options: {
          code: {
            title: "معمل الأكواد",
            language: "html",
            brief: "اكتب الكود المطلوب ثم اضغط تشغيل لترى الناتج.",
            steps: ["اقرأ الدليل", "اكتب الكود", "شغّل وقارن الناتج"],
            expected_html: "<h1>مرحبا</h1>",
            starter: "",
            solution: "<h1>مرحبا</h1>",
            checks: [{ type: "includes", value: "<h1>", hint: "استخدم وسم <h1>" }],
            hints: ["الوسم يُفتح ويُغلق: <h1> … </h1>"],
            refs: [{ label: "MDN — h1", url: "https://developer.mozilla.org/ar/docs/Web/HTML/Element/Heading_Elements" }],
            success: "ناتج صحيح! 🎉",
          },
        },
      } as never);
      if (error) return toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["admin-steps", lessonId] });
      return;
    }
    const { error } = await supabase.from("lesson_steps").insert({
      lesson_id: lessonId, order_index: order, kind, content: kind === "question" ? "اختر الإجابة الصحيحة" : "",
      options: kind === "question" ? { choices: ["الخيار 1", "الخيار 2"], answer: 0 } : null,
    });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-steps", lessonId] });
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/50 overflow-y-auto" onClick={onClose}>
      <div dir="rtl" className="mx-auto max-w-2xl my-6 bg-background rounded-3xl border-2 border-border p-4 sm:p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">تحرير الدرس</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary"><X className="w-5 h-5" /></button>
        </div>

        {lessonQ.isLoading ? <Center /> : (
          <>
            <section className="bg-card border-2 border-border rounded-2xl p-4 space-y-2">
              <Field label="عنوان الدرس"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inp} /></Field>
              <Field label="نبذة (تظهر في المربع قبل البدء)"><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inp} resize-none`} /></Field>
              <Field label="نص المقدمة"><textarea rows={2} value={form.intro_text} onChange={(e) => setForm({ ...form, intro_text: e.target.value })} className={`${inp} resize-none`} /></Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="الوحدة"><input type="number" value={form.unit} onChange={(e) => setForm({ ...form, unit: Number(e.target.value) || 1 })} className={inp} /></Field>
                <Field label="الترتيب"><input type="number" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) || 1 })} className={inp} /></Field>
                <Field label="XP"><input type="number" value={form.xp_reward} onChange={(e) => setForm({ ...form, xp_reward: Number(e.target.value) || 10 })} className={inp} /></Field>
              </div>
              <Field label="الكورس">
                <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} className={inp}>
                  <option value="">بدون كورس</option>
                  {(coursesQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.title}</option>)}
                </select>
              </Field>
              <Field label="الحالة">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "draft" | "published" | "archived" })} className={inp}>
                  <option value="draft">مسودة</option><option value="published">منشور</option><option value="archived">أرشيف</option>
                </select>
              </Field>

              <ListEditor label="أهداف الدرس (ماذا سيتعلّم)" items={form.objectives} onChange={(v) => setForm({ ...form, objectives: v })} />
              <ListEditor label="ملخص نهاية الدرس (نقاط ✓)" items={form.summary_points} onChange={(v) => setForm({ ...form, summary_points: v })} />
              <button onClick={saveLesson} disabled={saving} className="btn-3d w-full active:btn-3d-active disabled:opacity-60">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> حفظ بيانات الدرس</>}
              </button>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold">خطوات الحوار ({stepsQ.data?.length ?? 0})</h3>
              </div>
              {stepsQ.isLoading && <Center />}
              {stepsQ.data?.map((s, i) => (
                <StepRow key={s.id} step={s} index={i} total={stepsQ.data!.length} characters={charsQ.data ?? []} lessonId={lessonId} />
              ))}
              {stepsQ.data?.length === 0 && <p className="text-xs text-muted-foreground font-bold text-center py-6">لا خطوات بعد — أضف أول فقاعة حوار.</p>}

              {/* شريط الإضافة أسفل آخر رسالة — لا حاجة للصعود للأعلى */}
              <div className="sticky bottom-2 z-10 rounded-2xl border-2 border-primary/30 bg-background/95 backdrop-blur p-2 shadow-md">
                <div className="text-[10px] font-extrabold text-muted-foreground mb-1 text-center">أضف رسالة جديدة بعد آخر رسالة</div>
                <AddBar onAdd={addStep} />
              </div>
            </section>

          </>
        )}
      </div>
    </div>
  );
}

const inp = "w-full px-3 py-2 rounded-xl border-2 border-input bg-background font-bold text-sm";

function AddBar({ onAdd }: { onAdd: (kind: StepKind | "code" | "site") => void }) {
  return (
    <div className="flex flex-wrap gap-1 text-[11px] font-extrabold justify-center">
      <button onClick={() => onAdd("text")} className="px-2 py-1 rounded-lg bg-primary/10 text-primary">+ نص</button>
      <button onClick={() => onAdd("image")} className="px-2 py-1 rounded-lg bg-primary/10 text-primary">+ صورة</button>
      <button onClick={() => onAdd("video")} className="px-2 py-1 rounded-lg bg-primary/10 text-primary">+ فيديو</button>
      <button onClick={() => onAdd("question")} className="px-2 py-1 rounded-lg bg-primary/10 text-primary">+ سؤال</button>
      <button onClick={() => onAdd("site")} className="px-2 py-1 rounded-lg bg-primary/10 text-primary">+ عارض موقع</button>
      <button onClick={() => onAdd("code")} className="px-2 py-1 rounded-lg bg-foreground text-background">+ محرر أكواد</button>
    </div>
  );
}


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[11px] font-extrabold text-muted-foreground">{label}</span>{children}</label>;
}
function Center() { return <div className="grid place-items-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>; }

function ListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-1">
      <span className="text-[11px] font-extrabold text-muted-foreground">{label}</span>
      {items.map((it, i) => (
        <div key={i} className="flex gap-1">
          <input value={it} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} className={inp} />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="p-2 text-heart"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
      <button onClick={() => onChange([...items, ""])} className="text-xs font-extrabold text-primary flex items-center gap-1"><Plus className="w-3 h-3" /> إضافة سطر</button>
    </div>
  );
}

function StepRow({ step, index, total, characters, lessonId }: {
  step: Step; index: number; total: number; lessonId: string;
  characters: { id: string; name: string; avatar_url: string | null; color: string; moods: unknown }[];
}) {
  const qc = useQueryClient();
  const opts = (step.options as { choices?: string[]; answer?: number } | null) ?? {};
  const [content, setContent] = useState(step.content ?? "");
  const [note, setNote] = useState(step.admin_note ?? "");
  const [choices, setChoices] = useState<string[]>(opts.choices ?? []);
  const [answer, setAnswer] = useState<number>(opts.answer ?? 0);
  const [busy, setBusy] = useState(false);
  const initialLab = isCodeLab(step.options);
  const [labJson, setLabJson] = useState(initialLab ? JSON.stringify(initialLab, null, 2) : "");
  const initialSite = isSiteView(step.options);
  const [site, setSite] = useState<SiteSpec>(initialSite ?? { tabs: [] });


  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-steps", lessonId] });

  type StepPatch = Partial<{ content: string | null; options: unknown; order_index: number; character_id: string | null; mood: string; media_url: string | null; admin_note: string | null }>;
  async function patch(values: StepPatch) {
    const { error } = await supabase.from("lesson_steps").update(values as never).eq("id", step.id);
    if (error) return toast.error(error.message);
    refresh();
  }
  async function save() {
    let options: unknown = step.options ?? null;
    if (step.kind === "question") options = { choices, answer };
    else if (initialSite) {
      const tabs = (site.tabs ?? []).filter((t) => t.url.trim());
      if (!tabs.length) return toast.error("أضف رابط موقع واحد على الأقل");
      options = { site: { ...site, tabs, key: site.key || tabs[0].url } };
    }
    else if (initialLab) {
      try { options = { code: JSON.parse(labJson) }; }
      catch { return toast.error("صيغة JSON لمحرر الأكواد غير صحيحة"); }
    }

    setBusy(true);
    await patch({ content, admin_note: note.trim() || null, options });
    setBusy(false);
    toast.success("حُفظت الخطوة");
  }

  // Swap this step with its neighbour so "up"/"down" really reorders the conversation.
  async function move(dir: -1 | 1) {
    const list = (qc.getQueryData(["admin-steps", lessonId]) as Step[] | undefined) ?? [];
    const neighbour = list[index + dir];
    if (!neighbour) return;
    setBusy(true);
    const a = step.order_index;
    const b = neighbour.order_index;
    const tmp = -Math.abs(a) - 100000;
    await supabase.from("lesson_steps").update({ order_index: tmp } as never).eq("id", step.id);
    await supabase.from("lesson_steps").update({ order_index: a } as never).eq("id", neighbour.id);
    const { error } = await supabase.from("lesson_steps").update({ order_index: b } as never).eq("id", step.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    refresh();
  }
  async function del() {
    const { error } = await supabase.from("lesson_steps").delete().eq("id", step.id);
    if (error) return toast.error(error.message);
    refresh();
  }
  async function upload(file: File) {
    setBusy(true);
    try {
      const up = await uploadFile("lesson-media", file, "step-");
      await patch({ media_url: up.url });
      toast.success("تم رفع الملف");
    } catch (e) { toast.error(e instanceof Error ? e.message : "فشل الرفع"); } finally { setBusy(false); }
  }

  const char = characters.find((c) => c.id === step.character_id);

  return (
    <div className="bg-card border-2 border-border rounded-2xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-extrabold bg-secondary rounded-full px-2 py-0.5">#{index + 1} • {initialSite ? "عارض موقع" : initialLab ? "محرر أكواد" : kindLabel(step.kind)}</span>
        <div className="flex-1" />
        <button disabled={index === 0} onClick={() => move(-1)} className="p-1 text-muted-foreground disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
        <button disabled={index === total - 1} onClick={() => move(1)} className="p-1 text-muted-foreground disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
        <button onClick={del} className="p-1 text-heart"><Trash2 className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select value={step.character_id ?? ""} onChange={(e) => patch({ character_id: e.target.value || null })} className={inp}>
          <option value="">بدون شخصية (زكي)</option>
          {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={step.mood} onChange={(e) => patch({ mood: e.target.value })} className={inp}>
          {MOODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </div>

      {char && (
        <div className="flex items-center gap-2 text-[11px] font-extrabold text-muted-foreground">
          <AvatarBubble id={characterImage(char, step.mood)} size={28} /> معاينة الشخصية
        </div>
      )}

      <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={2} placeholder="نص الفقاعة…" className={`${inp} resize-none`} />

      {/* Production instructions — visible only here in the admin panel, never to students. */}
      <div className="rounded-xl bg-streak/10 border-2 border-streak/30 p-2">
        <span className="text-[10px] font-extrabold text-streak">🎬 تعليمات الصورة/الفيديو (للأدمن فقط)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="مثال: صوّر لقطة شاشة لزر إنشاء صورة داخل تطبيق مساعد ذكي…"
          className={`${inp} resize-none mt-1`}
        />
      </div>


      {(step.kind === "image" || step.kind === "video") && (
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs font-extrabold text-primary cursor-pointer">
            <Upload className="w-4 h-4" /> رفع ملف
            <input type="file" accept={step.kind === "image" ? "image/*" : "video/*"} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
          </label>
          {step.media_url && <span className="text-[10px] text-muted-foreground truncate flex-1">تم إرفاق ملف ✓</span>}
        </div>
      )}

      {step.kind === "question" && (
        <div className="space-y-1">
          {choices.map((c, i) => (
            <div key={i} className="flex items-center gap-1">
              <input type="radio" checked={answer === i} onChange={() => setAnswer(i)} aria-label="الإجابة الصحيحة" />
              <input value={c} onChange={(e) => setChoices(choices.map((x, j) => (j === i ? e.target.value : x)))} className={inp} />
              <button onClick={() => setChoices(choices.filter((_, j) => j !== i))} className="p-1 text-heart"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <button onClick={() => setChoices([...choices, ""])} className="text-xs font-extrabold text-primary flex items-center gap-1"><Plus className="w-3 h-3" /> خيار</button>
        </div>
      )}

      {initialSite && <SiteFields spec={site} onChange={setSite} />}


      {initialLab && <CodeLabFields json={labJson} onChange={setLabJson} />}

      <button onClick={save} disabled={busy} className="w-full text-xs font-extrabold text-primary border-2 border-primary/30 rounded-xl py-2 disabled:opacity-50">
        {busy ? "…" : "حفظ الخطوة"}
      </button>
    </div>
  );
}

function kindLabel(k: StepKind) {
  return { text: "نص", image: "صورة", video: "فيديو", question: "سؤال" }[k];
}

/** Visual editor for a code-lab step: fields + raw JSON + a live preview of the block. */
function CodeLabFields({ json, onChange }: { json: string; onChange: (v: string) => void }) {
  const [raw, setRaw] = useState(false);
  let spec: Record<string, unknown> | null = null;
  try { spec = JSON.parse(json) as Record<string, unknown>; } catch { spec = null; }

  function set(key: string, value: unknown) {
    if (!spec) return;
    onChange(JSON.stringify({ ...spec, [key]: value }, null, 2));
  }
  const lines = (v: unknown) => (Array.isArray(v) ? v.join("\n") : "");
  const toLines = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="rounded-2xl border-2 border-foreground/20 bg-foreground/5 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold">🧪 محرر الأكواد (خطوة تفاعلية)</span>
        <button onClick={() => setRaw((v) => !v)} className="text-[11px] font-extrabold text-primary">
          {raw ? "الحقول" : "JSON متقدم"}
        </button>
      </div>

      {raw || !spec ? (
        <textarea dir="ltr" value={json} onChange={(e) => onChange(e.target.value)} rows={12}
          className="w-full font-mono text-[11.5px] leading-6 p-2 rounded-xl bg-[#0f1115] text-[#e6edf3] outline-none" />
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label="العنوان"><input value={String(spec["title"] ?? "")} onChange={(e) => set("title", e.target.value)} className={inp} /></Field>
            <Field label="اللغة">
              <select value={String(spec["language"] ?? "html")} onChange={(e) => set("language", e.target.value)} className={inp}>
                <option value="html">html</option><option value="css">css</option><option value="js">js</option>
              </select>
            </Field>
          </div>
          <Field label="الدليل"><textarea rows={2} value={String(spec["brief"] ?? "")} onChange={(e) => set("brief", e.target.value)} className={`${inp} resize-none`} /></Field>
          <Field label="خطوات الشرح (سطر لكل خطوة)">
            <textarea rows={3} value={lines(spec["steps"])} onChange={(e) => set("steps", toLines(e.target.value))} className={`${inp} resize-none`} />
          </Field>
          <Field label="الناتج المطلوب (HTML)">
            <textarea dir="ltr" rows={3} value={String(spec["expected_html"] ?? "")} onChange={(e) => set("expected_html", e.target.value)} className={`${inp} resize-none font-mono text-[11.5px]`} />
          </Field>
          <Field label="كود البداية (يظهر للطالب)">
            <textarea dir="ltr" rows={3} value={String(spec["starter"] ?? "")} onChange={(e) => set("starter", e.target.value)} className={`${inp} resize-none font-mono text-[11.5px]`} />
          </Field>
          <Field label="الحل الصحيح">
            <textarea dir="ltr" rows={3} value={String(spec["solution"] ?? "")} onChange={(e) => set("solution", e.target.value)} className={`${inp} resize-none font-mono text-[11.5px]`} />
          </Field>
          <Field label="شروط النجاح (نص مطلوب — سطر لكل شرط)">
            <textarea dir="ltr" rows={3}
              value={(Array.isArray(spec["checks"]) ? (spec["checks"] as { value?: string }[]).map((c) => c.value ?? "") : []).join("\n")}
              onChange={(e) => set("checks", toLines(e.target.value).map((v) => ({ type: "includes", value: v, hint: `الكود ناقص: ${v}` })))}
              className={`${inp} resize-none font-mono text-[11.5px]`} />
          </Field>
          <Field label="تلميحات (سطر لكل تلميح)">
            <textarea rows={2} value={lines(spec["hints"])} onChange={(e) => set("hints", toLines(e.target.value))} className={`${inp} resize-none`} />
          </Field>
        </div>
      )}

      {spec && (
        <div className="pt-2">
          <div className="text-[10px] font-extrabold text-muted-foreground mb-1">معاينة الطالب</div>
          <CodeLab spec={spec as never} />
        </div>
      )}
    </div>
  );
}

/** Editor for a "site viewer" step: tabs (name + link) + the task the learner must do. */
function SiteFields({ spec, onChange }: { spec: SiteSpec; onChange: (v: SiteSpec) => void }) {
  const tabs = spec.tabs ?? [];
  const set = (v: Partial<SiteSpec>) => onChange({ ...spec, ...v });
  const setTab = (i: number, v: Partial<{ label: string; url: string }>) =>
    set({ tabs: tabs.map((t, j) => (j === i ? { ...t, ...v } : t)) });

  return (
    <div className="rounded-2xl border-2 border-primary/25 bg-primary/5 p-3 space-y-2">
      <div className="text-[11px] font-extrabold text-primary">🌐 عارض المواقع (تبويبات + مهمة)</div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="عنوان العارض"><input value={spec.title ?? ""} onChange={(e) => set({ title: e.target.value })} className={inp} /></Field>
        <Field label="مُعرّف الجلسة (نفس المُعرّف = نفس الموقع محفوظ)">
          <input dir="ltr" value={spec.key ?? ""} onChange={(e) => set({ key: e.target.value })} className={`${inp} font-mono text-[11.5px]`} />
        </Field>
      </div>
      <p className="text-[10px] font-bold text-muted-foreground leading-5">
        استخدم نفس «مُعرّف الجلسة» في رسائل لاحقة ليجد الطالب الموقع كما تركه تماماً (نفس تسجيل الدخول ونفس المكان).
      </p>

      <div className="space-y-1">
        <span className="text-[11px] font-extrabold text-muted-foreground">التبويبات</span>
        {tabs.map((t, i) => (
          <div key={i} className="flex gap-1">
            <input value={t.label} placeholder="الاسم" onChange={(e) => setTab(i, { label: e.target.value })} className={`${inp} w-28`} />
            <input dir="ltr" value={t.url} placeholder="https://…" onChange={(e) => setTab(i, { url: e.target.value })} className={`${inp} flex-1 font-mono text-[11.5px]`} />
            <button onClick={() => set({ tabs: tabs.filter((_, j) => j !== i) })} className="p-2 text-heart"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        <button onClick={() => set({ tabs: [...tabs, { label: "تبويب", url: "https://" }] })} className="text-xs font-extrabold text-primary flex items-center gap-1">
          <Plus className="w-3 h-3" /> إضافة تبويب
        </button>
      </div>

      <Field label="المهمة المطلوبة"><input value={spec.task ?? ""} onChange={(e) => set({ task: e.target.value })} className={inp} /></Field>
      <Field label="خطوات المهمة (سطر لكل خطوة)">
        <textarea rows={3} value={(spec.steps ?? []).join("\n")}
          onChange={(e) => set({ steps: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
          className={`${inp} resize-none`} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="نص زر التأكيد"><input value={spec.done_label ?? ""} onChange={(e) => set({ done_label: e.target.value })} className={inp} /></Field>
        <Field label="ارتفاع العارض (px)"><input type="number" value={spec.height ?? 420} onChange={(e) => set({ height: Number(e.target.value) || 420 })} className={inp} /></Field>
      </div>
      <label className="flex items-center gap-2 text-[11px] font-extrabold">
        <input type="checkbox" checked={spec.require_done ?? true} onChange={(e) => set({ require_done: e.target.checked })} />
        منع المتابعة حتى يضغط الطالب «تم»
      </label>
      <label className="flex items-center gap-2 text-[11px] font-extrabold">
        <input type="checkbox" checked={spec.force_window ?? false} onChange={(e) => set({ force_window: e.target.checked })} />
        افتحه دائماً في نافذة (للمواقع التي ترفض العرض بالداخل مثل Google)
      </label>

    </div>
  );
}
