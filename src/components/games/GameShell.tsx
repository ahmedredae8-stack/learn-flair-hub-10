import { type ReactNode, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, Volume2, VolumeX, X } from "lucide-react";

/**
 * Full-screen shell for the interactive physics games.
 * Dark futuristic glassmorphism, independent of the lesson chat layout.
 */
export function GameShell({
  title,
  subtitle,
  sound,
  onToggleSound,
  actions,
  children,
  backTo = "/lab",
}: {
  title: string;
  subtitle?: string;
  sound?: boolean;
  onToggleSound?: () => void;
  actions?: ReactNode;
  children: ReactNode;
  backTo?: string;
}) {
  return (
    <div dir="rtl" className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 text-slate-100">
      <div
        className="pointer-events-none fixed inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 45% at 15% 0%, rgba(56,189,248,0.18), transparent 70%), radial-gradient(55% 40% at 90% 10%, rgba(244,63,94,0.14), transparent 70%)",
        }}
      />
      <div className="relative">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-white/10 bg-slate-950/70 px-3 py-2.5 backdrop-blur-xl sm:px-5">
          <Link
            to={backTo}
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-extrabold text-slate-200 hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
            رجوع
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-extrabold sm:text-base">{title}</h1>
            {subtitle && <p className="truncate text-[11px] font-bold text-slate-400">{subtitle}</p>}
          </div>
          {actions}
          {onToggleSound && (
            <button
              onClick={onToggleSound}
              aria-label="الصوت"
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10"
            >
              {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          )}
        </header>
        <main className="px-3 pb-10 pt-3 sm:px-5">{children}</main>
      </div>
    </div>
  );
}

export function GlassPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-[0_0_40px_-20px_rgba(56,189,248,0.6)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

export function GameModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div dir="rtl" className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-900/95 p-4 sm:rounded-3xl">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="flex-1 text-sm font-extrabold">{title}</h2>
          <button onClick={onClose} className="rounded-xl border border-white/10 bg-white/5 p-1.5 hover:bg-white/10" aria-label="إغلاق">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 text-[13px] font-bold leading-7 text-slate-300">{children}</div>
      </div>
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.1,
  unit,
  color = "#38bdf8",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  color?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-[11px] font-extrabold">
        <span className="text-slate-300">{label}</span>
        <span style={{ color }}>
          {value.toLocaleString("en-US", { maximumFractionDigits: 1 })} {unit ?? ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: color }}
      />
    </label>
  );
}

export function StatCard({ label, value, unit, color = "#38bdf8" }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 backdrop-blur">
      <div className="truncate text-[10px] font-extrabold text-slate-400">{label}</div>
      <div className="text-base font-extrabold" style={{ color }}>
        {value} <span className="text-[10px] text-slate-400">{unit ?? ""}</span>
      </div>
    </div>
  );
}

/** Tiny WebAudio helper: no assets, works offline, respects the mute toggle. */
export function useGameSound(enabled: boolean) {
  const [ctx, setCtx] = useState<AudioContext | null>(null);
  useEffect(() => {
    return () => {
      ctx?.close().catch(() => {});
    };
  }, [ctx]);

  function ac() {
    if (typeof window === "undefined") return null;
    if (ctx) return ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    const next = new Ctor();
    setCtx(next);
    return next;
  }

  function tone(freq: number, dur = 0.16, type: OscillatorType = "sine", gain = 0.06) {
    if (!enabled) return;
    const a = ac();
    if (!a) return;
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    osc.connect(g).connect(a.destination);
    osc.start();
    osc.stop(a.currentTime + dur);
  }

  function splash() {
    if (!enabled) return;
    const a = ac();
    if (!a) return;
    const buffer = a.createBuffer(1, a.sampleRate * 0.25, a.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
    const src = a.createBufferSource();
    const g = a.createGain();
    g.gain.value = 0.12;
    src.buffer = buffer;
    src.connect(g).connect(a.destination);
    src.start();
  }

  function success() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, "triangle", 0.07), i * 90));
  }

  return { tone, splash, success };
}
