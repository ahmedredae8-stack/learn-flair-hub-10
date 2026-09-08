import { useState } from "react";
import { toast } from "sonner";
import { uploadFile } from "@/lib/upload";
import { SETTING_LABELS, useSaveSetting, useSiteSettings, type SettingKey } from "@/lib/siteSettings";
import { Loader2, Palette, RotateCcw, Upload } from "lucide-react";
import { DEFAULT_PRESET, THEME_PRESETS } from "@/lib/theme";

async function uploadBranding(key: string, file: File): Promise<string> {
  const up = await uploadFile("branding", file, `${key}-`);
  return up.url;
}


export function BrandingPanel() {
  const { data: settings, isLoading } = useSiteSettings();
  const save = useSaveSetting();
  const [busy, setBusy] = useState<string | null>(null);

  async function onPick(key: SettingKey, file: File) {
    setBusy(key);
    try {
      const url = await uploadBranding(key, file);
      await save(key, url);
      toast.success("تم تحديث الصورة");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الرفع");
    } finally {
      setBusy(null);
    }
  }

  async function onUrl(key: SettingKey, url: string) {
    setBusy(key);
    try {
      await save(key, url.trim() || null);
      toast.success("تم الحفظ");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) return <div className="grid place-items-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <ThemePanel />
      <p className="text-xs font-bold text-muted-foreground">
        غيّر اللوجو وصور الروبوت في أي وقت — التغيير يظهر فوراً لكل المستخدمين.
      </p>
      {SETTING_LABELS.map((s) => (
        <Row key={s.key} k={s.key} label={s.label} hint={s.hint} value={settings?.[s.key] ?? ""} busy={busy === s.key} onPick={onPick} onUrl={onUrl} />
      ))}
    </div>
  );
}

function Row({ k, label, hint, value, busy, onPick, onUrl }: {
  k: SettingKey; label: string; hint: string; value: string; busy: boolean;
  onPick: (k: SettingKey, f: File) => void; onUrl: (k: SettingKey, v: string) => void;
}) {
  const [url, setUrl] = useState(value);

  return (
    <div className="bg-card border-2 border-border rounded-2xl p-3 flex items-center gap-3">
      <div className="w-16 h-16 shrink-0 rounded-xl bg-secondary grid place-items-center overflow-hidden">
        {value ? <img src={value} alt="" className="w-full h-full object-contain" /> : <span className="text-[10px] font-extrabold text-muted-foreground">الافتراضي</span>}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="font-extrabold text-sm">{label}</div>
        <div className="text-[11px] font-bold text-muted-foreground leading-5">{hint}</div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <label className="flex items-center gap-1 text-xs font-extrabold text-primary cursor-pointer">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} رفع صورة
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(k, f); }} />
          </label>
          <input
            dir="ltr"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => url !== value && onUrl(k, url)}
            placeholder="أو الصق رابط صورة…"
            className="flex-1 min-w-[140px] px-3 py-1.5 rounded-xl border-2 border-input bg-background font-bold text-[11px]"
          />
          {value && (
            <button onClick={() => { setUrl(""); onUrl(k, ""); }} className="text-xs font-extrabold text-heart flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" /> افتراضي
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Palette control — stored in the database so it applies to every visitor. */
function ThemePanel() {
  const { data: settings } = useSiteSettings();
  const save = useSaveSetting();
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState(settings?.theme_primary ?? "");
  const current = settings?.theme_preset ?? DEFAULT_PRESET;

  async function pick(id: string) {
    setBusy(true);
    try {
      await save("theme_preset", id);
      await save("theme_primary", null);
      setCustom("");
      toast.success("تم تغيير لون المنصة");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-card border-2 border-border rounded-2xl p-3 space-y-3">
      <div className="font-extrabold text-sm flex items-center gap-1">
        <Palette className="w-4 h-4 text-primary" /> لون المنصة
      </div>
      <p className="text-[11px] font-bold text-muted-foreground leading-5">
        اختر الهوية اللونية — تُطبَّق فوراً على كل الصفحات ولكل المستخدمين.
      </p>
      <div className="grid grid-cols-4 gap-2">
        {THEME_PRESETS.map((p) => (
          <button
            key={p.id}
            disabled={busy}
            onClick={() => pick(p.id)}
            className={`rounded-xl border-2 p-2 flex flex-col items-center gap-1 font-extrabold text-[11px] transition ${
              current === p.id ? "border-primary bg-primary/10" : "border-border"
            }`}
          >
            <span className="w-7 h-7 rounded-full" style={{ background: p.swatch }} />
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          dir="ltr"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="#7c3aed لون مخصّص"
          className="flex-1 px-3 py-1.5 rounded-xl border-2 border-input bg-background font-bold text-[11px]"
        />
        <button
          onClick={async () => {
            setBusy(true);
            try {
              await save("theme_primary", custom.trim() || null);
              toast.success("تم الحفظ");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "فشل الحفظ");
            } finally {
              setBusy(false);
            }
          }}
          className="text-xs font-extrabold text-primary"
        >
          حفظ
        </button>
      </div>
    </div>
  );
}
