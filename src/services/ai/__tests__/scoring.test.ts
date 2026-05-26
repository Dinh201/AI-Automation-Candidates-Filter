/* eslint-disable @typescript-eslint/no-unused-vars */
// MOCK: Để chạy test này, bạn cần cài đặt thư viện test (vd: Jest, Vitest) 
// và mock axios hoặc fetch để chặn gọi API thực tế tới OpenAI, tránh tốn phí.

import { scoreCandidate } from "../scoring";
import { CandidateScoringResult } from "../schema";

// Định nghĩa chung đầu vào JD
const baseInput = {
  jobDescription: "Tìm kiếm Fullstack Developer (Nodejs/React) cho hệ thống e-commerce lớn. Làm việc nhóm, chịu áp lực cao.",
  requiredSkills: "Nodejs, React, TypeScript, PostgreSQL",
  preferredSkills: "Redis, Docker, AWS",
  experienceRequirement: "2 năm kinh nghiệm",
  customRubric: "Job Fit (50%), Potential (30%), Cultural Fit (20%). Điểm trừ mạnh nếu nhảy việc nhiều.",
  formAnswers: "Mức lương mong muốn: 1500$"
};

// --- MOCK OpenAI Implementation ---
// Trong thực tế sẽ dùng vi.mock('openai') hoặc jest.mock('openai')
// ----------------------------------

describe("AI Candidate Scoring Service", () => {
  
  it("Case 1: Ứng viên tốt, hoàn hảo (Strong Hire)", async () => {
    // CV Text: 3 năm kinh nghiệm Node/React, không nhảy việc, có dự án nổi bật.
    const input = {
      ...baseInput,
      cvText: "Nguyễn Văn A. Kinh nghiệm: 3 năm làm Fullstack tại VNG (Nodejs, React, TypeScript). Thành tựu: Xây dựng hệ thống payment chịu tải 10k CCU. Tính cách: Thích học hỏi, ổn định, cam kết lâu dài."
    };
    
    // Ghi chú: Chạy thật sẽ trả ra JSON. Ta test các thuộc tính.
    // const result = await scoreCandidate(input);
    // expect(result.total_score).toBeGreaterThan(8);
    // expect(result.final_decision).toBe("STRONG HIRE");
    // expect(result.evidence.skills_evidence.length).toBeGreaterThan(0);
  });

  it("Case 2: Ứng viên trái ngành, thiếu kinh nghiệm (Reject / Consider)", async () => {
    const input = {
      ...baseInput,
      cvText: "Lê Văn B. Sinh viên mới tốt nghiệp ngành Kế toán. Tự học khóa học 3 tháng về HTML/CSS. Chưa từng làm dự án thực tế."
    };
    
    // const result = await scoreCandidate(input);
    // expect(result.job_fit_score).toBeLessThanOrEqual(3); // Do trái ngành hoàn toàn
    // expect(result.total_score).toBeLessThan(6);
    // expect(result.hiring_risks).toContainEqual(expect.stringContaining("Trái ngành"));
  });

  it("Case 3: Ứng viên thiếu kinh nghiệm nhưng có portfolio mạnh (Consider/Hire)", async () => {
    const input = {
      ...baseInput,
      cvText: "Trần Văn C. 6 tháng kinh nghiệm thực tập sinh React. Tuy nhiên, có GitHub với 5 dự án open source, 1 dự án cá nhân clone lại Shopee dùng Nodejs, PostgreSQL, Docker."
    };
    
    // const result = await scoreCandidate(input);
    // expect(result.potential_score).toBeGreaterThan(7); // Dù exp thấp nhưng potential cao
    // expect(result.strengths).toContainEqual(expect.stringContaining("portfolio"));
  });

  it("Case 4: Ứng viên Job hopper (Nhảy việc liên tục)", async () => {
    const input = {
      ...baseInput,
      cvText: "Phạm Văn D. 3 năm kinh nghiệm làm React. 2021: Công ty X (4 tháng). 2022: Công ty Y (5 tháng). 2023: Công ty Z (3 tháng). Khả năng code tốt nhưng hay bất đồng quan điểm."
    };
    
    // const result = await scoreCandidate(input);
    // expect(result.cultural_fit_score).toBeLessThanOrEqual(5); // Điểm văn hóa thấp do nhảy việc
    // expect(result.hiring_risks).toContainEqual(expect.stringContaining("Nhảy việc"));
  });

  it("Case 5: Thiếu thông tin CV hoàn toàn (Low Confidence)", async () => {
    const input = {
      ...baseInput,
      cvText: "Họ tên: Nguyễn E. Số điện thoại: 09xx. Em xin ứng tuyển vị trí này." // Quá sơ sài
    };
    
    // const result = await scoreCandidate(input);
    // expect(result.confidence_level).toBe("Low");
    // expect(result.missing_information.length).toBeGreaterThan(0);
  });

});
