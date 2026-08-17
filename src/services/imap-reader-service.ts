import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

const PROCESSED_FOLDER = "AutoFilter-Processed";
// Giới hạn thấp để mỗi lần quét chạy nhanh, tránh timeout phía cron caller
// (vd cron-job.org free plan giới hạn ~30s). Cron chạy 1 lần/ngày (xem
// vercel.json) nên email dư trong ngày sẽ được xử lý ở lần quét kế tiếp.
const MAX_MESSAGES_PER_SCAN = 5;

// Chỉ quét email trong 5 ngày gần nhất (dư ~4 ngày phòng cron bị trễ/miss
// nhiều lần liên tiếp). Email cũ hơn (backlog tồn đọng lâu ngày, vd từ nhiều
// tháng trước) sẽ KHÔNG được quét nữa — trước đây search không giới hạn ngày
// nên khi số email mới trong ngày ít hơn MAX_MESSAGES_PER_SCAN, hệ thống lại
// "đào" luôn backlog cũ lên xử lý, gây cảm giác quét lộn xộn/không theo thứ
// tự thời gian.
const SCAN_SINCE_DAYS = 5;

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
      const since = new Date(Date.now() - SCAN_SINCE_DAYS * 24 * 60 * 60 * 1000);
      const uids = await client.search({ or: orCriteria, since }, { uid: true });
      if (!uids || uids.length === 0) return 0;

      // Lấy UID nhỏ nhất (email CŨ nhất) trước — xử lý theo đúng thứ tự
      // email tới (FIFO). Mail đến trước xử lý trước, mail mới xếp hàng chờ
      // chứ không chen ngang; mail đã xử lý xong sẽ được move sang
      // AutoFilter-Processed nên lần quét sau không thấy lại UID đó nữa.
      const oldestUids = [...uids].sort((a, b) => a - b).slice(0, MAX_MESSAGES_PER_SCAN);

      for (const uid of oldestUids) {
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
