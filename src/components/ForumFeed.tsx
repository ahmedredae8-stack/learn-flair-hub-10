import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AvatarBubble } from "@/components/AvatarBubble";
import { uploadFile, isImage, type UploadedFile } from "@/lib/upload";
import { toast } from "sonner";
import { Heart, MessageCircle, Share2, Image as ImageIcon, Loader2, Plus, Send, Paperclip, X } from "lucide-react";

type Author = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };

const EMOJIS = ["❤️", "👍", "😂", "🤯", "🔥"];

async function fetchAuthors(ids: string[]) {
  if (!ids.length) return new Map<string, Author>();
  const { data } = await supabase.from("profiles").select("id,display_name,username,avatar_url").in("id", ids);
  return new Map((data ?? []).map((a) => [a.id, a as Author]));
}

function attachmentsOf(v: unknown): UploadedFile[] {
  return Array.isArray(v) ? (v as UploadedFile[]) : [];
}

export function ForumFeed() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const threads = useQuery({
    queryKey: ["forum-threads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("forum_threads").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      const map = await fetchAuthors([...new Set((data ?? []).map((d) => d.author_id))]);
      return (data ?? []).map((d) => ({ ...d, author: map.get(d.author_id) }));
    },
  });

  async function pick(f: File) {
    setUploading(true);
    try { const up = await uploadFile("project-files", f, "forum-"); setFiles((v) => [...v, up]); }
    catch (e) { toast.error(e instanceof Error ? e.message : "فشل الرفع"); }
    finally { setUploading(false); }
  }

  async function post() {
    if (title.trim().length < 3) return toast.error("عنوان قصير");
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("غير مسجّل");
      const { error } = await supabase.from("forum_threads").insert({
        author_id: auth.user.id, title: title.trim().slice(0, 160), body: body.trim().slice(0, 5000),
        attachments: files as unknown as never,
      });
      if (error) throw error;
      toast.success("تم النشر");
      setTitle(""); setBody(""); setFiles([]); setShowNew(false);
      qc.invalidateQueries({ queryKey: ["forum-threads"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "فشل النشر"); } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-extrabold text-primary"><MessageCircle className="w-5 h-5" /> نقاشات المجتمع</div>
        <button onClick={() => setShowNew((v) => !v)} className="flex items-center gap-1 text-sm font-extrabold text-primary hover:underline">
          <Plus className="w-4 h-4" /> {showNew ? "إغلاق" : "منشور جديد"}
        </button>
      </div>

      {showNew && (
        <div className="bg-card border-2 border-border rounded-2xl p-4 mb-4 space-y-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عن ماذا تريد التحدث؟" maxLength={160} className="w-full px-4 py-3 rounded-xl border-2 border-input bg-background focus:border-primary outline-none font-bold" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="اكتب…" maxLength={5000} className="w-full px-4 py-3 rounded-xl border-2 border-input bg-background focus:border-primary outline-none font-bold resize-none" />
          <AttachmentList files={files} onRemove={(i) => setFiles(files.filter((_, j) => j !== i))} />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-xs font-extrabold text-primary cursor-pointer">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />} صورة/ملف
              <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }} />
            </label>
            <span className="text-[10px] text-muted-foreground font-bold">حد أقصى 5 ميجا للملف</span>
          </div>
          <button disabled={saving} onClick={post} className="btn-3d w-full active:btn-3d-active disabled:opacity-60">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "نشر"}
          </button>
        </div>
      )}

      {threads.isLoading && <div className="grid place-items-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
      {threads.data?.length === 0 && <p className="text-center text-sm text-muted-foreground py-10">لا منشورات بعد — كن الأول!</p>}
      <ul className="space-y-3">
        {threads.data?.map((t) => <ThreadCard key={t.id} thread={t} />)}
      </ul>
    </div>
  );
}

function AttachmentList({ files, onRemove }: { files: UploadedFile[]; onRemove?: (i: number) => void }) {
  if (!files.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      {files.map((f, i) => (
        <div key={i} className="relative rounded-xl overflow-hidden border-2 border-border bg-background">
          {isImage(f) ? <img src={f.url} alt={f.name} loading="lazy" className="w-full h-32 object-cover" />
            : <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 text-xs font-extrabold text-primary"><Paperclip className="w-4 h-4" />{f.name}</a>}
          {onRemove && (
            <button onClick={() => onRemove(i)} className="absolute top-1 left-1 bg-black/60 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
          )}
        </div>
      ))}
    </div>
  );
}

function ThreadCard({ thread }: { thread: Record<string, unknown> & { author?: Author } }) {
  const qc = useQueryClient();
  const id = String(thread["id"]);
  const [openComments, setOpenComments] = useState(false);

  const reactions = useQuery({
    queryKey: ["thread-reactions", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("forum_reactions").select("user_id,emoji").eq("thread_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const comments = useQuery({
    queryKey: ["thread-comments", id],
    enabled: openComments,
    queryFn: async () => {
      const { data, error } = await supabase.from("forum_posts").select("*").eq("thread_id", id).order("created_at");
      if (error) throw error;
      const map = await fetchAuthors([...new Set((data ?? []).map((d) => d.author_id))]);
      return (data ?? []).map((d) => ({ ...d, author: map.get(d.author_id) }));
    },
  });

  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  async function react(emoji: string) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const mine = reactions.data?.find((r) => r.user_id === auth.user!.id);
    if (mine?.emoji === emoji) {
      await supabase.from("forum_reactions").delete().eq("thread_id", id).eq("user_id", auth.user.id);
    } else {
      await supabase.from("forum_reactions").upsert({ thread_id: id, user_id: auth.user.id, emoji }, { onConflict: "thread_id,user_id" });
    }
    qc.invalidateQueries({ queryKey: ["thread-reactions", id] });
  }

  async function addComment() {
    if (comment.trim().length < 1) return;
    setSending(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("forum_posts").insert({ thread_id: id, author_id: auth.user!.id, body: comment.trim().slice(0, 2000) });
      if (error) throw error;
      setComment("");
      qc.invalidateQueries({ queryKey: ["thread-comments", id] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "فشل"); } finally { setSending(false); }
  }

  function share() {
    const url = `${window.location.origin}/projects#thread-${id}`;
    navigator.clipboard?.writeText(url);
    toast.success("تم نسخ رابط المنشور");
  }

  const counts = EMOJIS.map((e) => ({ e, n: (reactions.data ?? []).filter((r) => r.emoji === e).length })).filter((x) => x.n > 0);
  const files = attachmentsOf(thread["attachments"]);

  return (
    <li id={`thread-${id}`} className="bg-card border-2 border-border rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-2">
        <AvatarBubble id={thread.author?.avatar_url} size={40} />
        <div>
          <div className="font-extrabold text-sm">{thread.author?.display_name || "عضو"}</div>
          <div className="text-[10px] text-muted-foreground font-bold" translate="no">@{thread.author?.username || "user"}</div>
        </div>
      </div>
      <div className="font-extrabold">{String(thread["title"] ?? "")}</div>
      {thread["body"] ? <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{String(thread["body"])}</p> : null}
      <div className="mt-2"><AttachmentList files={files} /></div>

      {counts.length > 0 && (
        <div className="flex items-center gap-1 mt-2 text-xs font-extrabold text-muted-foreground">
          {counts.map((c) => <span key={c.e}>{c.e} {c.n}</span>)}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border text-xs font-extrabold text-muted-foreground">
        <div className="relative group">
          <button onClick={() => react("❤️")} className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-secondary"><Heart className="w-4 h-4" /> إعجاب</button>
          <div className="absolute bottom-full mb-1 hidden group-hover:flex bg-card border-2 border-border rounded-full px-2 py-1 gap-1 shadow-lg z-10">
            {EMOJIS.map((e) => <button key={e} onClick={() => react(e)} className="text-lg hover:scale-125 transition">{e}</button>)}
          </div>
        </div>
        <button onClick={() => setOpenComments((v) => !v)} className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-secondary"><MessageCircle className="w-4 h-4" /> تعليق</button>
        <button onClick={share} className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-secondary"><Share2 className="w-4 h-4" /> مشاركة</button>
      </div>

      {openComments && (
        <div className="mt-3 space-y-2">
          {comments.isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          {comments.data?.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <AvatarBubble id={c.author?.avatar_url} size={30} />
              <div className="bg-secondary rounded-2xl px-3 py-2 flex-1">
                <div className="text-[11px] font-extrabold">{c.author?.display_name || "عضو"}</div>
                <div className="text-xs font-bold whitespace-pre-wrap">{c.body}</div>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="اكتب تعليقاً…" className="flex-1 px-3 py-2 rounded-full border-2 border-input bg-background font-bold text-sm" />
            <button onClick={addComment} disabled={sending} className="p-2 rounded-full bg-primary text-primary-foreground disabled:opacity-50"><Send className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </li>
  );
}
