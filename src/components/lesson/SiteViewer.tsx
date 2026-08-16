import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Check, Globe, ListChecks, RefreshCw, ArrowDown, AlertTriangle, ExternalLink, MonitorSmartphone } from "lucide-react";

/**
 * A live website shown *inside* the lesson.
 *
 * Continuity is the point: if the learner signs in to a site in message #4 and
 * the site shows up again in message #9, they must find themselves exactly where
 * they left off. So a site (identified by `key`) is mounted **once** per lesson;
 * later messages that use the same key render a small task card that jumps back
 * to the same living frame instead of loading a second copy.
 *
 * Many real sites (Google, Facebook, banks…) refuse to render inside an iframe
 * via X-Frame-Options / CSP frame-ancestors — the browser blocks it and no
 * script can bypass that. So the viewer detects the failure and falls back to
 * "window mode": the site opens in a NAMED popup window (one per site key), which
 * keeps the real session and the exact page the learner left, and we detect the
 * learner coming back to enable the "done" button.
 */

export type SiteTab = { label: string; url: string };

export type SiteSpec = {
  /** Groups messages that must share the SAME live frame. Defaults to the first tab url. */
  key?: string;
  title?: string;
  tabs?: SiteTab[];
  url?: string;
  /** What the learner should do on the site right now. */
  task?: string;
  steps?: string[];
  done_label?: string;
  /** Block the lesson until the learner confirms. Default: true when a task exists. */
  require_done?: boolean;
  height?: number;
  /** Skip the embed attempt and go straight to window mode. */
  force_window?: boolean;
};

export function isSiteView(v: unknown): SiteSpec | null {
  if (!v || typeof v !== "object") return null;
  const spec = (v as Record<string, unknown>)["site"];
  if (!spec || typeof spec !== "object") return null;
  const s = spec as SiteSpec;
  if (!s.url && !(s.tabs ?? []).length) return null;
  return s;
}

export function siteTabs(spec: SiteSpec): SiteTab[] {
  if (spec.tabs?.length) return spec.tabs;
  return [{ label: spec.title ?? "الموقع", url: spec.url! }];
}

export function siteKey(spec: SiteSpec) {
  return spec.key ?? siteTabs(spec)[0].url;
}

/** Which step id owns the live frame for a given site key, per lesson. */
const owners = new Map<string, string>();
/** Named windows opened per site key, so revisits land on the SAME window/session. */
const windows = new Map<string, Window | null>();

export function resetSiteOwners(lessonId: string) {
  for (const k of [...owners.keys()]) if (k.startsWith(`${lessonId}::`)) owners.delete(k);
}
function claim(lessonId: string, key: string, stepId: string) {
  const k = `${lessonId}::${key}`;
  if (!owners.has(k)) owners.set(k, stepId);
  return owners.get(k) === stepId;
}

/** Opens (or re-focuses) the one window that belongs to this site key. */
function openSiteWindow(key: string, url: string) {
  const name = `nilex_site_${cssSafe(key)}`;
  const existing = windows.get(key);
  if (existing && !existing.closed) {
    try {
      // Re-focusing without touching location keeps the learner exactly where they were.
      existing.focus();
      return existing;
    } catch {
      /* cross-origin focus can throw in rare cases — fall through and reopen */
    }
  }
  const w = window.open(url, name, "noopener=no,width=1100,height=800");
  windows.set(key, w);
  return w;
}

export function SiteViewer({
  spec,
  lessonId,
  stepId,
  done,
  onDone,
}: {
  spec: SiteSpec;
  lessonId: string;
  stepId: string;
  done?: boolean;
  onDone?: () => void;
}) {
  const tabs = useMemo(() => siteTabs(spec), [spec]);
  const key = siteKey(spec);
  const owner = claim(lessonId, key, stepId);
  const frameId = `site-frame-${cssSafe(key)}`;
  const [tab, setTab] = useState(0);
  const [reloads, setReloads] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [windowMode, setWindowMode] = useState(!!spec.force_window);
  const [visited, setVisited] = useState(false);
  const [returned, setReturned] = useState(false);
  const loadedRef = useRef(false);
  const requireDone = spec.require_done ?? !!spec.task;
  const currentUrl = tabs[Math.min(tab, tabs.length - 1)].url;

  useEffect(() => {
    // The frame keeps its session; only the tab selection is per-message.
    setTab(0);
  }, [key]);

  // Detect an embed that never loads (X-Frame-Options / frame-ancestors).
  useEffect(() => {
    if (windowMode) return;
    loadedRef.current = false;
    setBlocked(false);
    const t = setTimeout(() => {
      if (!loadedRef.current) setBlocked(true);
    }, 4000);
    return () => clearTimeout(t);
  }, [currentUrl, reloads, windowMode]);

  // "Came back to the lesson" detection, so the done button feels earned.
  useEffect(() => {
    if (!visited) return;
    const onFocus = () => setReturned(true);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [visited]);

  const openWindow = useCallback(() => {
    openSiteWindow(key, currentUrl);
    setVisited(true);
  }, [key, currentUrl]);

  const taskCard = (
    <div className="rounded-2xl border-2 border-primary/25 bg-primary/5 p-3 space-y-2">
      {spec.task && (
        <div className="flex gap-2 text-[13px] font-extrabold leading-7">
          <ListChecks className="w-4 h-4 mt-1 shrink-0 text-primary" />
          <span>{spec.task}</span>
        </div>
      )}
      {(spec.steps ?? []).length > 0 && (
        <ol className="space-y-1 pr-1">
          {spec.steps!.map((s, i) => (
            <li key={i} className="flex gap-2 text-[12px] font-bold leading-6">
              <span className="w-4 h-4 mt-0.5 shrink-0 grid place-items-center rounded-full bg-primary/15 text-primary text-[10px]">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      )}
      {requireDone && (
        <button
          onClick={onDone}
          disabled={done}
          className={`w-full rounded-2xl py-2 text-[13px] font-extrabold border-2 transition ${
            done ? "border-primary bg-primary/15 text-primary" : "border-primary bg-primary text-primary-foreground"
          }`}
        >
          {done ? <span className="inline-flex items-center gap-1"><Check className="w-4 h-4" /> تم</span> : (spec.done_label ?? "تم ✅")}
        </button>
      )}
      {visited && !done && (
        <div className="text-[11px] font-extrabold text-muted-foreground text-center">
          {returned ? "أهلاً بعودتك 👋 لو خلّصت المهمة اضغط «تم»." : "أنجز المهمة في النافذة ثم ارجع هنا."}
        </div>
      )}
    </div>
  );

  // A later message reusing the same site: never remount the frame / never reopen the window.
  if (!owner) {
    return (
      <div dir="rtl" className="rounded-3xl border-2 border-border bg-card p-3 space-y-2.5 shadow-sm">
        <div className="flex items-center gap-2 text-[13px] font-extrabold">
          <Globe className="w-4 h-4 text-primary" />
          <span className="flex-1 truncate">{spec.title ?? tabs[0].label}</span>
          <span className="text-[10px] font-extrabold rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">نفس الجلسة</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => document.getElementById(frameId)?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="rounded-2xl border-2 border-border bg-secondary/60 py-2 text-[12px] font-extrabold text-primary flex items-center justify-center gap-1"
          >
            <ArrowDown className="w-4 h-4" /> العارض بالأعلى
          </button>
          <button
            onClick={openWindow}
            className="rounded-2xl border-2 border-primary bg-primary/10 py-2 text-[12px] font-extrabold text-primary flex items-center justify-center gap-1"
          >
            <ExternalLink className="w-4 h-4" /> ارجع لنفس النافذة
          </button>
        </div>
        {taskCard}
      </div>
    );
  }

  return (
    <div dir="rtl" className="rounded-3xl border-2 border-border bg-card overflow-hidden shadow-md">
      <div className="flex items-center gap-2 px-3 py-2 bg-foreground text-background">
        <Globe className="w-4 h-4" />
        <span className="text-[13px] font-extrabold flex-1 truncate">{spec.title ?? "عارض المواقع"}</span>
        {!windowMode && (
          <button onClick={() => setReloads((r) => r + 1)} aria-label="تحديث" className="p-1 rounded-lg hover:bg-background/20">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={openWindow} aria-label="فتح في نافذة" className="p-1 rounded-lg hover:bg-background/20">
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {tabs.length > 1 && (
        <div className="flex gap-1 overflow-x-auto px-2 py-2 border-b border-border bg-secondary/40">
          {tabs.map((t, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-extrabold border-2 transition ${
                i === tab ? "border-primary bg-primary/10 text-primary" : "border-transparent bg-background text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {windowMode ? (
        <div id={frameId} className="p-4 space-y-3 bg-secondary/30">
          <div className="flex items-start gap-2 text-[12px] font-extrabold leading-6">
            <MonitorSmartphone className="w-5 h-5 shrink-0 text-primary" />
            <span>هذا الموقع لا يسمح بالعرض داخل الصفحة. سنفتحه في نافذة خاصة به — جلستك وتسجيل دخولك يبقيان محفوظين، وأي رجوع لاحق يفتح نفس النافذة في نفس المكان.</span>
          </div>
          <button onClick={openWindow} className="w-full rounded-2xl border-2 border-primary bg-primary text-primary-foreground py-2.5 text-[13px] font-extrabold flex items-center justify-center gap-1">
            <ExternalLink className="w-4 h-4" /> {visited ? "ارجع للنافذة (نفس المكان)" : "افتح الموقع الآن"}
          </button>
          {!spec.force_window && (
            <button onClick={() => { setWindowMode(false); setReloads((r) => r + 1); }} className="w-full text-[11px] font-extrabold text-muted-foreground underline">
              جرّب العرض داخل الصفحة مرة أخرى
            </button>
          )}
        </div>
      ) : (
        <div className="bg-background relative">
          {/* Every tab keeps its own frame alive; hidden tabs are not unmounted, so
              logins and half-finished work survive switching back and forth. */}
          {tabs.map((t, i) => (
            <iframe
              key={`${i}-${reloads}`}
              id={i === 0 ? frameId : undefined}
              title={t.label}
              src={t.url}
              loading="lazy"
              onLoad={() => { if (i === tab) loadedRef.current = true; }}
              referrerPolicy="no-referrer-when-downgrade"
              sandbox="allow-forms allow-modals allow-popups allow-same-origin allow-scripts allow-downloads"
              className={`w-full bg-white ${i === tab ? "block" : "hidden"}`}
              style={{ height: spec.height ?? 420 }}
            />
          ))}
          {blocked && (
            <div className="absolute inset-0 grid place-items-center bg-background/95 p-4">
              <div className="text-center space-y-2 max-w-sm">
                <AlertTriangle className="w-6 h-6 mx-auto text-primary" />
                <div className="text-[12px] font-extrabold leading-6">
                  يبدو أن الموقع يرفض الظهور داخل الصفحة (حماية من المواقع نفسها).
                </div>
                <button onClick={() => { setWindowMode(true); openWindow(); }} className="w-full rounded-2xl border-2 border-primary bg-primary text-primary-foreground py-2 text-[13px] font-extrabold flex items-center justify-center gap-1">
                  <ExternalLink className="w-4 h-4" /> افتحه في نافذة محفوظة الجلسة
                </button>
                <button onClick={() => setBlocked(false)} className="text-[11px] font-extrabold text-muted-foreground underline">
                  لا، الموقع ظاهر — أكمل هنا
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-2.5 space-y-2">
        {!windowMode && (
          <button onClick={() => { setWindowMode(true); openWindow(); }} className="w-full text-[11px] font-extrabold text-muted-foreground underline">
            الموقع لا يظهر؟ افتحه في نافذة محفوظة الجلسة
          </button>
        )}
        {(spec.task || (spec.steps ?? []).length > 0 || requireDone) && taskCard}
      </div>
    </div>
  );
}

function cssSafe(v: string) {
  return v.replace(/[^a-zA-Z0-9_-]/g, "").slice(-32) || "site";
}
