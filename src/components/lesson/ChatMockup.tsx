import {
  AudioLines,
  Camera,
  ChevronDown,
  Folder,
  History,
  Image as ImageIcon,
  Menu,
  Mic,
  Paperclip,
  Plus,
  SendHorizonal,
  Sparkles,
  SlidersHorizontal,
  Trash2,
  Video,
  Check,
} from "lucide-react";

export type DemoHighlight =
  | "input"
  | "mic"
  | "plus"
  | "menu"
  | "send"
  | "attach"
  | "image"
  | "history"
  | "camera"
  | "files"
  | "video"
  | "model"
  | "tools";

export type ChatDemo = {
  app?: string;
  /** Model / mode pill shown at the top, like real assistant apps. */
  model?: string;
  /** Greeting shown on an empty screen. */
  greeting?: string;
  /** Suggestion chips under the greeting. */
  chips?: string[];
  /** Button the learner must press — drawn in red so the path is obvious. */
  highlight?: DemoHighlight;
  /** Opens the "+" sheet (like a real assistant app) with the given items. */
  panel?: "plus" | "menu";
  items?: { label: string; hint?: string; icon?: DemoHighlight }[];
  /** Green success bar under the screen, e.g. "تم رفع الصورة بنجاح". */
  success?: string;
  /** Small red caption explaining the highlighted control. */
  new_label?: string;
  attachment?: { name: string; deletable?: boolean };
  messages?: { role: "user" | "ai"; text: string }[];
  caption?: string;
  /** Show the "typing / thinking" shimmer under the last message. */
  thinking?: boolean;
};

export function isChatDemo(v: unknown): ChatDemo | null {
  if (!v || typeof v !== "object") return null;
  const demo = (v as Record<string, unknown>)["demo"];
  if (!demo || typeof demo !== "object") return null;
  return demo as ChatDemo;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  image: ImageIcon,
  camera: Camera,
  files: Folder,
  history: History,
  video: Video,
  mic: Mic,
  attach: Paperclip,
  plus: Plus,
  menu: Menu,
  send: SendHorizonal,
  tools: SlidersHorizontal,
  input: Sparkles,
};

/** Wraps a control and paints it red when it is the one the learner should press. */
function Hot({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span className={`relative grid place-items-center rounded-full ${on ? "ring-4 ring-heart animate-pulse-ring" : ""}`}>
      {children}
    </span>
  );
}

function IconBtn({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <Hot on={on}>
      <span className={`p-2 rounded-full transition ${on ? "bg-heart text-white" : "text-muted-foreground hover:bg-secondary"}`}>
        {children}
      </span>
    </Hot>
  );
}

/**
 * A simulated (brand-free) modern AI assistant screen, matching how the popular
 * assistant apps actually look today: a slim top bar with a model pill, a big
 * greeting on an empty chat, plain-text answers, and a rounded composer.
 */
export function ChatMockup({ demo }: { demo: ChatDemo }) {
  const hl = demo.highlight;
  const msgs = demo.messages ?? [];
  const empty = msgs.length === 0 && !demo.panel;

  return (
    <div dir="rtl" className="rounded-[28px] border-2 border-border bg-background overflow-hidden shadow-lg">
      {/* top bar */}
      <div className="flex items-center gap-2 px-2.5 py-2">
        <IconBtn on={hl === "menu"}><Menu className="w-[18px] h-[18px]" /></IconBtn>
        <Hot on={hl === "model"}>
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-extrabold ${hl === "model" ? "bg-heart text-white" : "hover:bg-secondary text-foreground"}`}>
            {demo.model ?? demo.app ?? "مساعد ذكي"}
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </span>
        </Hot>
        <div className="flex-1" />
        <IconBtn on={hl === "history"}><History className="w-[18px] h-[18px]" /></IconBtn>
        <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-accent grid place-items-center text-[10px] font-extrabold text-primary-foreground">أ</span>
      </div>

      {/* body */}
      <div className="px-4 pb-2 min-h-[140px]">
        {empty ? (
          <div className="py-6">
            <div className="text-[22px] sm:text-[26px] font-extrabold bg-gradient-to-l from-primary via-accent to-streak bg-clip-text text-transparent leading-snug">
              {demo.greeting ?? "أهلاً بك، كيف أساعدك؟"}
            </div>
            {(demo.chips ?? []).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {demo.chips!.map((c, i) => (
                  <span key={i} className="rounded-2xl border border-border bg-card px-3 py-2 text-[12px] font-bold text-muted-foreground">
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[85%] rounded-[22px] rounded-tr-lg bg-secondary px-4 py-2.5 text-[13px] sm:text-sm font-bold leading-relaxed">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-2">
                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-1" />
                  <p className="flex-1 text-[13px] sm:text-sm font-bold leading-7 text-foreground">{m.text}</p>
                </div>
              ),
            )}
            {demo.thinking && (
              <div className="flex gap-2 items-center">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span className="h-2.5 w-40 rounded-full bg-secondary animate-pulse" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* success bar (e.g. upload finished) */}
      {demo.success && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl bg-primary/10 text-primary px-3 py-2 text-[12px] font-extrabold">
          <Check className="w-4 h-4" /> {demo.success}
        </div>
      )}

      {/* attachment chip, with a delete affordance (files stay on the learner's device) */}
      {demo.attachment && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-2xl border-2 border-border px-3 py-2">
          <ImageIcon className="w-4 h-4 text-primary shrink-0" />
          <span className="flex-1 min-w-0 truncate text-[12px] font-extrabold">{demo.attachment.name}</span>
          {demo.attachment.deletable !== false && (
            <span className="p-1 rounded-lg bg-heart/10 text-heart"><Trash2 className="w-3.5 h-3.5" /></span>
          )}
        </div>
      )}

      {/* the "+" sheet / side menu */}
      {demo.panel && (demo.items?.length ?? 0) > 0 && (
        <div className="mx-2 mb-2 rounded-3xl bg-card border border-border p-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {demo.items!.map((it, i) => {
            const Icon = ICONS[it.icon ?? "image"] ?? ImageIcon;
            const on = !!it.icon && it.icon === hl;
            return (
              <div
                key={i}
                className={`rounded-2xl px-2.5 py-2 flex items-center gap-2 border-2 ${
                  on ? "border-heart bg-heart/10" : "border-transparent bg-secondary/70"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${on ? "text-heart" : "text-muted-foreground"}`} />
                <div className="min-w-0">
                  <div className={`text-[12px] font-extrabold truncate ${on ? "text-heart" : ""}`}>{it.label}</div>
                  {it.hint && <div className="text-[10px] font-bold text-muted-foreground truncate">{it.hint}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* composer */}
      <div className="p-2.5">
        {demo.new_label && (
          <div className="mb-2 text-center">
            <span className="inline-block rounded-full bg-heart/15 text-heart text-[11px] font-extrabold px-2.5 py-1">
              👆 {demo.new_label}
            </span>
          </div>
        )}
        <div
          className={`rounded-[26px] border-2 px-3 py-2.5 bg-card ${
            hl === "input" ? "border-heart bg-heart/5" : "border-border"
          }`}
        >
          <div className="text-[13px] font-bold text-muted-foreground pb-2">اكتب رسالتك هنا…</div>
          <div className="flex items-center gap-1">
            <IconBtn on={hl === "plus"}><Plus className="w-[18px] h-[18px]" /></IconBtn>
            <IconBtn on={hl === "tools"}><SlidersHorizontal className="w-[18px] h-[18px]" /></IconBtn>
            <IconBtn on={hl === "attach"}><Paperclip className="w-[18px] h-[18px]" /></IconBtn>
            <div className="flex-1" />
            <IconBtn on={hl === "mic"}><Mic className="w-[18px] h-[18px]" /></IconBtn>
            <Hot on={hl === "send"}>
              <span className={`p-2 rounded-full ${hl === "send" ? "bg-heart text-white" : "bg-foreground text-background"}`}>
                {hl === "send" ? <SendHorizonal className="w-[18px] h-[18px] rotate-180" /> : <AudioLines className="w-[18px] h-[18px]" />}
              </span>
            </Hot>
          </div>
        </div>
      </div>

      {demo.caption && (
        <div className="px-3 py-2 bg-secondary/50 text-[12px] font-extrabold text-muted-foreground border-t border-border">
          {demo.caption}
        </div>
      )}
    </div>
  );
}
