import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Gift, Sparkles, X } from "lucide-react";

interface WheelSegment {
  id: string;
  segment_label: string;
  segment_value: number;
  segment_color: string;
  segment_type: string;
  probability: number;
}

interface DailyBonusWheelProps {
  userId: string;
  onRewardClaimed?: (amount: number) => void;
}

const DailyBonusWheel = ({ userId, onRewardClaimed }: DailyBonusWheelProps) => {
  const [segments, setSegments] = useState<WheelSegment[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [reward, setReward] = useState<WheelSegment | null>(null);
  const [showWheel, setShowWheel] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadWheelData();
  }, [userId]);

  useEffect(() => {
    if (segments.length > 0 && canvasRef.current) {
      drawWheel();
    }
  }, [segments, rotation]);

  const loadWheelData = async () => {
    const [configRes, spinRes] = await Promise.all([
      supabase.from("bonus_wheel_config").select("*").eq("is_active", true).order("probability", { ascending: false }),
      supabase.from("daily_spins").select("*").eq("user_id", userId).eq("spin_date", new Date().toISOString().split("T")[0]).maybeSingle(),
    ]);

    if (configRes.data) setSegments(configRes.data);
    if (spinRes.data) setHasSpunToday(true);
  };

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas || segments.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;
    const segmentAngle = (2 * Math.PI) / segments.length;

    ctx.clearRect(0, 0, size, size);

    segments.forEach((seg, i) => {
      const startAngle = i * segmentAngle + (rotation * Math.PI) / 180;
      const endAngle = startAngle + segmentAngle;

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.segment_color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw label
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(seg.segment_label, radius - 15, 4);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(center, center, 20, 0, 2 * Math.PI);
    ctx.fillStyle = "#1a1a2e";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();
  };

  const selectReward = (): WheelSegment => {
    const totalProb = segments.reduce((sum, s) => sum + s.probability, 0);
    let random = Math.random() * totalProb;
    for (const seg of segments) {
      random -= seg.probability;
      if (random <= 0) return seg;
    }
    return segments[0];
  };

  const spin = async () => {
    if (isSpinning || hasSpunToday || segments.length === 0) return;

    setIsSpinning(true);
    setReward(null);

    const selectedReward = selectReward();
    const segmentIndex = segments.findIndex(s => s.id === selectedReward.id);
    const segmentAngle = 360 / segments.length;
    // Calculate target rotation so the pointer (at top) lands on the segment
    const targetSegmentCenter = segmentIndex * segmentAngle + segmentAngle / 2;
    const fullRotations = 5 * 360; // 5 full spins
    const targetRotation = fullRotations + (360 - targetSegmentCenter);

    // Animate
    let current = 0;
    const duration = 4000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      current = eased * targetRotation;
      setRotation(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Spin complete
        completeSpinReward(selectedReward);
      }
    };

    requestAnimationFrame(animate);
  };

  const completeSpinReward = async (selectedReward: WheelSegment) => {
    try {
      // Record spin
      await supabase.from("daily_spins").insert({
        user_id: userId,
        reward_amount: selectedReward.segment_value,
        reward_type: selectedReward.segment_type,
        segment_label: selectedReward.segment_label,
      });

      // Credit wallet if cash reward
      if (selectedReward.segment_type === "cash" && selectedReward.segment_value > 0) {
        await supabase.rpc("add_tap_earnings", {
          _user_id: userId,
          _amount: selectedReward.segment_value,
        });
      }

      setReward(selectedReward);
      setHasSpunToday(true);
      onRewardClaimed?.(selectedReward.segment_value);
      toast.success(`You won ${selectedReward.segment_label}! 🎉`);
    } catch (error) {
      console.error("Error completing spin:", error);
      toast.error("Failed to claim reward");
    } finally {
      setIsSpinning(false);
    }
  };

  if (!showWheel) {
    return (
      <button
        onClick={() => setShowWheel(true)}
        disabled={hasSpunToday}
        className={`w-full relative overflow-hidden rounded-2xl border p-4 flex items-center gap-4 transition-all ${
          hasSpunToday
            ? "bg-card/40 border-border/30 opacity-60"
            : "bg-gradient-to-r from-primary/10 to-cyber-neon-purple/10 border-primary/30 hover:border-primary/50"
        }`}
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg">
          <Gift className="w-7 h-7 text-white" />
        </div>
        <div className="text-left flex-1">
          <h4 className="font-bold text-foreground">Daily Bonus Wheel</h4>
          <p className="text-sm text-muted-foreground">
            {hasSpunToday ? "Come back tomorrow!" : "Spin to win rewards!"}
          </p>
        </div>
        {!hasSpunToday && (
          <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full animate-pulse">
            FREE
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl border border-border/50 p-6 max-w-sm w-full relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowWheel(false)}
          className="absolute top-3 right-3 rounded-xl"
        >
          <X className="w-5 h-5" />
        </Button>

        <div className="text-center mb-4">
          <h3 className="text-xl font-black text-foreground flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Daily Bonus Wheel
          </h3>
          <p className="text-sm text-muted-foreground">Spin to win amazing rewards!</p>
        </div>

        {/* Wheel */}
        <div className="relative mx-auto w-64 h-64 mb-6">
          {/* Pointer */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
          <canvas
            ref={canvasRef}
            width={256}
            height={256}
            className="w-full h-full rounded-full shadow-2xl"
          />
        </div>

        {/* Result */}
        {reward && (
          <div className="text-center mb-4 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-bold text-primary">You won {reward.segment_label}!</span>
            </div>
          </div>
        )}

        {/* Spin Button */}
        <Button
          onClick={spin}
          disabled={isSpinning || hasSpunToday}
          className="w-full h-14 rounded-2xl text-lg font-black"
        >
          {isSpinning ? "Spinning..." : hasSpunToday ? "Come Back Tomorrow" : "🎰 SPIN NOW!"}
        </Button>
      </div>
    </div>
  );
};

export default DailyBonusWheel;
