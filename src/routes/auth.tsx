import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, MessageCircle, Trophy, Rocket, ShieldCheck, Wand2, ChevronDown } from "lucide-react";
import { NilexLogo } from "@/components/NilexLogo";
import { BrandMascot } from "@/components/BrandMascot";
import cloud from "@/assets/cloud.png";
import boy from "@/assets/avatar-boy.png";
import girl from "@/assets/avatar-girl.png";
import robot from "@/assets/avatar-robot.png";
import astro from "@/assets/avatar-astro.png";
import shotHome from "@/assets/shot-home.jpg";
import shotLesson from "@/assets/shot-lesson.jpg";
import shotCourses from "@/assets/shot-courses.jpg";
import shotProjects from "@/assets/shot-projects.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "nilex — تعلّم الذكاء الاصطناعي بأسلوب ممتع" },
      { name: "description", content: "منصة nilex: دروس تفاعلية بأسلوب المحادثة تعلّمك أدوات الذكاء الاصطناعي خطوة بخطوة، مع نقاط وشارات ومشاريع حقيقية." },
      { property: "og:title", content: "nilex — تعلّم الذكاء الاصطناعي بأسلوب ممتع" },
      { property: "og:description", content: "دروس قصيرة بأسلوب المحادثة، تجارب حيّة لأدوات الذكاء الاصطناعي، ونقاط تحفزك كل يوم." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signup");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  function goForm(next: "signin" | "signup") {
    setMode(next);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background font-display overflow-x-hidden">
      {/* top bar */}
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <NilexLogo className="h-8 sm:h-9" />
          <button onClick={() => goForm("signin")} className="text-xs sm:text-sm font-extrabold text-primary border-2 border-primary/30 rounded-xl px-3 py-2 hover:bg-primary/10">
            تسجيل الدخول
          </button>
        </div>
      </header>

      {/* hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <img src={cloud} alt="" className="absolute -top-6 right-[-40px] w-40 opacity-60 animate-bob" />
          <img src={cloud} alt="" className="absolute top-24 left-[-30px] w-28 opacity-40 animate-bob" />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 pt-10 pb-14 grid gap-8 md:grid-cols-2 items-center">
          <div className="text-center md:text-right">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-[11px] sm:text-xs font-extrabold px-3 py-1.5">
              <Sparkles className="w-3.5 h-3.5" /> أول منصة عربية تعلّمك أدوات الذكاء الاصطناعي باللعب
            </span>
            <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold leading-[1.25]">
              تعلّم <span className="text-primary">الذكاء الاصطناعي</span>
              <br /> بطريقة ممتعة… 5 دقائق يومياً
            </h1>
            <p className="mt-4 text-sm sm:text-base font-bold text-muted-foreground leading-relaxed">
              دروس قصيرة على شكل محادثة مع زكي ونور وآدم، تجارب حيّة داخل شاشة مساعد ذكي، أسئلة، نقاط، وشارات — وفي النهاية تبني مشروعك الخاص.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <button onClick={() => goForm("signup")} className="btn-3d active:btn-3d-active">ابدأ الآن مجاناً</button>
              <button onClick={() => goForm("signin")} className="rounded-2xl border-2 border-border bg-card px-6 py-3.5 font-extrabold text-primary hover:bg-secondary">
                لدي حساب بالفعل
              </button>
            </div>
            <div className="mt-5 flex items-center gap-2 justify-center md:justify-start">
              {[boy, girl, robot, astro].map((s, i) => (
                <img key={i} src={s} alt="" width={36} height={36} className="w-9 h-9 rounded-full bg-secondary object-cover border-2 border-background -ml-2" />
              ))}
              <span className="text-[11px] font-extrabold text-muted-foreground">+100 درس تفاعلي بانتظارك</span>
            </div>
          </div>

          {/* phone mockup */}
          <div className="mx-auto w-full max-w-[320px]">
            <div className="rounded-[2rem] border-4 border-border bg-card shadow-xl p-3">
              <div className="rounded-3xl bg-secondary/40 p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <BrandMascot slot="mascot_landing" size={36} className="w-9 h-9 animate-bob object-contain" />
                  <div className="rounded-2xl rounded-tr-sm bg-card border-2 border-border px-3 py-2 text-[12px] font-bold leading-6">
                    أهلاً! أنا زكي 🤖 في 5 دقائق النهاردة هتتعلّم تكتب أمراً ذكياً يطلّع نتيجة احترافية.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <img src={girl} alt="" width={36} height={36} className="w-9 h-9 rounded-full object-cover" />
                  <div className="rounded-2xl rounded-tr-sm bg-card border-2 border-border px-3 py-2 text-[12px] font-bold leading-6">
                    وأنا نور ✨ خلّينا نجرّب سوا: اطلب من المساعد خطة مذاكرة لأسبوع… وشوف الفرق.
                  </div>
                </div>
                <div className="rounded-2xl border-2 border-heart/40 bg-heart/5 px-3 py-2 text-[11px] font-extrabold text-heart">
                  🎯 مهمتك الأولى: جرّب الأداة بنفسك داخل الدرس واكسب أول 10 نقاط
                </div>
                <div className="rounded-full border-2 border-input bg-background flex items-center gap-2 px-2 py-1.5">
                  <span className="w-7 h-7 rounded-full bg-heart text-primary-foreground grid place-items-center text-xs font-extrabold">+</span>
                  <span className="flex-1 text-[11px] font-bold text-muted-foreground">اكتب رسالتك هنا…</span>
                  <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs">➤</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center pb-6">
          <ChevronDown className="w-6 h-6 text-primary animate-hint-up" />
        </div>
      </section>

      {/* features */}
      <section className="bg-secondary/40 border-y-2 border-border py-12">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center">ليه هتحب nilex؟</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Feature icon={<MessageCircle className="w-6 h-6" />} title="دروس على شكل محادثة" text="كل درس حكاية: رسائل تظهر واحدة واحدة وأنت تسحب الشاشة للأعلى، من غير ملل." />
            <Feature icon={<Wand2 className="w-6 h-6" />} title="تجربة الأدوات حيّة" text="شاشة مساعد ذكي داخل الدرس، الزر المطلوب يضيء بالأحمر لحد ما تتقنه بنفسك." />
            <Feature icon={<Trophy className="w-6 h-6" />} title="نقاط وشارات ومتصدرين" text="اجمع XP وجواهر وحافظ على شعلتك اليومية، وشوف ترتيبك بين كل المتعلمين." />
            <Feature icon={<ShieldCheck className="w-6 h-6" />} title="محتوى آمن ومناسب" text="نعلّمك الأمان الرقمي والخصوصية وآداب التعامل مع الذكاء الاصطناعي من أول وحدة." />
            <Feature icon={<Rocket className="w-6 h-6" />} title="من التعلّم للمشروع" text="قسم المشاريع يخليك تقدّم فكرتك، تجد تمويل، وتتناقش مع مجتمع المنصة." />
            <Feature icon={<Sparkles className="w-6 h-6" />} title="مسارات متعددة" text="أدوات الذكاء الاصطناعي مجاناً، وكورسات مميّزة للتصميم والبرمجة وبناء وإطلاق المنتجات." />
          </div>
        </div>
      </section>

      {/* real screenshots from the app */}
      <section className="py-12">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center">شوف المنصة من جوّه 👀</h2>
          <p className="mt-2 text-center text-sm font-bold text-muted-foreground">لقطات حقيقية من nilex — مش صور تسويقية.</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Shot src={shotHome} title="مسار التعلّم" text="طريق الدروس المتعرّج مع تقدّمك ونقاطك." />
            <Shot src={shotLesson} title="الدرس محادثة" text="رسائل من زكي ونور وأ. سارة تظهر واحدة واحدة." />
            <Shot src={shotCourses} title="الكورسات" text="مجاني للجميع + كورسات مميّزة للتصميم والبرمجة." />
            <Shot src={shotProjects} title="المشاريع والتمويل" text="قدّم فكرتك، اطلب تمويلاً، وناقش المجتمع في المنتدى." />
          </div>
        </div>
      </section>

      {/* how it works */}
      <section className="py-12">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center">إزاي بتشتغل؟</h2>
          <ol className="mt-8 space-y-3">
            {[
              "اعمل حساب واختر صورتك (ولد، بنت، روبوت أو صورتك الخاصة).",
              "افتح أول درس في المسار وابدأ المحادثة مع زكي.",
              "جرّب الأداة بنفسك داخل الشاشة التفاعلية وجاوب على الأسئلة.",
              "اجمع النقاط، افتح الدرس التالي، وابنِ مشروعك في النهاية.",
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-3 rounded-2xl border-2 border-border bg-card p-4">
                <span className="w-8 h-8 shrink-0 rounded-xl bg-primary text-primary-foreground grid place-items-center font-extrabold">{i + 1}</span>
                <span className="text-sm font-bold leading-7">{t}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* auth card */}
      <section ref={formRef} className="pb-16 px-4">
        <div className="mx-auto w-full max-w-md">
          <div className="text-center mb-5">
            <BrandMascot slot="mascot_landing" size={72} className="mx-auto w-18 h-18 animate-bob object-contain" />
            <h2 className="text-xl font-extrabold mt-2">يلا نبدأ رحلتك 🚀</h2>
            <p className="text-xs font-bold text-muted-foreground mt-1">مجاني تماماً — دقيقة واحدة وتكون جوّه.</p>
          </div>
          <AuthCard mode={mode} setMode={setMode} onDone={() => navigate({ to: "/", replace: true })} />
        </div>
      </section>

      <footer className="border-t-2 border-border py-6 text-center">
        <NilexLogo className="h-7 mx-auto" />
        <p className="mt-2 text-[11px] font-bold text-muted-foreground">تعلّم الذكاء الاصطناعي… وابنِ المستقبل.</p>
      </footer>
    </div>
  );
}

function Shot({ src, title, text }: { src: string; title: string; text: string }) {
  return (
    <figure className="rounded-3xl border-2 border-border bg-card p-3 hover:-translate-y-1 transition-transform">
      <div className="rounded-2xl overflow-hidden border-2 border-border bg-secondary/40">
        <img src={src} alt={title} loading="lazy" width={560} height={1173} className="w-full h-auto" />
      </div>
      <figcaption className="px-1 pt-3 pb-1 text-right">
        <div className="font-extrabold text-sm">{title}</div>
        <p className="text-[12px] font-bold text-muted-foreground leading-6 mt-0.5">{text}</p>
      </figcaption>
    </figure>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-3xl border-2 border-border bg-card p-5 hover:-translate-y-1 transition-transform">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary grid place-items-center">{icon}</div>
      <h3 className="mt-3 font-extrabold">{title}</h3>
      <p className="mt-1 text-[13px] font-bold text-muted-foreground leading-6">{text}</p>
    </div>
  );
}

function AuthCard({ mode, setMode, onDone }: { mode: "signin" | "signup"; setMode: (m: "signin" | "signup") => void; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName.trim() || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب! 🎉");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast.success("أهلاً بعودتك!");
      }
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  const inp = "w-full px-4 py-3 rounded-xl border-2 border-input bg-background focus:border-primary outline-none font-bold";

  return (
    <div className="bg-card border-2 border-border rounded-3xl p-6 shadow-lg">
      <div className="flex gap-2 mb-6 bg-secondary rounded-2xl p-1">
        <button type="button" onClick={() => setMode("signup")} className={`flex-1 py-2.5 rounded-xl text-sm font-extrabold transition ${mode === "signup" ? "bg-card shadow text-primary" : "text-muted-foreground"}`}>
          حساب جديد
        </button>
        <button type="button" onClick={() => setMode("signin")} className={`flex-1 py-2.5 rounded-xl text-sm font-extrabold transition ${mode === "signin" ? "bg-card shadow text-primary" : "text-muted-foreground"}`}>
          تسجيل الدخول
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "signup" && (
          <div>
            <label className="text-xs font-extrabold text-muted-foreground block mb-1.5">الاسم</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} placeholder="مثلاً: أحمد" className={inp} />
          </div>
        )}
        <div>
          <label className="text-xs font-extrabold text-muted-foreground block mb-1.5">البريد الإلكتروني</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" placeholder="you@example.com" className={`${inp} text-left`} />
        </div>
        <div>
          <label className="text-xs font-extrabold text-muted-foreground block mb-1.5">كلمة المرور</label>
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" placeholder="••••••••" className={`${inp} text-left`} />
        </div>
        <button type="submit" disabled={loading} className="btn-3d w-full active:btn-3d-active disabled:opacity-60">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === "signin" ? "دخول" : "إنشاء الحساب"}
        </button>
      </form>
    </div>
  );
}
