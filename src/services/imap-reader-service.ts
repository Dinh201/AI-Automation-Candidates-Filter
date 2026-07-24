import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

const PROCESSED_FOLDER = "AutoFilter-Processed";
// Giới hạn thấp để mỗi lần quét chạy nhanh, tránh timeout phía cron caller
// (vd cron-job.org free plan giới hạn ~30s). Cron chạy mỗi vài giờ nên email
// dư sẽ được xử lý ở lần quét kế tiếp, không mất dữ liệu.
const MAX_MESSAGES_PER_SCAN = 5;

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
 * Mở 1 kết nối IMAP duy nhất cho cả lần quét: tìm email khớp từ khóa tiêu đề,
 * parse từng email rồi gọi `handler` để xử lý (tạo ứng viên, chấm điểm...).
 * Sau khi `handler` xử lý xong (kể cả khi trả kết quả lỗi), email được chuyển
 * sang folder AutoFilter-Processed trong CÙNG kết nối — không reconnect mỗi
 * email, giúp cả lần quét chạy nhanh hơn nhiều so với trước.
 *
 * Nếu `handler` throw (lỗi không lường trước), email đó KHÔNG được đánh dấu
 * đã xử lý để lần quét sau thử lại.
 */
export async function scanImapInbox(
  subjectKeywords: string[],
  handler: (email: ParsedImapEmail) => Promise<void>
): Promise<number> {
  const client = createClient();
  await client.connect();

  try {
    await ensureProcessedFolder(client);
    const lock = await client.getMailboxLock("INBOX");
    let processedCount = 0;

    try {
      const orCriteria = subjectKeywords.map((keyword) => ({ header: { subject: keyword } }));
      const uids = await client.search({ or: orCriteria }, { uid: true });
      if (!uids || uids.length === 0) return 0;

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
        const email: ParsedImapEmail = {
          uid,
          senderName: fromAddr?.name?.trim() || fromAddr?.address?.split("@")[0] || "Unknown",
          senderEmail: fromAddr?.address ?? "",
          subject: parsed.subject ?? "",
          pdfAttachments,
        };

        try {
          await handler(email);
          await client.messageMove(uid, PROCESSED_FOLDER, { uid: true });
          processedCount++;
        } catch (err) {
          console.error("[imap-scan] Lỗi xử lý email, bỏ qua đánh dấu đã xử lý:", uid, err);
        }
      }
    } finally {
      lock.release();
    }

    return processedCount;
  } finally {
    await client.logout().catch(() => {});
  }
}
