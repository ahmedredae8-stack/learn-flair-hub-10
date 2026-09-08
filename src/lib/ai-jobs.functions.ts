import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Queue statistics for the admin content factory. */
export const getAiJobStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdminId } = await import("./admin-guard.server");
    const { aiJobStats } = await import("./ai-jobs.server");
    await assertAdminId((context as { userId: string }).userId);
    return aiJobStats();
  });

/** Process a few queued lessons. Called by the admin panel and by cron. */
export const runAiJobs = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ limit: z.number().int().min(1).max(5).default(1) }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdminId } = await import("./admin-guard.server");
    const { processAiJobs } = await import("./ai-jobs.server");
    await assertAdminId((context as { userId: string }).userId);
    return processAiJobs(data.limit);
  });

/** Queue AI writing for every lesson of a course (optionally only empty ones). */
export const enqueueCourse = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        courseId: z.string().uuid(),
        msgCount: z.number().int().min(5).max(30).default(18),
        onlyEmpty: z.boolean().default(true),
        characterIds: z.array(z.string().uuid()).default([]),
        article: z.string().default(""),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdminId } = await import("./admin-guard.server");
    const { enqueueCourseLessons } = await import("./ai-jobs-admin.server");
    await assertAdminId((context as { userId: string }).userId);
    return enqueueCourseLessons(data);
  });

/** Publish every lesson of a course in one click. */
export const publishCourse = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ courseId: z.string().uuid() }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdminId } = await import("./admin-guard.server");
    const { publishAllLessons } = await import("./ai-jobs-admin.server");
    await assertAdminId((context as { userId: string }).userId);
    return publishAllLessons(data.courseId);
  });
