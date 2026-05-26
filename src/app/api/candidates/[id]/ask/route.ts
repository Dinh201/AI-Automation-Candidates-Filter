import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let question: string;
  try {
    const body = await request.json();
    question = body.question?.trim();
    if (!question) throw new Error();
  } catch {
    return NextResponse.json(
      { error: "Thiếu câu hỏi", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const { data: candidate, error } = await supabase
    .from("candidates")
    .select("*, jobs(*)")
    .eq("id", id)
    .single();

  if (error || !candidate) {
    return NextResponse.json({ error: "Không tìm thấy ứng viên", code: "NOT_FOUND" }, { status: 404 });
  }

  const ai = candidate.ai_score_result;
  const job = candidate.jobs;

  const context = [
    `Ứng viên: ${candidate.name}`,
    `Email: ${candidate.email}`,
    `Vị trí ứng tuyển: ${job?.title ?? "Không rõ"}`,
    ai
      ? [
          `Tổng điểm: ${ai.total_score}/10`,
          `Job Fit: ${ai.job_fit_score}/10 | Potential: ${ai.potential_score}/10 | Cultural Fit: ${ai.cultural_fit_score}/10`,
          `Quyết định AI: ${ai.final_decision}`,
          `Tóm tắt: ${ai.candidate_summary}`,
          `Điểm mạnh: ${ai.strengths?.join(", ") ?? "—"}`,
          `Điểm yếu: ${ai.weaknesses?.join(", ") ?? "—"}`,
          `Rủi ro: ${ai.hiring_risks?.join(", ") ?? "—"}`,
          `Thông tin thiếu: ${ai.missing_information?.join(", ") ?? "—"}`,
          `Bằng chứng kỹ năng: ${ai.evidence?.skills_evidence?.join("; ") ?? "—"}`,
          `Bằng chứng kinh nghiệm: ${ai.evidence?.experience_evidence?.join("; ") ?? "—"}`,
        ].join("\n")
      : "Chưa có kết quả AI scoring.",
    job
      ? `\nMô tả công việc: ${job.description}\nKỹ năng yêu cầu: ${job.required_skills}`
      : "",
  ].join("\n");

  const systemPrompt = `Bạn là trợ lý AI chuyên về tuyển dụng của hệ thống AutoFilter.
Bạn đang hỗ trợ HR đánh giá ứng viên dựa trên dữ liệu đã phân tích.
Trả lời ngắn gọn, chính xác, bằng tiếng Việt. Dựa vào dữ liệu có sẵn, không bịa đặt.
Nếu không đủ dữ liệu để trả lời, hãy nói rõ điều đó.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Dữ liệu ứng viên:\n${context}\n\nCâu hỏi HR: ${question}` },
      ],
      max_tokens: 500,
      temperature: 0.4,
    });

    const answer = completion.choices[0]?.message?.content ?? "Không có phản hồi từ AI.";
    return NextResponse.json({ answer });
  } catch (err) {
    console.error("Ask AI error:", err);
    return NextResponse.json(
      { error: "AI không phản hồi được", code: "AI_SCORING_FAILED" },
      { status: 500 }
    );
  }
}
