import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Video, Image as ImageIcon, Type, BarChart3, Plus, ChevronLeft, Upload, RefreshCw } from "lucide-react";

type Mode = "video" | "photo" | "text" | "poll";
const BACKGROUNDS = ["reel-bg-red", "reel-bg-gold", "reel-bg-night", "reel-bg-pitch"];
const LIMITS = { video: 100 * 1024 * 1024, photo: 10 * 1024 * 1024 };
const CAPTION_MAX = 300;

interface Props { userId: string; onClose: () => void; onPosted: () => void; }

/** Full-screen, TikTok-style composer: pick a mode, preview, add caption, post. */
const CreatePostSheet = ({ userId, onClose, onPosted }: Props) => {
  const [mode, setMode] = useState<Mode>("video");
  const [step, setStep] = useState<"pick" | "details">("pick");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [background, setBackground] = useState(0);
  const [options, setOptions] = useState(["", ""]);
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !posting) onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose, posting]);

  const chooseMode = (next: Mode) => {
    setMode(next);
    setFile(null); setPreview(null);
    setStep(next === "text" || next === "poll" ? "details" : "pick");
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    const isVideo = picked.type.startsWith("video/");
    const isImage = picked.type.startsWith("image/");
    if ((mode === "video" && !isVideo) || (mode === "photo" && !isImage)) { toast.error(`Please choose a ${mode}`); return; }
    if (picked.size > LIMITS[mode as "video" | "photo"]) { toast.error(mode === "video" ? "Videos must be under 100MB" : "Photos must be under 10MB"); return; }
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    setStep("details");
  };

  const validOptions = options.map(o => o.trim()).filter(Boolean);
  const canPost = !posting && (
    (mode === "video" || mode === "photo") ? !!file :
    mode === "text" ? caption.trim().length > 0 :
    caption.trim().length > 0 && validOptions.length >= 2
  );

  const post = async () => {
    if (!canPost) return;
    setPosting(true);
    try {
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || (mode === "video" ? "mp4" : "jpg");
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("shorts-media").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
        if (error) throw error;
        mediaUrl = supabase.storage.from("shorts-media").getPublicUrl(path).data.publicUrl;
        mediaType = mode === "video" ? "video" : "image";
      }
      const { error } = await supabase.from("shorts").insert({
        user_id: userId,
        content: caption.trim() || null,
        media_url: mediaUrl,
        media_type: mediaType,
        poll_options: mode === "poll" ? { options: validOptions.map((text, index) => ({ text, votes: 0, index })) } : null,
      });
      if (error) throw error;
      toast.success("Posted! 🎉");
      onPosted();
    } catch (error) {
      toast.error((error as { message?: string })?.message || "Couldn't post. Please try again.");
    } finally { setPosting(false); }
  };

  const modes: { key: Mode; label: string; icon: typeof Video }[] = [
    { key: "video", label: "Video", icon: Video },
    { key: "photo", label: "Photo", icon: ImageIcon },
    { key: "text", label: "Text", icon: Type },
    { key: "poll", label: "Poll", icon: BarChart3 },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label="Create post" className="reels-page fixed inset-0 z-[60] flex flex-col">
      <input ref={inputRef} type="file" className="hidden" accept={mode === "video" ? "video/*" : "image/*"} onChange={onFile} />
      <header className="flex items-center justify-between px-3 h-14 shrink-0">
        {step === "details" && (mode === "video" || mode === "photo")
          ? <Button variant="ghost" size="icon" aria-label="Back" disabled={posting} onClick={() => setStep("pick")}><ChevronLeft /></Button>
          : <Button variant="ghost" size="icon" aria-label="Close" disabled={posting} onClick={onClose}><X /></Button>}
        <h2 className="font-bold">{step === "details" ? "New post" : `Add ${mode}`}</h2>
        {step === "details"
          ? <Button size="sm" className="rounded-full px-5" disabled={!canPost} onClick={post}>{posting ? "Posting…" : "Post"}</Button>
          : <span className="w-10" />}
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 max-w-xl w-full mx-auto">
        {step === "pick" && (
          <button onClick={() => inputRef.current?.click()} className="h-full min-h-80 w-full rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-4 text-center px-8 hover:border-primary transition-colors">
            <span className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground"><Upload className="w-9 h-9" /></span>
            <span className="text-lg font-bold">Select {mode === "video" ? "a video" : "a photo"}</span>
            <span className="text-sm text-muted-foreground">{mode === "video" ? "Vertical videos look best · up to 100MB" : "JPG, PNG or WebP · up to 10MB"}</span>
          </button>
        )}

        {step === "details" && (
          <div className="space-y-5">
            {(mode === "video" || mode === "photo") && preview && (
              <div className="relative mx-auto w-48 aspect-[9/16] rounded-xl overflow-hidden bg-card">
                {mode === "video" ? <video src={preview} className="w-full h-full object-cover" autoPlay muted loop playsInline /> : <img src={preview} alt="Selected preview" className="w-full h-full object-cover" />}
                <Button size="sm" variant="secondary" className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full" disabled={posting} onClick={() => inputRef.current?.click()}><RefreshCw className="w-3 h-3 mr-1" />Replace</Button>
              </div>
            )}

            {mode === "text" ? (
              <>
                <div className={`aspect-[9/16] max-h-[52vh] mx-auto rounded-xl flex items-center justify-center p-6 ${BACKGROUNDS[background]}`}>
                  <Textarea autoFocus value={caption} maxLength={CAPTION_MAX} onChange={e => setCaption(e.target.value)} placeholder="Type something…" aria-label="Post text"
                    className="bg-transparent border-0 text-center text-2xl font-bold resize-none focus-visible:ring-0 min-h-40" />
                </div>
                <div className="flex justify-center gap-3" role="radiogroup" aria-label="Background">
                  {BACKGROUNDS.map((bg, i) => <button key={bg} role="radio" aria-checked={background === i} aria-label={`Background ${i + 1}`} onClick={() => setBackground(i)} className={`w-9 h-9 rounded-full ${bg} ${background === i ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`} />)}
                </div>
              </>
            ) : (
              <div>
                <Textarea value={caption} maxLength={CAPTION_MAX} onChange={e => setCaption(e.target.value)} aria-label={mode === "poll" ? "Poll question" : "Caption"}
                  placeholder={mode === "poll" ? "Ask your question…" : "Describe your post… #football #surewin"} className="min-h-24 bg-card border-border rounded-xl text-base" />
                <p className="text-right text-xs text-muted-foreground mt-1">{caption.length}/{CAPTION_MAX}</p>
              </div>
            )}

            {mode === "poll" && (
              <div className="space-y-2">
                {options.map((option, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={option} maxLength={60} placeholder={`Option ${i + 1}`} aria-label={`Option ${i + 1}`} onChange={e => setOptions(o => o.map((v, idx) => idx === i ? e.target.value : v))} className="bg-card rounded-xl h-12" />
                    {i > 1 && <Button variant="ghost" size="icon" className="h-12" aria-label="Remove option" onClick={() => setOptions(o => o.filter((_, idx) => idx !== i))}><X className="w-4 h-4" /></Button>}
                  </div>
                ))}
                {options.length < 4 && <Button variant="outline" className="w-full rounded-xl" onClick={() => setOptions(o => [...o, ""])}><Plus className="w-4 h-4 mr-1" />Add option</Button>}
              </div>
            )}
          </div>
        )}
      </main>

      {posting && <div className="h-1 w-full overflow-hidden bg-muted"><div className="h-full w-1/3 bg-primary reel-upload-bar" /></div>}

      <nav aria-label="Post type" className="shrink-0 flex justify-center gap-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {modes.map(({ key, label, icon: Icon }) => (
          <button key={key} disabled={posting} onClick={() => chooseMode(key)} aria-pressed={mode === key}
            className={`flex flex-col items-center gap-1 text-xs font-bold transition-opacity ${mode === key ? "opacity-100" : "opacity-50"}`}>
            <Icon className="w-5 h-5" />{label}
            <span className={`h-1 w-1 rounded-full ${mode === key ? "bg-foreground" : "bg-transparent"}`} />
          </button>
        ))}
      </nav>
    </div>
  );
};

export default CreatePostSheet;
