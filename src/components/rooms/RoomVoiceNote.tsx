import { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RoomVoiceNoteProps {
  onSend: (blob: Blob, duration: number) => void;
}

export function RoomVoiceNote({ onSend }: RoomVoiceNoteProps) {
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      clearInterval(intervalRef.current);
      clearInterval(timerRef.current);
    };
  }, [recordedUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setDuration(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecorded(blob);
        setRecordedUrl(url);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } catch {
      // microphone not available
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    clearInterval(timerRef.current);
  };

  const playPreview = () => {
    if (!recordedUrl) return;
    const audio = new Audio(recordedUrl);
    audioRef.current = audio;
    audio.play();
    setPlaying(true);
    setPlayProgress(0);
    intervalRef.current = window.setInterval(() => {
      if (audio.duration) {
        setPlayProgress((audio.currentTime / audio.duration) * 100);
      }
    }, 100);
    audio.onended = () => {
      setPlaying(false);
      setPlayProgress(0);
      clearInterval(intervalRef.current);
    };
  };

  const pausePreview = () => {
    audioRef.current?.pause();
    setPlaying(false);
    clearInterval(intervalRef.current);
  };

  const discard = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecorded(null);
    setRecordedUrl(null);
    setDuration(0);
    setPlayProgress(0);
    setPlaying(false);
  };

  const handleSend = () => {
    if (recorded) {
      onSend(recorded, duration);
      discard();
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (!recording && !recorded) {
    return (
      <Button size="icon" onClick={startRecording} className="shrink-0 h-11 w-11 rounded-full shadow-lg active:scale-95 transition-transform" title="Record voice note" aria-label="Record voice note">
        <Mic className="w-5 h-5" />
      </Button>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2 flex-1 bg-destructive/10 rounded-lg px-3 py-1.5 animate-pulse">
        <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
        <span className="text-xs text-destructive font-medium flex-1">Recording {formatTime(duration)}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={stopRecording}>
          <Square className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-1 bg-secondary rounded-lg px-2 py-1.5">
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={playing ? pausePreview : playPreview}>
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </Button>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${playProgress}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground w-8 text-center">{formatTime(duration)}</span>
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={discard}>
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
      <Button size="icon" className="h-7 w-7 shrink-0" onClick={handleSend}>
        <Send className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
