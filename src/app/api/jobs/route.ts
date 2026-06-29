import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = supabase.from("jobs").select("*").order("created_at", { ascending: false });
    if (status && status !== "all") query = query.eq("status", status);

    const { data: jobs, error } = await query;

    if (error) {
      console.error("Lỗi lấy danh sách job:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ jobs });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, required_skills, preferred_skills, experience_requirement, benefits, rubric, status } = body;

    if (!title || !description || !required_skills) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc: title, description, required_skills", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { data: newJob, error } = await supabaseAdmin
      .from("jobs")
      .insert([
        {
          title,
          description,
          required_skills,
          preferred_skills: preferred_skills || "",
          experience_requirement: experience_requirement || "",
          benefits: benefits || "",
          rubric: rubric || {
            job_fit_weight: 0.5,
            potential_weight: 0.3,
            cultural_fit_weight: 0.2,
            notes: "",
          },
          status: status || "Open",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Lỗi tạo job:", error);
      return NextResponse.json({ error: error.message, code: "DATABASE_ERROR" }, { status: 500 });
    }

    return NextResponse.json({ job: newJob }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
