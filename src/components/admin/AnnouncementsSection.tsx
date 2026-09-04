import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Megaphone,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  X,
  ExternalLink,
  AlertTriangle,
  Bell,
  MessageSquare,
  Layout,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AnnouncementBannerView,
  AnnouncementPopupBody,
  AnnouncementToastView,
  AnnouncementView,
} from "@/components/announcements/AnnouncementSurfaces";
import { RICH_HELP } from "@/lib/announcementRich";
import {
  ANNOUNCEMENT_TEMPLATES,
  TEMPLATE_CATEGORIES,
  AnnouncementTemplate,
} from "@/lib/announcementTemplates";

interface Announcement {
  id: string;
  title: string;
  content: string;
  display_type: string;
  priority: number;
  bg_color: string;
  text_color: string;
  link_url?: string;
  link_text?: string;
  image_url?: string;
  is_active: boolean;
  is_dismissible: boolean;
  show_once: boolean;
  start_at?: string;
  end_at?: string;
  created_at: string;
}

const DISPLAY_TYPES = [
  { value: "banner", label: "Banner", description: "Persistent bar at top of page", icon: Layout },
  { value: "popup", label: "Popup/Modal", description: "Centered dialog box", icon: MessageSquare },
  { value: "toast", label: "Toast Notification", description: "Slide-in at corner", icon: Bell },
];

const COLOR_PRESETS = [
  { name: "Primary", bg: "#6366f1", text: "#ffffff" },
  { name: "Success", bg: "#22c55e", text: "#ffffff" },
  { name: "Warning", bg: "#f59e0b", text: "#000000" },
  { name: "Danger", bg: "#ef4444", text: "#ffffff" },
  { name: "Info", bg: "#0ea5e9", text: "#ffffff" },
  { name: "Dark", bg: "#1f2937", text: "#ffffff" },
];

export const AnnouncementsSection = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>("banner");
  
  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [displayType, setDisplayType] = useState("toast");
  const [priority, setPriority] = useState(1);
  const [bgColor, setBgColor] = useState("#6366f1");
  const [textColor, setTextColor] = useState("#ffffff");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isDismissible, setIsDismissible] = useState(true);
  const [showOnce, setShowOnce] = useState(false);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategory, setTemplateCategory] = useState("all");

  const filteredTemplates = ANNOUNCEMENT_TEMPLATES.filter((t) => {
    const q = templateSearch.trim().toLowerCase();
    const matchesQ = !q || `${t.name} ${t.title} ${t.category}`.toLowerCase().includes(q);
    const matchesC = templateCategory === "all" || t.category === templateCategory;
    return matchesQ && matchesC;
  });

  const applyTemplate = (t: AnnouncementTemplate) => {
    setTitle(t.title);
    setContent(t.content);
    setDisplayType(t.display_type);
    setPreviewType(t.display_type);
    setBgColor(t.bg_color);
    setTextColor(t.text_color);
    if (t.link_text) setLinkText(t.link_text);
    toast.success(`Template applied: ${t.name}`);
  };

  const insertMarkup = (snippet: string) => {
    setContent((prev) => (prev ? `${prev.replace(/\s+$/, "")}\n${snippet}` : snippet));
  };

  const previewData: AnnouncementView = {
    title: title || "Announcement Title",
    content: content || "Your message here...",
    bg_color: bgColor,
    text_color: textColor,
    link_url: linkUrl || undefined,
    link_text: linkText || undefined,
    image_url: imageUrl || undefined,
    is_dismissible: isDismissible,
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load announcements");
    } else {
      setAnnouncements(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setDisplayType("toast");
    setPriority(1);
    setBgColor("#6366f1");
    setTextColor("#ffffff");
    setLinkUrl("");
    setLinkText("");
    setIsActive(true);
    setIsDismissible(true);
    setShowOnce(false);
    setStartAt("");
    setEndAt("");
    setEditingId(null);
    setImageFile(null);
    setImageUrl("");
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setTitle(announcement.title);
    setContent(announcement.content);
    setDisplayType(announcement.display_type);
    setPriority(announcement.priority);
    setBgColor(announcement.bg_color);
    setTextColor(announcement.text_color);
    setLinkUrl(announcement.link_url || "");
    setLinkText(announcement.link_text || "");
    setIsActive(announcement.is_active);
    setIsDismissible(announcement.is_dismissible);
    setShowOnce(announcement.show_once);
    setStartAt(announcement.start_at ? new Date(announcement.start_at).toISOString().slice(0, 16) : "");
    setEndAt(announcement.end_at ? new Date(announcement.end_at).toISOString().slice(0, 16) : "");
    setImageUrl(announcement.image_url || "");
    setImageFile(null);
    setDialogOpen(true);
  };

  const handleImageUpload = async (): Promise<string | null> => {
    if (!imageFile) return imageUrl || null;
    
    setUploadingImage(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `announcement-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("announcement-images")
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("announcement-images")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Failed to upload image");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setSaving(true);
    
    // Upload image if selected
    let finalImageUrl = imageUrl;
    if (imageFile) {
      const uploadedUrl = await handleImageUpload();
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
      }
    }
    
    const { data: session } = await supabase.auth.getSession();

    const payload = {
      title,
      content,
      display_type: displayType,
      priority,
      bg_color: bgColor,
      text_color: textColor,
      link_url: linkUrl || null,
      link_text: linkText || null,
      image_url: finalImageUrl || null,
      is_active: isActive,
      is_dismissible: isDismissible,
      show_once: showOnce,
      start_at: startAt || null,
      end_at: endAt || null,
      created_by: session?.session?.user?.id,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("announcements").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("announcements").insert(payload));
    }

    if (error) {
      toast.error("Failed to save announcement");
      console.error(error);
    } else {
      toast.success(editingId ? "Announcement updated!" : "Announcement created!");
      setDialogOpen(false);
      resetForm();
      fetchAnnouncements();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Announcement deleted");
      fetchAnnouncements();
    }
  };

  const toggleActive = async (announcement: Announcement) => {
    const { error } = await supabase
      .from("announcements")
      .update({ is_active: !announcement.is_active })
      .eq("id", announcement.id);

    if (error) {
      toast.error("Failed to update");
    } else {
      fetchAnnouncements();
    }
  };

  const getDisplayTypeIcon = (type: string) => {
    const dt = DISPLAY_TYPES.find(t => t.value === type);
    return dt ? dt.icon : Bell;
  };

  const applyColorPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setBgColor(preset.bg);
    setTextColor(preset.text);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" />
            Announcements
          </h2>
          <p className="text-sm text-muted-foreground">Create and manage site-wide announcements</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          New Announcement
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-foreground">{announcements.length}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-card/50 border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-bet-success/10 rounded-lg">
              <Eye className="w-5 h-5 text-bet-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-bet-success">
                {announcements.filter(a => a.is_active).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-card/50 border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <EyeOff className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inactive</p>
              <p className="text-2xl font-bold text-muted-foreground">
                {announcements.filter(a => !a.is_active).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Announcements Table */}
      <Card className="bg-card/50 border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : announcements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No announcements yet. Create one to get started!
                </TableCell>
              </TableRow>
            ) : (
              announcements.map((announcement) => {
                const Icon = getDisplayTypeIcon(announcement.display_type);
                return (
                  <TableRow key={announcement.id} className="border-border">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: announcement.bg_color }}
                        />
                        <span className="font-medium text-foreground">{announcement.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Icon className="w-4 h-4" />
                        <span className="capitalize">{announcement.display_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(announcement)}
                        className={announcement.is_active ? "text-bet-success" : "text-muted-foreground"}
                      >
                        {announcement.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        <span className="ml-1">{announcement.is_active ? "Active" : "Inactive"}</span>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-muted-foreground">{announcement.priority}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(announcement)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(announcement.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              {editingId ? "Edit Announcement" : "Create Announcement"}
            </DialogTitle>
            <DialogDescription>
              Create announcements that display as banners, popups, or toast notifications
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="content" className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="style">Style & Display</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="🎉 Exciting News!"
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <div className="flex flex-wrap gap-1">
                  {[
                    ["# Title", "# Big Title"],
                    ["## Subtitle", "## Subtitle"],
                    ["Bold", "**bold text**"],
                    ["Highlight", "==highlighted=="],
                    ["Badge", "[[NEW]]"],
                    ["Bullets", "- first item\n- second item"],
                    ["Numbered", "1. step one\n2. step two"],
                    ["Quote", "> quoted line"],
                    ["Callout", "!info: important note"],
                    ["Alert", "!error: urgent alert"],
                    ["Promo", "!promo: limited offer"],
                    ["Divider", "---"],
                    ["Button", "[Claim Now](https://sportycodes.lovable.app)"],
                    ["Image", "![](https://image-url)"],
                    ["Countdown", "@@countdown:2026-12-31T20:00@@"],
                  ].map(([label, snippet]) => (
                    <Button
                      key={label}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => insertMarkup(snippet)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={RICH_HELP}
                  className="bg-secondary/50 border-border min-h-[160px] font-mono text-xs"
                />
                <div className="rounded-xl border border-border bg-background p-3">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Live preview ({displayType})
                  </div>
                  {displayType === "banner" && <AnnouncementBannerView a={previewData} />}
                  {displayType === "popup" && (
                    <div
                      className="overflow-hidden rounded-2xl border-2 bg-card"
                      style={{ borderColor: bgColor }}
                    >
                      <AnnouncementPopupBody a={previewData} />
                    </div>
                  )}
                  {displayType === "toast" && <AnnouncementToastView a={previewData} />}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Link URL (optional)</Label>
                  <Input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Link Text</Label>
                  <Input
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Learn More"
                    className="bg-secondary/50 border-border"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Image (optional)</Label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImageFile(file);
                        // Create preview URL
                        const previewUrl = URL.createObjectURL(file);
                        setImageUrl(previewUrl);
                      }
                    }}
                    className="hidden"
                    id="announcement-image"
                  />
                  
                  {imageUrl ? (
                    <div className="relative">
                      <img 
                        src={imageUrl} 
                        alt="Announcement preview" 
                        className="w-full h-40 object-cover rounded-xl border border-border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setImageFile(null);
                          setImageUrl("");
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label
                      htmlFor="announcement-image"
                      className="flex flex-col items-center justify-center gap-2 w-full py-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-secondary/30"
                    >
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="text-muted-foreground font-medium">
                        Upload image from device
                      </span>
                      <span className="text-xs text-muted-foreground">
                        PNG, JPG, GIF up to 5MB
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Style Tab */}
            <TabsContent value="style" className="space-y-6 mt-4">
              {/* Display Type */}
              <div className="space-y-3">
                <Label>Display Type</Label>
                <div className="grid grid-cols-3 gap-3">
                  {DISPLAY_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setDisplayType(type.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        displayType === type.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <type.icon className={`w-6 h-6 mb-2 ${displayType === type.value ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="font-semibold text-foreground">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Presets */}
              <div className="space-y-3">
                <Label>Color Preset</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyColorPreset(preset)}
                      className="px-3 py-2 rounded-lg border border-border flex items-center gap-2 hover:border-primary/50"
                    >
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.bg }}
                      />
                      <span className="text-sm text-foreground">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Background Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="h-10 w-16 rounded cursor-pointer"
                    />
                    <Input
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="bg-secondary/50 border-border font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Text Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="h-10 w-16 rounded cursor-pointer"
                    />
                    <Input
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="bg-secondary/50 border-border font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority (higher = more important)</Label>
                  <Input
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    min={1}
                    max={10}
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <div className="space-y-4 pt-6">
                  <div className="flex items-center justify-between">
                    <Label>Active</Label>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Dismissible</Label>
                    <Switch checked={isDismissible} onCheckedChange={setIsDismissible} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Show Once Per User</Label>
                    <Switch checked={showOnce} onCheckedChange={setShowOnce} />
                  </div>
                </div>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="bg-secondary/50 border-border"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Preview Tab — renders the EXACT user-facing components */}
            <TabsContent value="preview" className="mt-4">
              <div className="space-y-4">
                <div className="flex gap-2">
                  {DISPLAY_TYPES.map((type) => (
                    <Button
                      key={type.value}
                      variant={previewType === type.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPreviewType(type.value)}
                    >
                      <type.icon className="w-4 h-4 mr-1" />
                      {type.label}
                    </Button>
                  ))}
                </div>

                <div className="relative min-h-[340px] overflow-hidden rounded-xl border border-border bg-background">
                  {previewType === "banner" && (
                    <div className="absolute left-0 right-0 top-0">
                      <AnnouncementBannerView a={previewData} />
                    </div>
                  )}

                  {previewType === "popup" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-4">
                      <div
                        className="w-full max-w-md overflow-hidden rounded-2xl border-2 bg-card"
                        style={{ borderColor: bgColor }}
                      >
                        <AnnouncementPopupBody a={previewData} />
                      </div>
                    </div>
                  )}

                  {previewType === "toast" && (
                    <div className="absolute bottom-4 right-4">
                      <AnnouncementToastView a={previewData} onDismiss={() => {}} />
                    </div>
                  )}

                  <div className={`p-4 ${previewType === "banner" ? "mt-16" : ""}`}>
                    <div className="mb-4 h-8 w-48 rounded-lg bg-muted/30" />
                    <div className="mb-2 h-4 w-full rounded-lg bg-muted/30" />
                    <div className="mb-2 h-4 w-3/4 rounded-lg bg-muted/30" />
                    <div className="h-4 w-1/2 rounded-lg bg-muted/30" />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="mt-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    placeholder="Search templates..."
                    className="h-9 max-w-xs bg-secondary/50"
                  />
                  <Select value={templateCategory} onValueChange={setTemplateCategory}>
                    <SelectTrigger className="h-9 w-44 bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {TEMPLATE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">
                    {filteredTemplates.length} templates
                  </span>
                </div>

                <div className="grid max-h-[55vh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                  {filteredTemplates.slice(0, 120).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className="rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary hover:shadow-lg"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold">{t.name}</span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                          style={{ backgroundColor: t.bg_color, color: t.text_color }}
                        >
                          {t.display_type}
                        </span>
                      </div>
                      <div className="pointer-events-none max-h-32 overflow-hidden rounded-lg">
                        <AnnouncementToastView
                          a={{
                            title: t.title,
                            content: t.content,
                            bg_color: t.bg_color,
                            text_color: t.text_color,
                          }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving ? "Saving..." : editingId ? "Update" : "Create"} Announcement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
