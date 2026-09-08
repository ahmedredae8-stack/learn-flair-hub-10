import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/**
 * Background worker endpoint: processes queued lesson-writing jobs.
 * Accepts either the platform cron credential or the private database job
 * token used by the scheduled database job, so generation keeps running with
 * nobody watching.
 */
export const Route = createFileRoute("/api/public/ai-jobs-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-job-token");
        let allowed = false;

        if (token) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin
            .from("job_secrets")
            .select("token")
            .eq("name", "ai_jobs_tick")
            .maybeSingle();
          const expected = (data as { token?: string } | null)?.token;
          allowed = Boolean(expected) && token.length === expected!.length && token === expected;
        }

        if (!allowed) {
          const denied = await authenticateCronRequest(request);
          if (denied) return denied;
        }

        const { processAiJobs } = await import("@/lib/ai-jobs.server");
        const result = await processAiJobs(3);
        return Response.json(result);
      },
    },
  },
});
