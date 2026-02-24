import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ThemePresetSelector } from './ThemePresetSelector';
import { ThemePreview } from './ThemePreview';
import { ThemeConfig } from '@/hooks/useSeasonalTheme';

interface AddSeasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editData?: {
    id: string;
    season_name: string;
    description?: string;
    start_date: string;
    end_date: string;
    priority: number;
    theme_config: ThemeConfig;
    is_enabled: boolean;
  };
}

export const AddSeasonModal = ({ open, onOpenChange, onSuccess, editData }: AddSeasonModalProps) => {
  const [seasonName, setSeasonName] = useState(editData?.season_name || '');
  const [description, setDescription] = useState(editData?.description || '');
  const [startDate, setStartDate] = useState(editData?.start_date || '');
  const [endDate, setEndDate] = useState(editData?.end_date || '');
  const [priority, setPriority] = useState(editData?.priority || 0);
  const [selectedThemeConfig, setSelectedThemeConfig] = useState<ThemeConfig | null>(
    editData?.theme_config || null
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!seasonName || !startDate || !endDate || !selectedThemeConfig) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        season_name: seasonName,
        description,
        start_date: startDate,
        end_date: endDate,
        priority,
        theme_config: selectedThemeConfig as any,
        is_enabled: editData?.is_enabled ?? true,
      };

      if (editData) {
        // Update existing season
        const { error } = await supabase
          .from('seasonal_themes')
          .update(payload)
          .eq('id', editData.id);

        if (error) throw error;
        toast.success('Season updated successfully!');
      } else {
        // Create new season
        const { error } = await supabase.from('seasonal_themes').insert([payload]);

        if (error) throw error;
        toast.success('Season created successfully!');
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving season:', error);
      toast.error(error.message || 'Failed to save season');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSeasonName('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setPriority(0);
    setSelectedThemeConfig(null);
    setSelectedPresetId(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? 'Edit Season' : 'Add New Season'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="seasonName">Season Name *</Label>
              <Input
                id="seasonName"
                value={seasonName}
                onChange={(e) => setSeasonName(e.target.value)}
                placeholder="e.g., Christmas 2025"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="priority">Priority (Higher = Higher Priority)</Label>
              <Input
                id="priority"
                type="number"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>

            <div>
              <Label>Theme Preset *</Label>
              <div className="mt-2 max-h-64 overflow-y-auto">
                <ThemePresetSelector
                  selectedPresetId={selectedPresetId}
                  onSelect={(preset) => {
                    setSelectedPresetId(preset.id);
                    setSelectedThemeConfig(preset.theme_config);
                  }}
                />
              </div>
            </div>
          </div>

          <div>
            <Label>Preview</Label>
            <div className="mt-2">
              {selectedThemeConfig ? (
                <ThemePreview themeConfig={selectedThemeConfig} />
              ) : (
                <div className="border rounded-lg h-64 flex items-center justify-center text-muted-foreground">
                  Select a theme preset to preview
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : editData ? 'Update Season' : 'Create Season'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
