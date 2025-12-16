import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Bell, Send, Loader2, Users, Image, Sparkles, 
  Copy, Trash2, Plus, Eye, Megaphone, Clock,
  CheckCircle2, XCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  image_url?: string;
}

export const NotificationsSection = () => {
  const [activeTab, setActiveTab] = useState("compose");
  
  // Compose state
  const [title, setTitle] = useState("🎯 SPORTY CODES Alert!");
  const [body, setBody] = useState("Check out our latest sure odds predictions!");
  const [imageUrl, setImageUrl] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [sendToAll, setSendToAll] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Stats
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Templates
  const [templates, setTemplates] = useState<NotificationTemplate[]>([
    {
      id: "1",
      name: "New Sure Odds",
      title: "🔥 New Sure Odds Available!",
      body: "Don't miss out! Fresh predictions with high confidence just dropped.",
      image_url: ""
    },
    {
      id: "2", 
      name: "Match Going Live",
      title: "⚽ Match Starting Now!",
      body: "Your selected match is about to begin. Check the predictions!",
      image_url: ""
    },
    {
      id: "3",
      name: "Payment Approved",
      title: "✅ Payment Confirmed!",
      body: "Your payment has been approved. Access your betting codes now!",
      image_url: ""
    },
    {
      id: "4",
      name: "Big Win Alert",
      title: "🏆 Jackpot Alert!",
      body: "Major wins happening today! Get in on the action before it's too late.",
      image_url: ""
    },
    {
      id: "5",
      name: "Daily Bonus",
      title: "🎁 Daily Bonus Ready!",
      body: "Your daily free predictions are waiting. Claim them now!",
      image_url: ""
    }
  ]);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Emoji picker
  const emojis = ["🔥", "⚽", "🏆", "💰", "🎯", "✅", "🎁", "💎", "⭐", "🚀", "💥", "🎰", "📈", "💵", "🏅"];

  useEffect(() => {
    fetchSubscriberCount();
  }, []);

  const fetchSubscriberCount = async () => {
    setLoadingStats(true);
    try {
      const { count, error } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      setSubscriberCount(count || 0);
    } catch (error) {
      console.error('Error fetching subscriber count:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sendToAll && !targetEmail) {
      toast.error("Please enter a user email or select 'Send to All'");
      return;
    }

    setSending(true);
    try {
      const payload: any = {
        title,
        body,
        data: {}
      };

      // Add image if provided
      if (imageUrl) {
        payload.data.image = imageUrl;
      }

      // Add target email if not sending to all
      if (!sendToAll && targetEmail) {
        payload.userEmail = targetEmail;
      }

      const { error } = await supabase.functions.invoke("send-push-notification", {
        body: payload,
      });

      if (error) throw error;

      toast.success(
        sendToAll 
          ? `Notification broadcast to ${subscriberCount} subscribers!`
          : `Notification sent to ${targetEmail}!`
      );
    } catch (error: any) {
      console.error("Error sending notification:", error);
      toast.error(error.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const loadTemplate = (template: NotificationTemplate) => {
    setTitle(template.title);
    setBody(template.body);
    setImageUrl(template.image_url || "");
    toast.success(`Template "${template.name}" loaded`);
  };

  const saveAsTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    setSavingTemplate(true);
    try {
      const newTemplate: NotificationTemplate = {
        id: Date.now().toString(),
        name: newTemplateName,
        title,
        body,
        image_url: imageUrl
      };
      
      setTemplates([...templates, newTemplate]);
      setNewTemplateName("");
      toast.success("Template saved!");
    } catch (error) {
      toast.error("Failed to save template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const deleteTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
    toast.success("Template deleted");
  };

  const insertEmoji = (emoji: string) => {
    setTitle(prev => prev + emoji);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-cyber border-2 border-cyber-neon-green/50 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyber-neon-green/20 rounded-lg">
              <Users className="w-6 h-6 text-cyber-neon-green" />
            </div>
            <div>
              <p className="text-xs text-cyber-neon-green/70 font-mono">SUBSCRIBERS</p>
              <p className="text-2xl font-black text-cyber-neon-green">
                {loadingStats ? "..." : subscriberCount}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-cyber border-2 border-cyber-neon-purple/50 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyber-neon-purple/20 rounded-lg">
              <Megaphone className="w-6 h-6 text-cyber-neon-purple" />
            </div>
            <div>
              <p className="text-xs text-cyber-neon-purple/70 font-mono">TEMPLATES</p>
              <p className="text-2xl font-black text-cyber-neon-purple">{templates.length}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-cyber border-2 border-cyber-neon-cyan/50 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyber-neon-cyan/20 rounded-lg">
              <Bell className="w-6 h-6 text-cyber-neon-cyan animate-neon-pulse" />
            </div>
            <div>
              <p className="text-xs text-cyber-neon-cyan/70 font-mono">STATUS</p>
              <p className="text-sm font-bold text-cyber-neon-cyan">READY TO SEND</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-cyber-dark/50 border border-cyber-neon-purple/30 w-full">
          <TabsTrigger value="compose" className="flex-1 data-[state=active]:bg-cyber-neon-purple/20">
            <Send className="w-4 h-4 mr-2" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex-1 data-[state=active]:bg-cyber-neon-purple/20">
            <Copy className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex-1 data-[state=active]:bg-cyber-neon-purple/20">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </TabsTrigger>
        </TabsList>

        {/* Compose Tab */}
        <TabsContent value="compose">
          <Card className="bg-gradient-cyber border-2 border-cyber-neon-purple/50 shadow-neon-purple p-6">
            <h3 className="text-xl font-black text-cyber-neon-purple mb-6 font-mono flex items-center gap-2">
              <Sparkles className="w-5 h-5 animate-neon-pulse" />
              COMPOSE NOTIFICATION
            </h3>

            <form onSubmit={handleSendNotification} className="space-y-4">
              {/* Emoji Quick Insert */}
              <div>
                <Label className="text-cyber-neon-cyan font-mono text-sm">QUICK EMOJIS</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="text-xl p-2 bg-cyber-dark/50 rounded hover:bg-cyber-neon-purple/20 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <Label className="text-cyber-neon-cyan font-mono text-sm">NOTIFICATION TITLE</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-2 bg-cyber-dark/50 border-cyber-neon-purple/50 text-cyber-neon-green font-mono"
                  placeholder="e.g., 🔥 Don't miss out!"
                  required
                />
              </div>

              {/* Body */}
              <div>
                <Label className="text-cyber-neon-cyan font-mono text-sm">NOTIFICATION BODY</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="mt-2 bg-cyber-dark/50 border-cyber-neon-purple/50 text-cyber-neon-green font-mono min-h-[100px]"
                  placeholder="Your notification message..."
                  required
                />
              </div>

              {/* Image URL */}
              <div>
                <Label className="text-cyber-neon-cyan font-mono text-sm flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  IMAGE URL (OPTIONAL)
                </Label>
                <Input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="mt-2 bg-cyber-dark/50 border-cyber-neon-purple/50 text-cyber-neon-green font-mono"
                  placeholder="https://example.com/image.png"
                />
                <p className="text-xs text-cyber-neon-cyan/50 mt-1">
                  For rich notifications with images (shows on Android)
                </p>
              </div>

              {/* Target Selection */}
              <div className="space-y-3">
                <Label className="text-cyber-neon-cyan font-mono text-sm">SEND TO</Label>
                
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={sendToAll}
                      onChange={() => setSendToAll(true)}
                      className="accent-cyber-neon-purple"
                    />
                    <span className="text-cyber-neon-green font-mono text-sm flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      All Subscribers ({subscriberCount})
                    </span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!sendToAll}
                      onChange={() => setSendToAll(false)}
                      className="accent-cyber-neon-purple"
                    />
                    <span className="text-cyber-neon-green font-mono text-sm">Specific User</span>
                  </label>
                </div>

                {!sendToAll && (
                  <Input
                    type="email"
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    className="bg-cyber-dark/50 border-cyber-neon-purple/50 text-cyber-neon-green font-mono"
                    placeholder="user@example.com"
                  />
                )}
              </div>

              {/* Save as Template */}
              <div className="flex gap-2">
                <Input
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono"
                  placeholder="Template name..."
                />
                <Button
                  type="button"
                  onClick={saveAsTemplate}
                  disabled={savingTemplate}
                  variant="outline"
                  className="border-cyber-neon-cyan text-cyber-neon-cyan hover:bg-cyber-neon-cyan/20"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Save
                </Button>
              </div>

              {/* Send Button */}
              <Button
                type="submit"
                disabled={sending}
                className="w-full bg-gradient-to-r from-cyber-neon-purple to-cyber-neon-pink text-white hover:opacity-90 font-black font-mono py-6 text-lg"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    SENDING...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    {sendToAll ? `BROADCAST TO ${subscriberCount} USERS` : 'SEND NOTIFICATION'}
                  </>
                )}
              </Button>
            </form>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card className="bg-gradient-cyber border-2 border-cyber-neon-cyan/50 p-6">
            <h3 className="text-xl font-black text-cyber-neon-cyan mb-6 font-mono flex items-center gap-2">
              <Copy className="w-5 h-5" />
              NOTIFICATION TEMPLATES
            </h3>

            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 bg-cyber-dark/50 border border-cyber-neon-purple/30 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-cyber-neon-purple font-bold font-mono text-sm">{template.name}</p>
                      <p className="text-cyber-neon-green mt-1">{template.title}</p>
                      <p className="text-cyber-neon-green/70 text-sm mt-1">{template.body}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadTemplate(template)}
                        className="border-cyber-neon-green text-cyber-neon-green hover:bg-cyber-neon-green/20"
                      >
                        Use
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteTemplate(template.id)}
                        className="border-destructive text-destructive hover:bg-destructive/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview">
          <Card className="bg-gradient-cyber border-2 border-cyber-neon-green/50 p-6">
            <h3 className="text-xl font-black text-cyber-neon-green mb-6 font-mono flex items-center gap-2">
              <Eye className="w-5 h-5" />
              NOTIFICATION PREVIEW
            </h3>

            {/* Phone Mockup */}
            <div className="max-w-sm mx-auto">
              <div className="bg-gray-900 rounded-3xl p-4 border-4 border-gray-700">
                {/* Status Bar */}
                <div className="flex justify-between text-white text-xs mb-4 px-2">
                  <span>9:32 PM</span>
                  <div className="flex gap-1 items-center">
                    <span>📶</span>
                    <span>🔋</span>
                  </div>
                </div>

                {/* Notification Card */}
                <div className="bg-gray-800 rounded-2xl p-4 shadow-lg">
                  <div className="flex gap-3">
                    {/* App Icon */}
                    <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">SC</span>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="text-gray-400 text-xs">SPORTY CODES • now</p>
                        {imageUrl && (
                          <img 
                            src={imageUrl} 
                            alt="Notification" 
                            className="w-10 h-10 rounded-lg object-cover ml-2"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        )}
                      </div>
                      <p className="text-white font-semibold text-sm mt-1 truncate">{title || "Notification Title"}</p>
                      <p className="text-gray-300 text-xs mt-1 line-clamp-2">{body || "Notification body text..."}</p>
                    </div>
                  </div>
                </div>

                {/* Time indicator */}
                <div className="text-center mt-4">
                  <div className="w-32 h-1 bg-gray-600 rounded-full mx-auto" />
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-cyber-neon-green/10 border border-cyber-neon-green/30 rounded-lg">
              <p className="text-xs text-cyber-neon-green/80 font-mono">
                💡 <strong>TIP:</strong> Rich notifications with images work best on Android devices. 
                iOS shows basic notifications. Use eye-catching emojis in your title for better engagement!
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
