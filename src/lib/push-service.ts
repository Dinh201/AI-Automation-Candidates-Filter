import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase-admin";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@vacons.com.vn";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  requireInteraction?: boolean;
  tag?: string;
}

type PrefKey = "pushApplicant" | "pushInterview";

export async function sendPushToAll(payload: PushPayload, prefKey?: PrefKey): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[push] VAPID keys chưa cấu hình — bỏ qua push notification");
    return;
  }

  const { data: subscriptions } = await supabaseAdmin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");

  if (!subscriptions || subscriptions.length === 0) return;

  let allowedUserIds: Set<string> | null = null;
  if (prefKey) {
    const { data: profiles } = await supabaseAdmin
      .from("user_profiles")
      .select("id, notification_prefs");

    if (profiles) {
      allowedUserIds = new Set(
        profiles
          .filter((p) => {
            const prefs = p.notification_prefs as Record<string, boolean> | null;
            return prefs?.[prefKey] !== false;
          })
          .map((p) => p.id)
      );
    }
  }

  const sends = subscriptions
    .filter((sub) => !allowedUserIds || allowedUserIds.has(sub.user_id))
    .map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        const e = err as { statusCode?: number };
        if (e.statusCode === 410 || e.statusCode === 404) {
          await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        } else {
          console.warn("[push] Gửi thất bại:", sub.endpoint, err);
        }
      }
    });

  await Promise.allSettled(sends);
}