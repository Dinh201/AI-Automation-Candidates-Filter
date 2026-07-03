const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_URL = "https://www.googleapis.com/calendar/v3";

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expiry: number; // Unix timestamp (ms)
}

export interface CalendarEventData {
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendees: Array<{ email: string; name?: string }>;
  timezone?: string;
}

export interface CreatedEvent {
  eventId: string;
  meetLink?: string;
  htmlLink: string;
}

export function buildOAuthUrl(returnTo?: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    // calendar.readonly needed for freeBusy queries; calendar.events for creating events
    scope: "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
    ...(returnTo ? { state: returnTo } : {}),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function buildGmailOAuthUrl(returnTo?: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_GMAIL_REDIRECT_URI!,
    response_type: "code",
    scope: "https://mail.google.com/",
    access_type: "offline",
    prompt: "consent",
    ...(returnTo ? { state: returnTo } : {}),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }

  const json = await res.json();
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expiry: Date.now() + json.expires_in * 1000,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) throw new Error("Failed to refresh Google token");

  const json = await res.json();
  return {
    access_token: json.access_token,
    refresh_token: refreshToken,
    expiry: Date.now() + json.expires_in * 1000,
  };
}

export async function createCalendarEvent(
  tokens: GoogleTokens,
  event: CalendarEventData
): Promise<CreatedEvent> {
  const timezone = event.timezone ?? "Asia/Ho_Chi_Minh";

  const body = {
    summary: event.summary,
    description: event.description,
    start: { dateTime: event.startTime.toISOString(), timeZone: timezone },
    end: { dateTime: event.endTime.toISOString(), timeZone: timezone },
    attendees: event.attendees.map((a) => ({ email: a.email, displayName: a.name })),
    conferenceData: {
      createRequest: {
        requestId: `autofilter-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
    reminders: { useDefault: false, overrides: [{ method: "email", minutes: 30 }] },
  };

  const res = await fetch(
    `${GOOGLE_CALENDAR_URL}/calendars/primary/events?conferenceDataVersion=1`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Calendar event creation failed: ${err}`);
  }

  const json = await res.json();
  const meetLink =
    json.conferenceData?.entryPoints?.find(
      (ep: { entryPointType: string; uri: string }) => ep.entryPointType === "video"
    )?.uri;

  return {
    eventId: json.id,
    meetLink,
    htmlLink: json.htmlLink,
  };
}

export async function deleteCalendarEvent(
  tokens: GoogleTokens,
  eventId: string
): Promise<void> {
  const res = await fetch(
    `${GOOGLE_CALENDAR_URL}/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    }
  );

  // 204 = success, 410 = already deleted — both are fine
  if (!res.ok && res.status !== 410) {
    const err = await res.text();
    throw new Error(`Google Calendar event deletion failed: ${err}`);
  }
}

export interface BusyPeriod {
  start: string;
  end: string;
}

export async function checkFreeBusy(
  tokens: GoogleTokens,
  startTime: Date,
  endTime: Date,
  calendarId: string = "primary"
): Promise<BusyPeriod[]> {
  const res = await fetch(`${GOOGLE_CALENDAR_URL}/freeBusy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      timeZone: "Asia/Ho_Chi_Minh",
      items: [{ id: calendarId }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`FreeBusy check failed: ${err}`);
  }

  const json = await res.json();
  return (json.calendars?.[calendarId]?.busy ?? []) as BusyPeriod[];
}