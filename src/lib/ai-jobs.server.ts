/**
 * Background content factory.
 *
 * Every lesson that needs AI-written dialogue gets a row in `ai_jobs`.
 * A worker (cron or admin panel) picks pending jobs one by one, asks the model
 * for 15–20 linked messages, and stores them as lesson steps. Because the work
 * happens job-by-job on the server, the admin can close the browser at any time.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  AI_LESSON_SYSTEM,
  AI_PHYSICS_RULES,
  type AiStep,
} from "./ai-lesson.prompt";

const DEFAULT_IMAGE = "/brand/mascot.png";
const MOOD_IDS = ["neutral", "happy", "sad", "surprised", "thinking", "excited"];

type JobRow = {
  id: string;
  lesson_id: string;
  msg_count: number;
  mode: string;
  character_ids: string[];
  brief: string;
  article: string;
  attempts: number;
};

async function callGateway(system: string, user: string): Promise<Record<string, unknown>> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("مفتاح الذكاء الاصطناعي غير مهيّأ");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "openai/gpt-5.6-sol",
      reasoning_effort: "none",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`فشل توليد المحتوى (${res.status}): ${body.slice(0, 200)}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  try {
    return JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as Record<string, unknown>;
  } catch {
    throw new Error("رد الذكاء الاصطناعي غير صالح");
  }
}

/** Everything the model needs to keep the lesson linked to its unit. */
async function buildPrompt(job: JobRow) {
  const { data: lesson } = await supabaseAdmin
    .from("lessons")
    .select("id, title, description, unit, order_index, course_id")
    .eq("id", job.lesson_id)
    .maybeSingle();
  if (!lesson) throw new Error("الدرس غير موجود");

  const [{ data: course }, { data: unit }, { data: siblings }, { data: chars }] = await Promise.all([
    supabaseAdmin.from("courses").select("title").eq("id", lesson.course_id ?? "").maybeSingle(),
    supabaseAdmin
      .from("units")
      .select("name")
      .eq("course_id", lesson.course_id ?? "")
      .eq("number", lesson.unit)
      .maybeSingle(),
    supabaseAdmin
      .from("lessons")
      .select("title, order_index")
      .eq("course_id", lesson.course_id ?? "")
      .eq("unit", lesson.unit)
      .order("order_index"),
    supabaseAdmin.from("characters").select("id, name, bio").in("id", job.character_ids),
  ]);

  const list = siblings ?? [];
  const idx = list.findIndex((l) => l.order_index === lesson.order_index);
  const cast = chars ?? [];

  const user = [
    `الشخصيات المتاحة: ${cast.map((c) => c.name).join("، ") || "بدون"}`,
    cast.length ? `أوصاف الشخصيات:\n${cast.map((c) => `- ${c.name}: ${c.bio || "بدون وصف"}`).join("\n")}` : "",
    `عدد الرسائل المطلوب: ${job.msg_count} (لا تقل عن ${job.msg_count - 2})`,
    `سياق الدرس:\n- الكورس: ${course?.title ?? "-"}\n- الوحدة ${lesson.unit}: ${unit?.name ?? "-"}\n- الدرس ${idx + 1}: ${lesson.title}\n- الدرس السابق: ${list[idx - 1]?.title ?? "لا يوجد"}\n- الدرس القادم: ${list[idx + 1]?.title ?? "لا يوجد"}`,
    `خطة كاملة لدروس الوحدة (لا تكرر محتواها، اكتفِ بالربط):\n${list.map((l, i) => `${i + 1}. ${l.title}`).join("\n")}`,
    "أعد أيضاً objectives و summary_points لهذا الدرس.",
    job.brief,
    job.article.trim() ? `المقال المصدر (التزم بمعلوماته):\n${job.article.trim()}` : "",
    `الشرح المطلوب:\n${lesson.title} — ${lesson.description ?? ""}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { user, cast, lessonId: lesson.id };
}

/** Run a single job end to end. Returns a short log line. */
async function runJob(job: JobRow): Promise<string> {
  const { user, cast, lessonId } = await buildPrompt(job);
  const system = job.mode === "physics" ? `${AI_LESSON_SYSTEM}\n\n${AI_PHYSICS_RULES}` : AI_LESSON_SYSTEM;
  const parsed = await callGateway(system, user);

  const steps = ((parsed["steps"] as AiStep[] | undefined) ?? []).filter(
    (s) => s && typeof s.content === "string",
  );
  if (!steps.length) throw new Error("لم يتم توليد أي رسائل");

  const strings = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : [];

  const rows = steps.map((s, i) => {
    const char = cast.find((c) => c.name.trim() === (s.character ?? "").trim());
    const isQ = s.kind === "question" && Array.isArray(s.choices) && s.choices.length >= 2;
    const isImg = s.kind === "image";
    const isVid = s.kind === "video";
    const isSim = s.kind === "simulation" && !!s.sim && Array.isArray(s.sim.vars) && s.sim.vars.length > 0;
    return {
      lesson_id: lessonId,
      order_index: i + 1,
      kind: isSim ? "simulation" : isQ ? "question" : isVid ? "video" : isImg ? "image" : "text",
      content: s.content,
      media_url: isImg ? DEFAULT_IMAGE : null,
      admin_note: s.admin_note?.trim() || null,
      character_id: char?.id ?? null,
      mood: MOOD_IDS.includes(s.mood) ? s.mood : "neutral",
      options: isSim
        ? { sim: s.sim }
        : isQ
          ? { choices: s.choices, answer: Math.max(0, Math.min((s.choices?.length ?? 1) - 1, s.answer ?? 0)) }
          : null,
    };
  });

  await supabaseAdmin.from("lesson_steps").delete().eq("lesson_id", lessonId);
  const { error } = await supabaseAdmin.from("lesson_steps").insert(rows as never);
  if (error) throw new Error(error.message);

  await supabaseAdmin
    .from("lessons")
    .update({
      objectives: strings(parsed["objectives"]),
      summary_points: strings(parsed["summary_points"]),
    } as never)
    .eq("id", lessonId);

  return `${rows.length} رسالة`;
}

/** Process up to `limit` pending jobs. Safe to call repeatedly. */
export async function processAiJobs(limit = 1): Promise<{ done: number; failed: number; log: string[] }> {
  const log: string[] = [];
  let done = 0;
  let failed = 0;

  for (let i = 0; i < limit; i++) {
    const { data: candidates } = await supabaseAdmin
      .from("ai_jobs")
      .select("id, lesson_id, msg_count, mode, character_ids, brief, article, attempts")
      .eq("status", "pending")
      .lt("attempts", 3)
      .order("priority")
      .order("created_at")
      .limit(1);

    const job = candidates?.[0] as JobRow | undefined;
    if (!job) break;

    // Claim it so parallel workers never pick the same lesson twice.
    const { data: claimed } = await supabaseAdmin
      .from("ai_jobs")
      .update({ status: "running", attempts: job.attempts + 1, updated_at: new Date().toISOString() } as never)
      .eq("id", job.id)
      .eq("status", "pending")
      .select("id");
    if (!claimed?.length) continue;

    try {
      const info = await runJob(job);
      await supabaseAdmin
        .from("ai_jobs")
        .update({ status: "done", error: null, updated_at: new Date().toISOString() } as never)
        .eq("id", job.id);
      done++;
      log.push(`✓ ${info}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطأ غير معروف";
      const status = (e as { status?: number }).status;
      // Credit / policy failures are terminal for this run — stop the queue.
      const terminal = status === 402 || status === 403 || status === 401;
      await supabaseAdmin
        .from("ai_jobs")
        .update({
          status: job.attempts + 1 >= 3 || terminal ? "error" : "pending",
          error: msg,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", job.id);
      failed++;
      log.push(`✗ ${msg}`);
      if (terminal || status === 429) break;
    }
  }

  return { done, failed, log };
}

export async function aiJobStats() {
  const { data } = await supabaseAdmin.from("ai_jobs").select("status");
  const rows = (data ?? []) as { status: string }[];
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  return {
    pending: count("pending"),
    running: count("running"),
    done: count("done"),
    error: count("error"),
    total: rows.length,
  };
}
