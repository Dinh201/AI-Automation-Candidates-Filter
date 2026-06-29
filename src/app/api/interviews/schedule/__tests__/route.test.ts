// Mock tất cả external dependencies trước khi import route
jest.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

// Supabase mock — mỗi bảng trả về dữ liệu khác nhau
const mockCandidateData = {
  name: "Nguyễn Văn A",
  email: "candidate@test.com",
  jobs: { title: "Fullstack Developer" },
};

const mockInterviewData = {
  id: "interview-uuid-123",
  candidate_id: "candidate-uuid",
  start_time: "2025-01-15T09:00:00.000Z",
  end_time: "2025-01-15T09:45:00.000Z",
  status: "Scheduled",
};

const makeCandidatesMock = () => {
  // select chain: .select().eq().single()
  const selectChain = {
    single: jest.fn().mockResolvedValue({ data: mockCandidateData, error: null }),
    eq: jest.fn(),
  };
  selectChain.eq.mockReturnValue(selectChain);

  // update chain: .update().eq()  — the route awaits .eq() directly
  const updateChain = { eq: jest.fn().mockResolvedValue({ error: null }) };

  return {
    select: jest.fn().mockReturnValue(selectChain),
    update: jest.fn().mockReturnValue(updateChain),
  };
};

const makeTokensMock = () => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({
    data: {
      access_token: "valid-access-token",
      refresh_token: "valid-refresh-token",
      expiry: Date.now() + 3_600_000,
    },
    error: null,
  }),
});

// Module-level var — tests set this to simulate DB overlap
let mockOverlapData: { id: string; start_time: string; end_time: string }[] = [];

const makeInterviewsMock = () => {
  // Overlap check chain: .select().neq().lt().gt() → awaitable
  const overlapSelectChain = {
    neq: jest.fn(),
    lt: jest.fn(),
    gt: jest.fn().mockImplementation(() =>
      Promise.resolve({ data: mockOverlapData, error: null })
    ),
  };
  overlapSelectChain.neq.mockReturnValue(overlapSelectChain);
  overlapSelectChain.lt.mockReturnValue(overlapSelectChain);

  // Insert chain: .insert().select().single() → awaitable
  const insertChain = {
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: mockInterviewData, error: null }),
    }),
  };

  return {
    select: jest.fn().mockReturnValue(overlapSelectChain),
    insert: jest.fn().mockReturnValue(insertChain),
  };
};

const mockSupabaseFrom = jest.fn((table: string) => {
  if (table === "hr_calendar_tokens") return makeTokensMock();
  if (table === "candidates") return makeCandidatesMock();
  if (table === "interviews") return makeInterviewsMock();
  return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
});

jest.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: { from: mockSupabaseFrom },
}));

// Google Calendar mocks
const mockCheckFreeBusy = jest.fn();
const mockCreateCalendarEvent = jest.fn();
jest.mock("@/services/google-calendar-service", () => ({
  checkFreeBusy: mockCheckFreeBusy,
  createCalendarEvent: mockCreateCalendarEvent,
  refreshAccessToken: jest.fn(),
}));

// Email và audit mocks
jest.mock("@/services/email-service", () => ({
  sendInterviewInvitation: jest.fn().mockResolvedValue({ partial: false, errors: [] }),
}));
jest.mock("@/services/audit-service", () => ({
  logAudit: jest.fn(),
}));

import { POST } from "../route";

// ---------------------------------------------------------------------------
// Dữ liệu request hợp lệ dùng chung
// ---------------------------------------------------------------------------
const validBody = {
  candidate_id: "candidate-uuid",
  job_id: "job-uuid",
  interviewer_name: "Trần Thị B",
  interviewer_email: "hr@company.com",
  start_time: "2025-01-15T09:00:00+07:00",
  duration_minutes: 45,
  notes: "Tập trung phần system design",
};

function makeRequest(body: object) {
  return new Request("http://localhost/api/interviews/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
describe("POST /api/interviews/schedule — Validation", () => {
  it("trả về 400 khi thiếu candidate_id", async () => {
    const { candidate_id: _, ...body } = validBody;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("trả về 400 khi thiếu start_time", async () => {
    const { start_time: _, ...body } = validBody;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("trả về 400 khi thiếu duration_minutes", async () => {
    const { duration_minutes: _, ...body } = validBody;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("trả về 400 khi body không phải JSON hợp lệ", async () => {
    const req = new Request("http://localhost/api/interviews/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe("VALIDATION_ERROR");
  });
});

// ---------------------------------------------------------------------------
// DB-Level Conflict Detection — không cần Google Calendar
// ---------------------------------------------------------------------------
describe("POST /api/interviews/schedule — DB Conflict Check", () => {
  beforeEach(() => { mockOverlapData = []; });

  it("trả về 409 khi DB đã có buổi phỏng vấn trùng giờ", async () => {
    mockOverlapData = [{
      id: "existing-interview",
      start_time: "2025-01-15T07:00:00.000Z", // 14:00 VN
      end_time: "2025-01-15T08:31:00.000Z",   // 15:31 VN — overlap với validBody 09:00–09:45 UTC
    }];

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.code).toBe("SLOT_NOT_AVAILABLE");
    expect(data.error).toContain("trùng");
  });

  it("response chứa thông tin khung giờ bị trùng", async () => {
    mockOverlapData = [{
      id: "existing-interview",
      start_time: "2025-01-15T07:00:00.000Z",
      end_time: "2025-01-15T08:31:00.000Z",
    }];

    const res = await POST(makeRequest(validBody));
    const data = await res.json();
    expect(data.error).toMatch(/\d{2}:\d{2}.*\d{2}:\d{2}/);
  });

  it("cho phép đặt lịch khi không có buổi phỏng vấn trùng", async () => {
    mockOverlapData = []; // Trống
    mockCheckFreeBusy.mockResolvedValue([]);
    mockCreateCalendarEvent.mockResolvedValue({
      eventId: "event-789",
      meetLink: "https://meet.google.com/test",
      htmlLink: "https://calendar.google.com/event?eid=789",
    });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Conflict Detection — Case lịch bận qua Google Calendar
// ---------------------------------------------------------------------------
describe("POST /api/interviews/schedule — Conflict Detection", () => {
  beforeEach(() => { mockOverlapData = []; }); // DB trống → chỉ test Calendar logic
  it("trả về 409 SLOT_NOT_AVAILABLE khi Google Calendar bận", async () => {
    mockCheckFreeBusy.mockResolvedValue([
      { start: "2025-01-15T02:00:00Z", end: "2025-01-15T02:45:00Z" },
    ]);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.code).toBe("SLOT_NOT_AVAILABLE");
    expect(data.error).toContain("đã bận");
  });

  it("response chứa thông tin giờ bận cụ thể", async () => {
    mockCheckFreeBusy.mockResolvedValue([
      { start: "2025-01-15T02:00:00Z", end: "2025-01-15T02:45:00Z" },
    ]);

    const res = await POST(makeRequest(validBody));
    const data = await res.json();
    // Message phải chứa khung giờ bận
    expect(data.error).toMatch(/\d{2}:\d{2}.*\d{2}:\d{2}/);
  });

  it("không tạo calendar event khi slot đã bận", async () => {
    mockCheckFreeBusy.mockResolvedValue([
      { start: "2025-01-15T02:00:00Z", end: "2025-01-15T02:45:00Z" },
    ]);

    await POST(makeRequest(validBody));
    expect(mockCreateCalendarEvent).not.toHaveBeenCalled();
  });

  it("tiếp tục đặt lịch khi freeBusy API lỗi (graceful degradation)", async () => {
    mockCheckFreeBusy.mockRejectedValue(new Error("Token lacks calendar.readonly scope"));
    mockCreateCalendarEvent.mockResolvedValue({
      eventId: "event-123",
      meetLink: "https://meet.google.com/abc-defg-hij",
      htmlLink: "https://calendar.google.com/event?eid=123",
    });

    const res = await POST(makeRequest(validBody));
    // Phải thành công dù freeBusy thất bại
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("trả về 200 và tạo event khi lịch trống", async () => {
    mockCheckFreeBusy.mockResolvedValue([]); // Lịch trống
    mockCreateCalendarEvent.mockResolvedValue({
      eventId: "event-456",
      meetLink: "https://meet.google.com/xyz-1234-abc",
      htmlLink: "https://calendar.google.com/event?eid=456",
    });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.calendar_connected).toBe(true);
    expect(data.meet_link).toBe("https://meet.google.com/xyz-1234-abc");
  });
});