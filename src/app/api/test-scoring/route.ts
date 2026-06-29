import { NextResponse } from "next/server";
import { scoreCandidate } from "@/services/ai/scoring";

// Route chỉ dùng để test AI scoring — xóa trước khi deploy production
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      jobDescription = "",
      requiredSkills = "",
      preferredSkills = "",
      experienceRequirement = "",
      customRubric = "",
      formAnswers = "",
      cvText = "",
    } = body;

    const result = await scoreCandidate({
      jobDescription,
      requiredSkills,
      preferredSkills,
      experienceRequirement,
      customRubric,
      formAnswers,
      cvText,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
