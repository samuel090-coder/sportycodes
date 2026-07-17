import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mic, MicOff, PhoneOff, Phone, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createPortal } from "react-dom";

interface Props {
  roomId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  open: boolean;
  onClose: () => void;
}

interface Peer {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  pc: RTCPeerConnection;
  stream?: MediaStream;
  speaking?: boolean;
  muted?: boolean;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const RoomVoiceCall = ({ roomId, userId, displayName, avatarUrl, open, onClose }: Props) => {
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [peers, setPeers] = useState<Record<string, Peer>>({});
  const [speakingSelf, setSpeakingSelf] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Record<string, Peer>>({});
  const channelRef = useRef<any>(null);
  const pingChannelRef = useRef<any>(null);
  const pingIntervalRef = useRef<any>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);

  const updatePeer = (uid: string, patch: Partial<Peer>) => {
    if (!peersRef.current[uid]) return;
    peersRef.current[uid] = { ...peersRef.current[uid], ...patch };
    setPeers({ ...peersRef.current });
  };

  const cleanupPeer = (uid: string) => {
    const p = peersRef.current[uid];
    if (p) {
      try { p.pc.close(); } catch {}
      delete peersRef.current[uid];
      setPeers({ ...peersRef.current });
    }
    const el = document.getElementById(`audio-${uid}`);
    el?.remove();
  };

  const createPeer = (remoteUserId: string, meta: { displayName: string; avatarUrl?: string | null }, initiator: boolean) => {
    if (peersRef.current[remoteUserId]) return peersRef.current[remoteUserId];

    const pc = new RTCPeerConnection(ICE_SERVERS);
    const peer: Peer = { userId: remoteUserId, displayName: meta.displayName, avatarUrl: meta.avatarUrl, pc };
    peersRef.current[remoteUserId] = peer;
    setPeers({ ...peersRef.current });

    // Add local tracks
    localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        channelRef.current?.send({
          type: "broadcast",
          event: "ice",
          payload: { to: remoteUserId, from: userId, candidate: e.candidate },
        });
      }
    };

    pc.ontrack = (e) => {
      const [stream] = e.streams;
      updatePeer(remoteUserId, { stream });
      // attach audio
      let audio = document.getElementById(`audio-${remoteUserId}`) as HTMLAudioElement | null;
      if (!audio) {
        audio = document.createElement("audio");
        audio.id = `audio-${remoteUserId}`;
        audio.autoplay = true;
        (audio as any).playsInline = true;
        audioContainerRef.current?.appendChild(audio);
      }
      audio.srcObject = stream;
    };

    pc.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        cleanupPeer(remoteUserId);
      }
    };

    if (initiator) {
      (async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        channelRef.current?.send({
          type: "broadcast",
          event: "offer",
          payload: { to: remoteUserId, from: userId, sdp: offer, meta: { displayName, avatarUrl } },
        });
      })();
    }

    return peer;
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      // simple VAD via audio level
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
      const ac = new AudioCtx();
      const src = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i];
        setSpeakingSelf(sum / buf.length > 12);
        if (localStreamRef.current) requestAnimationFrame(tick);
      };
      tick();

      const channel = supabase.channel(`voice-${roomId}`, {
        config: { presence: { key: userId }, broadcast: { self: false } },
      });
      channelRef.current = channel;

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState() as Record<string, any[]>;
          // For each remote user, if we don't have a peer and our id is lower, initiate
          Object.keys(state).forEach((uid) => {
            if (uid === userId) return;
            if (uid.startsWith("observer-")) return; // ignore listeners not in the call
            const meta = state[uid][0] || {};
            if (meta?.observer) return;
            if (!peersRef.current[uid]) {
              const initiator = userId < uid; // deterministic
              createPeer(uid, { displayName: meta.displayName || "User", avatarUrl: meta.avatarUrl }, initiator);
            }
          });
        })
        .on("presence", { event: "leave" }, ({ key }) => {
          if (key.startsWith("observer-")) return;
          cleanupPeer(key);
        })
        .on("broadcast", { event: "offer" }, async ({ payload }) => {
          if (payload.to !== userId) return;
          const peer = createPeer(payload.from, payload.meta || { displayName: "User" }, false);
          await peer.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await peer.pc.createAnswer();
          await peer.pc.setLocalDescription(answer);
          channel.send({
            type: "broadcast",
            event: "answer",
            payload: { to: payload.from, from: userId, sdp: answer },
          });
        })
        .on("broadcast", { event: "answer" }, async ({ payload }) => {
          if (payload.to !== userId) return;
          const peer = peersRef.current[payload.from];
          if (peer) await peer.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        })
        .on("broadcast", { event: "ice" }, async ({ payload }) => {
          if (payload.to !== userId) return;
          const peer = peersRef.current[payload.from];
          if (peer && payload.candidate) {
            try { await peer.pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch {}
          }
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({ displayName, avatarUrl, joinedAt: Date.now() });
            setConnected(true);
          }
        });

      // Public heartbeat channel so ALL room members (even those not in the call) know a call is live
      const pingCh = supabase.channel(`voice-ping-${roomId}`, { config: { broadcast: { self: false } } });
      pingChannelRef.current = pingCh;
      pingCh.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const send = () => {
            pingCh.send({
              type: "broadcast",
              event: "ping",
              payload: { userId, displayName, avatarUrl, ts: Date.now() },
            });
          };
          send();
          pingIntervalRef.current = setInterval(send, 3000);
        }
      });
    } catch (err: any) {
      toast({ title: "Microphone blocked", description: err.message || "Enable mic access to join the call", variant: "destructive" });
      onClose();
    }
  };

  const endCall = () => {
    try {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
      pingChannelRef.current?.send({ type: "broadcast", event: "left", payload: { userId } });
      pingChannelRef.current && supabase.removeChannel(pingChannelRef.current);
    } catch {}
    pingChannelRef.current = null;
    try {
      channelRef.current?.untrack();
      channelRef.current && supabase.removeChannel(channelRef.current);
    } catch {}
    channelRef.current = null;
    Object.keys(peersRef.current).forEach(cleanupPeer);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setConnected(false);
    setPeers({});
    onClose();
  };

  const toggleMute = () => {
    const enabled = muted; // we're about to unmute if currently muted
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = enabled));
    setMuted(!muted);
  };

  useEffect(() => {
    if (open && !connected) startCall();
    return () => {
      if (!open && connected) endCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      // final cleanup on unmount
      channelRef.current && supabase.removeChannel(channelRef.current);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      Object.values(peersRef.current).forEach((p) => { try { p.pc.close(); } catch {} });
    };
  }, []);

  if (!open) return null;

  const participants = [
    { userId, displayName: `${displayName} (You)`, avatarUrl, speaking: speakingSelf && !muted, isSelf: true, muted },
    ...Object.values(peers).map((p) => ({ userId: p.userId, displayName: p.displayName, avatarUrl: p.avatarUrl, speaking: false, isSelf: false, muted: false })),
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <h2 className="font-semibold text-foreground">Voice Call</h2>
        <span className="text-xs text-muted-foreground">· {participants.length} in call</span>
      </div>

      {/* Participants grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {participants.map((p) => (
            <div key={p.userId} className="flex flex-col items-center gap-2 bg-card border border-border rounded-2xl p-4">
              <div className={`relative ${p.speaking ? "ring-4 ring-primary rounded-full" : ""} transition-all`}>
                <Avatar className="w-16 h-16">
                  <AvatarImage src={p.avatarUrl || ""} />
                  <AvatarFallback className="bg-secondary text-lg">
                    {p.displayName[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                {p.speaking && (
                  <span className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
                    <Volume2 className="w-3 h-3 text-primary-foreground" />
                  </span>
                )}
                {p.muted && (
                  <span className="absolute -bottom-1 -right-1 bg-destructive rounded-full p-1">
                    <MicOff className="w-3 h-3 text-destructive-foreground" />
                  </span>
                )}
              </div>
              <p className="text-xs text-center text-foreground truncate max-w-full">{p.displayName}</p>
            </div>
          ))}
        </div>

        {participants.length === 1 && (
          <p className="text-center text-sm text-muted-foreground mt-8">
            Waiting for others to join… Share the room and start talking!
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 border-t border-border flex items-center justify-center gap-4">
        <Button
          size="lg"
          variant={muted ? "destructive" : "secondary"}
          className="rounded-full w-14 h-14"
          onClick={toggleMute}
        >
          {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>
        <Button
          size="lg"
          variant="destructive"
          className="rounded-full w-16 h-16"
          onClick={endCall}
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>

      <div ref={audioContainerRef} className="hidden" />
    </div>,
    document.body
  );
};
