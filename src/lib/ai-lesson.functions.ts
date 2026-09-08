import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  AI_LESSON_SYSTEM,
  AI_PHYSICS_RULES,
  AI_UNIT_SYSTEM,
  AiLessonInput,
  AiUnitInput,
  type AiLessonResult,
  type AiStep,
  type AiUnitLesson,
} from "./ai-lesson.prompt";

export type { AiStep, AiUnitLesson };

async function callGateway(system: string, user: string): Promise<Record<string, unknown>> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("مفتاح الذكاء الاصطناعي غير مهيّأ");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "openai/gpt-5.6-sol",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
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
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("رد الذكاء الاصطناعي غير صالح");
  }
}

async function assertAdmin(context: { supabase: { from: (t: string) => never }; userId: string }) {
  const { data: roles } = await (context.supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (a: string, b: string) => { eq: (a: string, b: string) => Promise<{ data: unknown[] | null }> };
      };
    };
  })
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin");
  if (!roles || roles.length === 0) throw new Error("للمديرين فقط");
}

export const generateLessonSteps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => AiLessonInput.parse(data))
  .handler(async ({ data, context }): Promise<AiLessonResult> => {
    await assertAdmin(context as never);

    const wanted = data.count ? `\n\nعدد الرسائل المطلوب تقريباً: ${data.count}` : "";
    const ctx = data.context;
    const ctxText = ctx
      ? `\n\nسياق الدرس:\n- الكورس: ${ctx.courseTitle ?? "-"}\n- الوحدة ${ctx.unitNumber ?? "-"}: ${ctx.unitName ?? "-"}\n- الدرس ${ctx.lessonNumber ?? "-"}: ${ctx.lessonTitle ?? "-"}\n- الدرس السابق: ${ctx.previousLesson ?? "لا يوجد"}\n- الدرس القادم: ${ctx.nextLesson ?? "لا يوجد"}`
      : "";
    const bios = data.characterBios.length
      ? `\n\nأوصاف الشخصيات:\n${data.characterBios.map((c) => `- ${c.name}: ${c.bio || "بدون وصف"}`).join("\n")}`
      : "";
    const article = data.article.trim()
      ? `\n\nالمقال المصدر (التزم بمعلوماته):\n${data.article.trim()}`
      : "";
    const meta = data.withMeta ? "\n\nأعد أيضاً objectives و summary_points لهذا الدرس." : "";

    const parsed = await callGateway(
      data.mode === "physics" ? `${AI_LESSON_SYSTEM}\n\n${AI_PHYSICS_RULES}` : AI_LESSON_SYSTEM,
      `الشخصيات المتاحة: ${data.characters.join("، ") || "بدون"}${bios}${wanted}${ctxText}${meta}${article}\n\nالشرح:\n${data.explanation}`,
    );

    const steps = ((parsed["steps"] as AiStep[] | undefined) ?? []).filter(
      (s) => s && typeof s.content === "string",
    );
    if (!steps.length) throw new Error("لم يتم توليد أي رسائل");
    const strings = (v: unknown) =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : [];
    return {
      steps,
      objectives: strings(parsed["objectives"]),
      summary_points: strings(parsed["summary_points"]),
    };
  });

/** Plan a whole unit: titles, intros, objectives and summaries for every lesson. */
export const generateUnitPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => AiUnitInput.parse(data))
  .handler(async ({ data, context }): Promise<{ lessons: AiUnitLesson[] }> => {
    await assertAdmin(context as never);

    const parsed = await callGateway(
      data.mode === "physics" ? `${AI_UNIT_SYSTEM}\n\n${AI_PHYSICS_RULES}` : AI_UNIT_SYSTEM,
      `الكورس: ${data.courseTitle}\nالوحدة ${data.unitNumber}: ${data.unitName}\nعدد الدروس المطلوب: ${data.lessonCount}\n\nمعلومات وأهداف يبني عليها المنهج:\n${data.brief}${data.article.trim() ? `\n\nالمقال المصدر الكامل (وزّع محتواه على الدروس بترتيب مترابط):\n${data.article.trim()}` : ""}`,
    );

    const lessons = ((parsed["lessons"] as AiUnitLesson[] | undefined) ?? []).filter(
      (l) => l && typeof l.title === "string" && l.title.trim(),
    );
    if (!lessons.length) throw new Error("لم يتم توليد خطة الوحدة");
    return { lessons };
  });
