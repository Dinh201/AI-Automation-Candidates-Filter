import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { translateScoringResult } from "@/services/ai/scoring";
import { CandidateScoringResult } from "@/services/ai/schema";

type Params = { params: Promise<{ id: string }> };

// Dịch kết quả chấm điểm AI sang tiếng Việt (cache trong cột ai_score_result_vi
// để không gọi lại AI mỗi lần HR mở box "Xem bản dịch tiếng Việt").
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  const { data: candidate, error } = await supabaseAdmin
    .from("candidates")
    .select("ai_score_result, ai_score_result_vi")
    .eq("id", id)
    .single();

  if (error || !candidate) {
    return NextResponse.json({ error: "Không tìm thấy ứng viên", code: "NOT_FOUND" }, { status: 404 });
  }

  if (candidate.ai_score_result_vi) {
    return NextResponse.json({ translation: candidate.ai_score_result_vi });
  }

  const ai = candidate.ai_score_result as CandidateScoringResult | null;
  if (!ai) {
    return NextResponse.json(
      { error: "Ứng viên chưa có kết quả chấm điểm AI để dịch", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  try {
    const translation = await translateScoringResult({
      candidate_summary: ai.candidate_summary,
      evaluation_reason: ai.evaluation_reason,
      hiring_risks: ai.hiring_risks,
      strengths: ai.strengths,
      weaknesses: ai.weaknesses,
      missing_information: ai.missing_information,
      recommended_interview_questions: ai.recommended_interview_questions,
      evidence: ai.evidence,
    });

    await supabaseAdmin
      .from("candidates")
      .update({ ai_score_result_vi: translation })
      .eq("id", id);

    return NextResponse.json({ translation });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[translate-score] Lỗi dịch:", message);
    return NextResponse.json(
      { error: "Không dịch được kết quả. Vui lòng thử lại.", code: "AI_SCORING_FAILED" },
      { status: 500 }
    );
  }
}
