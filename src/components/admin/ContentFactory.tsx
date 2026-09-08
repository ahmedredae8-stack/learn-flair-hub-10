import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Factory, Loader2, Play, Pause, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAiJobStats, runAiJobs, enqueueCourse, publishCourse } from "@/lib/ai-jobs.functions";

const inp = "w-full px-3 py-2 rounded-xl border-2 border-input bg-background font-bold text-sm";

/**
 * Content factory: queues AI lesson writing and keeps a worker running in the
 * background. Jobs live in the database, so generation continues on the server
 * even after the browser is closed.
 */
export function ContentFactory() {
  const qc = useQueryClient();
  const stats = useServerFn(getAiJobStats);
  const tick = useServerFn(runAiJobs);
  const queueCourse = useServerFn(enqueueCourse);
  const publishAll = useServerFn(publishCourse);

  const [auto, setAuto] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [courseId, setCourseId] = useState("");
  const [msgCount, setMsgCount] = useState(18);
  const [onlyEmpty, setOnlyEmpty] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [article, setArticle] = useState("");
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  const statsQ = useQuery({
    queryKey: ["ai-job-stats"],
    queryFn: () => stats({ data: undefined }),
    refetchInterval: 5000,
  });

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

  // Local pump: while enabled, keeps asking the server to process the queue.
  useEffect(() => {
    if (!auto) return;
    let stop = false;
    const loop = async () => {
      while (!stop) {
        if (!running.current) {
          running.current = true;
          try {
            const r = await tick({ data: { limit: 1 } });
            if (r.log.length) setLog((l) => [...r.log, ...l].slice(0, 30));
            qc.invalidateQueries({ queryKey: ["ai-job-stats"] });
            if (r.done === 0 && r.failed === 0) {
              setAuto(false);
              toast.success("انتهت كل المهام");
              break;
            }
          } catch (e) {
            setLog((l) => [`✗ ${e instanceof Error ? e.message : "خطأ"}`, ...l]);
            setAuto(false);
            break;
          } finally {
            running.current = false;
          }
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    };
    void loop();
    return () => {
      stop = true;
    };
  }, [auto, tick, qc]);

  async function onQueue() {
    if (!courseId) return toast.error("اختر الكورس");
    setBusy(true);
    try {
      const r = await queueCourse({
        data: { courseId, msgCount, onlyEmpty, characterIds: picked, article },
      });
      toast.success(`تمت جدولة ${r.queued} درس`);
      qc.invalidateQueries({ queryKey: ["ai-job-stats"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشلت الجدولة");
    } finally {
      setBusy(false);
    }
  }

  async function onPublish() {
    if (!courseId) return toast.error("اختر الكورس");
    setBusy(true);
    try {
      const r = await publishAll({ data: { courseId } });
      toast.success(`تم نشر ${r.published} درس`);
      qc.invalidateQueries({ queryKey: ["admin-lessons"] });
      qc.invalidateQueries({ queryKey: ["lessons-path"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل النشر");
    } finally {
      setBusy(false);
    }
  }

  const s = statsQ.data;

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="text-sm font-extrabold text-primary flex items-center gap-1">
        <Factory className="w-4 h-4" /> مصنع المحتوى (توليد في الخلفية)
      </div>
      <p className="text-[10px] font-bold text-muted-foreground leading-5">
        اجدول الدروس هنا ثم اضغط «شغّل». التوليد يتم على الخادم درساً بعد درس، ويكمل من حيث توقّف حتى لو أغلقت الصفحة.
      </p>

      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          ["قيد الانتظار", s?.pending ?? 0],
          ["جارٍ", s?.running ?? 0],
          ["تم", s?.done ?? 0],
          ["فشل", s?.error ?? 0],
        ].map(([label, v]) => (
          <div key={label as string} className="rounded-xl bg-background border-2 border-input p-2">
            <div className="text-lg font-black">{v as number}</div>
            <div className="text-[9px] font-bold text-muted-foreground">{label as string}</div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setAuto((a) => !a)}
        className={`w-full py-3 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 ${auto ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}
      >
        {auto ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        {auto ? "إيقاف التوليد" : "شغّل التوليد الآن"}
      </button>

      <div className="h-px bg-border" />

      <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inp}>
        <option value="">اختر الكورس</option>
        {(coursesQ.data ?? []).map((c) => (
          <option key={c.id} value={c.id}>
            {c.emoji} {c.title}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          value={msgCount}
          onChange={(e) => setMsgCount(Number(e.target.value) || 18)}
          placeholder="عدد الرسائل"
          className={inp}
        />
        <label className="flex items-center gap-2 text-xs font-bold px-3 rounded-xl border-2 border-input bg-background">
          <input type="checkbox" checked={onlyEmpty} onChange={(e) => setOnlyEmpty(e.target.checked)} />
          الدروس الناقصة فقط
        </label>
      </div>

      <div className="rounded-2xl border-2 border-input bg-background p-2">
        <div className="text-[10px] font-extrabold text-muted-foreground mb-1">شخصيات الكورس</div>
        <div className="flex flex-wrap gap-1">
          {(charsQ.data ?? []).map((c) => {
            const on = picked.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => setPicked((p) => (on ? p.filter((x) => x !== c.id) : [...p, c.id]))}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold border-2 ${on ? "bg-primary text-primary-foreground border-primary" : "border-input"}`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      <textarea
        rows={4}
        value={article}
        onChange={(e) => setArticle(e.target.value)}
        placeholder="مقال/مرجع اختياري يلتزم به الذكاء الاصطناعي في كل دروس هذا الكورس"
        className={`${inp} resize-none`}
      />

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onQueue}
          disabled={busy}
          className="py-3 rounded-xl bg-secondary text-secondary-foreground font-extrabold text-xs flex items-center justify-center gap-1"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Factory className="w-4 h-4" />} جدولة الكورس
        </button>
        <button
          onClick={onPublish}
          disabled={busy}
          className="py-3 rounded-xl bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-1"
        >
          <Rocket className="w-4 h-4" /> نشر كل الدروس
        </button>
      </div>

      {log.length > 0 && (
        <div className="rounded-xl bg-background border-2 border-input p-2 max-h-40 overflow-auto space-y-1">
          {log.map((l, i) => (
            <div key={i} className="text-[10px] font-bold text-muted-foreground">
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
