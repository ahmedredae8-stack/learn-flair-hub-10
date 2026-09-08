import { createFileRoute } from "@tanstack/react-router";

/**
 * Token-protected content API so an external tool (or another assistant
 * session) can read and edit course content without database credentials.
 *
 * POST /api/public/content-api
 * Header: x-content-token: <token stored in job_secrets.name = 'content_api'>
 * Body:   { action, table, ... }
 */

const TABLES = [
  "courses",
  "units",
  "lessons",
  "lesson_steps",
  "characters",
  "site_settings",
] as const;

type Table = (typeof TABLES)[number];

type Body = {
  action?: "select" | "insert" | "update" | "delete";
  table?: string;
  columns?: string;
  match?: Record<string, unknown>;
  values?: Record<string, unknown> | Record<string, unknown>[];
  order?: { column: string; ascending?: boolean };
  limit?: number;
};

function bad(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export const Route = createFileRoute("/api/public/content-api")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-content-token") ?? "";
        if (!token) return bad("missing token", 401);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: secret } = await supabaseAdmin
          .from("job_secrets")
          .select("token")
          .eq("name", "content_api")
          .maybeSingle();

        const expected = (secret as { token?: string } | null)?.token;
        if (!expected || token.length !== expected.length || token !== expected) {
          return bad("invalid token", 401);
        }

        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return bad("invalid JSON body");
        }

        const table = body.table as Table | undefined;
        if (!table || !TABLES.includes(table)) {
          return bad(`table must be one of: ${TABLES.join(", ")}`);
        }

        const action = body.action ?? "select";
        const applyMatch = <T extends { eq: (c: string, v: unknown) => T }>(q: T) => {
          for (const [key, value] of Object.entries(body.match ?? {})) q = q.eq(key, value);
          return q;
        };

        try {
          if (action === "select") {
            let query = supabaseAdmin.from(table).select(body.columns ?? "*") as any;
            query = applyMatch(query);
            if (body.order) {
              query = query.order(body.order.column, { ascending: body.order.ascending ?? true });
            }
            query = query.limit(Math.min(body.limit ?? 200, 1000));
            const { data, error } = await query;
            if (error) return bad(error.message, 500);
            return Response.json({ rows: data });
          }

          if (action === "insert") {
            if (!body.values) return bad("values required");
            const { data, error } = await (supabaseAdmin.from(table) as any)
              .insert(body.values)
              .select();
            if (error) return bad(error.message, 500);
            return Response.json({ rows: data });
          }

          if (action === "update") {
            if (!body.values || Array.isArray(body.values)) return bad("values object required");
            if (!body.match || Object.keys(body.match).length === 0) {
              return bad("match required for update");
            }
            let query = (supabaseAdmin.from(table) as any).update(body.values);
            query = applyMatch(query);
            const { data, error } = await query.select();
            if (error) return bad(error.message, 500);
            return Response.json({ rows: data });
          }

          if (action === "delete") {
            if (!body.match || Object.keys(body.match).length === 0) {
              return bad("match required for delete");
            }
            let query = (supabaseAdmin.from(table) as any).delete();
            query = applyMatch(query);
            const { data, error } = await query.select();
            if (error) return bad(error.message, 500);
            return Response.json({ rows: data });
          }

          return bad("unknown action");
        } catch (err) {
          return bad(err instanceof Error ? err.message : "unexpected error", 500);
        }
      },
    },
  },
});
