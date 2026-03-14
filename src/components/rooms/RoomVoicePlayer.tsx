import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface RoomVoicePlayerProps {
  audioUrl: string;
  duration?: number;
}

export function RoomVoicePlayer({ audioUrl, duration: totalDuration }: RoomVoicePlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number>(0);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
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

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // Generate fake waveform bars
  const bars = Array.from({ length: 24 }, (_, i) => {
    const height = 4 + Math.sin(i * 0.8) * 8 + Math.random() * 6;
    return Math.min(20, Math.max(4, height));
  });

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0"
      >
        {playing ? (
          <Pause className="w-3.5 h-3.5 text-primary" />
        ) : (
          <Play className="w-3.5 h-3.5 text-primary ml-0.5" />
        )}
      </button>
      <div className="flex-1 flex items-end gap-[2px] h-5">
        {bars.map((h, i) => (
          <div
            key={i}
            className={`w-[3px] rounded-full transition-colors ${
              (i / bars.length) * 100 < progress ? "bg-primary" : "bg-muted-foreground/30"
            }`}
            style={{ height: `${h}px` }}
          />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground w-8">
        {formatTime(playing ? currentTime : (totalDuration || 0))}
      </span>
    </div>
  );
}
