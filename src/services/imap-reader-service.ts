import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

const PROCESSED_FOLDER = "AutoFilter-Processed";
const MAX_MESSAGES_PER_SCAN = 10;

export interface ImapAttachment {
  filename: string;
  content: Buffer;
}

export interface ParsedImapEmail {
  uid: number;
  senderName: string;
  senderEmail: string;
  subject: string;
  pdfAttachments: ImapAttachment[];
}

export function isImapConfigured(): boolean {
  return !!(process.env.IMAP_HOST && process.env.IMAP_USER && process.env.IMAP_PASSWORD);
}

function createClient(): ImapFlow {
  const host = process.env.IMAP_HOST;
  const port = process.env.IMAP_PORT;
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error(
      "IMAP chưa được cấu hình — kiểm tra IMAP_HOST, IMAP_USER, IMAP_PASSWORD trong .env.local"
    );
  }

  return new ImapFlow({
    host,
    port: port ? Number(port) : 993,
    secure: process.env.IMAP_SECURE !== "false",
    auth: { user, pass },
    logger: false,
  });
}

async function ensureProcessedFolder(client: ImapFlow): Promise<void> {
  const exists = await client.mailboxOpen(PROCESSED_FOLDER).catch(() => null);
  if (exists) return;
  await client.mailboxCreate(PROCESSED_FOLDER);
}

/**
 * Kết nối IMAP, tìm email trong INBOX khớp từ khóa tiêu đề, tải kèm PDF đính kèm
 * (nếu có), rồi đóng kết nối. Trả về danh sách email đã parse sẵn.
 */
export async function listUnprocessedEmails(
  subjectKeywords: string[]
): Promise<ParsedImapEmail[]> {
  const client = createClient();
  await client.connect();

  try {
    await ensureProcessedFolder(client);
    const lock = await client.getMailboxLock("INBOX");
    const results: ParsedImapEmail[] = [];

    try {
      const orCriteria = subjectKeywords.map((keyword) => ({ header: { subject: keyword } }));
      const uids = await client.search({ or: orCriteria }, { uid: true });
      if (!uids || uids.length === 0) return results;

      const recentUids = uids.slice(-MAX_MESSAGES_PER_SCAN);

      for (const uid of recentUids) {
        const message = await client.fetchOne(uid, { source: true }, { uid: true });
        if (!message || !message.source) continue;

        const parsed = await simpleParser(message.source);
        const pdfAttachments = (parsed.attachments || [])
          .filter(
            (a) =>
              a.contentType === "application/pdf" ||
              a.filename?.toLowerCase().endsWith(".pdf")
          )
          .map((a) => ({ filename: a.filename ?? "cv.pdf", content: a.content }));

        const fromAddr = parsed.from?.value?.[0];
        results.push({
          uid,
          senderName: fromAddr?.name?.trim() || fromAddr?.address?.split("@")[0] || "Unknown",
          senderEmail: fromAddr?.address ?? "",
          subject: parsed.subject ?? "",
          pdfAttachments,
        });
      }
    } finally {
      lock.release();
    }

    return results;
  } finally {
    await client.logout().catch(() => {});
  }
}

/** Chuyển email sang folder AutoFilter-Processed để không quét lại lần sau. */
export async function markEmailAsProcessed(uid: number): Promise<void> {
  const client = createClient();
  await client.connect();

  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      await client.messageMove(uid, PROCESSED_FOLDER, { uid: true });
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}
