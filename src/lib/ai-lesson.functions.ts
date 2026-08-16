import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  explanation: z.string().min(5),
  characters: z.array(z.string()).default([]),
});

export type AiStep = {
  kind: "text" | "image" | "question";
  character: string | null;
  mood: string;
  content: string;
  admin_note?: string | null;
  choices?: string[];
  answer?: number;
};

const SYSTEM = `أنت مساعد لبناء دروس تفاعلية عربية بأسلوب دولينجو.
تحوّل الشرح الخام إلى سلسلة فقاعات حوار قصيرة (سطر أو سطرين لكل فقاعة) بلغة عربية بسيطة ومرحة.
قواعد:
- كل عنصر يمثل رسالة واحدة.
- kind = "text" لفقاعة كلام، "image" حين يطلب الشرح صورة أو لقطة شاشة أو حين يفيد وجود صورة توضيحية، "question" لسؤال اختيار من متعدد.
- عناصر image: اكتب في content تعليقاً قصيراً للطالب، وفي admin_note وصفاً دقيقاً للصورة المطلوب رفعها.
- عناصر question: اكتب السؤال في content، و choices من 2 إلى 4 خيارات، و answer فهرس الإجابة الصحيحة (يبدأ من 0).
- وزّع الرسائل على الشخصيات المتاحة بالاسم في الحقل character (أو null).
- mood من: neutral, happy, sad, surprised, thinking, excited.
- أضف سؤالاً واحداً على الأقل كل 4-6 رسائل.
أعد JSON فقط بالشكل: {"steps":[...]}`;

export const generateLessonSteps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }): Promise<{ steps: AiStep[] }> => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin");
    if (!roles || roles.length === 0) throw new Error("للمديرين فقط");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("مفتاح الذكاء الاصطناعي غير مهيّأ");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `الشخصيات المتاحة: ${data.characters.join("، ") || "بدون"}\n\nالشرح:\n${data.explanation}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`فشل توليد المحتوى (${res.status}): ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: { steps?: AiStep[] };
    try {
      parsed = JSON.parse(raw) as { steps?: AiStep[] };
    } catch {
      throw new Error("رد الذكاء الاصطناعي غير صالح");
    }
    const steps = (parsed.steps ?? []).filter((s) => s && typeof s.content === "string");
    if (!steps.length) throw new Error("لم يتم توليد أي رسائل");
    return { steps };
  });
