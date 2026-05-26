import { z } from "zod";

export const candidateScoringSchema = z.object({
  total_score: z.number().describe("Tổng điểm của ứng viên (Thang điểm 0-10)"),
  cultural_fit_score: z.number().describe("Điểm độ phù hợp văn hóa (0-10)"),
  job_fit_score: z.number().describe("Điểm mức độ đáp ứng công việc (0-10)"),
  potential_score: z.number().describe("Điểm tiềm năng phát triển (0-10)"),
  final_decision: z.enum(["STRONG HIRE", "HIRE", "CONSIDER", "REJECT"]).describe("Quyết định cuối cùng dựa trên điểm số và rủi ro"),
  candidate_summary: z.string().describe("Tóm tắt ngắn gọn về ứng viên"),
  evaluation_reason: z.string().describe("Lý do chính cho điểm số và quyết định đưa ra"),
  hiring_risks: z.array(z.string()).describe("Các rủi ro khi tuyển dụng (VD: Job hopping, trái ngành, giao tiếp kém)"),
  strengths: z.array(z.string()).describe("Điểm mạnh nổi bật"),
  weaknesses: z.array(z.string()).describe("Điểm yếu hoặc kỹ năng còn thiếu"),
  missing_information: z.array(z.string()).describe("Các thông tin quan trọng bị thiếu trong CV (nếu có)"),
  recommended_interview_questions: z.array(z.string()).describe("Đề xuất câu hỏi phỏng vấn dựa trên CV và rủi ro"),
  confidence_level: z.enum(["High", "Medium", "Low"]).describe("Độ tự tin của AI vào đánh giá này. Nếu thiếu nhiều thông tin, set là Low"),
  evidence: z.object({
    skills_evidence: z.array(z.string()).describe("Trích dẫn minh chứng cho kỹ năng từ CV"),
    experience_evidence: z.array(z.string()).describe("Trích dẫn minh chứng cho kinh nghiệm từ CV"),
    culture_evidence: z.array(z.string()).describe("Trích dẫn minh chứng cho văn hóa (nhảy việc, cách trình bày)"),
    potential_evidence: z.array(z.string()).describe("Trích dẫn minh chứng cho tiềm năng (portfolio, thăng tiến)")
  })
});

export type CandidateScoringResult = z.infer<typeof candidateScoringSchema>;
