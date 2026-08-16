import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Editable branding (logo + mascots) stored in `public.site_settings`.
 * Everything falls back to the bundled asset when the row is missing,
 * so the app never breaks if the table is empty.
 */

export type SettingKey =
  | "logo"
  | "mascot"
  | "mascot_home"
  | "mascot_courses"
  | "mascot_landing"
  | "mascot_lesson";

export const SETTING_LABELS: { key: SettingKey; label: string; hint: string }[] = [
  { key: "logo", label: "اللوجو (كل المنصة)", hint: "يظهر بجانب الإشعارات، وفي أعلى وأسفل صفحة الهبوط." },
  { key: "mascot", label: "الروبوت (الافتراضي)", hint: "يُستخدم في أي مكان لم تحدّد له صورة خاصة." },
  { key: "mascot_home", label: "روبوت الصفحة الرئيسية", hint: "الصورة أعلى مسار التعلّم." },
  { key: "mascot_courses", label: "روبوت صفحة الكورسات", hint: "الصورة في ترويسة الكورسات." },
  { key: "mascot_landing", label: "روبوت صفحة الهبوط", hint: "الصورة فوق مربع تسجيل الدخول." },
  { key: "mascot_lesson", label: "روبوت الدرس", hint: "صورة الراوي داخل الدرس." },
];

export type Settings = Partial<Record<SettingKey, string>>;

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    staleTime: 60_000,
    queryFn: async (): Promise<Settings> => {
      const res = (await (supabase.from("site_settings" as never).select("key,value") as never)) as {
        data: { key: string; value: string | null }[] | null;
        error: { message: string } | null;
      };
      if (res.error || !res.data) return {};
      const out: Settings = {};
      for (const row of res.data) {
        if (row.value) out[row.key as SettingKey] = row.value;
      }
      return out;
    },
  });
}

/** Resolve a branding image with a fallback chain: exact key → generic mascot → bundled asset. */
export function useBrandImage(key: SettingKey, fallback: string): string {
  const { data } = useSiteSettings();
  if (!data) return fallback;
  if (data[key]) return data[key]!;
  if (key.startsWith("mascot") && data.mascot) return data.mascot;
  return fallback;
}

export function useSaveSetting() {
  const qc = useQueryClient();
  return async (key: SettingKey, value: string | null) => {
    const res = (await (supabase
      .from("site_settings" as never)
      .upsert({ key, value, updated_at: new Date().toISOString() } as never, { onConflict: "key" } as never) as never)) as {
      error: { message: string } | null;
    };
    if (res.error) throw new Error(res.error.message);
    await qc.invalidateQueries({ queryKey: ["site-settings"] });
  };
}
