import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { AppTopBar } from "@/components/AppTopBar";
import { AvatarBubble } from "@/components/AvatarBubble";
import { useProfile } from "@/lib/useProfile";
import { Lightbulb, Coins, CheckCircle2, Users, Send, Loader2, Plus, MessageCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { ForumFeed } from "@/components/ForumFeed";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({
    meta: [
      { title: "المشاريع — nilex" },
      { name: "description", content: "قدّم فكرتك، شارك في تمويل مشاريع، وتواصل مع رواد nilex." },
      { property: "og:title", content: "المشاريع — nilex" },
      { property: "og:description", content: "من الفكرة إلى التمويل داخل مجتمع nilex." },
    ],
  }),
  component: ProjectsPage,
});

type Tab = "submit" | "funding" | "funded" | "forum";

const PLATFORM_SHARE = 20;

function ProjectsPage() {
  const [tab, setTab] = useState<Tab>("submit");
  return (
    <div dir="rtl" className="min-h-screen bg-background pb-24 font-display">
      <AppTopBar />
      <main className="mx-auto max-w-2xl px-4 pt-4">
        <h1 className="text-2xl font-extrabold mb-4">المشاريع</h1>

        <div className="grid grid-cols-4 gap-1 bg-secondary p-1 rounded-2xl mb-5 text-xs sm:text-sm">
          <TabButton active={tab === "submit"} onClick={() => setTab("submit")} icon={<Lightbulb className="w-4 h-4" />} label="قدّم فكرة" />
          <TabButton active={tab === "funding"} onClick={() => setTab("funding")} icon={<Coins className="w-4 h-4" />} label="تمويل" />
          <TabButton active={tab === "funded"} onClick={() => setTab("funded")} icon={<CheckCircle2 className="w-4 h-4" />} label="مموّلة" />
          <TabButton active={tab === "forum"} onClick={() => setTab("forum")} icon={<Users className="w-4 h-4" />} label="المنتدى" />
        </div>

        {tab === "submit" && <SubmitIdea />}
        {tab === "funding" && <FundingList />}
        {tab === "funded" && <FundedList />}
        {tab === "forum" && <ForumFeed />}
      </main>
      <BottomNav />
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 py-2 rounded-xl font-extrabold transition ${active ? "bg-card text-primary shadow" : "text-muted-foreground"}`}>
      {icon}
      {label}
    </button>
  );
}

/* ---------- Submit Idea ---------- */
function SubmitIdea() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const my = useQuery({
    queryKey: ["my-projects"],
    queryFn: async () => {
      if (!profile) return [];
      const { data, error } = await supabase.from("projects").select("id,title,description,stage,target_amount,raised_amount,created_at").eq("owner_id", profile.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || saving) return;
    if (title.trim().length < 4) return toast.error("عنوان الفكرة قصير");
    setSaving(true);
    try {
      const { error } = await supabase.from("projects").insert({
        owner_id: profile.id,
        title: title.trim().slice(0, 120),
        description: description.trim().slice(0, 3000),
        target_amount: Number(target) || 0,
        stage: "idea",
        platform_share: PLATFORM_SHARE,
        owner_share: 100 - PLATFORM_SHARE,
      });
      if (error) throw error;
      toast.success("تم إرسال فكرتك للمراجعة ✨");
      setTitle(""); setDescription(""); setTarget("");
      qc.invalidateQueries({ queryKey: ["my-projects"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر الإرسال");
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="bg-card border-2 border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-primary font-extrabold">
          <Lightbulb className="w-5 h-5" />
          فكرتك القادمة
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الفكرة" maxLength={120} className="w-full px-4 py-3 rounded-xl border-2 border-input bg-background focus:border-primary outline-none font-bold" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="اشرح فكرتك بوضوح: المشكلة، الحل، الجمهور المستهدف…" rows={5} maxLength={3000} className="w-full px-4 py-3 rounded-xl border-2 border-input bg-background focus:border-primary outline-none font-bold resize-none" />
        <input value={target} onChange={(e) => setTarget(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="مبلغ التمويل المستهدف (ج.م)" inputMode="decimal" className="w-full px-4 py-3 rounded-xl border-2 border-input bg-background focus:border-primary outline-none font-bold" />
        <p className="text-[11px] text-muted-foreground font-bold leading-relaxed">
          نسبة المنصة الافتراضية <b>20%</b> — تحتفظ بـ <b>{100 - PLATFORM_SHARE}%</b> من مشروعك، مع خيار زيادة نسبتك بمقابل عند الموافقة.
        </p>
        <button disabled={saving} className="btn-3d w-full active:btn-3d-active disabled:opacity-60">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> إرسال للمراجعة</>}
        </button>
      </form>

      <div>
        <h2 className="font-extrabold text-sm mb-2 text-muted-foreground">أفكاري</h2>
        {my.isLoading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
        {my.data?.length === 0 && <p className="text-sm text-muted-foreground">لم ترسل أي فكرة بعد.</p>}
        <ul className="space-y-2">
          {my.data?.map((p) => (
            <li key={p.id} className="bg-card border-2 border-border rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="font-extrabold text-sm">{p.title}</div>
                <div className="text-[11px] text-muted-foreground font-bold">{stageLabel(p.stage)} • هدف {p.target_amount ?? 0} ج.م</div>
              </div>
              <StageBadge stage={p.stage} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------- Funding lists ---------- */
type ProjectStage = "idea" | "review" | "funding" | "funded" | "rejected";
function useProjectsByStage(stages: ProjectStage[]) {
  return useQuery({
    queryKey: ["projects", stages.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id,owner_id,title,description,stage,target_amount,raised_amount,public_slug,cover_url").in("stage", stages).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function FundingList() {
  const q = useProjectsByStage(["funding"]);
  return <ProjectList query={q} showInvest emptyLabel="لا توجد مشاريع مفتوحة للتمويل الآن." />;
}
function FundedList() {
  const q = useProjectsByStage(["funded"]);
  return <ProjectList query={q} emptyLabel="لم تكتمل مشاريع بعد." />;
}

function ProjectList({ query, showInvest, emptyLabel }: { query: ReturnType<typeof useProjectsByStage>; showInvest?: boolean; emptyLabel: string }) {
  if (query.isLoading) return <div className="grid place-items-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!query.data?.length) return <p className="text-center text-sm text-muted-foreground py-10">{emptyLabel}</p>;
  return (
    <ul className="space-y-3">
      {query.data.map((p) => {
        const pct = p.target_amount ? Math.min(100, Math.round(((p.raised_amount ?? 0) / p.target_amount) * 100)) : 0;
        return (
          <li key={p.id} className="bg-card border-2 border-border rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-extrabold">{p.title}</div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.description}</p>
              </div>
              <StageBadge stage={p.stage} />
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] font-extrabold text-muted-foreground">
                <span>{p.raised_amount ?? 0} / {p.target_amount ?? 0} ج.م</span>
                <span>{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden mt-1">
                <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {showInvest && <InvestButton projectId={p.id} />}
              {p.public_slug && (
                <a href={`/p/${p.public_slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-extrabold text-primary hover:underline">
                  <ExternalLink className="w-4 h-4" /> رابط عام
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function InvestButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("10");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  async function invest() {
    const val = Number(amount);
    if (!(val >= 10)) return toast.error("الحد الأدنى 10 ج.م");
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("سجّل دخولك أولاً");
      const { error } = await supabase.from("investments").insert({
        project_id: projectId, investor_id: auth.user.id, amount: val,
      });
      if (error) throw error;
      toast.success("تمت مساهمتك، شكراً 💜");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["projects", "funding"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل");
    } finally { setSaving(false); }
  }
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-3d py-2 px-4 text-sm active:btn-3d-active">
        شارك بالتمويل
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40 grid place-items-center p-4" onClick={() => setOpen(false)}>
          <div dir="rtl" className="bg-card rounded-2xl p-5 max-w-sm w-full border-2 border-border" onClick={(e) => e.stopPropagation()}>
            <div className="font-extrabold text-lg mb-1">شارك بالتمويل</div>
            <p className="text-xs text-muted-foreground mb-3">أقل مبلغ 10 ج.م. تُحسب نسبتك من إجمالي التمويل تلقائياً.</p>
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" className="w-full px-4 py-3 rounded-xl border-2 border-input bg-background focus:border-primary outline-none font-bold" />
            <button disabled={saving} onClick={invest} className="btn-3d w-full mt-3 active:btn-3d-active disabled:opacity-60">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "تأكيد المساهمة"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- Helpers ---------- */
function stageLabel(s: string) {
  return { idea: "قيد المراجعة", review: "قيد المراجعة", funding: "مفتوح للتمويل", funded: "مموّل", rejected: "مرفوض" }[s as string] ?? s;
}
function StageBadge({ stage }: { stage: string }) {
  const map: Record<string, string> = {
    idea: "bg-secondary text-muted-foreground",
    review: "bg-accent/10 text-accent",
    funding: "bg-primary/10 text-primary",
    funded: "bg-streak/10 text-streak",
    rejected: "bg-heart/10 text-heart",
  };
  return <span className={`text-[10px] font-extrabold px-2 py-1 rounded-full ${map[stage] ?? "bg-secondary"}`}>{stageLabel(stage)}</span>;
}
