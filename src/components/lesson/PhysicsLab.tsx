import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw, FlaskConical, Check } from "lucide-react";

/**
 * Interactive physics experiment rendered inside a lesson.
 *
 * The AI (or the admin) describes the experiment as data — variables the learner
 * can drag, formulas written in plain math, and an optional animated scene whose
 * position is an expression of the variables and time. Everything is evaluated
 * client-side, so any law the admin writes becomes a playable simulation.
 */

export type SimVar = {
  key: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  unit?: string;
};

export type SimOutput = { label: string; expr: string; unit?: string; decimals?: number };

export type SimSpec = {
  title?: string;
  description?: string;
  vars: SimVar[];
  outputs?: SimOutput[];
  /** Animated scene: expressions of the variables and `t` (seconds), in 0..100 scene units. */
  scene?: {
    kind?: "ball" | "box" | "arrow";
    x?: string;
    y?: string;
    size?: string;
    trail?: boolean;
    /** Loop length in seconds. */
    duration?: number;
    ground?: boolean;
    color?: string;
  };
  /** Short takeaway the learner must confirm before moving on. */
  task?: string;
};

export function isPhysicsLab(v: unknown): SimSpec | null {
  if (!v || typeof v !== "object") return null;
  const spec = (v as Record<string, unknown>)["sim"] ?? (v as Record<string, unknown>)["simulation"];
  if (!spec || typeof spec !== "object") return null;
  const s = spec as SimSpec;
  if (!Array.isArray(s.vars) || s.vars.length === 0) return null;
  return s;
}

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

function compile(expr: string): (scope: Record<string, number>) => number {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("s", "Math", `with (s) { return (${expr}); }`) as (
      s: Record<string, number>,
      m: Math,
    ) => number;
    return (scope) => {
      try {
        const out = fn(scope, Math);
        return Number.isFinite(out) ? out : 0;
      } catch {
        return 0;
      }
    };
  } catch {
    return () => 0;
  }
}

export function PhysicsLab({ spec, done, onDone }: { spec: SimSpec; done?: boolean; onDone?: () => void }) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(spec.vars.map((v) => [v.key, v.value ?? v.min])),
  );
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef<number>(0);

  const duration = spec.scene?.duration ?? 3;

  useEffect(() => {
    if (!spec.scene || !playing) return;
    start.current = performance.now() - t * 1000;
    const tick = (now: number) => {
      const elapsed = ((now - start.current) / 1000) % duration;
      setT(elapsed);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, duration, spec.scene]);

  const outputs = useMemo(
    () => (spec.outputs ?? []).map((o) => ({ ...o, fn: compile(o.expr) })),
    [spec.outputs],
  );
  const sceneFns = useMemo(
    () => ({
      x: compile(spec.scene?.x ?? "50"),
      y: compile(spec.scene?.y ?? "50"),
      size: compile(spec.scene?.size ?? "10"),
    }),
    [spec.scene],
  );

  const scope = { ...values, t };
  const px = clamp(sceneFns.x(scope), 0, 100);
  const py = clamp(sceneFns.y(scope), 0, 100);
  const size = clamp(sceneFns.size(scope), 2, 40);

  function reset() {
    setValues(Object.fromEntries(spec.vars.map((v) => [v.key, v.value ?? v.min])));
    setT(0);
    start.current = performance.now();
  }

  return (
    <div dir="rtl" className="rounded-3xl border-2 border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border-b-2 border-border">
        <FlaskConical className="w-4 h-4 text-primary" />
        <div className="flex-1 text-xs font-extrabold text-primary truncate">{spec.title ?? "تجربة تفاعلية"}</div>
        {spec.scene && (
          <>
            <button onClick={() => setPlaying((p) => !p)} className="p-1.5 rounded-lg hover:bg-background/60 text-primary" aria-label="تشغيل">
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button onClick={reset} className="p-1.5 rounded-lg hover:bg-background/60 text-muted-foreground" aria-label="إعادة">
              <RotateCcw className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {spec.description && (
        <p className="px-4 pt-3 text-[13px] font-bold leading-7 text-muted-foreground">{spec.description}</p>
      )}

      {spec.scene && (
        <div className="m-4 rounded-2xl bg-secondary/60 relative overflow-hidden" style={{ height: 180 }}>
          {spec.scene.ground !== false && <div className="absolute inset-x-0 bottom-0 h-1.5 bg-primary/30" />}
          <div
            className="absolute -translate-x-1/2 translate-y-1/2"
            style={{
              left: `${px}%`,
              bottom: `${py}%`,
              width: size * 1.6,
              height: size * 1.6,
              background: spec.scene.color ?? "hsl(var(--primary))",
              borderRadius: spec.scene.kind === "box" ? 6 : 999,
              transition: "background 200ms",
            }}
          />
        </div>
      )}

      <div className="px-4 pb-3 space-y-3">
        {spec.vars.map((v) => (
          <label key={v.key} className="block">
            <div className="flex items-center justify-between text-[11px] font-extrabold mb-1">
              <span>{v.label}</span>
              <span className="text-primary">
                {(values[v.key] ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} {v.unit ?? ""}
              </span>
            </div>
            <input
              type="range"
              min={v.min}
              max={v.max}
              step={v.step ?? (v.max - v.min) / 100}
              value={values[v.key] ?? v.min}
              onChange={(e) => setValues((s) => ({ ...s, [v.key]: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
          </label>
        ))}
      </div>

      {outputs.length > 0 && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-2">
          {outputs.map((o, i) => (
            <div key={i} className="rounded-2xl border-2 border-border bg-background px-3 py-2">
              <div className="text-[10px] font-extrabold text-muted-foreground truncate">{o.label}</div>
              <div className="text-sm font-extrabold text-primary">
                {o.fn(scope).toFixed(o.decimals ?? 2)} <span className="text-[10px]">{o.unit ?? ""}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {spec.task && (
        <div className="px-4 pb-4">
          <div className="rounded-2xl bg-secondary/60 p-3 text-[12px] font-bold leading-6">{spec.task}</div>
          <button
            onClick={onDone}
            disabled={done}
            className="btn-3d w-full mt-2 active:btn-3d-active disabled:opacity-60"
          >
            {done ? <><Check className="w-4 h-4" /> تم</> : "جرّبتها — تابع"}
          </button>
        </div>
      )}
    </div>
  );
}
