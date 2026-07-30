import { getGmailAccessToken } from "@/lib/gmail-oauth";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
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

async function ensureProcessedLabel(token: string): Promise<string> {
  const res = await fetch(`${GMAIL_API}/labels`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    if (err.includes("insufficientPermissions") || res.status === 403) {
      throw new Error(
        "Token Gmail thiếu quyền đọc CV — kết nối qua nút 'Kết nối Gmail' hiện chỉ xin quyền GỬI mail (gmail.send), không đọc được inbox. " +
        "Nếu cần đọc CV qua Gmail thay vì IMAP, phải cấu hình riêng GMAIL_REFRESH_TOKEN trong .env.local với scope 'https://mail.google.com/' hoặc 'gmail.modify'."
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
  const token = await getGmailAccessToken();
  const processedLabelId = await ensureProcessedLabel(token);
  return { token, processedLabelId };
}

export async function listUnprocessedEmailIds(
  token: string,
  subjectKeywords?: string[]
): Promise<string[]> {
  let q = `has:attachment filename:pdf -label:${PROCESSED_LABEL_NAME}`;

  if (subjectKeywords && subjectKeywords.length > 0) {
    // Gmail subject filter: subject:("keyword1" OR "keyword2" OR ...)
    const kw = subjectKeywords.map((k) => `"${k}"`).join(" OR ");
    q += ` subject:(${kw})`;
  }

  const res = await fetch(
    `${GMAIL_API}/messages?q=${encodeURIComponent(q)}&maxResults=10`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

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