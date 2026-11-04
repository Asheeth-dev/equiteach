import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import { calculateResult, metrics } from "@/lib/evaluation";
import type { EvaluationRecord } from "@/lib/progress";

const evaluationInput = z.object({
  teacherName: z.string().trim().min(2).max(80),
  classSubject: z.string().trim().min(2).max(100),
  mode: z.enum(["recruitment", "in_service"]),
  scores: z.array(z.number().int().min(1).max(5)).length(10),
});

export const saveEvaluation = createServerFn({ method: "POST" })
  .inputValidator((input) => evaluationInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
    const url = process.env['SUPABASE_URL']!;
    const db = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });
    const result = calculateResult(data.scores, data.mode);
    const scores = Object.fromEntries(metrics.map((metric, index) => [metric.name, data.scores[index]]));
    const { error } = await db.from("evaluations").insert({
      teacher_name: data.teacherName,
      class_subject: data.classSubject,
      mode: data.mode,
      scores,
      total_score: result.total,
      tier: result.tier,
      verdict: result.verdict,
      focus_metric: result.focus.name,
    });

    if (error) throw new Error(`Could not save evaluation: ${error.message}`);
    return {
      ...result,
      focus: result.focus.name,
      action: result.focus.action,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
  });

export const getEvaluationHistory = createServerFn({ method: "GET" }).handler(async () => {
  // Evaluation rows carry no private data (anonymous demo observations) and
  // anon SELECT is revoked, so the privileged client stays inside this handler.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("evaluations")
    .select("id, teacher_name, class_subject, mode, scores, total_score, tier, verdict, focus_metric, created_at")
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) throw new Error(`Could not load evaluation history: ${error.message}`);

  const records: EvaluationRecord[] = (data ?? []).map((row) => {
    const scores: Record<string, number> = {};
    const raw = (row.scores ?? {}) as Record<string, unknown>;
    for (const metric of metrics) {
      const value = raw[metric.name];
      if (typeof value === "number") scores[metric.name] = value;
    }
    return {
      id: row.id,
      teacherName: row.teacher_name,
      classSubject: row.class_subject,
      mode: row.mode,
      scores,
      totalScore: row.total_score,
      tier: row.tier,
      verdict: row.verdict,
      focusMetric: row.focus_metric,
      createdAt: row.created_at,
    };
  });

  return { records };
});