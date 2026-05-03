import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Loader2, Sparkles, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BetslipPostcard, BetslipPostcardData } from "@/components/BetslipPostcard";

const empty: BetslipPostcardData = {
  bookmaker: "",
  booking_code: "",
  total_odds: 0,
  max_bonus_pct: 0,
  stake: 0,
  bonus: 0,
  payout: 0,
  slip_date: "",
  selections: [],
};

export function BetslipImporter({ onSaved }: { onSaved?: () => void }) {
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<BetslipPostcardData>(empty);
  const [price, setPrice] = useState<number>(500);
  const [confidence, setConfidence] = useState("HIGH");

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const { data: resp, error } = await supabase.functions.invoke("parse-betslip", {
        body: { imageDataUrl: dataUrl },
      });
      if (error) throw error;
      if (resp?.error) throw new Error(resp.error);
      const parsed = resp.data as BetslipPostcardData;
      setData({ ...empty, ...parsed, selections: parsed.selections || [] });
      toast.success("Betslip parsed! Review and adjust before going live.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to parse betslip");
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  };

  const updateSel = (i: number, patch: Partial<BetslipPostcardData["selections"][number]>) => {
    setData((d) => ({
      ...d,
      selections: d.selections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));
  };
  const addSel = () =>
    setData((d) => ({
      ...d,
      selections: [...d.selections, { home_team: "", away_team: "", market: "", pick: "", odds: 0 }],
    }));
  const removeSel = (i: number) =>
    setData((d) => ({ ...d, selections: d.selections.filter((_, idx) => idx !== i) }));

  const save = async () => {
    if (!data.booking_code || data.selections.length === 0) {
      toast.error("Booking code and at least one selection required");
      return;
    }
    setSaving(true);
    try {
      const matchCount = data.selections.length;
      const first = data.selections[0];
      const insertRow: any = {
        home_team: matchCount === 1 ? first.home_team : "",
        away_team: matchCount === 1 ? first.away_team : "",
        prediction: matchCount === 1 ? `${first.market}: ${first.pick}` : `${matchCount} SELECTIONS`,
        odds: data.total_odds,
        confidence,
        bet_code: data.booking_code,
        status: "not-started",
        price,
        match_count: matchCount,
        stake: data.stake || 0,
        payout: data.payout || 0,
        bonus: data.bonus || 0,
        selections: data.selections as any,
        is_postcard: true,
      };
      const { error } = await supabase.from("sure_odds").insert(insertRow);
      if (error) throw error;
      toast.success("Postcard saved & live!");
      setData(empty);
      onSaved?.();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save postcard");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-gradient-cyber border-2 border-cyber-neon-red/60 shadow-neon-red p-6">
      <h3 className="text-2xl font-black text-cyber-neon-red mb-4 font-mono flex items-center gap-2">
        <Sparkles className="w-6 h-6 animate-neon-pulse" />
        AI BETSLIP IMPORTER
      </h3>
      <p className="text-cyber-neon-cyan/80 text-xs font-mono mb-4">
        Upload a betslip screenshot. AI extracts every selection & rebuilds it as a branded postcard.
        Booking code stays locked (blue) for users until they purchase.
      </p>

      <label className="block">
        <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={parsing} />
        <Button
          asChild
          type="button"
          disabled={parsing}
          className="w-full bg-cyber-neon-red text-white hover:bg-red-600 font-mono font-black"
        >
          <span>
            {parsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {parsing ? "PARSING WITH AI..." : "UPLOAD BETSLIP IMAGE"}
          </span>
        </Button>
      </label>

      {(data.booking_code || data.selections.length > 0) && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editable form */}
          <div className="space-y-3">
            <h4 className="text-cyber-neon-cyan font-mono font-black text-sm">EDIT FIELDS</h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="BOOKING CODE" value={data.booking_code}
                onChange={(v) => setData({ ...data, booking_code: v })} />
              <Field label="TOTAL ODDS" type="number" value={data.total_odds}
                onChange={(v) => setData({ ...data, total_odds: parseFloat(v) || 0 })} />
              <Field label="MAX BONUS %" type="number" value={data.max_bonus_pct}
                onChange={(v) => setData({ ...data, max_bonus_pct: parseFloat(v) || 0 })} />
              <Field label="STAKE (₦)" type="number" value={data.stake}
                onChange={(v) => setData({ ...data, stake: parseFloat(v) || 0 })} />
              <Field label="BONUS (₦)" type="number" value={data.bonus}
                onChange={(v) => setData({ ...data, bonus: parseFloat(v) || 0 })} />
              <Field label="PAYOUT (₦)" type="number" value={data.payout}
                onChange={(v) => setData({ ...data, payout: parseFloat(v) || 0 })} />
              <Field label="UNLOCK PRICE (₦)" type="number" value={price}
                onChange={(v) => setPrice(parseFloat(v) || 0)} />
              <Field label="CONFIDENCE" value={confidence}
                onChange={(v) => setConfidence(v)} />
            </div>

            <div className="flex items-center justify-between mt-4">
              <h4 className="text-cyber-neon-cyan font-mono font-black text-sm">SELECTIONS</h4>
              <Button type="button" size="sm" onClick={addSel}
                className="bg-cyber-neon-cyan text-cyber-dark hover:bg-cyber-neon-green font-mono">
                <Plus className="w-3 h-3 mr-1" /> ADD
              </Button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {data.selections.map((s, i) => (
                <div key={i} className="rounded border border-cyber-neon-red/30 bg-cyber-dark/50 p-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-cyber-neon-red text-xs font-mono font-black">#{i + 1}</span>
                    <Button type="button" size="sm" variant="ghost"
                      onClick={() => removeSel(i)} className="h-6 w-6 p-0 text-cyber-neon-red">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <MiniField placeholder="Home" value={s.home_team}
                      onChange={(v) => updateSel(i, { home_team: v })} />
                    <MiniField placeholder="Away" value={s.away_team}
                      onChange={(v) => updateSel(i, { away_team: v })} />
                    <MiniField placeholder="Market" value={s.market}
                      onChange={(v) => updateSel(i, { market: v })} />
                    <MiniField placeholder="Pick" value={s.pick}
                      onChange={(v) => updateSel(i, { pick: v })} />
                    <MiniField placeholder="Odds" type="number" value={s.odds}
                      onChange={(v) => updateSel(i, { odds: parseFloat(v) || 0 })} />
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={save} disabled={saving}
              className="w-full bg-cyber-neon-green text-cyber-dark hover:bg-cyber-neon-cyan font-black font-mono mt-3">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "GO LIVE — SAVE POSTCARD"}
            </Button>
          </div>

          {/* Live preview */}
          <div>
            <h4 className="text-cyber-neon-cyan font-mono font-black text-sm mb-2">LIVE PREVIEW (USER VIEW — LOCKED)</h4>
            <BetslipPostcard data={data} unlocked={false} />
            <h4 className="text-cyber-neon-cyan font-mono font-black text-sm mt-4 mb-2">UNLOCKED VIEW</h4>
            <BetslipPostcard data={data} unlocked={true} />
          </div>
        </div>
      )}
    </Card>
  );
}

function Field({ label, value, onChange, type = "text" }:
  { label: string; value: any; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label className="text-cyber-neon-cyan font-mono text-[10px]">{label}</Label>
      <Input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono h-8 text-sm"
      />
    </div>
  );
}

function MiniField({ placeholder, value, onChange, type = "text" }:
  { placeholder: string; value: any; onChange: (v: string) => void; type?: string }) {
  return (
    <Input
      type={type}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="bg-cyber-dark/50 border-cyber-neon-cyan/30 text-cyber-neon-green font-mono h-7 text-xs"
    />
  );
}
