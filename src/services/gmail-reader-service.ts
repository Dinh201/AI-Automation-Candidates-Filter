import { supabaseAdmin } from "@/lib/supabase-admin";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const PROCESSED_LABEL_NAME = "AutoFilter-Processed";

interface GmailLabel {
  id: string;
  name: string;
}

interface GmailMessageMeta {
  id: string;
}

interface GmailMessagePart {
  partId?: string;
  mimeType: string;
  filename?: string;
  headers?: { name: string; value: string }[];
  body: { attachmentId?: string; size?: number; data?: string };
  parts?: GmailMessagePart[];
}

interface GmailFullMessage {
  id: string;
  payload: {
    headers: { name: string; value: string }[];
    parts?: GmailMessagePart[];
    body?: { data?: string };
    mimeType: string;
  };
}

async function refreshViaEnvToken(): Promise<string> {
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error(
      "Gmail chưa được kết nối. Kết nối Gmail qua trang Ứng viên hoặc cấu hình GMAIL_REFRESH_TOKEN trong .env.local"
    );
  }
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Refresh token Gmail thất bại: ${err}`);
  }
  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Gmail token không hợp lệ — kiểm tra GMAIL_REFRESH_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET");
  }
  return data.access_token as string;
}

async function getAccessToken(): Promise<string> {
  // 1. Ưu tiên OAuth token đã kết nối qua giao diện (hr_gmail_tokens)
  const { data: dbTokens } = await supabaseAdmin
    .from("hr_gmail_tokens")
    .select("*")
    .eq("id", "default")
    .single();

  if (dbTokens?.refresh_token) {
    // Còn hạn → dùng thẳng
    if (dbTokens.expiry && dbTokens.expiry - Date.now() > 60_000) {
      return dbTokens.access_token as string;
    }
    // Hết hạn → refresh
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: dbTokens.refresh_token,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      await supabaseAdmin
        .from("hr_gmail_tokens")
        .update({
          access_token: json.access_token,
          expiry: Date.now() + json.expires_in * 1000,
          updated_at: new Date().toISOString(),
        })
        .eq("id", "default");
      return json.access_token as string;
    }
    // Refresh thất bại → fallback về env
  }

  // 2. Fallback: GMAIL_REFRESH_TOKEN trong .env.local
  return refreshViaEnvToken();
}

async function ensureProcessedLabel(token: string): Promise<string> {
  const res = await fetch(`${GMAIL_API}/labels`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    if (err.includes("insufficientPermissions") || res.status === 403) {
      throw new Error(
        "GMAIL_REFRESH_TOKEN thiếu quyền đọc Gmail. Token cần scope 'https://mail.google.com/' hoặc 'gmail.modify'. Tạo lại token với scope đầy đủ."
      );
    }
    throw new Error(`Không lấy được Gmail labels: ${err}`);
  }

  const data = await res.json();
  const existing = (data.labels as GmailLabel[])?.find(
    (l) => l.name === PROCESSED_LABEL_NAME
  );
  if (existing) return existing.id;

  // Create the label
  const create = await fetch(`${GMAIL_API}/labels`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: PROCESSED_LABEL_NAME,
      labelListVisibility: "labelHide",
      messageListVisibility: "hide",
    }),
  });

  if (!create.ok) throw new Error("Không thể tạo label AutoFilter-Processed trong Gmail");
  const created = await create.json();
  return created.id as string;
}

export async function initGmailReader(): Promise<{ token: string; processedLabelId: string }> {
  const token = await getAccessToken();
  const processedLabelId = await ensureProcessedLabel(token);
  return { token, processedLabelId };
}

export async function listUnprocessedEmailIds(token: string): Promise<string[]> {
  const query = encodeURIComponent(
    `has:attachment filename:pdf -label:${PROCESSED_LABEL_NAME}`
  );
  const res = await fetch(`${GMAIL_API}/messages?q=${query}&maxResults=20`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Không thể list Gmail messages");
  const data = await res.json();
  return (data.messages as GmailMessageMeta[] | undefined)?.map((m) => m.id) ?? [];
}

export interface ParsedEmail {
  messageId: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  pdfAttachments: { filename: string; attachmentId: string }[];
}

function flattenParts(parts: GmailMessagePart[]): GmailMessagePart[] {
  const result: GmailMessagePart[] = [];
  for (const part of parts) {
    result.push(part);
    if (part.parts) result.push(...flattenParts(part.parts));
  }
  return result;
}

export async function getEmailDetails(
  token: string,
  messageId: string
): Promise<ParsedEmail> {
  const res = await fetch(`${GMAIL_API}/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Không đọc được email ${messageId}`);
  const msg = (await res.json()) as GmailFullMessage;

  const headers = msg.payload.headers;
  const from = headers.find((h) => h.name === "From")?.value ?? "";
  const subject = headers.find((h) => h.name === "Subject")?.value ?? "";

  // Parse "Display Name <email>" or plain "email"
  const fromMatch = from.match(/^(?:"?([^"<>]+)"?\s+)?<?([^\s<>]+@[^\s<>]+)>?$/);
  const senderName = (fromMatch?.[1]?.trim() || from.split("@")[0]).replace(/^"|"$/g, "");
  const senderEmail = fromMatch?.[2]?.trim() ?? from;

  const allParts = msg.payload.parts ? flattenParts(msg.payload.parts) : [];
  const pdfAttachments = allParts
    .filter(
      (p) =>
        p.body?.attachmentId &&
        (p.filename?.toLowerCase().endsWith(".pdf") ||
          p.mimeType === "application/pdf")
    )
    .map((p) => ({ filename: p.filename ?? "cv.pdf", attachmentId: p.body.attachmentId! }));

  return { messageId, senderName, senderEmail, subject, pdfAttachments };
}

export async function downloadAttachment(
  token: string,
  messageId: string,
  attachmentId: string
): Promise<Buffer> {
  const res = await fetch(
    `${GMAIL_API}/messages/${messageId}/attachments/${attachmentId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error("Không tải được file đính kèm từ Gmail");
  const data = await res.json();
  // Gmail API returns base64url — convert to standard base64
  const base64 = (data.data as string).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}

export async function markEmailAsProcessed(
  token: string,
  messageId: string,
  processedLabelId: string
): Promise<void> {
  await fetch(`${GMAIL_API}/messages/${messageId}/modify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ addLabelIds: [processedLabelId] }),
  });
}