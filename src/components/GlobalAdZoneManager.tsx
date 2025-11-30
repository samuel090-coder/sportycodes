import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2, Plus, Loader2, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GlobalAdZone {
  id: string;
  zone_id: string;
  zone_name: string;
  placement: string;
  is_active: boolean;
}

export const GlobalAdZoneManager = () => {
  const [adZones, setAdZones] = useState<GlobalAdZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newZone, setNewZone] = useState({
    zone_id: "",
    zone_name: "",
    placement: "header",
  });

  useEffect(() => {
    loadAdZones();
  }, []);

  const loadAdZones = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('global_ad_zones')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdZones(data || []);
    } catch (error) {
      console.error('Error loading ad zones:', error);
      toast.error('Failed to load ad zones');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newZone.zone_id || !newZone.zone_name) {
      toast.error("Zone ID and Name are required");
      return;
    }

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('global_ad_zones')
        .insert({
          zone_id: newZone.zone_id,
          zone_name: newZone.zone_name,
          placement: newZone.placement,
          is_active: true,
        });

      if (error) throw error;

      toast.success("Ad zone added successfully!");
      setNewZone({ zone_id: "", zone_name: "", placement: "header" });
      loadAdZones();
    } catch (error) {
      console.error('Error adding ad zone:', error);
      toast.error("Failed to add ad zone");
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('global_ad_zones')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Ad zone ${!currentStatus ? 'activated' : 'deactivated'}`);
      loadAdZones();
    } catch (error) {
      console.error('Error toggling ad zone:', error);
      toast.error('Failed to update ad zone');
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ad zone?')) return;

    try {
      const { error } = await supabase
        .from('global_ad_zones')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Ad zone deleted successfully!");
      loadAdZones();
    } catch (error) {
      console.error('Error deleting ad zone:', error);
      toast.error("Failed to delete ad zone");
    }
  };

  return (
    <Card className="bg-gradient-cyber border-2 border-cyber-neon-purple/50 shadow-neon-purple p-4 md:p-6 relative overflow-hidden">
      <div className="absolute top-2 right-2 flex gap-2">
        <div className="w-2 h-2 rounded-full bg-cyber-neon-purple animate-pulse" />
        <div className="w-2 h-2 rounded-full bg-cyber-neon-cyan animate-pulse delay-75" />
        <div className="w-2 h-2 rounded-full bg-cyber-neon-green animate-pulse delay-150" />
      </div>

      <h2 className="text-base md:text-xl font-black text-cyber-neon-purple mb-4 font-mono flex items-center gap-2">
        <span className="text-cyber-neon-green text-sm md:text-base">&gt;</span> 
        <span className="text-sm md:text-base">GLOBAL AD ZONES</span>
      </h2>

      {/* HilltopAds Instructions */}
      <div className="mb-4 md:mb-6 p-3 md:p-4 bg-cyber-neon-cyan/10 border border-cyber-neon-cyan/30 rounded-lg">
        <h3 className="text-xs md:text-sm font-bold text-cyber-neon-cyan font-mono mb-2">📘 HILLTOPADS SETUP GUIDE:</h3>
        <ol className="text-xs text-cyber-neon-green/80 font-mono space-y-1 list-decimal list-inside">
          <li>Login to <strong>member.hilltopads.com</strong></li>
          <li>Click "Add New Zone" button</li>
          <li>Select zone type (Banner 300x250 recommended for mobile)</li>
          <li>Copy the FULL script URL from your zone</li>
          <li>Paste URL into "ZONE ID" field below</li>
          <li>Select placement and activate</li>
        </ol>
        <p className="text-xs text-yellow-400 font-mono mt-2 font-bold">
          ⚠️ IMPORTANT: HilltopAds works ONLY with Banner zones (300x100, 300x250). Popunders won't display!
        </p>
        <p className="text-xs text-cyber-neon-purple/80 font-mono mt-2">
          💡 Ads appear automatically once activated
        </p>
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* Add New Zone Form */}
        <form onSubmit={handleAddZone} className="space-y-4 pb-4 md:pb-6 border-b border-cyber-neon-purple/30">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="zone_id" className="text-cyber-neon-cyan font-mono text-sm">
                ZONE ID
              </Label>
              <Input
                id="zone_id"
                value={newZone.zone_id}
                onChange={(e) => setNewZone({ ...newZone, zone_id: e.target.value })}
                placeholder="Paste full script URL here"
                className="mt-2 bg-cyber-dark/50 border-cyber-neon-purple/50 text-cyber-neon-green font-mono text-xs"
                required
              />
            </div>

            <div>
              <Label htmlFor="zone_name" className="text-cyber-neon-cyan font-mono text-sm">
                ZONE NAME
              </Label>
              <Input
                id="zone_name"
                value={newZone.zone_name}
                onChange={(e) => setNewZone({ ...newZone, zone_name: e.target.value })}
                placeholder="e.g., Header Banner"
                className="mt-2 bg-cyber-dark/50 border-cyber-neon-purple/50 text-cyber-neon-green font-mono"
                required
              />
            </div>

            <div>
              <Label htmlFor="placement" className="text-cyber-neon-cyan font-mono text-sm">
                PLACEMENT
              </Label>
              <Select value={newZone.placement} onValueChange={(value) => setNewZone({ ...newZone, placement: value })}>
                <SelectTrigger className="mt-2 bg-cyber-dark/50 border-cyber-neon-purple/50 text-cyber-neon-green font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-cyber-panel border-cyber-neon-purple">
                  <SelectItem value="header" className="text-cyber-neon-green font-mono">Header (Top of page)</SelectItem>
                  <SelectItem value="after-header" className="text-cyber-neon-green font-mono">After Header (Below title)</SelectItem>
                  <SelectItem value="footer" className="text-cyber-neon-green font-mono">Footer (Bottom of page)</SelectItem>
                  <SelectItem value="sidebar" className="text-cyber-neon-green font-mono">Sidebar</SelectItem>
                  <SelectItem value="popup" className="text-cyber-neon-green font-mono">Popup</SelectItem>
                  <SelectItem value="interstitial" className="text-cyber-neon-green font-mono">Interstitial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isAdding}
            className="w-full bg-cyber-neon-purple text-cyber-dark hover:bg-cyber-neon-cyan font-black font-mono"
          >
            {isAdding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ADDING...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                ADD ZONE
              </>
            )}
          </Button>
        </form>

        {/* Existing Zones Table */}
        <div>
          <h3 className="text-base md:text-lg font-black text-cyber-neon-cyan mb-4 font-mono">
            ACTIVE ZONES
          </h3>
          
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-cyber-neon-green mx-auto" />
              <p className="text-cyber-neon-cyan/50 font-mono mt-2">LOADING ZONES...</p>
            </div>
          ) : adZones.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-cyber-neon-cyan/50 font-mono">No global ad zones configured</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-cyber-neon-purple/30">
                    <TableHead className="text-cyber-neon-green font-mono">ZONE ID</TableHead>
                    <TableHead className="text-cyber-neon-green font-mono">NAME</TableHead>
                    <TableHead className="text-cyber-neon-green font-mono">PLACEMENT</TableHead>
                    <TableHead className="text-cyber-neon-green font-mono">STATUS</TableHead>
                    <TableHead className="text-cyber-neon-green font-mono">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adZones.map((zone) => (
                    <TableRow key={zone.id} className="border-cyber-neon-purple/20">
                      <TableCell className="text-cyber-neon-cyan font-mono text-xs max-w-[200px] truncate" title={zone.zone_id}>
                        {zone.zone_id}
                      </TableCell>
                      <TableCell className="text-cyber-neon-green font-mono">{zone.zone_name}</TableCell>
                      <TableCell className="text-cyber-neon-cyan font-mono uppercase">{zone.placement}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleToggleActive(zone.id, zone.is_active)}
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold font-mono transition-all ${
                            zone.is_active
                              ? 'bg-cyber-neon-green/20 text-cyber-neon-green'
                              : 'bg-cyber-neon-purple/20 text-cyber-neon-purple'
                          }`}
                        >
                          <Radio className="w-3 h-3" />
                          {zone.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteZone(zone.id)}
                          className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
