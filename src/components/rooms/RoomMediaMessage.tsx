import { useState, useRef } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

interface RoomMediaMessageProps {
  mediaUrl: string;
  mediaType: "image" | "video" | "audio";
  caption?: string;
}

export function RoomMediaMessage({ mediaUrl, mediaType, caption }: RoomMediaMessageProps) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleVideo = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  if (mediaType === "image") {
    return (
      <div className="space-y-1">
        <img
          src={mediaUrl}
          alt="Shared image"
          className="rounded-lg max-w-full max-h-60 object-cover cursor-pointer"
          onClick={() => window.open(mediaUrl, "_blank")}
        />
        {caption && <p className="text-sm">{caption}</p>}
      </div>
    );
  }

  if (mediaType === "video") {
    return (
      <div className="space-y-1">
        <div className="relative rounded-lg overflow-hidden max-w-full bg-black">
          <video
            ref={videoRef}
            src={mediaUrl}
            className="max-w-full max-h-60 rounded-lg"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            playsInline
            preload="auto"
            controls={playing}
            controlsList="nodownload"
          />
          {!playing && (
            <button
              onClick={toggleVideo}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                <Play className="w-7 h-7 text-primary-foreground ml-0.5" />
              </div>
            </button>
          )}
        </div>
        {caption && <p className="text-sm">{caption}</p>}
      </div>
    );
  }

  return null;
}
