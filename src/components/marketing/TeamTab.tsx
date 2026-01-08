import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Users, Star, CheckSquare, Trophy, Settings, Eye } from "lucide-react";
import { MemberProfileModal } from "./MemberProfileModal";

export const TeamTab = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [formData, setFormData] = useState({
    display_name: '',
    designation: '',
    bio: '',
    is_task_assigner: false,
    is_task_confirmer: false,
  });
  const queryClient = useQueryClient();

  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ['marketing-team-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_team_members')
        .select('*')
        .eq('is_active', true)
        .order('total_credits', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('marketing_team_members')
        .insert({
          ...formData,
          user_id: user.user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Team member added successfully!');
      setIsCreateOpen(false);
      setFormData({
        display_name: '',
        designation: '',
        bio: '',
        is_task_assigner: false,
        is_task_confirmer: false,
      });
      queryClient.invalidateQueries({ queryKey: ['marketing-team-full'] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRankStyle = (index: number) => {
    if (index === 0) return 'bg-gradient-to-br from-yellow-400 to-amber-500 ring-4 ring-yellow-200';
    if (index === 1) return 'bg-gradient-to-br from-gray-300 to-gray-400 ring-4 ring-gray-200';
    if (index === 2) return 'bg-gradient-to-br from-amber-600 to-amber-700 ring-4 ring-amber-200';
    return 'bg-gradient-to-br from-purple-500 to-pink-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Profiles</h2>
          <p className="text-muted-foreground">Manage marketing team members and view performance</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                Add Team Member
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name *</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Enter name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="e.g., Graphic Designer, Content Writer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Short bio..."
                  rows={2}
                />
              </div>

              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Task Assigner</p>
                    <p className="text-xs text-muted-foreground">Can assign tasks to team members</p>
                  </div>
                  <Switch
                    checked={formData.is_task_assigner}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_task_assigner: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Task Confirmer</p>
                    <p className="text-xs text-muted-foreground">Can approve or request revisions on tasks</p>
                  </div>
                  <Switch
                    checked={formData.is_task_confirmer}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_task_confirmer: checked })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Adding...' : 'Add Member'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Grid */}
      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : teamMembers && teamMembers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((member, index) => (
            <Card 
              key={member.id} 
              className="relative overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
              onClick={() => setSelectedMember(member)}
            >
              {/* Rank Badge for Top 3 */}
              {index < 3 && (
                <div className="absolute top-3 right-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${getRankStyle(index)}`}>
                    {index + 1}
                  </div>
                </div>
              )}

              <CardContent className="p-6">
                {/* Avatar & Basic Info */}
                <div className="flex flex-col items-center text-center mb-4">
                  <Avatar className={`w-20 h-20 mb-3 ${index < 3 ? getRankStyle(index) : ''}`}>
                    <AvatarImage src={member.avatar_url || ''} />
                    <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                      {getInitials(member.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-lg font-bold">{member.display_name}</h3>
                  <p className="text-sm text-muted-foreground">{member.designation || 'Team Member'}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-yellow-600">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="text-xl font-bold">{member.total_credits || 0}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Credits</p>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-purple-600">
                      <Trophy className="h-4 w-4" />
                      <span className="text-xl font-bold">#{index + 1}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Rank</p>
                  </div>
                </div>

                {/* Bio */}
                {member.bio && (
                  <p className="text-sm text-muted-foreground text-center mb-4 line-clamp-2">
                    {member.bio}
                  </p>
                )}

                {/* Permissions Badges */}
                <div className="flex flex-wrap justify-center gap-2">
                  {member.is_task_assigner && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Settings className="h-3 w-3" />
                      Assigner
                    </Badge>
                  )}
                  {member.is_task_confirmer && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <CheckSquare className="h-3 w-3" />
                      Confirmer
                    </Badge>
                  )}
                </div>

                {/* Skills */}
                {member.skills && member.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3 justify-center">
                    {member.skills.slice(0, 3).map((skill, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {member.skills.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{member.skills.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                {/* View Profile Button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMember(member);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Profile
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium">No team members yet</p>
            <p className="text-muted-foreground">Add your first team member to get started</p>
          </CardContent>
        </Card>
      )}

      {/* Member Profile Modal */}
      {selectedMember && (
        <MemberProfileModal
          member={selectedMember}
          open={!!selectedMember}
          onOpenChange={(open) => !open && setSelectedMember(null)}
        />
      )}
    </div>
  );
};
