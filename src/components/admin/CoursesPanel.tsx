import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile } from "@/lib/upload";
import { toast } from "sonner";
import {
  Loader2, Plus, Save, Trash2, ArrowUp, ArrowDown, Upload, Image as ImageIcon, Pencil, BookOpen,
} from "lucide-react";

/**
 * Full course management: cover image, units (add / rename / reorder / delete)
 * and the lessons inside every unit.
 */

const inp = "w-full px-3 py-2 rounded-xl border-2 border-input bg-background font-bold text-sm";

type Course = {
  id: string; slug: string; title: string; subtitle: string | null; emoji: string; color: string;
  cover_url: string | null; is_paid: boolean; price: number; coming_soon: boolean; order_index: number;
};
type Unit = {
  id: string; course_id: string | null; number: number; name: string; emoji: string;
  color: string; description: string | null; cover_url: string | null; order_index: number;
};
type Lesson = { id: string; title: string; unit: number; order_index: number; status: string; xp_reward: number };

const db = supabase as unknown as {
  from: (t: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export function CoursesPanel() {
  const [openCourse, setOpenCourse] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["admin-courses-full"],
    queryFn: async () => {
      const { data, error } = await db.from("courses")
        .select("id,slug,title,subtitle,emoji,color,cover_url,is_paid,price,coming_soon,order_index")
        .order("order_index");
      if (error) throw new Error(error.message);
      return (data ?? []) as Course[];
    },
  });

  if (q.isLoading) return <div className="grid place-items-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      {(q.data ?? []).map((c) => (
        <CourseCard key={c.id} course={c} open={openCourse === c.id} onToggle={() => setOpenCourse(openCourse === c.id ? null : c.id)} />
      ))}
    </div>
  );
}

function CourseCard({ course, open, onToggle }: { course: Course; open: boolean; onToggle: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: course.title, subtitle: course.subtitle ?? "", emoji: course.emoji,
    price: course.price, is_paid: course.is_paid, coming_soon: course.coming_soon,
  });
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-courses-full"] });
    qc.invalidateQueries({ queryKey: ["courses-full"] });
    qc.invalidateQueries({ queryKey: ["admin-courses"] });
  };

  async function save() {
    setBusy(true);
    const { error } = await db.from("courses").update({
      title: form.title.trim(), subtitle: form.subtitle.trim() || null, emoji: form.emoji,
      price: Number(form.price) || 0, is_paid: form.is_paid, coming_soon: form.coming_soon,
    }).eq("id", course.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("حُفظ الكورس");
    refresh();
  }

  async function uploadCover(file: File) {
    setBusy(true);
    try {
      const up = await uploadFile("lesson-media", file, "course-");
      const { error } = await db.from("courses").update({ cover_url: up.url }).eq("id", course.id);
      if (error) throw new Error(error.message);
      toast.success("تم تغيير صورة الكورس");
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "فشل الرفع"); } finally { setBusy(false); }
  }

  return (
    <div className="bg-card border-2 border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <label className="relative w-16 h-16 rounded-2xl border-2 border-dashed border-input overflow-hidden grid place-items-center bg-background cursor-pointer shrink-0">
          {course.cover_url
            ? <img src={course.cover_url} alt={course.title} className="w-full h-full object-cover" />
            : <span className="text-2xl">{course.emoji}</span>}
          <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] font-extrabold text-center py-0.5 flex items-center justify-center gap-1">
            <ImageIcon className="w-3 h-3" /> صورة
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); }} />
        </label>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-sm truncate">{course.title}</div>
          <div className="text-[11px] text-muted-foreground font-bold" translate="no">{course.slug}</div>
        </div>
        <button onClick={onToggle} className="p-2 rounded-lg text-primary hover:bg-primary/10" aria-label="تحرير">
          <Pencil className="w-4 h-4" />
        </button>
      </div>

      {open && (
        <div className="border-t border-border p-3 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان الكورس" className={inp} />
            <input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} placeholder="إيموجي" className={inp} />
            <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="وصف مختصر" className={inp} />
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) || 0 })} placeholder="السعر" className={inp} />
          </div>
          <div className="flex gap-4 text-[12px] font-extrabold">
            <label className="flex items-center gap-1"><input type="checkbox" checked={form.is_paid} onChange={(e) => setForm({ ...form, is_paid: e.target.checked })} /> مدفوع</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={form.coming_soon} onChange={(e) => setForm({ ...form, coming_soon: e.target.checked })} /> قريباً</label>
          </div>
          <button onClick={save} disabled={busy} className="btn-3d w-full active:btn-3d-active disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> حفظ بيانات الكورس</>}
          </button>

          <UnitsEditor courseId={course.id} />
        </div>
      )}
    </div>
  );
}

function UnitsEditor({ courseId }: { courseId: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📘");
  const [openUnit, setOpenUnit] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-units", courseId],
    queryFn: async () => {
      const { data, error } = await db.from("units").select("*").eq("course_id", courseId).order("order_index");
      if (error) throw new Error(error.message);
      return (data ?? []) as Unit[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-units", courseId] });
    qc.invalidateQueries({ queryKey: ["lessons-path"] });
  };

  async function add() {
    if (name.trim().length < 2) return toast.error("اسم الوحدة قصير");
    const list = q.data ?? [];
    const number = (list.reduce((m, u) => Math.max(m, u.number), 0) || 0) + 1;
    const { error } = await db.from("units").insert({
      course_id: courseId, number, name: name.trim(), emoji, color: "primary", order_index: number,
    });
    if (error) return toast.error(error.message);
    setName("");
    toast.success("أُضيفت الوحدة");
    refresh();
  }

  async function patch(id: string, values: Record<string, unknown>) {
    const { error } = await db.from("units").update(values).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  async function move(index: number, dir: -1 | 1) {
    const list = q.data ?? [];
    const a = list[index]; const b = list[index + dir];
    if (!a || !b) return;
    await db.from("units").update({ order_index: -999 }).eq("id", a.id);
    await db.from("units").update({ order_index: a.order_index }).eq("id", b.id);
    await db.from("units").update({ order_index: b.order_index }).eq("id", a.id);
    refresh();
  }

  async function del(id: string) {
    if (!window.confirm("حذف الوحدة؟ الدروس لا تُحذف.")) return;
    const { error } = await db.from("units").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  return (
    <div className="rounded-2xl bg-secondary/40 p-3 space-y-3">
      <div className="font-extrabold text-sm flex items-center gap-1"><BookOpen className="w-4 h-4 text-primary" /> وحدات الكورس</div>

      <div className="flex gap-2">
        <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className={`${inp} w-16 text-center`} />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم وحدة جديدة" className={inp} />
        <button onClick={add} className="px-3 rounded-xl bg-primary text-primary-foreground font-extrabold text-sm flex items-center gap-1">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {q.isLoading && <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />}
      <ul className="space-y-2">
        {(q.data ?? []).map((u, i) => (
          <li key={u.id} className="bg-background border-2 border-border rounded-2xl p-2 space-y-2">
            <div className="flex items-center gap-2">
              <input value={u.emoji} onChange={(e) => patch(u.id, { emoji: e.target.value })} className="w-10 text-center rounded-lg border-2 border-input bg-background py-1 text-sm" />
              <input defaultValue={u.name} onBlur={(e) => e.target.value !== u.name && patch(u.id, { name: e.target.value })} className="flex-1 min-w-0 rounded-lg border-2 border-input bg-background px-2 py-1 font-extrabold text-[13px]" />
              <span className="text-[10px] font-extrabold text-muted-foreground">#{u.number}</span>
              <button disabled={i === 0} onClick={() => move(i, -1)} className="p-1 text-muted-foreground disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
              <button disabled={i === (q.data?.length ?? 1) - 1} onClick={() => move(i, 1)} className="p-1 text-muted-foreground disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
              <button onClick={() => setOpenUnit(openUnit === u.id ? null : u.id)} className="p-1 text-primary"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => del(u.id)} className="p-1 text-heart"><Trash2 className="w-4 h-4" /></button>
            </div>
            {openUnit === u.id && <UnitLessons courseId={courseId} unitNumber={u.number} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function UnitLessons({ courseId, unitNumber }: { courseId: string; unitNumber: number }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");

  const q = useQuery({
    queryKey: ["admin-unit-lessons", courseId, unitNumber],
    queryFn: async () => {
      const { data, error } = await db.from("lessons")
        .select("id,title,unit,order_index,status,xp_reward")
        .eq("course_id", courseId).eq("unit", unitNumber).order("order_index");
      if (error) throw new Error(error.message);
      return (data ?? []) as Lesson[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-unit-lessons", courseId, unitNumber] });
    qc.invalidateQueries({ queryKey: ["admin-lessons"] });
    qc.invalidateQueries({ queryKey: ["lessons-path"] });
  };

  async function add() {
    if (title.trim().length < 3) return toast.error("عنوان قصير");
    const order = (q.data?.length ?? 0) + 1;
    const { error } = await db.from("lessons").insert({
      course_id: courseId, unit: unitNumber, order_index: order, title: title.trim(), xp_reward: 10, status: "draft",
    });
    if (error) return toast.error(error.message);
    setTitle("");
    toast.success("أُضيف الدرس داخل الوحدة");
    refresh();
  }

  async function del(id: string) {
    const { error } = await db.from("lessons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  return (
    <div className="rounded-xl bg-secondary/50 p-2 space-y-2">
      <div className="flex gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان درس جديد" className={inp} />
        <button onClick={add} className="px-3 rounded-xl bg-primary text-primary-foreground font-extrabold text-sm"><Plus className="w-4 h-4" /></button>
      </div>
      {q.isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto" />}
      <ul className="space-y-1">
        {(q.data ?? []).map((l) => (
          <li key={l.id} className="flex items-center gap-2 bg-background rounded-lg px-2 py-1.5">
            <span className="text-[10px] font-extrabold text-muted-foreground">{l.order_index}</span>
            <a href={`/admin?lesson=${l.id}`} className="flex-1 min-w-0 truncate text-[12px] font-extrabold">{l.title}</a>
            <span className="text-[9px] font-extrabold rounded-full bg-secondary px-2 py-0.5">{l.status === "published" ? "منشور" : "مسودة"}</span>
            <button onClick={() => del(l.id)} className="p-1 text-heart"><Trash2 className="w-3.5 h-3.5" /></button>
          </li>
        ))}
        {q.data?.length === 0 && <li className="text-[11px] font-bold text-muted-foreground text-center py-2">لا دروس في هذه الوحدة بعد.</li>}
      </ul>
      <div className="text-[10px] font-bold text-muted-foreground flex items-center gap-1"><Upload className="w-3 h-3" /> افتح الدرس لتحرير المحادثات والخطوات.</div>
    </div>
  );
}
