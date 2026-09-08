import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Flag, Pause, Play, RotateCcw, Ship, Timer, Trophy, Users, Waves } from "lucide-react";
import boatSprite from "@/assets/games/boat.png";
import swimmerSprite from "@/assets/games/swimmer.png";
import buoySprite from "@/assets/games/buoy.png";
import { GameModal, GameShell, GlassPanel, Slider, StatCard, useGameSound } from "./GameShell";

/**
 * "عبور النهر" — a 2D relative-velocity playground.
 * Everything is computed from the vector sum of the swimmer/boat velocity and
 * the river current, so the numbers on screen always match the drawn arrows.
 */

const DEG = Math.PI / 180;
const HALF_SPAN = 90; // metres shown left/right of the launch dock

type Runner = { x: number; y: number; theta: number; done: boolean; t: number; color: string; label: string };
type Particle = { x: number; y: number; life: number; r: number };

export function RiverCrossing() {
  const [vs, setVs] = useState(5);
  const [vr, setVr] = useState(3);
  const [theta, setTheta] = useState(90);
  const [W, setW] = useState(80);
  const [targetX, setTargetX] = useState(20);
  const [rate, setRate] = useState(1);
  const [vehicle, setVehicle] = useState<"boat" | "swimmer">("boat");
  const [race, setRace] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState(true);
  const [guide, setGuide] = useState(false);
  const [result, setResult] = useState<{ score: number; drift: number; time: number; winner?: string } | null>(null);

  const sfx = useGameSound(sound);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runners = useRef<Runner[]>([]);
  const particles = useRef<Particle[]>([]);
  const raf = useRef<number | null>(null);
  const last = useRef(0);
  const sprites = useRef<{ boat?: HTMLImageElement; swimmer?: HTMLImageElement; buoy?: HTMLImageElement }>({});
  const scale = useRef({ px: 1, ox: 0, oy: 0, h: 0 });

  // ---------- live physics ----------
  const m = useMemo(() => {
    const vsx = vs * Math.cos(theta * DEG);
    const vsy = vs * Math.sin(theta * DEG);
    const vnx = vsx + vr;
    const vny = vsy;
    const vnet = Math.hypot(vnx, vny);
    const t = vsy > 0.0001 ? W / vsy : Infinity;
    const drift = Number.isFinite(t) ? vnx * t : Infinity;
    const angle = (Math.atan2(vny, vnx) / DEG + 360) % 360;
    return { vsx, vsy, vnx, vny, vnet, t, drift, angle };
  }, [vs, vr, theta, W]);

  const straightAngle = vr <= vs ? Math.acos(-vr / vs) / DEG : null;

  useEffect(() => {
    const load = (src: string) =>
      new Promise<HTMLImageElement>((res) => {
        const img = new Image();
        img.src = src;
        img.onload = () => res(img);
      });
    void Promise.all([load(boatSprite), load(swimmerSprite), load(buoySprite)]).then(([b, s, u]) => {
      sprites.current = { boat: b, swimmer: s, buoy: u };
    });
  }, []);

  const reset = useCallback(
    (autoplay = false) => {
      runners.current = race
        ? [
            { x: 0, y: 0, theta: 90, done: false, t: 0, color: "#38bdf8", label: "قارب A · ٩٠°" },
            { x: 0, y: 0, theta: 120, done: false, t: 0, color: "#fb7185", label: "قارب B · ١٢٠°" },
          ]
        : [{ x: 0, y: 0, theta, done: false, t: 0, color: "#38bdf8", label: "أنت" }];
      particles.current = [];
      setResult(null);
      setPlaying(autoplay);
    },
    [race, theta],
  );

  useEffect(() => {
    reset(false);
  }, [reset, W, vs, vr]);

  // ---------- animation loop ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - (last.current || now)) / 1000);
      last.current = now;

      if (playing) {
        let finished = false;
        for (const r of runners.current) {
          if (r.done) continue;
          const sx = vs * Math.cos(r.theta * DEG);
          const sy = vs * Math.sin(r.theta * DEG);
          r.x += (sx + vr) * dt * rate;
          r.y += sy * dt * rate;
          r.t += dt * rate;
          if (Math.random() < 0.7) particles.current.push({ x: r.x, y: r.y, life: 1, r: 1 + Math.random() * 2 });
          if (r.y >= W) {
            r.y = W;
            r.done = true;
            finished = true;
          }
        }
        for (const p of particles.current) p.life -= dt * 1.2;
        particles.current = particles.current.filter((p) => p.life > 0).slice(-260);

        if (finished && runners.current.every((r) => r.done)) {
          const main = runners.current[0]!;
          const drift = main.x;
          const err = Math.abs(drift - targetX);
          const score = Math.max(0, Math.round(100 - (err / Math.max(8, W * 0.25)) * 100));
          const winner = race
            ? [...runners.current].sort((a, b) => a.t - b.t)[0]!.label
            : undefined;
          setResult({ score, drift, time: main.t, winner });
          setPlaying(false);
          if (score >= 99) sfx.success();
          else sfx.splash();
        }
      }

      draw(canvas);
      raf.current = requestAnimationFrame(step);
    };

    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      last.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, vs, vr, rate, W, targetX, race, sound, vehicle, theta]);

  function draw(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const bank = Math.min(34, cssH * 0.09);
    const px = Math.min(cssW / (HALF_SPAN * 2), (cssH - bank * 2) / W);
    const ox = cssW / 2;
    const oy = cssH - bank;
    scale.current = { px, ox, oy, h: cssH };
    const X = (mx: number) => ox + mx * px;
    const Y = (my: number) => oy - my * px;

    // water
    const water = ctx.createLinearGradient(0, Y(W), 0, Y(0));
    water.addColorStop(0, "#0b2545");
    water.addColorStop(1, "#0e7490");
    ctx.fillStyle = water;
    ctx.fillRect(0, Y(W), cssW, W * px);

    // moving waves + current arrows
    const time = performance.now() / 1000;
    ctx.strokeStyle = "rgba(125,211,252,0.18)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const y = Y(W) + ((i * 40 + ((time * vr * 12) % 40)) % (W * px));
      ctx.beginPath();
      for (let x = 0; x <= cssW; x += 12) ctx.lineTo(x, y + Math.sin((x + time * 60) / 40) * 3);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(56,189,248,0.30)";
    for (let i = 0; i < 5; i++) {
      const y = Y(W * ((i + 1) / 6));
      const x = ((time * vr * 26 + i * 180) % (cssW + 120)) - 60;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 26, y - 6);
      ctx.lineTo(x + 26, y + 6);
      ctx.closePath();
      ctx.fill();
    }

    // banks + docks
    ctx.fillStyle = "#14532d";
    ctx.fillRect(0, 0, cssW, Y(W));
    ctx.fillRect(0, oy, cssW, cssH - oy);
    ctx.fillStyle = "#166534";
    ctx.fillRect(0, Y(W) - 6, cssW, 6);
    ctx.fillRect(0, oy, cssW, 6);
    ctx.fillStyle = "#92400e";
    ctx.fillRect(X(-6), oy - 4, 12 * px > 6 ? 12 * px : 24, 14);
    ctx.fillRect(X(targetX - 6), Y(W) - 10, 12 * px > 6 ? 12 * px : 24, 14);

    // particles (wake)
    for (const p of particles.current) {
      ctx.fillStyle = `rgba(226,254,255,${0.35 * p.life})`;
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y), p.r + (1 - p.life) * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // target buoy
    const buoy = sprites.current.buoy;
    if (buoy) ctx.drawImage(buoy, X(targetX) - 14, Y(W) - 30, 28, 28);

    // runners + vectors
    const sprite = vehicle === "boat" ? sprites.current.boat : sprites.current.swimmer;
    runners.current.forEach((r, idx) => {
      const cx = X(r.x);
      const cy = Y(r.y);
      const heading = r.theta * DEG;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 2 - heading);
      const size = vehicle === "boat" ? 46 : 40;
      if (sprite) ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
      else {
        ctx.fillStyle = r.color;
        ctx.fillRect(-8, -14, 16, 28);
      }
      ctx.restore();

      if (!race || idx === 0) {
        const k = 9; // pixels per m/s
        const sx = vs * Math.cos(heading);
        const sy = vs * Math.sin(heading);
        arrow(ctx, cx, cy, cx + sx * k, cy - sy * k, "#3b82f6", "v‌s");
        arrow(ctx, cx, cy, cx + vr * k, cy, "#22d3ee", "v‌r");
        arrow(ctx, cx, cy, cx + (sx + vr) * k, cy - sy * k, "#fb7185", "v‌net");
      }
      if (race) {
        ctx.fillStyle = r.color;
        ctx.font = "bold 11px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(r.label, cx, cy - 32);
      }
    });
  }

  function arrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, label: string) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 11 * Math.cos(a - 0.4), y2 - 11 * Math.sin(a - 0.4));
    ctx.lineTo(x2 - 11 * Math.cos(a + 0.4), y2 - 11 * Math.sin(a + 0.4));
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = "bold 11px system-ui";
    ctx.fillText(label, x2 + 6, y2 - 6);
    ctx.restore();
  }

  // ---------- drag the steering vector ----------
  function onPointer(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.buttons === 0 && e.type !== "pointerdown") return;
    const canvas = canvasRef.current;
    if (!canvas || race) return;
    const rect = canvas.getBoundingClientRect();
    const r = runners.current[0];
    if (!r) return;
    const { px, ox, oy } = scale.current;
    const cx = ox + r.x * px;
    const cy = oy - r.y * px;
    const dx = e.clientX - rect.left - cx;
    const dy = cy - (e.clientY - rect.top);
    if (dy <= 2) return;
    const nextTheta = Math.min(170, Math.max(10, (Math.atan2(dy, dx) / DEG + 360) % 360));
    const nextVs = Math.min(15, Math.max(0.5, Math.hypot(dx, dy) / 9));
    setTheta(Number(nextTheta.toFixed(0)));
    setVs(Number(nextVs.toFixed(1)));
    if (!playing) r.theta = nextTheta;
  }

  const fmt = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : "∞");

  return (
    <GameShell
      title="عبور النهر · السرعة النسبية"
      subtitle="اسحب السهم الأزرق أو حرّك المزلاقات وجرّب توصل العوامة الحمراء بدقة ١٠٠٪"
      sound={sound}
      onToggleSound={() => setSound((s) => !s)}
      actions={
        <>
          <button
            onClick={() => {
              setRace((v) => !v);
              setTimeout(() => reset(false), 0);
            }}
            className={`hidden items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-extrabold sm:flex ${
              race ? "border-rose-400/40 bg-rose-400/20 text-rose-200" : "border-white/10 bg-white/5 text-slate-200"
            }`}
          >
            <Users className="h-4 w-4" /> سباق قاربين
          </button>
          <button
            onClick={() => setGuide(true)}
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-extrabold text-slate-200 hover:bg-white/10"
          >
            <BookOpen className="h-4 w-4" /> القوانين
          </button>
        </>
      }
    >
      <div className="grid gap-3 lg:grid-cols-12">
        {/* stage */}
        <div className="space-y-3 lg:col-span-8">
          <GlassPanel className="p-2">
            <canvas
              ref={canvasRef}
              onPointerDown={onPointer}
              onPointerMove={onPointer}
              className="h-[46vh] min-h-[280px] w-full touch-none rounded-xl sm:h-[56vh]"
            />
          </GlassPanel>

          <GlassPanel className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (!playing && runners.current.every((r) => r.done)) reset(true);
                else setPlaying((p) => !p);
                sfx.splash();
              }}
              className="flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-sky-400"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? "إيقاف" : "انطلاق"}
            </button>
            <button
              onClick={() => reset(false)}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" /> إعادة
            </button>
            <div className="flex overflow-hidden rounded-xl border border-white/10">
              {(["boat", "swimmer"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVehicle(v)}
                  className={`px-3 py-2 text-xs font-extrabold ${vehicle === v ? "bg-sky-500 text-slate-950" : "bg-white/5 text-slate-300"}`}
                >
                  {v === "boat" ? "قارب" : "سباح"}
                </button>
              ))}
            </div>
            <div className="flex overflow-hidden rounded-xl border border-white/10">
              {[0.5, 1, 2].map((r) => (
                <button
                  key={r}
                  onClick={() => setRate(r)}
                  className={`px-3 py-2 text-xs font-extrabold ${rate === r ? "bg-rose-500 text-slate-950" : "bg-white/5 text-slate-300"}`}
                >
                  {r}x
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setRace((v) => !v);
                setTimeout(() => reset(false), 0);
              }}
              className={`flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-extrabold sm:hidden ${
                race ? "border-rose-400/40 bg-rose-400/20 text-rose-200" : "border-white/10 bg-white/5"
              }`}
            >
              <Users className="h-4 w-4" /> سباق
            </button>
          </GlassPanel>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard label="زمن العبور t" value={fmt(m.t)} unit="ث" color="#facc15" />
            <StatCard label="الانحراف x" value={fmt(m.drift)} unit="م" color="#fb7185" />
            <StatCard label="محصلة السرعة" value={fmt(m.vnet, 2)} unit="م/ث" color="#22d3ee" />
            <StatCard label="زاوية المحصلة" value={fmt(m.angle, 0)} unit="°" color="#a78bfa" />
          </div>
        </div>

        {/* controls */}
        <div className="space-y-3 lg:col-span-4">
          <GlassPanel className="space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-400">
              <Ship className="h-4 w-4" /> لوحة المتغيرات
            </div>
            <Slider label="سرعة القارب في ماء هادئ vs" value={vs} min={0.5} max={15} step={0.1} unit="م/ث" onChange={setVs} color="#3b82f6" />
            <Slider label="سرعة تيار النهر vr" value={vr} min={0} max={12} step={0.1} unit="م/ث" onChange={setVr} color="#22d3ee" />
            <Slider label="زاوية التوجيه θ" value={theta} min={10} max={170} step={1} unit="°" onChange={setTheta} color="#fb7185" />
            <Slider label="عرض النهر W" value={W} min={30} max={150} step={1} unit="م" onChange={setW} color="#facc15" />
            <Slider label="موقع الهدف على الضفة" value={targetX} min={-60} max={60} step={1} unit="م" onChange={setTargetX} color="#a78bfa" />
          </GlassPanel>

          <GlassPanel className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-400">
              <Waves className="h-4 w-4" /> حالات جاهزة
            </div>
            <Preset icon={<Timer className="h-4 w-4" />} title="أقصر زمن عبور" note="θ = ٩٠° عمودي على الضفة" onClick={() => setTheta(90)} />
            <Preset
              icon={<Flag className="h-4 w-4" />}
              title="أقصر مسافة (عبور مباشر)"
              note={straightAngle ? `θ = ${straightAngle.toFixed(0)}° ضد التيار` : "مستحيل: التيار أسرع من القارب"}
              disabled={!straightAngle}
              onClick={() => straightAngle && setTheta(Math.round(straightAngle))}
            />
            <Preset
              icon={<Waves className="h-4 w-4" />}
              title="النهر الجارف"
              note="vr أكبر من vs — لا يمكن الوصول مقابل نقطة الانطلاق"
              onClick={() => {
                setVs(3);
                setVr(8);
                setTheta(120);
              }}
            />
          </GlassPanel>

          <GlassPanel className="text-[12px] leading-7 text-slate-300">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-extrabold text-slate-400">
              <Trophy className="h-4 w-4" /> التحدي
            </div>
            وصّل القارب إلى العوامة الحمراء عند <span className="text-fuchsia-300">{targetX} م</span> بدقة ١٠٠٪. غيّر الزاوية والسرعة قبل الانطلاق.
          </GlassPanel>
        </div>
      </div>

      <GameModal open={!!result} onClose={() => setResult(null)} title={result && result.score >= 99 ? "🎯 دقة كاملة!" : "نتيجة العبور"}>
        {result && (
          <div className="space-y-2">
            <div className="text-3xl font-extrabold text-sky-300">{result.score}%</div>
            <p>
              وصلت عند <b className="text-rose-300">{result.drift.toFixed(1)} م</b> والهدف عند {targetX} م، وزمن العبور{" "}
              <b className="text-amber-300">{result.time.toFixed(1)} ث</b>.
            </p>
            {result.winner && <p>الفائز في السباق: <b className="text-sky-300">{result.winner}</b> — الزاوية ٩٠° تعطي دائماً أقصر زمن.</p>}
            <button onClick={() => reset(true)} className="w-full rounded-xl bg-sky-500 px-4 py-2 text-xs font-extrabold text-slate-950">
              جرّب مرة أخرى
            </button>
          </div>
        )}
      </GameModal>

      <GameModal open={guide} onClose={() => setGuide(false)} title="دليل القوانين">
        <ul className="list-disc space-y-1 pr-5">
          <li>vs,x = vs · cos(θ) &nbsp;|&nbsp; vs,y = vs · sin(θ)</li>
          <li>v net,x = vs,x + vr &nbsp;|&nbsp; v net,y = vs,y</li>
          <li>v net = √(v net,x² + v net,y²)</li>
          <li>زمن العبور t = W ÷ vs,y — لا يتأثر بالتيار أبداً</li>
          <li>الانحراف x = v net,x × t</li>
          <li>زاوية المحصلة = arctan(v net,y ÷ v net,x)</li>
          <li>للعبور المباشر: θ = arccos(−vr ÷ vs) وتكون ممكنة فقط إذا vr ≤ vs</li>
        </ul>
      </GameModal>
    </GameShell>
  );
}

function Preset({
  icon,
  title,
  note,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  note: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-right hover:bg-white/10 disabled:opacity-40"
    >
      <span className="mt-0.5 text-sky-300">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-extrabold text-slate-100">{title}</span>
        <span className="block text-[11px] font-bold text-slate-400">{note}</span>
      </span>
    </button>
  );
}
