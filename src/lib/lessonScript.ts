/**
 * A tiny authoring shorthand for lesson dialogue.
 *
 * The admin writes plain lines with an HTML-like tag; the number attached to the
 * tag picks the character (1 = first character in the list, and so on), and an
 * optional `:mood` sets the face.
 *
 *   <p1> أهلاً بك في الدرس
 *   <p2:happy> وأنا معك خطوة بخطوة
 *   <img1> لقطة شاشة لواجهة الأداة
 *   <vid> مقطع قصير يشرح الفكرة
 *   <q1> ما هو HTML؟ | لغة تنسيق | *لغة بناء الصفحة
 *   <site> اسم الموقع | https://example.com | افتح الصفحة واقرأ العنوان
 *   <code> معمل الأكواد
 *
 * `*` قبل الخيار = الإجابة الصحيحة. الأسطر الفارغة تُهمل.
 */

export type ScriptDraft = {
  kind: "text" | "image" | "video" | "question";
  charIndex: number | null;
  mood: string;
  content: string;
  admin_note: string | null;
  choices?: string[];
  answer?: number;
  site?: { title: string; url: string; task?: string };
  code?: boolean;
};

const MOODS = ["neutral", "happy", "sad", "surprised", "thinking", "excited"];
const TAG = /^<\s*(p|img|image|vid|video|q|question|site|code)\s*(\d+)?\s*(?::\s*([a-z]+))?\s*>\s*(.*)$/i;

export function parseLessonScript(src: string): { drafts: ScriptDraft[]; errors: string[] } {
  const drafts: ScriptDraft[] = [];
  const errors: string[] = [];

  src.split(/\r?\n/).forEach((rawLine, i) => {
    const line = rawLine.trim();
    if (!line) return;
    const m = TAG.exec(line);
    if (!m) {
      // A line with no tag continues the previous bubble, otherwise it is narrator text.
      const prev = drafts.at(-1);
      if (prev && prev.kind === "text") prev.content = `${prev.content}\n${line}`;
      else drafts.push({ kind: "text", charIndex: null, mood: "neutral", content: line, admin_note: null });
      return;
    }

    const tag = m[1].toLowerCase();
    const charIndex = m[2] ? Number(m[2]) - 1 : null;
    const mood = m[3] && MOODS.includes(m[3].toLowerCase()) ? m[3].toLowerCase() : "neutral";
    const body = (m[4] ?? "").trim();
    const parts = body.split("|").map((p) => p.trim()).filter(Boolean);

    if (tag === "p") {
      if (!body) return errors.push(`سطر ${i + 1}: رسالة فارغة`);
      drafts.push({ kind: "text", charIndex, mood, content: body, admin_note: null });
      return;
    }
    if (tag === "img" || tag === "image") {
      drafts.push({
        kind: "image",
        charIndex,
        mood,
        content: parts[1] ?? "",
        admin_note: parts[0] || "صورة توضيحية",
      });
      return;
    }
    if (tag === "vid" || tag === "video") {
      drafts.push({ kind: "video", charIndex, mood, content: parts[1] ?? "", admin_note: parts[0] || "مقطع فيديو" });
      return;
    }
    if (tag === "q" || tag === "question") {
      const [question, ...rest] = parts;
      const choices = rest.map((c) => c.replace(/^\*/, "").trim());
      const answer = Math.max(0, rest.findIndex((c) => c.startsWith("*")));
      if (!question || choices.length < 2) return errors.push(`سطر ${i + 1}: السؤال يحتاج نصاً وخيارين على الأقل`);
      drafts.push({ kind: "question", charIndex, mood, content: question, admin_note: null, choices, answer });
      return;
    }
    if (tag === "site") {
      const url = parts.find((p) => /^https?:\/\//i.test(p));
      if (!url) return errors.push(`سطر ${i + 1}: عارض الموقع يحتاج رابطاً يبدأ بـ https://`);
      const title = parts[0] === url ? "الموقع" : parts[0];
      const task = parts.filter((p) => p !== url && p !== title)[0];
      drafts.push({
        kind: "text",
        charIndex,
        mood,
        content: "",
        admin_note: null,
        site: { title, url, task },
      });
      return;
    }
    // code
    drafts.push({ kind: "text", charIndex, mood, content: "", admin_note: null, code: true });
  });

  return { drafts, errors };
}
