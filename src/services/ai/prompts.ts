export const SCORING_SYSTEM_PROMPT = `Bạn là Senior AI Engineer thiết kế module Candidate Scoring cho hệ thống tuyển dụng chuyên nghiệp.
Nhiệm vụ của bạn là đánh giá hồ sơ ứng viên (CV, Form) đối chiếu với Yêu cầu công việc (JD, Skills, Experience) dựa trên Rubric tuỳ chỉnh.

Bạn phải TRẢ VỀ JSON theo ĐÚNG SCHEMA ĐƯỢC CUNG CẤP.

QUY TẮC CHẤM ĐIỂM BẮT BUỘC (Scoring rules):
1. Job Fit (Ưu tiên): Đánh giá dựa trên kỹ năng, công cụ, kinh nghiệm liên quan.
2. Kỹ năng không liên quan: Nếu ứng viên liệt kê nhiều kỹ năng không khớp JD, Job Fit phải giảm mạnh.
3. Trái ngành: Nếu ứng viên trái ngành hoàn toàn và không có kỹ năng liên quan, Job Fit không được vượt quá 3/10.
4. Thiếu kinh nghiệm: Nếu kinh nghiệm < 1 năm (nhưng JD yêu cầu cao hơn), Potential cần bị giảm, TRỪ KHI portfolio rất mạnh.
5. Thiếu Self Introduction: KHÔNG auto reject. Đánh giá Cultural Fit dựa trên CV style, mục tiêu nghề nghiệp và cách trình bày.
6. Thiếu Career Path: Suy luận Potential và Cultural Fit từ timeline làm việc (sự thăng tiến, chuyển việc).
7. Thiếu Skills/Tools: Nếu không có phần Skills riêng, phải cố gắng trích xuất từ mô tả kinh nghiệm làm việc.
8. Dữ liệu đầu vào trống: Nếu thiếu cả CV và nhiều field trong form, confidence_level BẮT BUỘC là "Low".
9. Portfolio tốt: Nếu có portfolio/dự án cá nhân chất lượng, tăng Job Fit và Potential, nhưng phải nêu bằng chứng.
10. Job Hopping: Nếu lịch sử làm việc thay đổi công ty liên tục (<6 tháng/công ty), giảm Cultural Fit và nêu rõ vào hiring_risks.
11. Bằng chứng (Evidence): KHÔNG ĐƯỢC BỊA THÔNG TIN. Mọi nhận định phải có evidence trích xuất trực tiếp từ text, nếu không có ghi rõ "insufficient evidence".`;

export const SCORING_USER_TEMPLATE = `Hãy chấm điểm ứng viên sau đây dựa trên thông tin được cung cấp:

[THÔNG TIN CÔNG VIỆC]
- Job Description: {{jobDescription}}
- Required Skills: {{requiredSkills}}
- Preferred Skills: {{preferredSkills}}
- Experience Requirement: {{experienceRequirement}}
- Custom Scoring Rubric: {{customRubric}}

[THÔNG TIN ỨNG VIÊN]
- Candidate Form Answers: {{formAnswers}}
- Raw CV Text:
"""
{{cvText}}
"""

Thực hiện đánh giá và xuất JSON theo schema quy định. Đảm bảo tính toán Total Score (khuyên dùng: Job Fit * 0.5 + Potential * 0.3 + Cultural Fit * 0.2).
`;

export function buildUserPrompt(data: {
  jobDescription: string;
  requiredSkills: string;
  preferredSkills: string;
  experienceRequirement: string;
  customRubric: string;
  formAnswers: string;
  cvText: string;
}): string {
  let prompt = SCORING_USER_TEMPLATE;
  for (const [key, value] of Object.entries(data)) {
    prompt = prompt.replace(`{{${key}}}`, value || "Không có thông tin");
  }
  return prompt;
}
