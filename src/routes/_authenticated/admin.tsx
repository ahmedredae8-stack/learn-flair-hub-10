import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { AppTopBar } from "@/components/AppTopBar";
import { BottomNav } from "@/components/BottomNav";
import { AvatarBubble } from "@/components/AvatarBubble";
import { characterImage } from "@/lib/characterImage";
import { LessonEditor, MOODS } from "@/components/admin/LessonEditor";
import { CoursesPanel } from "@/components/admin/CoursesPanel";
import { BrandingPanel } from "@/components/admin/BrandingPanel";
import { uploadFile } from "@/lib/upload";
import { toast } from "sonner";
import {
  Loader2, Users, GraduationCap, Rocket, MessageCircle, Trash2, Plus, ShieldCheck, Save,
  Ban, Pencil, Bell, Upload, ShieldOff, CheckCircle2, BookOpen, Image as ImageIcon,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الأدمن — nilex" },
      { name: "description", content: "إدارة الطلاب والدروس والمشاريع والشخصيات والإشعارات." },
      { property: "og:title", content: "لوحة الأدمن — nilex" },
      { property: "og:description", content: "تحكم كامل بمنصة nilex." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { lesson?: string } =>
    typeof search["lesson"] === "string" ? { lesson: search["lesson"] } : {},
  beforeLoad: async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw redirect({ to: "/auth" });
  },
  component: AdminPage,
});

type Tab = "students" | "courses" | "lessons" | "characters" | "projects" | "notify" | "branding";

function AdminPage() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const { lesson } = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(lesson ? "lessons" : "students");

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!isAdmin) {
    return (
      <div dir="rtl" className="min-h-screen bg-background grid place-items-center p-6 font-display">
        <div className="text-center">
          <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <div className="font-extrabold text-lg">لا صلاحية</div>
          <p className="text-sm text-muted-foreground">هذه الصفحة مخصّصة لمدراء المنصة.</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-24 font-display">
      <AppTopBar />
      <main className="mx-auto max-w-4xl px-4 pt-4">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-extrabold">لوحة الأدمن</h1>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 bg-secondary p-1 rounded-2xl mb-5 text-[10px] sm:text-sm">
          <TabBtn active={tab === "students"} onClick={() => setTab("students")} icon={<Users className="w-4 h-4" />} label="الطلاب" />
          <TabBtn active={tab === "courses"} onClick={() => setTab("courses")} icon={<BookOpen className="w-4 h-4" />} label="الكورسات" />
          <TabBtn active={tab === "lessons"} onClick={() => setTab("lessons")} icon={<GraduationCap className="w-4 h-4" />} label="الدروس" />
          <TabBtn active={tab === "characters"} onClick={() => setTab("characters")} icon={<Users className="w-4 h-4" />} label="الشخصيات" />
          <TabBtn active={tab === "projects"} onClick={() => setTab("projects")} icon={<Rocket className="w-4 h-4" />} label="المشاريع" />
          <TabBtn active={tab === "notify"} onClick={() => setTab("notify")} icon={<Bell className="w-4 h-4" />} label="إشعارات" />
          <TabBtn active={tab === "branding"} onClick={() => setTab("branding")} icon={<ImageIcon className="w-4 h-4" />} label="المظهر" />
        </div>

        {tab === "students" && <StudentsPanel />}
        {tab === "courses" && <CoursesPanel />}
        {tab === "lessons" && <LessonsPanel />}
        {tab === "characters" && <CharactersPanel />}
        {tab === "projects" && <ProjectsPanel />}
        {tab === "notify" && <NotifyPanel />}
        {tab === "branding" && <BrandingPanel />}
      </main>
      <BottomNav />
      {lesson && <LessonEditor lessonId={lesson} onClose={() => navigate({ to: "/admin", search: {} })} />}
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 py-2 rounded-xl font-extrabold transition ${active ? "bg-card text-primary shadow" : "text-muted-foreground"}`}>
      {icon}{label}
    </button>
  );
}

const inp = "w-full px-3 py-2 rounded-xl border-2 border-input bg-background font-bold text-sm";

/* ---------- Students ---------- */
type Status = "active" | "suspended" | "banned";

function StudentsPanel() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,display_name,username,avatar_url,xp,streak,gems,hearts,created_at,status,status_reason,suspended_until")
        .order("xp", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });

  async function setStatus(id: string, status: Status) {
    const reason = status === "active" ? null : window.prompt("سبب الإجراء (اختياري)") ?? null;
    const suspended_until = status === "suspended" ? new Date(Date.now() + 7 * 864e5).toISOString() : null;
    const { error } = await supabase.from("profiles").update({ status, status_reason: reason, suspended_until }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم تحديث حالة الطالب");
    qc.invalidateQueries({ queryKey: ["admin-students"] });
  }

  const list = (q.data ?? []).filter((s) =>
    !search || (s.display_name ?? "").includes(search) || (s.username ?? "").includes(search));

  if (q.isLoading) return <Center />;
  return (
    <div className="space-y-3">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث باسم الطالب…" className={inp} />
      <div className="bg-card border-2 border-border rounded-2xl overflow-hidden">
        <div className="p-3 text-sm font-extrabold border-b border-border">إجمالي الطلاب: {q.data?.length ?? 0}</div>
        <ul className="divide-y divide-border">
          {list.map((s) => (
            <li key={s.id} className="p-3 space-y-2">
              <div className="flex items-center gap-3">
                <AvatarBubble id={s.avatar_url} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate flex items-center gap-2">
                    {s.display_name || "بدون اسم"}
                    <StatusChip status={(s.status as Status) ?? "active"} />
                  </div>
                  <div className="text-[11px] text-muted-foreground font-bold" translate="no">@{s.username || "user"}</div>
                </div>
                <div className="text-[11px] font-extrabold text-muted-foreground hidden sm:flex gap-3">
                  <span>XP {s.xp}</span><span>🔥 {s.streak}</span><span>💎 {s.gems}</span>
                </div>
              </div>
              <div className="flex gap-1 text-[11px] font-extrabold">
                <button onClick={() => setStatus(s.id, "active")} className="flex-1 py-1.5 rounded-lg bg-primary/10 text-primary flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3" /> تفعيل</button>
                <button onClick={() => setStatus(s.id, "suspended")} className="flex-1 py-1.5 rounded-lg bg-streak/10 text-streak flex items-center justify-center gap-1"><ShieldOff className="w-3 h-3" /> تعليق</button>
                <button onClick={() => setStatus(s.id, "banned")} className="flex-1 py-1.5 rounded-lg bg-heart/10 text-heart flex items-center justify-center gap-1"><Ban className="w-3 h-3" /> حظر</button>
              </div>
              {s.status_reason && <div className="text-[10px] text-muted-foreground font-bold">السبب: {s.status_reason}</div>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    active: "bg-primary/10 text-primary",
    suspended: "bg-streak/10 text-streak",
    banned: "bg-heart/10 text-heart",
  };
  const label: Record<Status, string> = { active: "نشط", suspended: "معلّق", banned: "محظور" };
  return <span className={`text-[9px] px-2 py-0.5 rounded-full ${map[status]}`}>{label[status]}</span>;
}

/* ---------- Characters ---------- */
function CharactersPanel() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("robot");
  const [color, setColor] = useState("#7c3aed");
  const [bio, setBio] = useState("");

  const q = useQuery({
    queryKey: ["admin-characters"],
    queryFn: async () => {
      const { data, error } = await supabase.from("characters").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function add() {
    if (name.trim().length < 2) return toast.error("اسم قصير");
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("characters").insert({ name: name.trim(), avatar_url: avatar, color, bio, created_by: auth.user?.id });
    if (error) return toast.error(error.message);
    toast.success("أُضيفت الشخصية");
    setName(""); setBio("");
    qc.invalidateQueries({ queryKey: ["admin-characters"] });
  }
  async function del(id: string) {
    const { error } = await supabase.from("characters").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-characters"] });
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border-2 border-border rounded-2xl p-4 space-y-2">
        <div className="font-extrabold text-sm mb-1">إضافة شخصية</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" className={inp} />
          <input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="معرّف الصورة (boy, girl, robot, wizard, ninja, astro)" className={inp} />
          <input value={color} onChange={(e) => setColor(e.target.value)} type="color" className="h-10 rounded-xl border-2 border-input bg-background" />
          <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="تعريف مختصر" className={inp} />
        </div>
        <button onClick={add} className="btn-3d w-full active:btn-3d-active"><Plus className="w-4 h-4" /> إضافة</button>
      </div>
      {q.isLoading && <Center />}
      <ul className="space-y-3">
        {q.data?.map((c) => <CharacterCard key={c.id} character={c} onDelete={() => del(c.id)} />)}
      </ul>
    </div>
  );
}

function CharacterCard({ character, onDelete }: { character: Record<string, unknown>; onDelete: () => void }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const moods = (character["moods"] as Record<string, string> | null) ?? {};
  const id = String(character["id"]);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(String(character["name"] ?? ""));
  const [bio, setBio] = useState(String(character["bio"] ?? ""));
  const [color, setColor] = useState(String(character["color"] ?? "#7c3aed"));
  const [avatar, setAvatar] = useState(String(character["avatar_url"] ?? "robot"));

  async function saveInfo() {
    if (name.trim().length < 2) return toast.error("اسم قصير");
    const { error } = await supabase
      .from("characters")
      .update({ name: name.trim(), bio, color, avatar_url: avatar })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم تحديث الشخصية");
    setEditing(false);
    qc.invalidateQueries({ queryKey: ["admin-characters"] });
    qc.invalidateQueries({ queryKey: ["characters-all"] });
  }

  async function uploadMood(mood: string, file: File) {
    setBusy(mood);
    try {
      const up = await uploadFile("lesson-media", file, `char-${mood}-`);
      const next = { ...moods, [mood]: up.url };
      const { error } = await supabase.from("characters").update({ moods: next }).eq("id", id);
      if (error) throw error;
      toast.success("تم رفع صورة الحالة");
      qc.invalidateQueries({ queryKey: ["admin-characters"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "فشل الرفع"); } finally { setBusy(null); }
  }

  return (
    <li className="bg-card border-2 border-border rounded-2xl p-3 space-y-3">
      <div className="flex items-center gap-3">
        <AvatarBubble id={characterImage(character as { avatar_url?: string | null; moods?: unknown })} size={48} />
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-sm truncate" style={{ color }}>{String(character["name"] ?? "")}</div>
          <div className="text-[11px] text-muted-foreground truncate">{String(character["bio"] ?? "")}</div>
        </div>
        <button onClick={() => setEditing((v) => !v)} className="p-2 rounded-lg text-primary hover:bg-primary/10" aria-label="تعديل"><Pencil className="w-4 h-4" /></button>
        <button onClick={onDelete} className="p-2 rounded-lg text-heart hover:bg-heart/10" aria-label="حذف"><Trash2 className="w-4 h-4" /></button>
      </div>

      {editing && (
        <div className="rounded-2xl bg-secondary/50 p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الشخصية" className={inp} />
            <input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="معرّف الصورة (boy, girl, robot…)" className={inp} />
            <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="تعريف مختصر" className={inp} />
            <input value={color} onChange={(e) => setColor(e.target.value)} type="color" className="h-10 rounded-xl border-2 border-input bg-background" />
          </div>
          <button onClick={saveInfo} className="btn-3d w-full active:btn-3d-active">حفظ التعديلات</button>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {MOODS.map((m) => (
          <label key={m.id} className="flex flex-col items-center gap-1 cursor-pointer">
            <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-input grid place-items-center overflow-hidden bg-background">
              {busy === m.id ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
                : moods[m.id] ? <img src={moods[m.id]} alt={m.label} className="w-full h-full object-cover" />
                : <Upload className="w-4 h-4 text-muted-foreground" />}
            </div>
            <span className="text-[10px] font-extrabold text-muted-foreground">{m.label}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMood(m.id, f); }} />
          </label>
        ))}
      </div>
    </li>
  );
}

/* ---------- Lessons ---------- */
function LessonsPanel() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState(1);
  const [xp, setXp] = useState(10);
  const [description, setDescription] = useState("");

  const q = useQuery({
    queryKey: ["admin-lessons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lessons").select("id,title,unit,order_index,status,xp_reward,description,created_at").order("unit").order("order_index");
      if (error) throw error;
      return data;
    },
  });

  async function add() {
    if (title.trim().length < 3) return toast.error("عنوان قصير");
    const orderIndex = (q.data?.filter((l) => l.unit === unit).length ?? 0) + 1;
    const { error } = await supabase.from("lessons").insert({ title: title.trim(), unit, order_index: orderIndex, xp_reward: xp, description });
    if (error) return toast.error(error.message);
    toast.success("أُضيف الدرس");
    setTitle(""); setDescription("");
    qc.invalidateQueries({ queryKey: ["admin-lessons"] });
  }
  async function updateStatus(id: string, status: "draft" | "published" | "archived") {
    const { error } = await supabase.from("lessons").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-lessons"] });
    qc.invalidateQueries({ queryKey: ["lessons-path"] });
  }
  async function del(id: string) {
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-lessons"] });
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border-2 border-border rounded-2xl p-4 space-y-2">
        <div className="font-extrabold text-sm mb-1">إضافة درس</div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الدرس" className={inp} />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={unit} onChange={(e) => setUnit(Number(e.target.value) || 1)} placeholder="رقم الوحدة" className={inp} />
          <input type="number" value={xp} onChange={(e) => setXp(Number(e.target.value) || 10)} placeholder="نقاط XP" className={inp} />
        </div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="نبذة مختصرة" rows={2} className={`${inp} resize-none`} />
        <button onClick={add} className="btn-3d w-full active:btn-3d-active"><Plus className="w-4 h-4" /> إضافة درس</button>
      </div>

      {q.isLoading && <Center />}
      <ul className="space-y-2">
        {q.data?.map((l) => (
          <li key={l.id} className="bg-card border-2 border-border rounded-2xl p-3 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-sm truncate">{l.title}</div>
              <div className="text-[11px] text-muted-foreground font-bold">وحدة {l.unit} • ترتيب {l.order_index} • {l.xp_reward} XP</div>
            </div>
            <button onClick={() => navigate({ to: "/admin", search: { lesson: l.id } })} className="p-2 rounded-lg text-primary hover:bg-primary/10" aria-label="تحرير">
              <Pencil className="w-4 h-4" />
            </button>
            <select value={l.status} onChange={(e) => updateStatus(l.id, e.target.value as "draft" | "published" | "archived")} className="text-xs px-2 py-1 rounded-lg border-2 border-input bg-background font-extrabold">
              <option value="draft">مسودة</option>
              <option value="published">منشور</option>
              <option value="archived">أرشيف</option>
            </select>
            <button onClick={() => del(l.id)} className="p-2 rounded-lg text-heart hover:bg-heart/10" aria-label="حذف"><Trash2 className="w-4 h-4" /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Notifications ---------- */
function NotifyPanel() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [href, setHref] = useState("");
  const [target, setTarget] = useState("all");
  const [sending, setSending] = useState(false);

  const students = useQuery({
    queryKey: ["notify-students"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,display_name,username").order("display_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function send() {
    if (title.trim().length < 3) return toast.error("عنوان قصير");
    setSending(true);
    try {
      const ids = target === "all" ? (students.data ?? []).map((s) => s.id) : [target];
      const rows = ids.map((user_id) => ({ user_id, kind: "admin", title: title.trim(), body: body.trim() || null, href: href.trim() || null }));
      const { error } = await supabase.from("notifications").insert(rows);
      if (error) throw error;
      toast.success(`أُرسل الإشعار إلى ${rows.length} مستخدم`);
      setTitle(""); setBody(""); setHref("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "فشل الإرسال"); } finally { setSending(false); }
  }

  return (
    <div className="bg-card border-2 border-border rounded-2xl p-4 space-y-2">
      <div className="font-extrabold text-sm">إرسال إشعار</div>
      <select value={target} onChange={(e) => setTarget(e.target.value)} className={inp}>
        <option value="all">كل الطلاب</option>
        {students.data?.map((s) => <option key={s.id} value={s.id}>{s.display_name || s.username}</option>)}
      </select>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الإشعار" className={inp} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="النص" className={`${inp} resize-none`} />
      <input value={href} onChange={(e) => setHref(e.target.value)} placeholder="رابط (اختياري) مثل /projects" className={inp} />
      <button onClick={send} disabled={sending} className="btn-3d w-full active:btn-3d-active disabled:opacity-60">
        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Bell className="w-4 h-4" /> إرسال</>}
      </button>
    </div>
  );
}

/* ---------- Projects admin ---------- */
function ProjectsPanel() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id,title,stage,target_amount,raised_amount,platform_share,owner_share,owner_id,created_at,public_slug").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  async function setStage(id: string, stage: "idea" | "review" | "funding" | "funded" | "rejected") {
    const { error } = await supabase.from("projects").update({ stage }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم التحديث");
    qc.invalidateQueries({ queryKey: ["admin-projects"] });
  }
  async function setShare(id: string, ownerShare: number) {
    const platform = Math.max(0, 100 - ownerShare);
    const { error } = await supabase.from("projects").update({ owner_share: ownerShare, platform_share: platform }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ النسبة");
    qc.invalidateQueries({ queryKey: ["admin-projects"] });
  }
  async function makeLink(id: string, title: string) {
    const slug = `${title.trim().replace(/\s+/g, "-").slice(0, 24)}-${Math.random().toString(36).slice(2, 7)}`;
    const { error } = await supabase.from("projects").update({ public_slug: slug }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم إنشاء رابط عام");
    qc.invalidateQueries({ queryKey: ["admin-projects"] });
  }
  async function del(id: string) {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-projects"] });
  }

  if (q.isLoading) return <Center />;
  return (
    <ul className="space-y-3">
      {q.data?.map((p) => (
        <li key={p.id} className="bg-card border-2 border-border rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-extrabold truncate">{p.title}</div>
              <div className="text-[11px] text-muted-foreground font-bold">جمع {p.raised_amount ?? 0} / {p.target_amount ?? 0} ج.م</div>
            </div>
            <button onClick={() => del(p.id)} className="p-2 rounded-lg text-heart hover:bg-heart/10"><Trash2 className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select value={p.stage} onChange={(e) => setStage(p.id, e.target.value as "idea" | "review" | "funding" | "funded" | "rejected")} className="text-xs px-2 py-2 rounded-lg border-2 border-input bg-background font-extrabold">
              <option value="idea">فكرة</option>
              <option value="review">تخطيط ومناقشة</option>
              <option value="funding">مفتوح للتمويل</option>
              <option value="funded">مموّل</option>
              <option value="rejected">مرفوض</option>
            </select>
            <ShareEditor initial={p.owner_share ?? 80} onSave={(v) => setShare(p.id, v)} />
            <MessageOwner projectId={p.id} />
          </div>
          <button onClick={() => makeLink(p.id, p.title)} className="text-[11px] font-extrabold text-primary">
            {p.public_slug ? `الرابط العام: /p/${p.public_slug} — تجديد` : "إنشاء رابط عام للمشروع"}
          </button>
        </li>
      ))}
    </ul>
  );
}

function ShareEditor({ initial, onSave }: { initial: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(initial);
  return (
    <div className="flex items-center gap-2 bg-background rounded-lg border-2 border-input px-2 py-1">
      <span className="text-[11px] font-extrabold text-muted-foreground">نسبة المالك</span>
      <input type="number" min={0} max={100} value={v} onChange={(e) => setV(Number(e.target.value) || 0)} className="w-14 bg-transparent font-extrabold text-sm outline-none" />
      <span className="text-[11px] font-extrabold">%</span>
      <button onClick={() => onSave(v)} className="mr-auto text-primary p-1" aria-label="حفظ"><Save className="w-4 h-4" /></button>
    </div>
  );
}

function MessageOwner({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  async function send() {
    if (msg.trim().length < 2) return;
    setSending(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("admin_messages").insert({ project_id: projectId, sender_id: auth.user!.id, body: msg.trim(), from_admin: true });
      if (error) throw error;
      toast.success("أُرسلت الرسالة");
      setMsg(""); setOpen(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "فشل"); } finally { setSending(false); }
  }
  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center justify-center gap-1 text-xs font-extrabold rounded-lg border-2 border-primary/40 text-primary py-2 hover:bg-primary/5">
        <MessageCircle className="w-4 h-4" /> راسل المالك
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40 grid place-items-center p-4" onClick={() => setOpen(false)}>
          <div dir="rtl" className="bg-card rounded-2xl p-5 max-w-sm w-full border-2 border-border" onClick={(e) => e.stopPropagation()}>
            <div className="font-extrabold mb-2">راسل مالك المشروع</div>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} className={`${inp} resize-none`} />
            <button disabled={sending} onClick={send} className="btn-3d w-full mt-2 active:btn-3d-active disabled:opacity-60">
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : "إرسال"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Center() {
  return <div className="grid place-items-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
}
