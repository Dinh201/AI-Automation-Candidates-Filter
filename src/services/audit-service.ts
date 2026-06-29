import { supabaseAdmin } from "@/lib/supabase-admin";

export type AuditAction =
  | "candidate_applied"
  | "candidate_scored"
  | "candidate_status_changed"
  | "candidate_deleted"
  | "interview_scheduled"
  | "interview_outcome";

interface AuditParams {
  entity_type: "candidate" | "interview" | "job";
  entity_id: string;
  entity_name?: string;
  action: AuditAction;
  details?: Record<string, unknown>;
}

export function logAudit(params: AuditParams): void {
  supabaseAdmin
    .from("audit_logs")
    .insert({
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      entity_name: params.entity_name ?? null,
      action: params.action,
      details: params.details ?? {},
    })
    .then(({ error }) => {
      if (error) console.error("[audit]", error.message);
    });
}
