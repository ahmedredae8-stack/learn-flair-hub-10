import { supabase } from "@/integrations/supabase/client";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB — keep files light
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export type UploadedFile = {
  url: string;
  name: string;
  type: string;
  size: number;
};

/**
 * Upload a file to a private bucket and return a long-lived signed URL.
 */
export async function uploadFile(bucket: string, file: File, prefix = ""): Promise<UploadedFile> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("حجم الملف كبير (الحد الأقصى 5 ميجابايت)");
  }
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("سجّل دخولك أولاً");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${auth.user.id}/${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;

  const { data: signed, error: signErr } = await supabase.storage.from(bucket).createSignedUrl(path, TEN_YEARS);
  if (signErr || !signed) throw signErr ?? new Error("تعذّر إنشاء رابط الملف");

  return { url: signed.signedUrl, name: file.name, type: file.type, size: file.size };
}

export function isImage(f: { type: string; name?: string }) {
  return f.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif)$/i.test(f.name ?? "");
}
