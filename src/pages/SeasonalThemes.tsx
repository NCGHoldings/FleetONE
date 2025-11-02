import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, Edit, Trash2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { AddSeasonModal } from '@/components/seasonal/AddSeasonModal';
import { useSeasonalThemeContext } from '@/components/seasonal/SeasonalThemeProvider';
import { ThemeConfig } from '@/hooks/useSeasonalTheme';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SeasonalTheme {
  id: string;
  season_name: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_enabled: boolean;
  is_active: boolean;
  priority: number;
  theme_config: ThemeConfig;
  created_at: string;
}

export default function SeasonalThemes() {
  const { masterEnabled, toggleMasterSwitch, refetch } = useSeasonalThemeContext();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSeason, setEditingSeason] = useState<SeasonalTheme | null>(null);
  const [deletingSeason, setDeletingSeason] = useState<SeasonalTheme | null>(null);

  const { data: seasons, isLoading, refetch: refetchSeasons } = useQuery({
    queryKey: ['seasonal-themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasonal_themes')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data as unknown as SeasonalTheme[];
    },
  });

  const handleToggleEnabled = async (season: SeasonalTheme) => {
    try {
      const { error } = await supabase
        .from('seasonal_themes')
        .update({ is_enabled: !season.is_enabled })
        .eq('id', season.id);

      if (error) throw error;

      toast.success(`Season ${!season.is_enabled ? 'enabled' : 'disabled'}`);
      refetchSeasons();
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update season');
    }
  };

  const handleDelete = async () => {
    if (!deletingSeason) return;

    try {
      const { error } = await supabase
        .from('seasonal_themes')
        .delete()
        .eq('id', deletingSeason.id);

      if (error) throw error;

      toast.success('Season deleted successfully');
      refetchSeasons();
      refetch();
      setDeletingSeason(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete season');
    }
  };

  const getStatusBadge = (season: SeasonalTheme) => {
    const today = new Date();
    const startDate = new Date(season.start_date);
    const endDate = new Date(season.end_date);

    if (!season.is_enabled) {
      return <Badge variant="outline" className="bg-gray-100">Disabled</Badge>;
    }

    if (today >= startDate && today <= endDate) {
      return <Badge className="bg-green-500">Active</Badge>;
    }

    if (today < startDate) {
      return <Badge variant="outline" className="bg-blue-100 text-blue-800">Upcoming</Badge>;
    }

    return <Badge variant="outline" className="bg-gray-100">Expired</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8" />
            Seasonal Themes
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage festive themes and seasonal decorations for your platform
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Season
        </Button>
      </div>

      <div className="card-elevated p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Master Theme Switch</h3>
            <p className="text-sm text-muted-foreground">
              Enable or disable all seasonal themes globally
            </p>
          </div>
          <Switch
            checked={masterEnabled}
            onCheckedChange={toggleMasterSwitch}
          />
        </div>
      </div>

      <div className="card-elevated">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Season Name</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Theme</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading seasons...
                </TableCell>
              </TableRow>
            ) : seasons?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No seasons created yet. Click "Add Season" to get started!
                </TableCell>
              </TableRow>
            ) : (
              seasons?.map((season) => (
                <TableRow key={season.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{season.season_name}</div>
                      {season.description && (
                        <div className="text-sm text-muted-foreground">{season.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(season.start_date).toLocaleDateString()} -{' '}
                      {new Date(season.end_date).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(season)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{season.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {season.theme_config.decorations.logoOverlay || '🎨'}
                      </span>
                      <Switch
                        checked={season.is_enabled}
                        onCheckedChange={() => handleToggleEnabled(season)}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingSeason(season);
                          setShowAddModal(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingSeason(season)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AddSeasonModal
        open={showAddModal}
        onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) setEditingSeason(null);
        }}
        onSuccess={() => {
          refetchSeasons();
          refetch();
        }}
        editData={editingSeason ? {
          id: editingSeason.id,
          season_name: editingSeason.season_name,
          description: editingSeason.description,
          start_date: editingSeason.start_date,
          end_date: editingSeason.end_date,
          priority: editingSeason.priority,
          theme_config: editingSeason.theme_config,
          is_enabled: editingSeason.is_enabled,
        } : undefined}
      />

      <AlertDialog open={!!deletingSeason} onOpenChange={() => setDeletingSeason(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Season?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingSeason?.season_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
