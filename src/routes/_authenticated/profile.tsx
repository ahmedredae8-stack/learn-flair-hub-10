import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { AVATARS } from "@/lib/avatars";
import { AvatarBubble } from "@/components/AvatarBubble";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";
import { Flame, Gem, Heart, Sparkles, LogOut, Check, Loader2, Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "الملف الشخصي — nilex" },
      { name: "description", content: "غيّر صورتك الرمزية وتابع تقدمك." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarValue, setAvatarValue] = useState("boy");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setUsername(profile.username ?? "");
      setAvatarValue(profile.avatar_url ?? "boy");
    }
  }, [profile]);

  async function uploadCustom(file: File) {
    if (!profile) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("حجم الصورة لا يتجاوز 3MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${profile.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (data?.signedUrl) setAvatarValue(data.signedUrl);
      toast.success("تم رفع الصورة، اضغط حفظ");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الرفع");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim().slice(0, 40),
          username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24),
          avatar_url: avatarValue,
        })
        .eq("id", profile.id);
      if (error) throw error;
      toast.success("تم الحفظ ✨");
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isCustom = avatarValue.startsWith("http") || avatarValue.startsWith("/");

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-24 font-display">
      <div className="mx-auto max-w-2xl">
        <div className="bg-primary text-primary-foreground pt-8 pb-16 px-6 relative">
          <div className="flex flex-col items-center">
            <AvatarBubble id={avatarValue} size={112} ring />
            <div className="mt-3 text-xl font-extrabold">{profile.display_name || "لاعب جديد"}</div>
            <div className="text-xs opacity-80 font-bold" translate="no">@{profile.username || "user"}</div>
          </div>
        </div>

        <div className="mx-4 -mt-10 relative z-10 bg-card border-2 border-border rounded-2xl p-4 grid grid-cols-4 gap-2 shadow-lg">
          <StatBox icon={<Sparkles className="w-5 h-5" />} value={profile.xp} label="XP" color="text-primary" />
          <StatBox icon={<Flame className="w-5 h-5" />} value={profile.streak} label="شعلة" color="text-streak" />
          <StatBox icon={<Gem className="w-5 h-5" />} value={profile.gems} label="جواهر" color="text-gem" />
          <StatBox icon={<Heart className="w-5 h-5 fill-current" />} value={profile.hearts} label="قلوب" color="text-heart" />
        </div>

        <section className="mx-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-sm">اختر صورتك الرمزية</h2>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-xs font-extrabold text-primary flex items-center gap-1 hover:underline disabled:opacity-60"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              صورة مخصّصة
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadCustom(f);
                e.currentTarget.value = "";
              }}
            />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {AVATARS.map((a) => {
              const active = a.id === avatarValue;
              return (
                <button
                  key={a.id}
                  onClick={() => setAvatarValue(a.id)}
                  className={`relative aspect-square rounded-2xl overflow-hidden grid place-items-center transition ${
                    active ? "ring-4 ring-primary shadow-lg" : "ring-2 ring-border hover:ring-primary/50"
                  }`}
                  style={{ background: a.bg }}
                  aria-label={a.label}
                >
                  <img src={a.src} alt={a.label} className="w-full h-full object-cover" loading="lazy" />
                  {active && (
                    <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground grid place-items-center border-2 border-card z-10">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
            {isCustom && (
              <div className="relative aspect-square rounded-2xl overflow-hidden ring-4 ring-primary shadow-lg">
                <img src={avatarValue} alt="مخصّص" className="w-full h-full object-cover" />
                <span className="absolute top-1 right-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-extrabold">أنت</span>
              </div>
            )}
          </div>
        </section>

        <section className="mx-4 mt-6 space-y-3">
          <div>
            <label className="text-xs font-extrabold text-muted-foreground block mb-1.5">الاسم المعروض</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              className="w-full px-4 py-3 rounded-xl border-2 border-input bg-card focus:border-primary outline-none font-bold"
            />
          </div>
          <div>
            <label className="text-xs font-extrabold text-muted-foreground block mb-1.5">اسم المستخدم</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={24}
              dir="ltr"
              className="w-full px-4 py-3 rounded-xl border-2 border-input bg-card focus:border-primary outline-none font-bold text-left"
            />
          </div>
        </section>

        <div className="mx-4 mt-6 space-y-3">
          <button onClick={save} disabled={saving} className="btn-3d w-full active:btn-3d-active disabled:opacity-60">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "حفظ التعديلات"}
          </button>
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-heart/30 text-heart font-extrabold hover:bg-heart/5 transition"
          >
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function StatBox({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center py-2">
      <div className={color}>{icon}</div>
      <div className="text-lg font-extrabold mt-1" translate="no">{value}</div>
      <div className="text-[10px] text-muted-foreground font-bold">{label}</div>
    </div>
  );
}
