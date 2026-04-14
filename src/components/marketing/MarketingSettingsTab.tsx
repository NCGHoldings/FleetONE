import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Settings, Plus, Trash2, Edit, Save, Tag, Clock, Star, 
  Users, CheckCircle, Briefcase
} from "lucide-react";

export const MarketingSettingsTab = () => {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryForm, setCategoryForm] = useState({
    category_name: '',
    description: '',
    average_hours: '',
    credit_multiplier: '1',
  });
  const queryClient = useQueryClient();

  // Fetch task categories
  const { data: categories } = useQuery({
    queryKey: ['marketing-task-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_task_categories')
        .select('*')
        .eq('is_active', true)
        .order('category_name');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch credit settings
  const { data: creditSettings } = useQuery({
    queryKey: ['marketing-credit-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_credit_settings')
        .select('*')
        .order('setting_key');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch team members with permissions
  const { data: teamMembers } = useQuery({
    queryKey: ['marketing-team-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_team_members')
        .select('*')
        .eq('is_active', true)
        .order('display_name');
      if (error) throw error;
      return data || [];
    }
  });

  // Create/Update category
  const saveCategoryMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        category_name: categoryForm.category_name,
        description: categoryForm.description || null,
        average_hours: parseFloat(categoryForm.average_hours) || 0,
        credit_multiplier: parseFloat(categoryForm.credit_multiplier) || 1,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('marketing_task_categories')
          .update(payload)
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('marketing_task_categories')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingCategory ? 'Category updated!' : 'Category created!');
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryForm({ category_name: '', description: '', average_hours: '', credit_multiplier: '1' });
      queryClient.invalidateQueries({ queryKey: ['marketing-task-categories'] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  // Delete category
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('marketing_task_categories')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Category deleted!');
      queryClient.invalidateQueries({ queryKey: ['marketing-task-categories'] });
    }
  });

  // Update credit setting
  const updateCreditSettingMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      const { error } = await supabase
        .from('marketing_credit_settings')
        .update({ setting_value: value, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Setting updated!');
      queryClient.invalidateQueries({ queryKey: ['marketing-credit-settings'] });
    }
  });

  // Update team member permissions
  const updatePermissionMutation = useMutation({
    mutationFn: async ({ memberId, field, value }: { memberId: string; field: string; value: boolean }) => {
      const { error } = await supabase
        .from('marketing_team_members')
        .update({ [field]: value })
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Permission updated!');
      queryClient.invalidateQueries({ queryKey: ['marketing-team-permissions'] });
    }
  });

  const openEditCategory = (category: any) => {
    setEditingCategory(category);
    setCategoryForm({
      category_name: category.category_name,
      description: category.description || '',
      average_hours: category.average_hours?.toString() || '',
      credit_multiplier: category.credit_multiplier?.toString() || '1',
    });
    setIsCategoryModalOpen(true);
  };

  const getSettingLabel = (key: string) => {
    switch (key) {
      case 'base_credit_per_hour': return 'Base Credit Per Hour';
      case 'early_completion_multiplier': return 'Early Completion Multiplier';
      case 'late_penalty_multiplier': return 'Late Penalty Multiplier';
      case 'office_hours_per_day': return 'Office Hours Per Day';
      case 'weekend_days': return 'Weekend Days';
      default: return key.replace(/_/g, ' ');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-purple-500" />
          Marketing Settings
        </h2>
        <p className="text-muted-foreground">Configure task categories, credit settings, and team permissions</p>
      </div>

      {/* Task Categories */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Task Categories
            </CardTitle>
            <CardDescription>Define categories with average timing for credit calculation</CardDescription>
          </div>
          <Dialog open={isCategoryModalOpen} onOpenChange={(open) => {
            setIsCategoryModalOpen(open);
            if (!open) {
              setEditingCategory(null);
              setCategoryForm({ category_name: '', description: '', average_hours: '', credit_multiplier: '1' });
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveCategoryMutation.mutate(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Category Name *</Label>
                  <Input
                    value={categoryForm.category_name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, category_name: e.target.value })}
                    placeholder="e.g., Social Media Post"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    placeholder="Brief description..."
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Average Hours *</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={categoryForm.average_hours}
                      onChange={(e) => setCategoryForm({ ...categoryForm, average_hours: e.target.value })}
                      placeholder="e.g., 4"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Credit Multiplier</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={categoryForm.credit_multiplier}
                      onChange={(e) => setCategoryForm({ ...categoryForm, credit_multiplier: e.target.value })}
                      placeholder="1.0"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCategoryModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveCategoryMutation.isPending}>
                    {saveCategoryMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {categories && categories.length > 0 ? (
            <div className="space-y-3">
              {categories.map((cat: any) => (
                <div key={cat.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-purple-500" />
                      <span className="font-medium">{cat.category_name}</span>
                    </div>
                    {cat.description && (
                      <p className="text-sm text-muted-foreground mt-1">{cat.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {cat.average_hours}h avg
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {cat.credit_multiplier}x
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => openEditCategory(cat)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive"
                      onClick={() => deleteCategoryMutation.mutate(cat.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No categories defined yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Credit Calculation Settings
          </CardTitle>
          <CardDescription>Configure how credits are calculated for completed tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {creditSettings?.map((setting: any) => (
              <div key={setting.id} className="p-4 border rounded-lg">
                <Label className="text-sm">{getSettingLabel(setting.setting_key)}</Label>
                <p className="text-xs text-muted-foreground mb-2">{setting.description}</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    defaultValue={setting.setting_value}
                    onBlur={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (newValue !== setting.setting_value) {
                        updateCreditSettingMutation.mutate({ id: setting.id, value: newValue });
                      }
                    }}
                    className="w-24"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Team Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Team Permissions
          </CardTitle>
          <CardDescription>Manage who can assign and confirm tasks</CardDescription>
        </CardHeader>
        <CardContent>
          {teamMembers && teamMembers.length > 0 ? (
            <div className="space-y-3">
              {teamMembers.map((member: any) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                      {member.display_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{member.display_name}</p>
                      <p className="text-sm text-muted-foreground">{member.designation || 'Team Member'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={member.is_task_assigner}
                        onCheckedChange={(checked) => 
                          updatePermissionMutation.mutate({ memberId: member.id, field: 'is_task_assigner', value: checked })
                        }
                      />
                      <Label className="text-sm">Task Assigner</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={member.is_task_confirmer}
                        onCheckedChange={(checked) => 
                          updatePermissionMutation.mutate({ memberId: member.id, field: 'is_task_confirmer', value: checked })
                        }
                      />
                      <Label className="text-sm">Task Confirmer</Label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No team members to configure</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};