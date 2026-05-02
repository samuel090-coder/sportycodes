import { supabase } from "@/integrations/supabase/client";

export async function logAudit(
  action: string,
  opts: {
    targetTable?: string;
    targetId?: string;
    targetUserId?: string;
    details?: Record<string, any>;
  } = {}
) {
  try {
    await supabase.rpc("log_audit_event" as any, {
      _action: action,
      _target_table: opts.targetTable ?? null,
      _target_id: opts.targetId ?? null,
      _target_user_id: opts.targetUserId ?? null,
      _details: opts.details ?? {},
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}

/** Get a short-lived signed URL for a private payment screenshot. */
export async function getScreenshotSignedUrl(pathOrUrl: string | null | undefined): Promise<string | null> {
  if (!pathOrUrl) return null;
  // extract path from any legacy public URL
  const path = pathOrUrl.includes("/payment-screenshots/")
    ? pathOrUrl.split("/payment-screenshots/")[1]
    : pathOrUrl;
  const { data, error } = await supabase.storage
    .from("payment-screenshots")
    .createSignedUrl(path, 300); // 5 minutes
  if (error) {
    console.error("signed url error", error);
    return null;
  }
  return data?.signedUrl ?? null;
}

/** Mask an email like s***@gmail.com */
export function maskEmail(email?: string | null): string {
  if (!email) return "";
  const [u, d] = email.split("@");
  if (!d) return email;
  const head = u.slice(0, 1);
  return `${head}${"*".repeat(Math.max(2, u.length - 1))}@${d}`;
}

/** Mask a phone like 090****3764 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return "";
  const s = String(phone);
  if (s.length < 6) return "****";
  return `${s.slice(0, 3)}${"*".repeat(s.length - 7)}${s.slice(-4)}`;
}
