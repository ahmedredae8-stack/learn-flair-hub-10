import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Queue AI writing for the lessons of a course. */
export async function enqueueCourseLessons(opts: {
  courseId: string;
  msgCount: number;
  onlyEmpty: boolean;
  characterIds: string[];
  article: string;
}) {
  const [{ data: course }, { data: lessons }, { data: units }] = await Promise.all([
    supabaseAdmin.from("courses").select("title").eq("id", opts.courseId).maybeSingle(),
    supabaseAdmin
      .from("lessons")
      .select("id, title, unit, order_index")
      .eq("course_id", opts.courseId)
      .order("unit")
      .order("order_index"),
    supabaseAdmin.from("units").select("number, name").eq("course_id", opts.courseId),
  ]);

  const all = lessons ?? [];
  let targets = all;
  if (opts.onlyEmpty) {
    const { data: steps } = await supabaseAdmin
      .from("lesson_steps")
      .select("lesson_id")
      .in("lesson_id", all.map((l) => l.id));
    const counts = new Map<string, number>();
    for (const s of steps ?? []) counts.set(s.lesson_id, (counts.get(s.lesson_id) ?? 0) + 1);
    targets = all.filter((l) => (counts.get(l.id) ?? 0) < 15);
  }
  if (!targets.length) return { queued: 0 };

  const unitName = new Map((units ?? []).map((u) => [u.number, u.name]));
  const isPhysics = /فيزيا/.test(course?.title ?? "");

  const rows = targets.map((l) => ({
    lesson_id: l.id,
    msg_count: opts.msgCount,
    mode: isPhysics ? "physics" : "chat",
    character_ids: opts.characterIds,
    article: opts.article,
    status: "pending",
    attempts: 0,
    error: null,
    brief: `${course?.title ?? ""} — الوحدة ${l.unit}: ${unitName.get(l.unit) ?? ""}. درس «${l.title}». محتوى جديد ومترابط مع بقية دروس الوحدة، شرح مبسط جداً وأمثلة عملية.`,
  }));

  const { error } = await supabaseAdmin
    .from("ai_jobs")
    .upsert(rows as never, { onConflict: "lesson_id" });
  if (error) throw new Error(error.message);
  return { queued: rows.length };
}

/** Publish every draft lesson of a course. */
export async function publishAllLessons(courseId: string) {
  const { data, error } = await supabaseAdmin
    .from("lessons")
    .update({ status: "published" } as never)
    .eq("course_id", courseId)
    .neq("status", "published")
    .select("id");
  if (error) throw new Error(error.message);
  await supabaseAdmin.from("courses").update({ status: "published" } as never).eq("id", courseId);
  return { published: data?.length ?? 0 };
}
