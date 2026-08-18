import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AI_LESSON_SYSTEM, AiLessonInput, type AiStep } from "./ai-lesson.prompt";

export type { AiStep };

export const generateLessonSteps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => AiLessonInput.parse(data))
  .handler(async ({ data, context }): Promise<{ steps: AiStep[] }> => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin");
    if (!roles || roles.length === 0) throw new Error("للمديرين فقط");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("مفتاح الذكاء الاصطناعي غير مهيّأ");

    const wanted = data.count ? `\n\nعدد الرسائل المطلوب تقريباً: ${data.count}` : "";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        messages: [
          { role: "system", content: AI_LESSON_SYSTEM },
          {
            role: "user",
            content: `الشخصيات المتاحة: ${data.characters.join("، ") || "بدون"}${wanted}\n\nالشرح:\n${data.explanation}`,
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
