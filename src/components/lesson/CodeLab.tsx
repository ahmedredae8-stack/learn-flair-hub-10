import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen, Check, Eye, Lightbulb, Play, RotateCcw, Code2, Loader2, X, ExternalLink,
  ChevronLeft, KeyRound, PenLine,
} from "lucide-react";

/**
 * One self-contained coding block with four faces, always in a single card:
 *   1) الدليل + معاينة الناتج المطلوب جنب بعض
 *   2) محرّر فيه التعليمات والمعاينة الحيّة وقت الكتابة
 *   3) زر تشغيل
 *   4) الناتج: صح → يكمل، غلط → تعليمات ومراجع، ويقدر يشوف الإجابة
 *      ثم يقفلها ويكتبها بنفسه (نسخ الحل ممنوع عن قصد).
 */

export type CodeCheck = { type?: "includes" | "regex" | "not_includes"; value: string; hint?: string };

export type CodeLabSpec = {
  title?: string;
  language?: "html" | "css" | "js";
  brief?: string;
  steps?: string[];
  expected_html?: string;
  expected_image?: string;
  starter?: string;
  solution?: string;
  checks?: CodeCheck[];
  hints?: string[];
  refs?: { label: string; url?: string; note?: string }[];
  success?: string;
};

export function isCodeLab(v: unknown): CodeLabSpec | null {
  if (!v || typeof v !== "object") return null;
  const spec = (v as Record<string, unknown>)["code"];
  if (!spec || typeof spec !== "object") return null;
  return spec as CodeLabSpec;
}

function wrap(code: string, language: CodeLabSpec["language"]) {
  const body =
    language === "css" ? `<style>${code}</style><div class="demo">معاينة</div>`
    : language === "js" ? `<div id="app"></div><script>try{${code}}catch(e){document.body.innerHTML='<pre style="color:#c00">'+e.message+'</pre>'}<\/script>`
    : code;
  return `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<style>body{font-family:system-ui,'Segoe UI',sans-serif;margin:0;padding:14px;background:#fff;color:#111}
*{box-sizing:border-box}</style></head><body>${body}</body></html>`;
}

function runChecks(code: string, checks: CodeCheck[]) {
  const failed: CodeCheck[] = [];
  const normalized = code.replace(/\s+/g, " ").toLowerCase();
  for (const c of checks) {
    const val = c.value ?? "";
    let ok = true;
    if (c.type === "regex") {
      try { ok = new RegExp(val, "i").test(code); } catch { ok = true; }
    } else if (c.type === "not_includes") {
      ok = !normalized.includes(val.replace(/\s+/g, " ").toLowerCase());
    } else {
      ok = normalized.includes(val.replace(/\s+/g, " ").toLowerCase());
    }
    if (!ok) failed.push(c);
  }
  return failed;
}

type Phase = "guide" | "edit" | "result";

export function CodeLab({ spec, onPass }: { spec: CodeLabSpec; onPass?: () => void }) {
  const [phase, setPhase] = useState<Phase>("guide");
  const [code, setCode] = useState(spec.starter ?? "");
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState<CodeCheck[] | null>(null);
  const [answerOpen, setAnswerOpen] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [preview, setPreview] = useState("");
  const [live, setLive] = useState("");
  const passedRef = useRef(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setCode(spec.starter ?? ""); }, [spec.starter]);

  const lang = spec.language ?? "html";
  const checks = useMemo(() => spec.checks ?? [], [spec.checks]);
  const passed = failed !== null && failed.length === 0;

  // Live preview while typing (debounced) so the learner sees the effect immediately.
  useEffect(() => {
    if (phase !== "edit") return;
    const t = window.setTimeout(() => setLive(wrap(code, lang)), 400);
    return () => window.clearTimeout(t);
  }, [code, lang, phase]);

  function run() {
    setRunning(true);
    setAnswerOpen(false);
    window.setTimeout(() => {
      const bad = runChecks(code, checks);
      setFailed(bad);
      setPreview(wrap(code, lang));
      setAttempts((a) => a + 1);
      setRunning(false);
      setPhase("result");
      if (bad.length === 0 && !passedRef.current) { passedRef.current = true; onPass?.(); }
    }, 300);
  }

  function backToWrite() {
    setAnswerOpen(false);
    setPhase("edit");
    window.setTimeout(() => areaRef.current?.focus(), 60);
  }

  const Instructions = (
    <div className="rounded-2xl border-2 border-border bg-secondary/40 p-3">
      <div className="flex items-center gap-1.5 text-primary text-[12px] font-extrabold mb-2">
        <BookOpen className="w-4 h-4" /> التعليمات
      </div>
      {spec.brief && <p className="text-[13px] font-bold leading-7">{spec.brief}</p>}
      {(spec.steps ?? []).length > 0 && (
        <ol className="mt-2 space-y-1.5">
          {spec.steps!.map((s, i) => (
            <li key={i} className="flex gap-2 text-[12px] font-bold leading-6">
              <span className="w-4 h-4 mt-0.5 shrink-0 grid place-items-center rounded-full bg-primary/15 text-primary text-[10px]">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      )}
      {(spec.hints ?? []).length > 0 && (
        <div className="mt-2 rounded-xl bg-background border-2 border-border p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-streak mb-1">
            <Lightbulb className="w-3.5 h-3.5" /> تلميحات
          </div>
          <ul className="space-y-1">{spec.hints!.map((h, i) => <li key={i} className="text-[12px] font-bold">— {h}</li>)}</ul>
        </div>
      )}
    </div>
  );

  const Expected = (
    <div className="rounded-2xl border-2 border-border overflow-hidden bg-background">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border text-[12px] font-extrabold text-muted-foreground">
        <Eye className="w-4 h-4 text-primary" /> الناتج المطلوب
      </div>
      {spec.expected_image ? (
        <img src={spec.expected_image} alt="الناتج المطلوب" loading="lazy" className="w-full" />
      ) : (
        <iframe title="الناتج المطلوب" sandbox="" srcDoc={wrap(spec.expected_html ?? "<p>—</p>", lang)} className="w-full h-40 bg-white" />
      )}
    </div>
  );

  return (
    <div dir="rtl" className="rounded-3xl border-2 border-border bg-card overflow-hidden shadow-md">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background">
        <Code2 className="w-4 h-4" />
        <span className="text-[13px] font-extrabold flex-1 truncate">{spec.title ?? "معمل الأكواد"}</span>
        <span className="text-[10px] font-extrabold rounded-full bg-background/20 px-2 py-0.5 uppercase">{lang}</span>
      </div>

      {/* 1) guide + expected preview, side by side */}
      {phase === "guide" && (
        <div className="p-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">{Instructions}{Expected}</div>
          <button onClick={backToWrite} className="btn-3d w-full active:btn-3d-active">
            <ChevronLeft className="w-4 h-4" /> فهمت — ابدأ الكتابة
          </button>
        </div>
      )}

      {/* 2) + 3) editor with instructions + live preview + run */}
      {phase === "edit" && (
        <div className="p-3 space-y-3">
          <div className="grid gap-3 lg:grid-cols-[1.15fr_1fr]">
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden border-2 border-border">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary text-[11px] font-extrabold text-muted-foreground">
                  <PenLine className="w-3.5 h-3.5 text-primary" />
                  <span className="flex-1">اكتب أو أكمل الكود</span>
                  <button onClick={() => setCode(spec.starter ?? "")} className="flex items-center gap-1 text-primary">
                    <RotateCcw className="w-3.5 h-3.5" /> إعادة
                  </button>
                </div>
                <textarea
                  ref={areaRef}
                  dir="ltr"
                  spellCheck={false}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  rows={12}
                  className="w-full bg-[#0f1115] text-[#e6edf3] font-mono text-[12.5px] leading-6 p-3 outline-none resize-y"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setPhase("guide")} className="rounded-2xl border-2 border-border px-4 text-[12px] font-extrabold text-muted-foreground">
                  الناتج المطلوب
                </button>
                <button onClick={run} disabled={running || !code.trim()} className="btn-3d flex-1 active:btn-3d-active disabled:opacity-50">
                  {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4" /> تشغيل</>}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {Instructions}
              <div className="rounded-2xl border-2 border-border overflow-hidden bg-background">
                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border text-[12px] font-extrabold text-muted-foreground">
                  <Eye className="w-4 h-4 text-primary" /> معاينة حيّة أثناء الكتابة
                </div>
                <iframe title="معاينة حيّة" sandbox="allow-scripts" srcDoc={live} className="w-full h-40 bg-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4) result */}
      {phase === "result" && (
        <div className="p-3 space-y-3">
          <div className="rounded-2xl border-2 border-border overflow-hidden bg-background">
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border text-[12px] font-extrabold text-muted-foreground">
              <Eye className="w-4 h-4 text-primary" /> ناتج الكود بتاعك
            </div>
            <iframe title="ناتج الكود" sandbox="allow-scripts" srcDoc={preview} className="w-full h-44 bg-white" />
          </div>

          {passed ? (
            <div className="rounded-2xl bg-primary/10 border-2 border-primary/30 p-3">
              <div className="flex items-center gap-2 text-primary font-extrabold text-[13px]">
                <Check className="w-4 h-4" /> {spec.success ?? "ناتج صحيح! 🎉 تقدر تكمل الدرس"}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-heart/10 border-2 border-heart/30 p-3 space-y-2">
              <div className="flex items-center gap-2 text-heart font-extrabold text-[13px]">
                <X className="w-4 h-4" /> الناتج مش مطابق — راجع الملاحظات
              </div>
              <ul className="space-y-1">
                {(failed ?? []).map((f, i) => (
                  <li key={i} className="text-[12px] font-bold flex gap-2"><span className="text-heart">•</span>{f.hint ?? `الكود ناقص: ${f.value}`}</li>
                ))}
              </ul>
              {(spec.hints ?? []).length > 0 && (
                <div className="rounded-xl bg-background border-2 border-border p-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-streak mb-1">
                    <Lightbulb className="w-3.5 h-3.5" /> تلميحات
                  </div>
                  <ul className="space-y-1">{spec.hints!.map((h, i) => <li key={i} className="text-[12px] font-bold">— {h}</li>)}</ul>
                </div>
              )}
              {(spec.refs ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {spec.refs!.map((r, i) =>
                    r.url ? (
                      <a key={i} href={r.url} target="_blank" rel="noreferrer" className="text-[11px] font-extrabold rounded-full bg-background border-2 border-border px-2.5 py-1 flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> {r.label}
                      </a>
                    ) : (
                      <span key={i} className="text-[11px] font-extrabold rounded-full bg-background border-2 border-border px-2.5 py-1">{r.label}{r.note ? ` — ${r.note}` : ""}</span>
                    ),
                  )}
                </div>
              )}

              {/* Show the answer, then close it and write it yourself. */}
              {spec.solution && (
                <div className="rounded-xl bg-background border-2 border-border p-2.5">
                  <button onClick={() => setAnswerOpen((v) => !v)} className="flex items-center gap-1.5 text-[12px] font-extrabold text-primary">
                    <KeyRound className="w-3.5 h-3.5" /> {answerOpen ? "إخفاء الإجابة" : "أرني الإجابة"}
                  </button>
                  {answerOpen && (
                    <div className="mt-2 space-y-2">
                      <div className="text-[11px] font-extrabold text-muted-foreground">اقرأها كويس، بعدين اقفلها واكتبها بنفسك — الفهم يجي من الكتابة.</div>
                      <pre
                        dir="ltr"
                        onCopy={(e) => e.preventDefault()}
                        className="select-none rounded-xl bg-[#0f1115] text-[#e6edf3] font-mono text-[12px] leading-6 p-3 overflow-x-auto whitespace-pre-wrap"
                      >
                        {spec.solution}
                      </pre>
                      <button onClick={backToWrite} className="btn-3d w-full active:btn-3d-active">
                        <PenLine className="w-4 h-4" /> أقفلها وأكتبها بنفسي
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="text-[11px] font-bold text-muted-foreground">عدد المحاولات: {attempts}</div>
            </div>
          )}

          <button onClick={backToWrite} className="w-full rounded-2xl border-2 border-border py-2 text-[12px] font-extrabold text-muted-foreground">
            العودة للمحرر
          </button>
        </div>
      )}
    </div>
  );
}
