import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Disc, Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WheelSegment {
  id: string;
  segment_label: string;
  segment_value: number;
  segment_color: string;
  segment_type: string;
  probability: number;
  is_active: boolean;
}

export const BonusWheelSection = () => {
  const [segments, setSegments] = useState<WheelSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [totalSpins, setTotalSpins] = useState(0);
  const [totalPaidOut, setTotalPaidOut] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [segRes, statsRes] = await Promise.all([
      supabase.from("bonus_wheel_config").select("*").order("probability", { ascending: false }),
      supabase.from("daily_spins").select("reward_amount"),
    ]);
    if (segRes.data) setSegments(segRes.data);
    if (statsRes.data) {
      setTotalSpins(statsRes.data.length);
      setTotalPaidOut(statsRes.data.reduce((sum, s) => sum + (s.reward_amount || 0), 0));
    }
    setIsLoading(false);
  };

  const updateSegment = (id: string, field: string, value: any) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const saveSegments = async () => {
    setIsSaving(true);
    try {
      for (const seg of segments) {
        await supabase.from("bonus_wheel_config").update({
          segment_label: seg.segment_label,
          segment_value: seg.segment_value,
          segment_color: seg.segment_color,
          segment_type: seg.segment_type,
          probability: seg.probability,
          is_active: seg.is_active,
        }).eq("id", seg.id);
      }
      toast.success("Wheel configuration saved!");
    } catch {
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const addSegment = async () => {
    const { error } = await supabase.from("bonus_wheel_config").insert({
      segment_label: "₦10",
      segment_value: 10,
      segment_color: "#3b82f6",
      segment_type: "cash",
      probability: 10,
    });
    if (!error) {
      toast.success("Segment added");
      loadData();
    }
  };

  const deleteSegment = async (id: string) => {
    await supabase.from("bonus_wheel_config").delete().eq("id", id);
    setSegments(prev => prev.filter(s => s.id !== id));
    toast.success("Segment removed");
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card/50 border-border p-4 text-center">
          <p className="text-2xl font-black text-foreground">{totalSpins}</p>
          <p className="text-sm text-muted-foreground">Total Spins</p>
        </Card>
        <Card className="bg-card/50 border-border p-4 text-center">
          <p className="text-2xl font-black text-green-500">₦{totalPaidOut.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Total Paid Out</p>
        </Card>
      </div>

      {/* Wheel Segments */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Disc className="w-5 h-5 text-primary" />
          Wheel Segments
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Configure each wheel segment's label, value, color, and probability weight.
        </p>

        <div className="space-y-3">
          {segments.map((seg) => (
            <div key={seg.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl flex-wrap">
              <input
                type="color"
                value={seg.segment_color}
                onChange={(e) => updateSegment(seg.id, "segment_color", e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
              <div className="flex-1 min-w-[100px]">
                <Label className="text-xs text-muted-foreground">Label</Label>
                <Input
                  value={seg.segment_label}
                  onChange={(e) => updateSegment(seg.id, "segment_label", e.target.value)}
                  className="h-8 bg-background border-border text-sm"
                />
              </div>
              <div className="w-20">
                <Label className="text-xs text-muted-foreground">Value (₦)</Label>
                <Input
                  type="number"
                  value={seg.segment_value}
                  onChange={(e) => updateSegment(seg.id, "segment_value", parseFloat(e.target.value) || 0)}
                  className="h-8 bg-background border-border text-sm"
                />
              </div>
              <div className="w-20">
                <Label className="text-xs text-muted-foreground">Weight</Label>
                <Input
                  type="number"
                  value={seg.probability}
                  onChange={(e) => updateSegment(seg.id, "probability", parseFloat(e.target.value) || 0)}
                  className="h-8 bg-background border-border text-sm"
                />
              </div>
              <Switch
                checked={seg.is_active}
                onCheckedChange={(v) => updateSegment(seg.id, "is_active", v)}
              />
              <Button variant="ghost" size="icon" onClick={() => deleteSegment(seg.id)} className="text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <Button onClick={addSegment} variant="outline" className="flex-1">
            <Plus className="w-4 h-4 mr-2" />
            Add Segment
          </Button>
          <Button onClick={saveSegments} disabled={isSaving} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Config"}
          </Button>
        </div>
      </Card>
    </div>
  );
};
