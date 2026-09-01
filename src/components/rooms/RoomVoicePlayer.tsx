import { useState, useRef, useEffect, useMemo } from "react";
import { Play, Pause, Mic } from "lucide-react";

interface RoomVoicePlayerProps {
  audioUrl: string;
  duration?: number;
  mine?: boolean;
}

export function RoomVoicePlayer({ audioUrl, duration: totalDuration, mine }: RoomVoicePlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      audioRef.current?.pause();
    };
  }, []);

  const toggle = () => {
    if (!audioRef.current) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setPlaying(false);
        setProgress(0);
        setCurrentTime(0);
        clearInterval(intervalRef.current);
      };
    }

    if (playing) {
      audioRef.current.pause();
      clearInterval(intervalRef.current);
    } else {
      audioRef.current.play();
      intervalRef.current = window.setInterval(() => {
        const a = audioRef.current;
        if (a && a.duration) {
          setProgress((a.currentTime / a.duration) * 100);
          setCurrentTime(Math.floor(a.currentTime));
        }
      }, 100);
    }
    setPlaying(!playing);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

  // Stable waveform per message
  const bars = useMemo(
    () => Array.from({ length: 30 }, (_, i) => Math.min(22, Math.max(5, 6 + Math.abs(Math.sin(i * 1.7)) * 16))),
    []
  );

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * a.duration;
    setProgress(ratio * 100);
    setCurrentTime(Math.floor(a.currentTime));
  };

  return (
    <div className="flex items-center gap-3 min-w-[210px] py-0.5">
      <button
        onClick={toggle}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center shadow-md transition active:scale-95 ${
          mine
            ? "bg-primary-foreground text-primary"
            : "bg-primary text-primary-foreground"
        } ${playing ? "ring-2 ring-primary/40 animate-pulse" : ""}`}
      >
        {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-end gap-[2px] h-6 cursor-pointer" onClick={seek}>
          {bars.map((h, i) => (
            <div
              key={i}
              className={`flex-1 min-w-[2px] rounded-full transition-colors ${
                (i / bars.length) * 100 < progress
                  ? mine ? "bg-primary-foreground" : "bg-primary"
                  : mine ? "bg-primary-foreground/35" : "bg-muted-foreground/35"
              }`}
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
        <div className={`flex items-center gap-1 mt-1 text-[10px] ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
          <Mic className="w-3 h-3" />
          <span>{formatTime(playing || currentTime ? currentTime : (totalDuration || 0))}</span>
          {!!totalDuration && <span className="opacity-60">/ {formatTime(totalDuration)}</span>}
        </div>
      </div>
    </div>
  );
}
