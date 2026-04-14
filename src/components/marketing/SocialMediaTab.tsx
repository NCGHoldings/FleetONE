import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Plus, 
  Share2, 
  Facebook, 
  Youtube, 
  Instagram, 
  Twitter, 
  Linkedin,
  TrendingUp,
  Users,
  Eye,
  Heart,
  MessageCircle,
  RefreshCw,
  Building2
} from "lucide-react";

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'bg-red-600' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400' },
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'bg-black' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'bg-blue-700' },
  { id: 'tiktok', name: 'TikTok', icon: Share2, color: 'bg-black' },
];

export const SocialMediaTab = () => {
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [formData, setFormData] = useState({
    platform: '',
    account_name: '',
    account_url: '',
    company_id: '',
  });
  const queryClient = useQueryClient();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['marketing-social-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_social_accounts')
        .select(`
          *,
          companies:company_id (name),
          stats:marketing_social_stats (
            followers_count,
            engagement_rate,
            likes_total,
            views_total,
            recorded_at
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_active', true);
      return data || [];
    }
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('marketing_social_accounts')
        .insert({
          ...formData,
          company_id: formData.company_id || null,
          is_connected: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Social account added successfully!');
      setIsConnectOpen(false);
      setFormData({ platform: '', account_name: '', account_url: '', company_id: '' });
      queryClient.invalidateQueries({ queryKey: ['marketing-social-accounts'] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const getPlatformInfo = (platformId: string) => {
    return PLATFORMS.find(p => p.id === platformId) || PLATFORMS[0];
  };

  const getLatestStats = (stats: any[]) => {
    if (!stats || stats.length === 0) return null;
    return stats.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];
  };

  const formatNumber = (num: number | null) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Social Media Management</h2>
          <p className="text-muted-foreground">Connect and track your social media accounts</p>
        </div>
        <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              <Plus className="h-4 w-4 mr-2" />
              Connect Account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-purple-500" />
                Connect Social Account
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); connectMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Platform *</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(value) => setFormData({ ...formData, platform: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((platform) => {
                      const Icon = platform.icon;
                      return (
                        <SelectItem key={platform.id} value={platform.id}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {platform.name}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_name">Account Name *</Label>
                <Input
                  id="account_name"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  placeholder="e.g., @yourcompany"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_url">Account URL</Label>
                <Input
                  id="account_url"
                  value={formData.account_url}
                  onChange={(e) => setFormData({ ...formData, account_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>Company</Label>
                <Select
                  value={formData.company_id}
                  onValueChange={(value) => setFormData({ ...formData, company_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies?.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsConnectOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={connectMutation.isPending}>
                  {connectMutation.isPending ? 'Connecting...' : 'Connect Account'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Platform Quick Add */}
      <div className="flex flex-wrap gap-3">
        {PLATFORMS.map((platform) => {
          const Icon = platform.icon;
          return (
            <Button
              key={platform.id}
              variant="outline"
              className="gap-2"
              onClick={() => {
                setFormData({ ...formData, platform: platform.id });
                setIsConnectOpen(true);
              }}
            >
              <div className={`w-6 h-6 rounded-full ${platform.color} flex items-center justify-center`}>
                <Icon className="h-3 w-3 text-white" />
              </div>
              {platform.name}
            </Button>
          );
        })}
      </div>

      {/* Accounts Grid */}
      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : accounts && accounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account: any) => {
            const platform = getPlatformInfo(account.platform);
            const Icon = platform.icon;
            const latestStats = getLatestStats(account.stats);

            return (
              <Card key={account.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{account.account_name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{platform.name}</p>
                      </div>
                    </div>
                    <Badge variant={account.is_connected ? 'default' : 'secondary'}>
                      {account.is_connected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {account.companies && (
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <Building2 className="h-3 w-3" />
                      {account.companies.name}
                    </Badge>
                  )}

                  {/* Stats Grid */}
                  {latestStats ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-center gap-1 text-blue-600">
                          <Users className="h-3 w-3" />
                          <span className="font-bold">{formatNumber(latestStats.followers_count)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Followers</p>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-center gap-1 text-green-600">
                          <TrendingUp className="h-3 w-3" />
                          <span className="font-bold">{latestStats.engagement_rate?.toFixed(1) || 0}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Engagement</p>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-center gap-1 text-red-500">
                          <Heart className="h-3 w-3" />
                          <span className="font-bold">{formatNumber(latestStats.likes_total)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Likes</p>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-center gap-1 text-purple-600">
                          <Eye className="h-3 w-3" />
                          <span className="font-bold">{formatNumber(latestStats.views_total)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Views</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No stats recorded yet</p>
                    </div>
                  )}

                  <Button variant="outline" className="w-full" size="sm">
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Sync Stats
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Share2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium">No social accounts connected</p>
            <p className="text-muted-foreground">Connect your first social media account</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
