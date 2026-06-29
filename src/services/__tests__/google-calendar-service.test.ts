import {
  buildOAuthUrl,
  checkFreeBusy,
  refreshAccessToken,
  GoogleTokens,
} from "../google-calendar-service";

const mockTokens: GoogleTokens = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expiry: Date.now() + 3_600_000,
};

beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/calendar/callback";
});

// ---------------------------------------------------------------------------
// buildOAuthUrl
// ---------------------------------------------------------------------------
describe("buildOAuthUrl", () => {
  it("trả về URL Google OAuth hợp lệ", () => {
    const url = buildOAuthUrl();
    expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
  });

  it("bao gồm scope calendar.readonly để query freeBusy", () => {
    const url = buildOAuthUrl();
    expect(decodeURIComponent(url)).toContain("calendar.readonly");
  });

  it("bao gồm scope calendar.events để tạo sự kiện", () => {
    const url = buildOAuthUrl();
    expect(decodeURIComponent(url)).toContain("calendar.events");
  });

  it("yêu cầu offline access để nhận refresh token", () => {
    const url = buildOAuthUrl();
    expect(url).toContain("access_type=offline");
  });

  it("chứa client_id từ env", () => {
    const url = buildOAuthUrl();
    expect(url).toContain("test-client-id");
  });
});

// ---------------------------------------------------------------------------
// checkFreeBusy
// ---------------------------------------------------------------------------
describe("checkFreeBusy", () => {
  const start = new Date("2025-01-15T09:00:00Z");
  const end = new Date("2025-01-15T09:45:00Z");

  it("trả về danh sách busy periods khi lịch bận", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        calendars: {
          primary: {
            busy: [
              { start: "2025-01-15T09:00:00Z", end: "2025-01-15T09:45:00Z" },
            ],
          },
        },
      }),
    }) as jest.Mock;

    const result = await checkFreeBusy(mockTokens, start, end);

    expect(result).toHaveLength(1);
    expect(result[0].start).toBe("2025-01-15T09:00:00Z");
    expect(result[0].end).toBe("2025-01-15T09:45:00Z");
  });

  it("trả về mảng rỗng khi lịch trống", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        calendars: { primary: { busy: [] } },
      }),
    }) as jest.Mock;

    const result = await checkFreeBusy(mockTokens, start, end);
    expect(result).toHaveLength(0);
  });

  it("trả về mảng rỗng khi response không có field busy", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        calendars: { primary: {} },
      }),
    }) as jest.Mock;

    const result = await checkFreeBusy(mockTokens, start, end);
    expect(result).toHaveLength(0);
  });

  it("throw lỗi khi Google API trả về status không OK", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      text: async () => "Unauthorized - token expired",
    }) as jest.Mock;

    await expect(checkFreeBusy(mockTokens, start, end)).rejects.toThrow(
      "FreeBusy check failed"
    );
  });

  it("gọi đúng endpoint và truyền Authorization header", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ calendars: { primary: { busy: [] } } }),
    }) as jest.Mock;
    global.fetch = mockFetch;

    await checkFreeBusy(mockTokens, start, end);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/freeBusy"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Bearer ${mockTokens.access_token}`,
        }),
      })
    );
  });

  it("dùng calendarId tùy chỉnh khi được truyền vào", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        calendars: { "custom@group.calendar.google.com": { busy: [] } },
      }),
    }) as jest.Mock;
    global.fetch = mockFetch;

    const result = await checkFreeBusy(
      mockTokens,
      start,
      end,
      "custom@group.calendar.google.com"
    );
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// refreshAccessToken
// ---------------------------------------------------------------------------
describe("refreshAccessToken", () => {
  it("trả về token mới sau khi refresh thành công", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "new-access-token",
        expires_in: 3600,
      }),
    }) as jest.Mock;

    const result = await refreshAccessToken("mock-refresh-token");

    expect(result.access_token).toBe("new-access-token");
    expect(result.refresh_token).toBe("mock-refresh-token");
    expect(result.expiry).toBeGreaterThan(Date.now());
  });

  it("throw lỗi khi Google từ chối refresh token", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      text: async () => "invalid_grant",
    }) as jest.Mock;

    await expect(refreshAccessToken("expired-refresh-token")).rejects.toThrow(
      "Failed to refresh Google token"
    );
  });
});