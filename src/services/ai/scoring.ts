import { OpenAI } from "openai";
import { candidateScoringSchema, CandidateScoringResult } from "./schema";
import { SCORING_SYSTEM_PROMPT, buildUserPrompt } from "./prompts";

// Khởi tạo client. Trong thực tế sẽ lấy từ môi trường process.env.OPENAI_API_KEY
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key",
});

interface ScoringInput {
  jobDescription: string;
  requiredSkills: string;
  preferredSkills: string;
  experienceRequirement: string;
  customRubric: string;
  formAnswers: string;
  cvText: string;
}

/**
 * Hàm gọi OpenAI API với Retry Logic (Exponential Backoff)
 */
export async function scoreCandidate(
  input: ScoringInput,
  maxRetries = 3
): Promise<CandidateScoringResult> {
  const userPrompt = buildUserPrompt(input);
  
  // Convert Zod schema to JSON schema string (simplified for prompt injection if not using strict mode)
  // In a real implementation with OpenAI SDK v4.50+, you can use `zodResponseFormat` directly.
  const schemaDescription = `Bắt buộc trả về JSON với cấu trúc chính xác như sau:
{
  "total_score": number,
  "cultural_fit_score": number,
  "job_fit_score": number,
  "potential_score": number,
  "final_decision": "STRONG HIRE" | "HIRE" | "CONSIDER" | "REJECT",
  "candidate_summary": string,
  "evaluation_reason": string,
  "hiring_risks": string[],
  "strengths": string[],
  "weaknesses": string[],
  "missing_information": string[],
  "recommended_interview_questions": string[],
  "confidence_level": "High" | "Medium" | "Low",
  "evidence": {
    "skills_evidence": string[],
    "experience_evidence": string[],
    "culture_evidence": string[],
    "potential_evidence": string[]
  }
}`;

  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Sử dụng model hỗ trợ tốt JSON
        temperature: 0.1, // Nhiệt độ thấp để kết quả nhất quán
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SCORING_SYSTEM_PROMPT + "\n\n" + schemaDescription },
          { role: "user", content: userPrompt }
        ],
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("OpenAI trả về nội dung rỗng.");
      }

      // Parse JSON
      const parsedJson = JSON.parse(content);
      
      // Validate schema bằng Zod
      const validationResult = candidateScoringSchema.safeParse(parsedJson);
      
      if (!validationResult.success) {
        console.error("Zod Validation Error:", validationResult.error.format());
        throw new Error("Dữ liệu JSON không khớp với Schema yêu cầu.");
      }

      return validationResult.data;
      
    } catch (error: unknown) {
      attempt++;
      console.warn(`Attempt ${attempt} failed: ${(error as Error).message}`);
      
      if (attempt >= maxRetries) {
        throw new Error(`Đã thử ${maxRetries} lần nhưng vẫn lỗi AI Candidate Scoring. Lỗi cuối: ${(error as Error).message}`);
      }
      
      // Exponential backoff: chờ 1s, 2s, 4s...
      const waitTime = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error("Lỗi không xác định trong luồng retry.");
}
